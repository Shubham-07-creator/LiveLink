import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ArtifactStreamParser, type ArtifactParserEvent } from '../lib/artifacts/parser';

describe('Aether Artifact Streaming State Machine Parser', () => {
  function collectEvents(chunks: string[]): ArtifactParserEvent[] {
    const parser = new ArtifactStreamParser();
    const events: ArtifactParserEvent[] = [];
    for (const chunk of chunks) {
      for (const ev of parser.feed(chunk)) {
        events.push(ev);
      }
    }
    for (const ev of parser.finish()) {
      events.push(ev);
    }
    return events;
  }

  it('1. Correctly detects opening tag split across chunk boundaries', () => {
    const chunks = [
      'Here is the widget: <art',
      'ifact identifier="counter-app" type="application/vnd.aether.react" title="Counter" language="tsx">',
      'const x = 1;\n',
      '</art',
      'ifact>\nDone!'
    ];

    const events = collectEvents(chunks);

    const startEv = events.find((e) => e.type === 'artifact_start');
    assert.ok(startEv, 'Should emit artifact_start');
    if (startEv && startEv.type === 'artifact_start') {
      assert.strictEqual(startEv.meta.identifier, 'counter-app');
      assert.strictEqual(startEv.meta.title, 'Counter');
    }

    const endEv = events.find((e) => e.type === 'artifact_end');
    assert.ok(endEv, 'Should emit artifact_end');
    if (endEv && endEv.type === 'artifact_end') {
      assert.strictEqual(endEv.content, 'const x = 1;');
    }
  });

  it('2. Parses attributes in ANY arbitrary order', () => {
    const chunk = `<artifact language="python" title="Data Pipeline" type="application/vnd.aether.code" identifier="pipeline-py">\ndef run():\n    pass\n</artifact>`;
    const events = collectEvents([chunk]);

    const startEv = events.find((e) => e.type === 'artifact_start');
    assert.ok(startEv);
    if (startEv && startEv.type === 'artifact_start') {
      assert.strictEqual(startEv.meta.language, 'python');
      assert.strictEqual(startEv.meta.title, 'Data Pipeline');
      assert.strictEqual(startEv.meta.type, 'application/vnd.aether.code');
      assert.strictEqual(startEv.meta.identifier, 'pipeline-py');
    }
  });

  it('3. Handles nested code fences and closing tags inside artifact content safely', () => {
    const chunk = `<artifact identifier="nested-test" type="text/markdown" title="Doc with code" language="md">
Here is nested code:
\`\`\`javascript
const str = "</div></artifact_fake>";
\`\`\`
</artifact>`;

    const events = collectEvents([chunk]);
    const endEv = events.find((e) => e.type === 'artifact_end');
    assert.ok(endEv);
    if (endEv && endEv.type === 'artifact_end') {
      assert.ok(endEv.content.includes('const str = "</div></artifact_fake>";'));
    }
  });

  it('4. Gracefully tolerates an unclosed artifact tag at stream end', () => {
    const chunks = [
      '<artifact identifier="unclosed-app" type="text/html" title="Incomplete Page" language="html">\n',
      '<html><body>Hello World'
      // Stream terminates without </artifact>
    ];

    const events = collectEvents(chunks);
    const endEv = events.find((e) => e.type === 'artifact_end');
    assert.ok(endEv, 'Must emit artifact_end on stream termination even without closing tag');
    if (endEv && endEv.type === 'artifact_end') {
      assert.strictEqual(endEv.meta.identifier, 'unclosed-app');
      assert.strictEqual(endEv.content, '<html><body>Hello World');
    }
  });

  it('5. Successfully parses two artifacts in a single message stream', () => {
    const chunks = [
      'First artifact:\n<artifact identifier="art-1" type="text/html" title="Doc 1" language="html">Page 1</artifact>\n',
      'Second artifact:\n<artifact identifier="art-2" type="text/html" title="Doc 2" language="html">Page 2</artifact>'
    ];

    const events = collectEvents(chunks);
    const ends = events.filter((e) => e.type === 'artifact_end');
    assert.strictEqual(ends.length, 2, 'Should cleanly parse both artifacts');
    if (ends[0].type === 'artifact_end' && ends[1].type === 'artifact_end') {
      assert.strictEqual(ends[0].meta.identifier, 'art-1');
      assert.strictEqual(ends[1].meta.identifier, 'art-2');
    }
  });
});
