import { NextResponse } from 'next/server';
import { z } from 'zod';
import { submitReport } from '@/lib/safety/moderation';

const reportSchema = z.object({
  messageId: z.string().min(1),
  conversationId: z.string().optional(),
  content: z.string().min(1),
  reason: z.string().min(1)
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = reportSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid report data' }, { status: 400 });
    }

    const report = submitReport(parsed.data);
    return NextResponse.json({ success: true, reportId: report.id });
  } catch {
    return NextResponse.json({ error: 'Failed to submit moderation report' }, { status: 500 });
  }
}
