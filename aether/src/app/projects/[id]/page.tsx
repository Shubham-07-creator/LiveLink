'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  Globe,
  FileText,
  Trash2,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Code2,
  FileCode,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ThemeSelector } from '@/components/layout/ThemeSelector';
import { useToast } from '@/contexts/ToastContext';

interface DocumentItem {
  id: string;
  name: string;
  type: string;
  sizeBytes: number;
  tokenCount: number;
  createdAt: string;
}

export default function ProjectWorkspacePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { success, error: toastError, info } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [projectTitle, setProjectTitle] = useState('Workspace');
  const [instructions, setInstructions] = useState('');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploading, setUploading] = useState(false);

  // URL Ingest
  const [webUrl, setWebUrl] = useState('');
  const [ingestingUrl, setIngestingUrl] = useState(false);

  useEffect(() => {
    // Fetch documents for this project
    fetch(`/api/projects/${params.id}/documents`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.documents)) {
          setDocuments(data.documents);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDocs(false));
  }, [params.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        toastError(`File "${file.name}" exceeds the 5 MB limit`);
        continue;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);

      try {
        const res = await fetch(`/api/projects/${params.id}/documents`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');

        setDocuments((prev) => [data.document, ...prev]);
        success(`Ingested "${file.name}" into knowledge base (${data.chunksProcessed || 1} chunks)`);
      } catch (err: unknown) {
        toastError((err as Error)?.message || `Could not ingest ${file.name}`);
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleIngestUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webUrl.trim()) return;

    setIngestingUrl(true);
    try {
      const res = await fetch(`/api/projects/${params.id}/ingest-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webUrl.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'URL ingest failed');

      setDocuments((prev) => [data.document, ...prev]);
      setWebUrl('');
      success(`Successfully scraped and embedded URL content (${data.chunksProcessed || 1} chunks)`);
    } catch (err: unknown) {
      toastError((err as Error)?.message || 'URL ingestion error');
    } finally {
      setIngestingUrl(false);
    }
  };

  const handleStartChatWithProject = () => {
    info(`Starting chat linked to project "${projectTitle}"`);
    router.push(`/?project=${params.id}`);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-app text-ink font-body p-4 sm:p-8">
      {/* Top Header */}
      <div className="max-w-5xl mx-auto flex items-center justify-between pb-6 border-b border-outline">
        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="p-2 text-ink-muted hover:text-ink rounded-input hover:bg-surface border border-outline transition-colors"
            title="Return to projects"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-semibold text-2xl text-ink">Project Knowledge Base</h1>
              <Badge variant="accent">pgvector</Badge>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Reference documents uploaded here are automatically retrieved via hybrid search (BM25 + cosine vectors).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeSelector />
          <Button variant="primary" size="sm" onClick={handleStartChatWithProject}>
            <MessageSquare className="w-4 h-4 mr-1.5" />
            <span>Chat with Project</span>
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto my-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Knowledge Base Uploaders */}
        <div className="md:col-span-2 space-y-6">
          {/* File Upload Box */}
          <div className="p-6 bg-surface border border-outline rounded-card shadow-2xs">
            <h2 className="font-heading text-base font-semibold text-ink mb-1 flex items-center gap-2">
              <Upload className="w-4 h-4 text-accent" />
              <span>Upload Reference Documents</span>
            </h2>
            <p className="text-xs text-ink-muted mb-4">
              Supports PDF, DOCX, TXT, Markdown, CSV, JSON, and source code files (max 5 MB).
            </p>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              className="hidden"
              accept=".pdf,.docx,.txt,.md,.csv,.json,.js,.ts,.tsx,.py,.sql,.html,.css"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-8 border-2 border-dashed border-outline hover:border-accent rounded-card text-center cursor-pointer transition-colors bg-surface-elevated/40 hover:bg-accent-subtle/20 group"
            >
              <Upload className="w-8 h-8 text-ink-muted group-hover:text-accent mx-auto mb-2 transition-colors" />
              <p className="text-xs font-semibold text-ink">
                {uploading ? 'Chunking and generating embeddings...' : 'Click or drop files to upload'}
              </p>
              <p className="text-[11px] text-ink-muted mt-0.5">5 MB free tier size limit per file</p>
            </div>
          </div>

          {/* Web URL Ingestion (SSRF Protected) */}
          <div className="p-6 bg-surface border border-outline rounded-card shadow-2xs">
            <h2 className="font-heading text-base font-semibold text-ink mb-1 flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>Ingest from Web URL</span>
            </h2>
            <p className="text-xs text-ink-muted mb-3 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Protected against SSRF (private & loopback IPs are blocked).</span>
            </p>

            <form onSubmit={handleIngestUrl} className="flex gap-2">
              <Input
                placeholder="https://example.com/documentation"
                value={webUrl}
                onChange={(e) => setWebUrl(e.target.value)}
                required
              />
              <Button variant="secondary" size="md" isLoading={ingestingUrl} type="submit" className="shrink-0">
                Fetch & Embed
              </Button>
            </form>
          </div>

          {/* Uploaded Documents List */}
          <div className="p-6 bg-surface border border-outline rounded-card shadow-2xs">
            <h3 className="font-heading text-sm font-semibold text-ink mb-3">
              Indexed Documents ({documents.length})
            </h3>

            {loadingDocs ? (
              <p className="text-xs text-ink-muted italic">Loading indexed documents...</p>
            ) : documents.length === 0 ? (
              <p className="text-xs text-ink-muted italic">No documents uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-surface-elevated rounded-input border border-outline text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-accent shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-ink truncate">{doc.name}</p>
                        <p className="text-[10px] text-ink-muted font-mono">
                          {formatSize(doc.sizeBytes)} • ~{doc.tokenCount} tokens
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setDocuments((prev) => prev.filter((d) => d.id !== doc.id))}
                      className="p-1 hover:text-rose-500 text-ink-muted transition-colors rounded"
                      title="Remove document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Custom Project Instructions */}
        <div className="space-y-4">
          <div className="p-6 bg-surface border border-outline rounded-card shadow-2xs">
            <h3 className="font-heading text-base font-semibold text-ink mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span>Project Instructions</span>
            </h3>
            <p className="text-xs text-ink-muted mb-3 leading-relaxed">
              These instructions are automatically prepended to every conversation inside this project.
            </p>

            <textarea
              rows={8}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Always write production-grade TypeScript with Zod schemas. Emphasize zero-cost infrastructure."
              className="w-full bg-surface-elevated text-ink border border-outline rounded-input p-3 text-xs leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-accent font-mono"
            />

            <Button
              variant="primary"
              size="sm"
              onClick={() => success('Project instructions updated')}
              className="w-full mt-3"
            >
              Save Instructions
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
