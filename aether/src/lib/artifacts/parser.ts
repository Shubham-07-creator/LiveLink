/**
 * AETHER STREAMING ARTIFACT STATE MACHINE PARSER
 * Zero global regex. Handles chunk boundary splitting, arbitrary attribute order,
 * nested code fences, and unclosed tags at stream end.
 */

export interface ArtifactMeta {
  identifier: string;
  type: string;
  title: string;
  language: string;
}

export type ArtifactParserEvent =
  | { type: 'text'; content: string }
  | { type: 'artifact_start'; meta: ArtifactMeta }
  | { type: 'artifact_delta'; identifier: string; delta: string }
  | { type: 'artifact_end'; meta: ArtifactMeta; content: string };

enum ParserState {
  OUTSIDE = 'OUTSIDE',
  POTENTIAL_OPEN_TAG = 'POTENTIAL_OPEN_TAG',
  IN_CONTENT = 'IN_CONTENT',
  POTENTIAL_CLOSE_TAG = 'POTENTIAL_CLOSE_TAG'
}

export class ArtifactStreamParser {
  private state: ParserState = ParserState.OUTSIDE;
  private buffer = '';
  private currentMeta: ArtifactMeta | null = null;
  private currentContent = '';

  /**
   * Parses attribute key-value pairs in arbitrary order from a tag string
   * e.g. <artifact type="..." title="..." identifier="..." language="...">
   */
  private parseAttributes(tagContent: string): ArtifactMeta | null {
    const meta: Partial<ArtifactMeta> = {};
    const attrRegex = /([a-zA-Z_][a-zA-Z0-9_-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let match: RegExpExecArray | null;

    while ((match = attrRegex.exec(tagContent)) !== null) {
      const key = match[1].toLowerCase();
      const val = match[2] !== undefined ? match[2] : match[3];

      if (key === 'identifier') meta.identifier = val;
      else if (key === 'type') meta.type = val;
      else if (key === 'title') meta.title = val;
      else if (key === 'language') meta.language = val;
    }

    if (meta.identifier && meta.type) {
      return {
        identifier: meta.identifier,
        type: meta.type,
        title: meta.title || meta.identifier,
        language: meta.language || (meta.type.includes('react') ? 'tsx' : 'plaintext')
      };
    }

    return null;
  }

  /**
   * Processes an incoming text chunk and yields parser events
   */
  public *feed(chunk: string): Generator<ArtifactParserEvent, void, unknown> {
    for (let i = 0; i < chunk.length; i++) {
      const char = chunk[i];
      this.buffer += char;

      if (this.state === ParserState.OUTSIDE) {
        if (this.buffer.endsWith('<')) {
          // Potential tag opening
          const textBefore = this.buffer.slice(0, -1);
          if (textBefore) yield { type: 'text', content: textBefore };
          this.buffer = '<';
          this.state = ParserState.POTENTIAL_OPEN_TAG;
        } else if (
          !this.buffer.startsWith('<') &&
          !('<artifact'.startsWith(this.buffer))
        ) {
          // Flush regular text
          yield { type: 'text', content: this.buffer };
          this.buffer = '';
        }
      } else if (this.state === ParserState.POTENTIAL_OPEN_TAG) {
        if (this.buffer.endsWith('>')) {
          // Tag complete
          const tagContent = this.buffer;
          if (tagContent.startsWith('<artifact') && tagContent.endsWith('>')) {
            const meta = this.parseAttributes(tagContent);
            if (meta) {
              this.currentMeta = meta;
              this.currentContent = '';
              this.state = ParserState.IN_CONTENT;
              this.buffer = '';
              yield { type: 'artifact_start', meta };
              continue;
            }
          }
          // Not a valid artifact tag, flush as normal text
          yield { type: 'text', content: this.buffer };
          this.buffer = '';
          this.state = ParserState.OUTSIDE;
        }
      } else if (this.state === ParserState.IN_CONTENT) {
        if (this.buffer.endsWith('</')) {
          const delta = this.buffer.slice(0, -2);
          if (delta) {
            this.currentContent += delta;
            yield { type: 'artifact_delta', identifier: this.currentMeta!.identifier, delta };
          }
          this.buffer = '</';
          this.state = ParserState.POTENTIAL_CLOSE_TAG;
        } else if (
          !this.buffer.startsWith('</') &&
          !('</artifact>'.startsWith(this.buffer))
        ) {
          const delta = this.buffer;
          this.currentContent += delta;
          yield { type: 'artifact_delta', identifier: this.currentMeta!.identifier, delta };
          this.buffer = '';
        }
      } else if (this.state === ParserState.POTENTIAL_CLOSE_TAG) {
        if (this.buffer.endsWith('>')) {
          if (this.buffer === '</artifact>') {
            // Artifact cleanly finished
            yield {
              type: 'artifact_end',
              meta: this.currentMeta!,
              content: this.currentContent.trim()
            };
            this.currentMeta = null;
            this.currentContent = '';
            this.buffer = '';
            this.state = ParserState.OUTSIDE;
          } else {
            // False alarm (e.g. nested </div > or closing XML inside content)
            const delta = this.buffer;
            this.currentContent += delta;
            yield { type: 'artifact_delta', identifier: this.currentMeta!.identifier, delta };
            this.buffer = '';
            this.state = ParserState.IN_CONTENT;
          }
        }
      }
    }
  }

  /**
   * Flushes remaining buffers at stream end, gracefully tolerating unclosed tags
   */
  public *finish(): Generator<ArtifactParserEvent, void, unknown> {
    if (this.state === ParserState.IN_CONTENT || this.state === ParserState.POTENTIAL_CLOSE_TAG) {
      if (this.buffer) {
        this.currentContent += this.buffer;
        yield { type: 'artifact_delta', identifier: this.currentMeta!.identifier, delta: this.buffer };
        this.buffer = '';
      }
      if (this.currentMeta) {
        // Tolerates unclosed tag at stream end
        yield {
          type: 'artifact_end',
          meta: this.currentMeta,
          content: this.currentContent.trim()
        };
      }
    } else if (this.buffer) {
      yield { type: 'text', content: this.buffer };
      this.buffer = '';
    }
    this.state = ParserState.OUTSIDE;
    this.currentMeta = null;
    this.currentContent = '';
  }

  /**
   * Lenient fallback: if a model returns a large fenced code block without tags (>15 lines),
   * offers it as an artifact candidate.
   */
  public static detectLenientCodeBlock(text: string): ArtifactMeta | null {
    const fenceMatch = /```(\w+)?\n([\s\S]*?)```/.exec(text);
    if (!fenceMatch) return null;

    const lang = fenceMatch[1] || 'plaintext';
    const code = fenceMatch[2] || '';
    const lines = code.trim().split('\n').length;

    if (lines >= 15) {
      const isReact = lang === 'tsx' || lang === 'jsx' || code.includes('export default') || code.includes('import React');
      return {
        identifier: `generated-${lang}-snippet`,
        type: isReact ? 'application/vnd.aether.react' : 'application/vnd.aether.code',
        title: isReact ? 'React Component' : `${lang.toUpperCase()} Code`,
        language: lang
      };
    }
    return null;
  }
}
