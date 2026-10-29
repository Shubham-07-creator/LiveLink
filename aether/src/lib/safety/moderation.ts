import { logger } from '../logger';

export interface ModerationReport {
  id: string;
  messageId: string;
  conversationId?: string;
  content: string;
  reason: string;
  reportedAt: string;
  status: 'pending' | 'reviewed' | 'dismissed';
}

// In-memory moderation report store (zero-cost)
const reportsStore: ModerationReport[] = [];

// Lightweight heuristic patterns for zero-cost client & server safety filtering
const SENSITIVE_PATTERNS = [
  /\b(how\s+to\s+build|synthesize|create)\s+(a\s+bomb|explosive|biological\s+weapon|chemical\s+weapon)\b/i,
  /\b(credit\s*card\s*numbers|dump\s*private\s*keys|steal\s*passwords)\b/i
];

export interface SafetyCheckResult {
  flagged: boolean;
  reason?: string;
}

/**
 * Fast, free heuristic safety check run before LLM processing
 */
export function checkSafety(content: string): SafetyCheckResult {
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(content)) {
      logger.warn({ pattern: pattern.toString() }, 'Safety filter triggered on input');
      return {
        flagged: true,
        reason: 'This request touches restricted safety topics (dangerous goods or privacy violations).'
      };
    }
  }

  return { flagged: false };
}

/**
 * Submits a user moderation report for flagged content or shared links
 */
export function submitReport(report: Omit<ModerationReport, 'id' | 'reportedAt' | 'status'>): ModerationReport {
  const newReport: ModerationReport = {
    ...report,
    id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    reportedAt: new Date().toISOString(),
    status: 'pending'
  };

  reportsStore.unshift(newReport);
  // Keep store capped at 200 items in memory
  if (reportsStore.length > 200) {
    reportsStore.pop();
  }

  logger.info({ reportId: newReport.id, reason: report.reason }, 'Moderation report submitted');
  return newReport;
}

export function getRecentReports(): ModerationReport[] {
  return [...reportsStore];
}
