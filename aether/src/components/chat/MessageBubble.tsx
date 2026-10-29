'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import { Copy, Check, RotateCw, Trash2, Edit3, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { CodeBlock } from './CodeBlock';
import { ThoughtProcess } from './ThoughtProcess';
import { useToast } from '@/contexts/ToastContext';

export interface MessageData {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  thinkingContent?: string;
  timestamp?: string;
  versions?: string[];
  versionIndex?: number;
}

export interface MessageBubbleProps {
  message: MessageData;
  isStreaming?: boolean;
  onEdit?: (messageId: string, newContent: string) => void;
  onRetry?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onSwitchVersion?: (messageId: string, targetIndex: number) => void;
}

export function MessageBubble({
  message,
  isStreaming = false,
  onEdit,
  onRetry,
  onDelete,
  onSwitchVersion
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const { success } = useToast();

  const isUser = message.sender === 'user';
  const versions = message.versions || [message.content];
  const versionIndex = message.versionIndex ?? versions.length - 1;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      success('Message copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleSaveEdit = () => {
    if (!editText.trim()) return;
    onEdit?.(message.id, editText.trim());
    setIsEditing(false);
  };

  return (
    <div
      className={`group flex flex-col w-full my-3 ${isUser ? 'items-end' : 'items-start'}`}
      role="article"
      aria-label={`${isUser ? 'User' : 'Assistant'} message`}
    >
      {/* Sender indicator & Version Branch Arrows (for user message edits) */}
      <div className="flex items-center gap-2 mb-1 px-1 text-xs text-ink-muted">
        <span className="font-semibold">{isUser ? 'You' : 'Aether'}</span>
        {isUser && versions.length > 1 && (
          <div className="flex items-center gap-1 bg-surface border border-outline rounded-chip px-1.5 py-0.5 text-[11px]">
            <button
              onClick={() => onSwitchVersion?.(message.id, Math.max(0, versionIndex - 1))}
              disabled={versionIndex === 0}
              className="hover:text-ink disabled:opacity-30 disabled:pointer-events-none p-0.5"
              aria-label="Previous version branch"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <span className="font-mono">
              {versionIndex + 1}/{versions.length}
            </span>
            <button
              onClick={() => onSwitchVersion?.(message.id, Math.min(versions.length - 1, versionIndex + 1))}
              disabled={versionIndex === versions.length - 1}
              className="hover:text-ink disabled:opacity-30 disabled:pointer-events-none p-0.5"
              aria-label="Next version branch"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Message Bubble Body */}
      <div
        className={`relative max-w-full sm:max-w-[85%] rounded-card p-4 transition-all duration-150 ${
          isUser
            ? 'bg-accent-subtle text-ink border border-accent/25'
            : 'bg-surface text-ink border border-outline shadow-2xs'
        }`}
      >
        {/* Reasoning / Thought Process block for Assistant */}
        {!isUser && message.thinkingContent && (
          <ThoughtProcess thought={message.thinkingContent} isStreaming={isStreaming} />
        )}

        {isEditing ? (
          <div className="flex flex-col gap-2 min-w-[280px]">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full bg-surface text-ink border border-outline rounded-input p-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-accent"
              rows={3}
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-2.5 py-1 text-xs text-ink-muted hover:text-ink flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-3 py-1 text-xs font-semibold bg-accent-button text-ink-inverse rounded-input shadow-xs hover:bg-accent-button-hover"
              >
                Save & Regenerate
              </button>
            </div>
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none break-words leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');

                  if (!inline && match) {
                    return <CodeBlock language={match[1]} value={codeString} />;
                  }
                  if (!inline) {
                    return <CodeBlock language="plaintext" value={codeString} />;
                  }
                  return (
                    <code className="bg-surface-elevated text-accent font-mono text-[13px] px-1.5 py-0.5 rounded border border-outline" {...props}>
                      {children}
                    </code>
                  );
                },
                table({ children }) {
                  return (
                    <div className="overflow-x-auto my-3 border border-outline rounded-input">
                      <table className="min-w-full divide-y divide-outline text-xs">{children}</table>
                    </div>
                  );
                },
                th({ children }) {
                  return <th className="px-3 py-2 bg-surface font-semibold text-left text-ink">{children}</th>;
                },
                td({ children }) {
                  return <td className="px-3 py-2 border-t border-outline text-ink">{children}</td>;
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Message Action Bar (Copy, Edit, Retry, Delete) */}
      {!isEditing && (
        <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex items-center gap-1 mt-1 text-ink-muted transition-opacity duration-150 px-1">
          <button
            onClick={handleCopy}
            className="p-1 hover:text-ink rounded transition-colors"
            title="Copy message"
            aria-label="Copy message"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {isUser && onEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 hover:text-ink rounded transition-colors"
              title="Edit message (creates branch)"
              aria-label="Edit message"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}

          {!isUser && onRetry && (
            <button
              onClick={() => onRetry(message.id)}
              className="p-1 hover:text-ink rounded transition-colors"
              title="Regenerate response"
              aria-label="Regenerate response"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(message.id)}
              className="p-1 hover:text-rose-500 rounded transition-colors"
              title="Delete message"
              aria-label="Delete message"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
