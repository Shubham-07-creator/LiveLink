'use client';

import React, { useState, useEffect } from 'react';
import { Zap, AlertTriangle, ShieldAlert } from 'lucide-react';

export function UsageMeter() {
  const [usage, setUsage] = useState<{
    messagesUsed: number;
    messageLimit: number;
    tokensUsed: number;
    tokenLimit: number;
    killSwitchActive: boolean;
  } | null>(null);

  useEffect(() => {
    const fetchUsage = () => {
      fetch('/api/user/usage')
        .then((r) => r.json())
        .then((data) => {
          if (data && typeof data.messagesUsed === 'number') {
            setUsage(data);
          }
        })
        .catch(() => {});
    };

    fetchUsage();
    const interval = setInterval(fetchUsage, 20000);
    return () => clearInterval(interval);
  }, []);

  if (!usage) return null;

  const msgPercent = Math.min(100, Math.round((usage.messagesUsed / (usage.messageLimit || 100)) * 100));
  const isNearLimit = msgPercent >= 80;

  return (
    <div className="px-3 py-2 border-t border-outline/70 bg-surface/50 text-xs font-body">
      {usage.killSwitchActive ? (
        <div className="flex items-center gap-1.5 text-rose-600 bg-rose-500/10 px-2 py-1 rounded-input font-medium">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>Free AI services temporarily paused</span>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between text-ink-muted mb-1 font-mono text-[11px]">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-accent" />
              <span>Daily Quota</span>
            </span>
            <span>
              {usage.messagesUsed} / {usage.messageLimit}
            </span>
          </div>

          <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden border border-outline/40">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                isNearLimit ? 'bg-amber-500' : 'bg-accent'
              }`}
              style={{ width: `${msgPercent}%` }}
            />
          </div>

          {isNearLimit && (
            <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-2.5 h-2.5" />
              <span>Approaching free daily message cap</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
