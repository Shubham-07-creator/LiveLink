import { NextResponse } from 'next/server';
import { getAdminMetrics } from '@/lib/telemetry/metrics';
import { getRecentReports } from '@/lib/safety/moderation';

export async function GET() {
  const telemetry = getAdminMetrics();
  const reports = getRecentReports();

  return NextResponse.json({
    ...telemetry,
    reports
  });
}
