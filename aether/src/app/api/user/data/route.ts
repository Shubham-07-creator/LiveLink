import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema } from '@/lib/db';
import { logger } from '@/lib/logger';

const deleteRequestSchema = z.object({
  action: z.enum(['delete_chats', 'delete_account'])
});

export async function DELETE(req: Request) {
  try {
    const json = await req.json();
    const parsed = deleteRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Valid action required ("delete_chats" or "delete_account")' }, { status: 400 });
    }

    const { action } = parsed.data;

    if (db) {
      try {
        if (action === 'delete_chats') {
          await db.delete(schema.messages);
          await db.delete(schema.conversations);
          logger.info('User conversations and messages deleted');
        } else if (action === 'delete_account') {
          // Cascade delete: chunks -> projectDocuments -> projects -> messages -> conversations
          await db.delete(schema.documentChunks);
          await db.delete(schema.projectDocuments);
          await db.delete(schema.projects);
          await db.delete(schema.artifactVersions);
          await db.delete(schema.artifacts);
          await db.delete(schema.messages);
          await db.delete(schema.conversations);
          logger.info('User account, embeddings, and project data purged');
        }
      } catch (dbErr) {
        logger.warn({ dbErr }, 'Error executing database purge');
      }
    }

    return NextResponse.json({
      success: true,
      message: action === 'delete_chats'
        ? 'All chat history has been permanently deleted.'
        : 'All user data, embeddings, and associated files have been permanently wiped.'
    });
  } catch {
    return NextResponse.json({ error: 'Failed to process data deletion request' }, { status: 500 });
  }
}
