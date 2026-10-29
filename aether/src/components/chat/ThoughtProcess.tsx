'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, BrainCircuit, Check } from 'lucide-react';

export interface ThoughtProcessProps {
  thought: string;
  isStreaming?: boolean;
}

export function ThoughtProcess({ thought, isStreaming = false }: ThoughtProcessProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!thought || !thought.trim()) return null;

  return (
    <div className="mb-3 border border-outline rounded-input bg-surface-elevated overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-3 py-2 text-ink-muted hover:text-ink transition-colors bg-surface select-none"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-3.5 h-3.5 text-accent animate-pulse" />
          <span className="font-semibold text-ink">Thought process</span>
          {isStreaming ? (
            <span className="text-[10px] text-accent font-medium px-1.5 py-0.2 rounded-chip bg-accent-subtle">
              Thinking...
            </span>
          ) : (
            <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
              <Check className="w-3 h-3" /> complete
            </span>
          )}
        </div>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <div className="p-3 border-t border-outline text-ink-muted text-xs leading-relaxed font-mono whitespace-pre-wrap max-h-60 overflow-y-auto bg-surface-elevated/40">
          {thought}
        </div>
      )}
    </div>
  );
}
