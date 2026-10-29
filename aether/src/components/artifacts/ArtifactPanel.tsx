'use client';

import React, { useState } from 'react';
import {
  Eye,
  Code2,
  History,
  Terminal,
  Download,
  Copy,
  Check,
  X,
  Share2,
  Wand2,
  ExternalLink
} from 'lucide-react';
import { PreviewSandbox, type ConsoleLog } from './PreviewSandbox';
import { VersionHistory, type ArtifactVersionItem } from './VersionHistory';
import { useToast } from '@/contexts/ToastContext';
import type { ArtifactMeta } from '@/lib/artifacts/parser';

export interface ArtifactPanelProps {
  meta: ArtifactMeta;
  code: string;
  versions?: ArtifactVersionItem[];
  currentVersion?: number;
  onClose: () => void;
  onRestoreVersion?: (ver: number) => void;
  onFixWithAI?: (errorMessage: string, currentCode: string) => void;
}

export function ArtifactPanel({
  meta,
  code,
  versions = [{ version: 1, content: code, timestamp: 'Just now' }],
  currentVersion = 1,
  onClose,
  onRestoreVersion,
  onFixWithAI
}: ArtifactPanelProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'versions' | 'console'>('preview');
  const [copied, setCopied] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const { success } = useToast();

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      success('Artifact code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownload = () => {
    const ext = meta.type.includes('react')
      ? 'tsx'
      : meta.type.includes('html')
      ? 'html'
      : meta.type.includes('svg')
      ? 'svg'
      : meta.type.includes('markdown')
      ? 'md'
      : meta.language || 'txt';

    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${meta.identifier}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    success(`Downloaded ${meta.identifier}.${ext}`);
  };

  const hasErrors = consoleLogs.some((l) => l.level === 'error');
  const lastError = consoleLogs.filter((l) => l.level === 'error').pop();

  return (
    <div
      className="flex flex-col h-full bg-surface border-l border-outline shadow-xl z-30 select-none overflow-hidden"
      role="region"
      aria-label={`Artifact preview: ${meta.title}`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-outline bg-surface-elevated shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-heading font-semibold text-sm text-ink truncate">{meta.title}</h3>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-chip bg-surface text-ink-muted border border-outline">
            v{currentVersion}
          </span>
        </div>

        {/* Global Panel Actions (Download, Copy, Close) */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopyCode}
            className="p-1.5 text-ink-muted hover:text-ink rounded-input hover:bg-surface transition-colors"
            title="Copy code"
            aria-label="Copy code"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 text-ink-muted hover:text-ink rounded-input hover:bg-surface transition-colors"
            title="Download file"
            aria-label="Download file"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-ink-muted hover:text-ink rounded-input hover:bg-surface transition-colors ml-1"
            title="Close panel"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center px-4 border-b border-outline bg-surface text-xs font-medium gap-1 shrink-0">
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-1.5 py-2 px-3 border-b-2 transition-colors ${
            activeTab === 'preview'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Preview</span>
        </button>

        <button
          onClick={() => setActiveTab('code')}
          className={`flex items-center gap-1.5 py-2 px-3 border-b-2 transition-colors ${
            activeTab === 'code'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Code</span>
        </button>

        <button
          onClick={() => setActiveTab('versions')}
          className={`flex items-center gap-1.5 py-2 px-3 border-b-2 transition-colors ${
            activeTab === 'versions'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Versions ({versions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('console')}
          className={`flex items-center gap-1.5 py-2 px-3 border-b-2 transition-colors ${
            activeTab === 'console'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Console</span>
          {hasErrors && (
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 animate-ping" />
          )}
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 min-h-0 relative bg-surface">
        {activeTab === 'preview' && (
          <PreviewSandbox
            type={meta.type}
            code={code}
            onConsoleLog={(log) => setConsoleLogs((prev) => [...prev, log])}
          />
        )}

        {activeTab === 'code' && (
          <div className="h-full overflow-auto p-4 font-mono text-xs leading-relaxed bg-surface text-ink select-text">
            <pre>
              <code>{code}</code>
            </pre>
          </div>
        )}

        {activeTab === 'versions' && (
          <VersionHistory
            versions={versions}
            currentVersion={currentVersion}
            onRestoreVersion={(v) => onRestoreVersion?.(v)}
          />
        )}

        {activeTab === 'console' && (
          <div className="flex flex-col h-full bg-surface text-xs font-mono">
            {/* Fix with AI Banner (if console has error) */}
            {lastError && onFixWithAI && (
              <div className="p-3 bg-rose-500/10 border-b border-rose-500/30 flex items-center justify-between">
                <span className="text-rose-600 truncate mr-2 font-sans font-medium text-xs">
                  Error: {lastError.message}
                </span>
                <button
                  onClick={() => onFixWithAI(lastError.message, code)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-accent-button hover:bg-accent-button-hover text-ink-inverse rounded-input shadow-xs shrink-0 font-sans font-semibold transition-all"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Fix with AI</span>
                </button>
              </div>
            )}

            <div className="flex-1 p-3 overflow-y-auto space-y-1.5">
              {consoleLogs.length === 0 ? (
                <p className="text-ink-muted italic">No console logs recorded.</p>
              ) : (
                consoleLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-start gap-2 py-1 px-2 rounded ${
                      log.level === 'error'
                        ? 'bg-rose-500/10 text-rose-600'
                        : log.level === 'warn'
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'text-ink'
                    }`}
                  >
                    <span className="text-[10px] text-ink-muted shrink-0">{log.timestamp}</span>
                    <span className="font-semibold uppercase text-[10px] shrink-0">[{log.level}]</span>
                    <span className="break-all">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
