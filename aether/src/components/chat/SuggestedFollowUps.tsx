'use client';

import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export interface SuggestedFollowUpsProps {
  suggestions: string[];
  onSelectSuggestion: (text: string) => void;
}

export function SuggestedFollowUps({ suggestions, onSelectSuggestion }: SuggestedFollowUpsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 my-2 w-full max-w-3xl animate-in fade-in duration-200">
      {suggestions.map((suggestion, idx) => (
        <button
          key={idx}
          onClick={() => onSelectSuggestion(suggestion)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-elevated border border-outline rounded-chip text-xs text-ink-muted hover:text-ink hover:border-accent/40 shadow-2xs transition-all duration-150 active:scale-95 text-left"
        >
          <span className="truncate max-w-xs">{suggestion}</span>
          <ArrowUpRight className="w-3 h-3 text-accent shrink-0" />
        </button>
      ))}
    </div>
  );
}
