import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';

const createProjectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(500).optional(),
  customInstructions: z.string().max(2000).optional(),
  userId: z.string().optional()
});

export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({
        projects: [
          {
            id: 'demo-p1',
            title: 'Lumina Architecture & Guidelines',
            description: 'Engineering standards, API contracts, and design tokens documentation',
            customInstructions: 'Always adhere to the warm editorial design system tokens and zero-cost constraints.',
            documentCount: 3,
            createdAt: new Date().toISOString()
          }
        ]
      });
    }

    const projectList = await db
      .select()
      .from(schema.projects)
      .orderBy(desc(schema.projects.createdAt));

    return NextResponse.json({ projects: projectList });
  } catch (err) {
    logger.error({ err }, 'Error listing projects');
    return NextResponse.json({ error: 'Failed to retrieve projects' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = createProjectSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const { title, description, customInstructions, userId } = parsed.data;

    if (db) {
      const [newProject] = await db
        .insert(schema.projects)
        .values({
          userId: userId || '00000000-0000-0000-0000-000000000000',
          title: title.trim(),
          description: description?.trim() || null,
          customInstructions: customInstructions?.trim() || null
        })
        .returning();

      return NextResponse.json({ success: true, project: newProject }, { status: 201 });
    }

    return NextResponse.json({
      success: true,
      project: {
        id: `p-${Date.now()}`,
        title,
        description,
        customInstructions,
        createdAt: new Date().toISOString()
      }
    }, { status: 201 });
  } catch (err) {
    logger.error({ err }, 'Error creating project');
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
