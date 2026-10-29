import { NextResponse } from 'next/server';
import { checkDailyUsage } from '@/lib/rate-limit/limiter';
import { isKillSwitchActive } from '@/lib/telemetry/metrics';

export async function GET(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const usage = await checkDailyUsage(`user:${ip}`, 0);

  return NextResponse.json({
    allowed: usage.allowed,
    messagesUsed: usage.messagesUsed,
    tokensUsed: usage.tokensUsed,
    messageLimit: usage.messageLimit,
    tokenLimit: usage.tokenLimit,
    resetAt: usage.resetAt,
    killSwitchActive: isKillSwitchActive()
  });
}
