import { NextResponse } from 'next/server';
import { z } from 'zod';
import { setKillSwitch, isKillSwitchActive } from '@/lib/telemetry/metrics';

const killSwitchSchema = z.object({
  active: z.boolean()
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = killSwitchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Active boolean flag required' }, { status: 400 });
    }

    setKillSwitch(parsed.data.active);
    return NextResponse.json({
      success: true,
      killSwitchActive: isKillSwitchActive()
    });
  } catch {
    return NextResponse.json({ error: 'Failed to update kill-switch status' }, { status: 500 });
  }
}
