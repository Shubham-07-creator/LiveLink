'use client';

import React, { useState } from 'react';
import { Database, Trash2, Shield, ExternalLink, X, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '@/contexts/ToastContext';

export interface DataControlsModalProps {
  open: boolean;
  onClose: () => void;
  onDataPurged?: () => void;
}

export function DataControlsModal({ open, onClose, onDataPurged }: DataControlsModalProps) {
  const { success, error: toastError } = useToast();
  const [isDeletingChats, setIsDeletingChats] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  if (!open) return null;

  const handleDeleteChats = async () => {
    if (!confirm('Are you sure you want to delete all conversation history? This cannot be undone.')) return;

    setIsDeletingChats(true);
    try {
      const res = await fetch('/api/user/data', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_chats' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      success(data.message || 'All chat history deleted');
      onDataPurged?.();
      onClose();
    } catch (err: unknown) {
      toastError((err as Error)?.message || 'Failed to delete chats');
    } finally {
      setIsDeletingChats(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        'WARNING: This will permanently delete your account, all project knowledge bases, RAG embeddings, and chats. Confirm?'
      )
    )
      return;

    setIsDeletingAccount(true);
    try {
      const res = await fetch('/api/user/data', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_account' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      success(data.message || 'Account purged');
      onDataPurged?.();
      onClose();
      window.location.reload();
    } catch (err: unknown) {
      toastError((err as Error)?.message || 'Failed to purge account');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-outline rounded-card max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-outline mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-accent" />
            <h3 className="font-heading font-semibold text-base text-ink">Data Controls & Privacy</h3>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5 text-xs font-body">
          {/* Section 1: Provider Training & Data Policy */}
          <div className="p-3.5 rounded-input bg-surface-elevated border border-outline/80 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-ink">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Model Training & Third-Party Providers</span>
            </div>
            <p className="text-ink-muted leading-relaxed">
              Aether runs on zero-cost infrastructure and does <strong>not</strong> train proprietary models on your conversations or uploaded files. However, depending on which provider is configured, requests are handled by external AI APIs under their respective terms:
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <a
                href="https://ai.google.dev/terms"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 p-2 rounded-input border border-outline hover:border-accent text-ink-muted hover:text-ink bg-surface transition-colors"
              >
                <span>Google Gemini API</span>
                <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
              </a>
              <a
                href="https://groq.com/privacy-policy/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 p-2 rounded-input border border-outline hover:border-accent text-ink-muted hover:text-ink bg-surface transition-colors"
              >
                <span>Groq Privacy</span>
                <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
              </a>
              <a
                href="https://openrouter.ai/privacy"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 p-2 rounded-input border border-outline hover:border-accent text-ink-muted hover:text-ink bg-surface transition-colors"
              >
                <span>OpenRouter Terms</span>
                <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
              </a>
              <a
                href="https://ollama.com/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 p-2 rounded-input border border-outline hover:border-accent text-ink-muted hover:text-ink bg-surface transition-colors"
              >
                <span>Ollama (100% Local)</span>
                <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
              </a>
            </div>
          </div>

          {/* Section 2: Data Purge Actions */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between p-3 rounded-input border border-outline bg-surface">
              <div>
                <h4 className="font-semibold text-ink">Clear Conversation History</h4>
                <p className="text-ink-muted text-[11px]">Delete all saved chats while preserving your projects and account.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteChats}
                disabled={isDeletingChats}
                className="shrink-0 text-amber-600 hover:text-amber-700"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                {isDeletingChats ? 'Deleting...' : 'Delete Chats'}
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-input border border-rose-500/30 bg-rose-500/5">
              <div>
                <h4 className="font-semibold text-rose-600 dark:text-rose-400">Purge All Account & Knowledge Data</h4>
                <p className="text-ink-muted text-[11px]">Permanently wipe all conversations, documents, and vector embeddings.</p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="shrink-0 bg-rose-600 hover:bg-rose-700 text-white"
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                {isDeletingAccount ? 'Purging...' : 'Delete All Data'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
