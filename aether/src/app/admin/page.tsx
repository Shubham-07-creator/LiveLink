'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Activity,
  ArrowLeft,
  AlertTriangle,
  Server,
  RefreshCw,
  Cpu,
  Clock,
  Flag
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ThemeSelector } from '@/components/layout/ThemeSelector';
import { useToast } from '@/contexts/ToastContext';

interface AdminData {
  totalRequests: number;
  totalTokens: number;
  fallbackCount: number;
  rateLimitCount: number;
  errorCount: number;
  killSwitchActive: boolean;
  providers: Record<string, { requests: number; tokens: number; errors: number; rateLimits: number }>;
  reports: Array<{ id: string; messageId: string; content: string; reason: string; reportedAt: string; status: string }>;
}

export default function AdminDashboardPage() {
  const { success, error: toastError } = useToast();
  const [data, setData] = useState<AdminData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingKillSwitch, setIsTogglingKillSwitch] = useState(false);

  const fetchMetrics = () => {
    setIsLoading(true);
    fetch('/api/admin/metrics')
      .then((r) => r.json())
      .then((res) => setData(res))
      .catch(() => toastError('Could not load telemetry metrics'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleKillSwitch = async () => {
    if (!data) return;
    const targetState = !data.killSwitchActive;
    setIsTogglingKillSwitch(true);
    try {
      const res = await fetch('/api/admin/kill-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: targetState })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setData((prev) => (prev ? { ...prev, killSwitchActive: json.killSwitchActive } : null));
      success(
        json.killSwitchActive
          ? 'EMERGENCY: AI Kill-Switch activated. Free quotas secured.'
          : 'AI Kill-Switch disabled. Streaming re-enabled.'
      );
    } catch {
      toastError('Failed to toggle kill switch');
    } finally {
      setIsTogglingKillSwitch(false);
    }
  };

  return (
    <div className="min-h-screen bg-app text-ink font-body p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-outline gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-input hover:bg-surface-elevated text-ink-muted hover:text-ink transition-colors border border-outline"
              title="Return to Chat"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-xl sm:text-2xl font-bold text-ink tracking-tight">
                  Free-Tier Quota & Telemetry Admin
                </h1>
                <Badge variant="accent">Phase 6 Safety</Badge>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                Real-time usage caps, zero-cost provider health, and emergency controls.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={isLoading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <ThemeSelector />
          </div>
        </header>

        {/* Emergency Kill-Switch Banner */}
        <div
          className={`p-4 rounded-card border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            data?.killSwitchActive
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-400'
          }`}
        >
          <div className="flex items-center gap-3">
            {data?.killSwitchActive ? (
              <ShieldAlert className="w-6 h-6 shrink-0 text-rose-600" />
            ) : (
              <ShieldCheck className="w-6 h-6 shrink-0 text-emerald-600" />
            )}
            <div>
              <h3 className="font-semibold text-sm">
                Global AI Kill-Switch is{' '}
                <span className="uppercase font-bold">{data?.killSwitchActive ? 'Active (Paused)' : 'Disarmed (Normal)'}</span>
              </h3>
              <p className="text-xs opacity-90">
                {data?.killSwitchActive
                  ? 'All upstream AI streaming is blocked immediately to protect free quota tiers from runaway usage.'
                  : 'Requests stream normally within daily limits (100 msgs/day, 150k tokens/day).'}
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleToggleKillSwitch}
            disabled={isTogglingKillSwitch}
            className={`shrink-0 font-medium ${
              data?.killSwitchActive ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            {data?.killSwitchActive ? 'Disarm Kill-Switch' : 'Trigger Kill-Switch'}
          </Button>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-card bg-surface border border-outline shadow-2xs">
            <span className="text-xs text-ink-muted">Total Requests</span>
            <div className="font-heading text-2xl font-bold text-ink mt-1">
              {data?.totalRequests ?? 0}
            </div>
            <span className="text-[11px] text-ink-muted">Since server start</span>
          </div>

          <div className="p-4 rounded-card bg-surface border border-outline shadow-2xs">
            <span className="text-xs text-ink-muted">Estimated Tokens</span>
            <div className="font-heading text-2xl font-bold text-ink mt-1">
              {((data?.totalTokens ?? 0) / 1000).toFixed(1)}k
            </div>
            <span className="text-[11px] text-ink-muted">Free-tier consumption</span>
          </div>

          <div className="p-4 rounded-card bg-surface border border-outline shadow-2xs">
            <span className="text-xs text-ink-muted">429 Rate Limits</span>
            <div className="font-heading text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {data?.rateLimitCount ?? 0}
            </div>
            <span className="text-[11px] text-ink-muted">Automatic backoff handled</span>
          </div>

          <div className="p-4 rounded-card bg-surface border border-outline shadow-2xs">
            <span className="text-xs text-ink-muted">Fallback Invocations</span>
            <div className="font-heading text-2xl font-bold text-accent mt-1">
              {data?.fallbackCount ?? 0}
            </div>
            <span className="text-[11px] text-ink-muted">Graceful failovers</span>
          </div>
        </div>

        {/* Provider Breakdown Table */}
        <div className="p-5 rounded-card bg-surface border border-outline space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold text-base text-ink">Zero-Cost Provider Breakdown</h2>
            <span className="text-xs text-ink-muted font-mono">Zero paid API usage</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-outline text-ink-muted font-mono">
                  <th className="pb-2">Provider</th>
                  <th className="pb-2">Tier</th>
                  <th className="pb-2">Requests</th>
                  <th className="pb-2">Tokens</th>
                  <th className="pb-2">429 Rate Limits</th>
                  <th className="pb-2">Errors</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline/50 font-mono">
                {['gemini', 'groq', 'openrouter', 'ollama'].map((pKey) => {
                  const stat = data?.providers[pKey] || { requests: 0, tokens: 0, errors: 0, rateLimits: 0 };
                  const isHealthy = stat.errors === 0;

                  return (
                    <tr key={pKey} className="hover:bg-surface-elevated/50">
                      <td className="py-2.5 font-sans font-semibold text-ink capitalize">{pKey}</td>
                      <td className="py-2.5 text-ink-muted font-sans">
                        {pKey === 'ollama' ? 'Local / Self-hosted' : 'Free Tier'}
                      </td>
                      <td className="py-2.5">{stat.requests}</td>
                      <td className="py-2.5">{stat.tokens.toLocaleString()}</td>
                      <td className="py-2.5">{stat.rateLimits}</td>
                      <td className="py-2.5">{stat.errors}</td>
                      <td className="py-2.5 font-sans">
                        <Badge variant={isHealthy ? 'accent' : 'outline'}>
                          {isHealthy ? 'Operational' : 'Degraded'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Moderation Reports Table */}
        <div className="p-5 rounded-card bg-surface border border-outline space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-rose-600" />
              <h2 className="font-heading font-semibold text-base text-ink">User Moderation & Safety Reports</h2>
            </div>
            <span className="text-xs text-ink-muted font-mono">
              {data?.reports?.length || 0} reports recorded
            </span>
          </div>

          {(!data?.reports || data.reports.length === 0) ? (
            <p className="text-xs text-ink-muted py-6 text-center">No moderation reports submitted yet.</p>
          ) : (
            <div className="space-y-2">
              {data.reports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-3 rounded-input border border-outline bg-surface-elevated text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-1 max-w-xl">
                    <span className="font-semibold text-rose-600 block">{rep.reason}</span>
                    <p className="text-ink-muted line-clamp-1 font-mono text-[11px]">{rep.content}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-ink-muted font-mono">
                      {new Date(rep.reportedAt).toLocaleTimeString()}
                    </span>
                    <Badge variant="outline">{rep.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
