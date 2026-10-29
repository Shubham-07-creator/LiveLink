'use client';

import React, { useRef, useState, useEffect, type KeyboardEvent } from 'react';
import { Paperclip, ArrowUp, X, FileText, Zap, Sparkles, StopCircle } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { VoiceInput } from './VoiceInput';

export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content?: string;
}

export interface ChatComposerProps {
  onSendMessage: (text: string, modelTier: 'fast' | 'smart', files: AttachedFile[]) => void;
  isStreaming?: boolean;
  onStopStreaming?: () => void;
  fastModelName?: string;
  smartModelName?: string;
  placeholder?: string;
}

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md', '.csv', '.json', '.js', '.py', '.png', '.jpg', '.jpeg'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function ChatComposer({
  onSendMessage,
  isStreaming = false,
  onStopStreaming,
  fastModelName = 'Fast',
  smartModelName = 'Smart',
  placeholder = 'Ask a question, describe a design, or write code...'
}: ChatComposerProps) {
  const [input, setInput] = useState('');
  const [modelTier, setModelTier] = useState<'fast' | 'smart'>('smart');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { warning, error } = useToast();

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: AttachedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        warning(`File "${file.name}" is not a supported file type. Allowed: PDF, DOCX, TXT, MD, Code, CSV, Images.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        error(`File "${file.name}" exceeds the 5 MB free tier upload limit.`);
        continue;
      }

      newFiles.push({
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: file.size,
        type: file.type
      });
    }

    setAttachedFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = () => {
    if ((!input.trim() && attachedFiles.length === 0) || isStreaming) return;
    onSendMessage(input.trim(), modelTier, attachedFiles);
    setInput('');
    setAttachedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4">
      <div className="bg-surface border border-outline rounded-card p-3 shadow-sm transition-all duration-200 focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/10">
        {/* Attached Files Carousel */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-outline">
            {attachedFiles.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-elevated border border-outline rounded-input text-xs text-ink"
              >
                <FileText className="w-3.5 h-3.5 text-accent" />
                <span className="font-medium truncate max-w-[150px]">{f.name}</span>
                <span className="text-ink-muted text-[10px]">({formatFileSize(f.size)})</span>
                <button
                  type="button"
                  onClick={() => removeFile(f.id)}
                  className="hover:text-rose-500 text-ink-muted ml-1 p-0.5"
                  aria-label={`Remove ${f.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="w-full bg-transparent text-ink placeholder:text-ink-muted text-sm resize-none focus:outline-none min-h-[44px] max-h-[220px] leading-relaxed"
          aria-label="Prompt composer input"
        />

        {/* Action Controls Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-outline/50 mt-1">
          {/* Left Controls: File Attachment & Model Tier Selector */}
          <div className="flex items-center gap-1.5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden"
              accept=".pdf,.docx,.txt,.md,.csv,.json,.js,.py,.png,.jpg,.jpeg"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-ink-muted hover:text-ink hover:bg-surface-elevated rounded-input transition-colors duration-150"
              title="Attach document or code (max 5 MB)"
              aria-label="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Voice Input (Web Speech API Beta) */}
            <VoiceInput onTranscript={(txt) => setInput((prev) => prev + (prev ? ' ' : '') + txt)} />

            {/* Model Selector Pill */}
            <div className="flex items-center bg-surface-elevated border border-outline rounded-chip p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setModelTier('fast')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-chip transition-all duration-150 ${
                  modelTier === 'fast'
                    ? 'bg-accent-button text-ink-inverse font-semibold shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
                title={`Fast tier: ${fastModelName}`}
              >
                <Zap className="w-3 h-3" />
                <span>Fast</span>
              </button>
              <button
                type="button"
                onClick={() => setModelTier('smart')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-chip transition-all duration-150 ${
                  modelTier === 'smart'
                    ? 'bg-accent-button text-ink-inverse font-semibold shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
                title={`Smart tier: ${smartModelName}`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Smart</span>
              </button>
            </div>
          </div>

          {/* Right Controls: Send / Stop */}
          <div className="flex items-center gap-2">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-button text-xs font-semibold shadow-sm transition-all duration-150"
                aria-label="Stop generating response"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!input.trim() && attachedFiles.length === 0}
                className="p-2 bg-accent-button hover:bg-accent-button-hover disabled:opacity-40 disabled:pointer-events-none text-ink-inverse rounded-button shadow-sm transition-all duration-150 active:scale-95"
                aria-label="Send prompt"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-ink-muted text-center mt-2 font-body">
        Aether is powered by zero-cost open models. Verify critical outputs.
      </p>
    </div>
  );
}
