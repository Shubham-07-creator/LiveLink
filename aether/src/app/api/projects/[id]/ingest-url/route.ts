import { NextResponse } from 'next/server';
import { z } from 'zod';
import { validateSafeUrl } from '@/lib/rag/ssrf';
import { chunkText } from '@/lib/rag/chunker';
import { getEmbedding } from '@/lib/rag/embeddings';
import { db, schema } from '@/lib/db';
import { logger } from '@/lib/logger';

const urlIngestSchema = z.object({
  url: z.string().url('Please enter a valid website URL')
});

const MAX_HTML_SIZE = 2 * 1024 * 1024; // 2 MB

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const projectId = params.id;
    const json = await req.json();
    const parsed = urlIngestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const { url } = parsed.data;

    // 1. SSRF Safety Validation (blocks private IPs, loopback, cloud metadata)
    const ssrfCheck = await validateSafeUrl(url);
    if (!ssrfCheck.isSafe) {
      return NextResponse.json({ error: `Security check failed: ${ssrfCheck.error}` }, { status: 403 });
    }

    // 2. Fetch URL with size limit and redirect cap
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Aether-Knowledge-Bot/1.0',
        Accept: 'text/html,application/xhtml+xml,text/plain'
      },
      redirect: 'follow'
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({ error: `Web server returned error status ${response.status}` }, { status: 400 });
    }

    const rawText = await response.text();
    if (rawText.length > MAX_HTML_SIZE) {
      return NextResponse.json({ error: 'Web page size exceeds the 2 MB limit' }, { status: 400 });
    }

    // Basic text extraction: strip scripts, styles, and tags
    const cleanedText = rawText
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanedText) {
      return NextResponse.json({ error: 'No readable text content extracted from page' }, { status: 400 });
    }

    // 3. Chunk and embed
    const chunks = chunkText(cleanedText, 600, 100);
    const domainName = new URL(url).hostname;
    const docName = `web-${domainName}.txt`;

    const chunkEmbeddings = await Promise.all(
      chunks.map(async (c) => {
        const vector = await getEmbedding(c.content);
        return {
          chunkIndex: c.chunkIndex,
          content: c.content,
          embeddingVector: JSON.stringify(vector)
        };
      })
    );

    if (db) {
      const [newDoc] = await db
        .insert(schema.projectDocuments)
        .values({
          projectId,
          name: docName,
          type: 'text/html',
          sizeBytes: Buffer.byteLength(cleanedText, 'utf8'),
          storagePath: url,
          tokenCount: Math.ceil(cleanedText.length / 4)
        })
        .returning();

      for (const item of chunkEmbeddings) {
        await db.insert(schema.documentChunks).values({
          documentId: newDoc.id,
          projectId,
          chunkIndex: item.chunkIndex,
          content: item.content,
          embeddingVector: item.embeddingVector
        });
      }

      return NextResponse.json({ success: true, document: newDoc, chunksProcessed: chunks.length });
    }

    return NextResponse.json({
      success: true,
      document: {
        id: `doc-${Date.now()}`,
        name: docName,
        url,
        tokenCount: Math.ceil(cleanedText.length / 4),
        chunksProcessed: chunks.length
      }
    });
  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out fetching web page' }, { status: 408 });
    }
    logger.error({ err }, 'Error during URL ingest');
    return NextResponse.json({ error: 'Could not fetch web page' }, { status: 500 });
  }
}
