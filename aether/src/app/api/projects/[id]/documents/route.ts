import { NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { chunkText } from '@/lib/rag/chunker';
import { getEmbedding } from '@/lib/rag/embeddings';
import { logger } from '@/lib/logger';

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5 MB

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const projectId = params.id;
    if (!db) {
      return NextResponse.json({
        documents: [
          {
            id: 'doc-1',
            name: 'api_guidelines.md',
            type: 'text/markdown',
            sizeBytes: 14200,
            tokenCount: 3500,
            createdAt: new Date().toISOString()
          }
        ]
      });
    }

    const docs = await db
      .select()
      .from(schema.projectDocuments)
      .where(eq(schema.projectDocuments.projectId, projectId));

    return NextResponse.json({ documents: docs });
  } catch (err) {
    logger.error({ err }, 'Error listing project documents');
    return NextResponse.json({ error: 'Failed to retrieve documents' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const projectId = params.id;
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const directText = formData.get('text') as string | null;
    const fileName = (formData.get('name') as string | null) || file?.name || 'document.txt';

    let content = '';
    let sizeBytes = 0;
    let fileType = 'text/plain';

    if (file) {
      if (file.size > MAX_UPLOAD_SIZE) {
        return NextResponse.json({ error: 'File size exceeds the 5 MB limit.' }, { status: 400 });
      }
      sizeBytes = file.size;
      fileType = file.type || 'text/plain';
      content = await file.text();
    } else if (directText) {
      content = directText;
      sizeBytes = Buffer.byteLength(directText, 'utf8');
      fileType = 'text/plain';
    } else {
      return NextResponse.json({ error: 'No file or text payload provided.' }, { status: 400 });
    }

    if (!content.trim()) {
      return NextResponse.json({ error: 'Document content cannot be empty.' }, { status: 400 });
    }

    // 1. Chunk document
    const chunks = chunkText(content, 600, 100);
    logger.info({ fileName, chunksCount: chunks.length }, 'Chunking document for knowledge base');

    // 2. Generate embeddings for each chunk
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
      // 3. Save to database
      const [newDoc] = await db
        .insert(schema.projectDocuments)
        .values({
          projectId,
          name: fileName,
          type: fileType,
          sizeBytes,
          storagePath: `projects/${projectId}/${fileName}`,
          tokenCount: Math.ceil(content.length / 4)
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
        name: fileName,
        type: fileType,
        sizeBytes,
        tokenCount: Math.ceil(content.length / 4),
        chunksProcessed: chunks.length
      }
    });
  } catch (err) {
    logger.error({ err }, 'Error ingesting document');
    return NextResponse.json({ error: 'Failed to process document into knowledge base' }, { status: 500 });
  }
}
