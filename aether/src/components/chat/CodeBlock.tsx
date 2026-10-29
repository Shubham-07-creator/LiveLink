'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

export interface CodeBlockProps {
  language?: string;
  value: string;
}

export function CodeBlock({ language = 'plaintext', value }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const { success } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      success('Code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="my-3 rounded-input border border-outline overflow-hidden bg-surface-elevated font-mono text-xs">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-surface border-b border-outline text-ink-muted">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-accent font-sans">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-input hover:bg-surface-elevated text-ink-muted hover:text-ink transition-colors duration-150 text-[11px]"
          title="Copy code to clipboard"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-600 font-sans">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="font-sans">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body */}
      <pre className="p-3.5 overflow-x-auto text-ink leading-relaxed">
        <code>{value}</code>
      </pre>
    </div>
  );
}
