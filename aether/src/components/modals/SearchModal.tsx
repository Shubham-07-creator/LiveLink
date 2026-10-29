'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, Star, Archive, MessageSquare, Sparkles } from 'lucide-react';
import type { ConversationItem } from '../layout/Sidebar';

export interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  conversations: ConversationItem[];
  onSelectChat: (id: string) => void;
}

export function SearchModal({ open, onClose, conversations, onSelectChat }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'starred' | 'archived'>('all');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) onClose();
      }
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const filtered = conversations.filter((c) => {
    const matchesQuery = c.title.toLowerCase().includes(query.toLowerCase());
    if (filter === 'starred') return matchesQuery && c.isStarred;
    return matchesQuery;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div className="bg-surface border border-outline rounded-card max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-outline gap-2.5">
          <Search className="w-4 h-4 text-ink-muted shrink-0" />
          <input
            type="text"
            placeholder="Search conversations by title or topic..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 text-ink-muted hover:text-ink rounded"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 px-4 py-2 bg-surface-elevated border-b border-outline text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-chip transition-colors ${
              filter === 'all' ? 'bg-accent-button text-ink-inverse font-semibold' : 'text-ink-muted hover:text-ink'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('starred')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-chip transition-colors ${
              filter === 'starred' ? 'bg-accent-button text-ink-inverse font-semibold' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Star className="w-3 h-3" />
            <span>Starred</span>
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <p className="text-center text-xs text-ink-muted py-8">No matching conversations found</p>
          ) : (
            filtered.map((chat) => (
              <div
                key={chat.id}
                onClick={() => {
                  onSelectChat(chat.id);
                  onClose();
                }}
                className="flex items-center justify-between p-2.5 rounded-input hover:bg-surface-elevated cursor-pointer transition-colors group text-xs text-ink"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MessageSquare className="w-4 h-4 text-accent shrink-0" />
                  <span className="truncate font-medium">{chat.title}</span>
                </div>
                {chat.isStarred && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
