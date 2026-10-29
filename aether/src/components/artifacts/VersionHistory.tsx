'use client';

import React, { useState } from 'react';
import { History, RotateCcw, GitCompare, Check } from 'lucide-react';

export interface ArtifactVersionItem {
  version: number;
  content: string;
  timestamp: string;
  commitMessage?: string;
}

export interface VersionHistoryProps {
  versions: ArtifactVersionItem[];
  currentVersion: number;
  onRestoreVersion: (versionNumber: number) => void;
}

export function VersionHistory({ versions, currentVersion, onRestoreVersion }: VersionHistoryProps) {
  const [diffMode, setDiffMode] = useState(false);
  const [selectedVersionForDiff, setSelectedVersionForDiff] = useState<number>(
    Math.max(1, currentVersion - 1)
  );

  const currentContent = versions.find((v) => v.version === currentVersion)?.content || '';
  const diffContent = versions.find((v) => v.version === selectedVersionForDiff)?.content || '';

  return (
    <div className="flex flex-col h-full bg-surface text-ink text-xs font-sans">
      {/* Top Controls */}
      <div className="flex items-center justify-between p-3 border-b border-outline bg-surface-elevated">
        <div className="flex items-center gap-1.5 font-semibold">
          <History className="w-4 h-4 text-accent" />
          <span>Version History ({versions.length} revisions)</span>
        </div>
        <button
          onClick={() => setDiffMode((prev) => !prev)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-input border transition-colors ${
            diffMode
              ? 'bg-accent-button text-ink-inverse border-transparent'
              : 'bg-surface border-outline text-ink-muted hover:text-ink'
          }`}
        >
          <GitCompare className="w-3.5 h-3.5" />
          <span>{diffMode ? 'Exit Diff' : 'Compare Diff'}</span>
        </button>
      </div>

      {diffMode ? (
        /* Diff Comparison View */
        <div className="flex-1 flex flex-col p-4 overflow-y-auto font-mono text-[11px]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-outline">
            <span className="text-ink-muted">Comparing v{selectedVersionForDiff} against v{currentVersion}</span>
            <select
              value={selectedVersionForDiff}
              onChange={(e) => setSelectedVersionForDiff(Number(e.target.value))}
              className="bg-surface text-ink border border-outline rounded px-2 py-1"
            >
              {versions
                .filter((v) => v.version !== currentVersion)
                .map((v) => (
                  <option key={v.version} value={v.version}>
                    Compare with v{v.version}
                  </option>
                ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3 h-full">
            <div className="border border-outline rounded p-2 bg-rose-50/20 dark:bg-rose-950/20 overflow-auto">
              <p className="font-sans font-semibold text-rose-600 mb-1">Previous (v{selectedVersionForDiff}):</p>
              <pre className="whitespace-pre-wrap">{diffContent}</pre>
            </div>
            <div className="border border-outline rounded p-2 bg-emerald-50/20 dark:bg-emerald-950/20 overflow-auto">
              <p className="font-sans font-semibold text-emerald-600 mb-1">Current (v{currentVersion}):</p>
              <pre className="whitespace-pre-wrap">{currentContent}</pre>
            </div>
          </div>
        </div>
      ) : (
        /* Linear Version List */
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {versions.map((item) => {
            const isCurrent = item.version === currentVersion;
            return (
              <div
                key={item.version}
                className={`p-3 rounded-card border transition-all ${
                  isCurrent
                    ? 'border-accent bg-accent-subtle/30 shadow-2xs'
                    : 'border-outline bg-surface hover:bg-surface-elevated'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-ink">v{item.version}</span>
                    {isCurrent && (
                      <span className="text-[10px] font-semibold bg-accent-button text-ink-inverse px-1.5 py-0.2 rounded-chip flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" /> current
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-ink-muted">{item.timestamp}</span>
                </div>

                <p className="text-ink-muted text-[11px] font-mono truncate mb-2">
                  {item.commitMessage || `${item.content.length} characters`}
                </p>

                {!isCurrent && (
                  <button
                    onClick={() => onRestoreVersion(item.version)}
                    className="flex items-center gap-1 text-[11px] font-medium text-accent hover:text-accent-hover transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restore this version</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
