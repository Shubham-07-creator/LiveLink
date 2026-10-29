'use client';

import React, { useState } from 'react';
import { Share2, Download, Copy, Check, X, Globe, Shield, Flag } from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '@/contexts/ToastContext';
import type { MessageData } from '../chat/MessageBubble';

export interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  conversationTitle: string;
  messages: MessageData[];
}

export function ShareModal({ open, onClose, conversationTitle, messages }: ShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const { success } = useToast();

  if (!open) return null;

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/share/c-${Date.now()}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    success('Public share link copied to clipboard');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleExportMarkdown = () => {
    let md = `# ${conversationTitle}\n\n`;
    messages.forEach((m) => {
      md += `### ${m.sender === 'user' ? 'User' : 'Aether'}\n\n${m.content}\n\n---\n\n`;
    });
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conversationTitle.toLowerCase().replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    success('Exported conversation as Markdown (.md)');
  };

  const handleExportJSON = () => {
    const data = {
      title: conversationTitle,
      exportedAt: new Date().toISOString(),
      messages: messages.map((m) => ({
        sender: m.sender,
        content: m.content,
        timestamp: m.timestamp
      }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conversationTitle.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    success('Exported conversation as JSON (.json)');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-outline rounded-card max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-outline mb-4">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-accent" />
            <h3 className="font-heading font-semibold text-base text-ink">Share & Export Chat</h3>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Public Link Share */}
        <div className="p-4 bg-surface-elevated border border-outline rounded-input mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-accent" />
              <span>Public Read-Only Link</span>
            </span>
            <button
              onClick={() => setIsPublic((p) => !p)}
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-chip transition-colors ${
                isPublic ? 'bg-emerald-600 text-white' : 'bg-surface text-ink-muted border border-outline'
              }`}
            >
              {isPublic ? 'Active' : 'Private'}
            </button>
          </div>

          <p className="text-[11px] text-ink-muted mb-3 leading-relaxed">
            Anyone with this link can read this conversation and view its interactive artifacts. You can revoke it anytime.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={isPublic ? publicUrl : 'Enable link sharing above to generate URL'}
              className="flex-1 bg-surface text-ink text-xs px-2.5 py-1.5 rounded-input border border-outline font-mono truncate select-all"
            />
            <Button variant="secondary" size="sm" onClick={handleCopyLink} disabled={!isPublic}>
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </Button>
          </div>
        </div>

        {/* Export Options */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-ink">Download Conversation</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExportMarkdown}
              className="p-2.5 bg-surface hover:bg-surface-elevated border border-outline rounded-input flex items-center justify-center gap-1.5 text-xs text-ink transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-accent" />
              <span>Markdown (.md)</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="p-2.5 bg-surface hover:bg-surface-elevated border border-outline rounded-input flex items-center justify-center gap-1.5 text-xs text-ink transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-accent" />
              <span>JSON (.json)</span>
            </button>
          </div>
        </div>

        {/* Safety & Report Footer */}
        <div className="mt-4 pt-3 border-t border-outline flex items-center justify-between text-[11px] text-ink-muted">
          <span>Read-only link</span>
          <button
            onClick={() => {
              const reason = prompt('Please specify reason for reporting this shared conversation:');
              if (reason) {
                fetch('/api/safety/report', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    messageId: `shared-${Date.now()}`,
                    content: `Report on shared link: ${publicUrl}`,
                    reason
                  })
                })
                  .then(() => success('Report submitted for review'))
                  .catch(() => {});
              }
            }}
            className="hover:text-rose-600 transition-colors flex items-center gap-1 text-[10px]"
          >
            <Flag className="w-3 h-3 text-rose-500" />
            <span>Report shared link</span>
          </button>
        </div>
      </div>
    </div>
  );
}
