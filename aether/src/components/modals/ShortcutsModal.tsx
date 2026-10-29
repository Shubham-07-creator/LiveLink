'use client';

import React from 'react';
import { Keyboard, X } from 'lucide-react';

export interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  if (!open) return null;

  const shortcuts = [
    { key: 'Ctrl + K', description: 'Search conversations and content' },
    { key: 'Ctrl + Shift + O', description: 'Start a new conversation' },
    { key: 'Esc', description: 'Stop streaming generation or close active modals' },
    { key: 'Shift + Enter', description: 'Insert newline in prompt composer' },
    { key: 'Enter', description: 'Send prompt message' },
    { key: '?', description: 'Open this keyboard shortcuts cheat-sheet' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-outline rounded-card max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-outline mb-4">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-accent" />
            <h3 className="font-heading font-semibold text-base text-ink">Keyboard Shortcuts</h3>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          {shortcuts.map((sc, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-outline/50">
              <span className="text-ink-muted">{sc.description}</span>
              <kbd className="px-2 py-0.5 rounded-input bg-surface-elevated border border-outline font-mono text-[11px] font-semibold text-ink shadow-2xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
