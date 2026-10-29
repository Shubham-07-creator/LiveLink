'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FolderKanban,
  Plus,
  ArrowLeft,
  FileText,
  Brain,
  Trash2,
  Edit2,
  Users,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ThemeSelector } from '@/components/layout/ThemeSelector';
import { useToast } from '@/contexts/ToastContext';

interface ProjectItem {
  id: string;
  title: string;
  description?: string;
  customInstructions?: string;
  documentCount?: number;
  role?: 'owner' | 'editor' | 'viewer';
  createdAt?: string;
}

export default function ProjectsPage() {
  const { success, error: toastError, info } = useToast();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New project state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newInstructions, setNewInstructions] = useState('');

  // Memory state (Viewable, editable, deletable with toggle switch)
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [memories, setMemories] = useState<string[]>([
    'Prefers clean TypeScript code without classes where functions suffice',
    'Uses Tailwind CSS and warm editorial design tokens',
    'Always emphasizes zero-cost free-tier architectures'
  ]);
  const [newMemory, setNewMemory] = useState('');

  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.projects)) {
          setProjects(data.projects);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          customInstructions: newInstructions.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create project');

      setProjects((prev) => [data.project, ...prev]);
      setCreateModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewInstructions('');
      success('Project created successfully!');
    } catch (err: unknown) {
      toastError((err as Error)?.message || 'Could not create project');
    }
  };

  const handleAddMemory = () => {
    if (!newMemory.trim()) return;
    setMemories((prev) => [...prev, newMemory.trim()]);
    setNewMemory('');
    success('Memory saved');
  };

  const handleDeleteMemory = (index: number) => {
    setMemories((prev) => prev.filter((_, i) => i !== index));
    info('Memory removed');
  };

  return (
    <div className="min-h-screen bg-app text-ink font-body p-4 sm:p-8">
      {/* Top Header */}
      <div className="max-w-5xl mx-auto flex items-center justify-between pb-6 border-b border-outline">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 text-ink-muted hover:text-ink rounded-input hover:bg-surface border border-outline transition-colors"
            title="Return to chat"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-heading font-semibold text-2xl text-ink">Projects & Knowledge Base</h1>
            <p className="text-xs text-ink-muted mt-0.5 font-body">
              Organize dedicated workspaces with uploaded reference documents, custom instructions, and team roles.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeSelector />
          <Button variant="primary" size="sm" onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            <span>New project</span>
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto my-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Projects List */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="font-heading text-lg font-semibold text-ink flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-accent" />
            <span>Active Projects ({projects.length})</span>
          </h2>

          {loading ? (
            <p className="text-xs text-ink-muted italic">Loading projects...</p>
          ) : projects.length === 0 ? (
            <div className="p-8 border border-dashed border-outline rounded-card text-center bg-surface">
              <FolderKanban className="w-8 h-8 text-ink-muted mx-auto mb-2" />
              <p className="text-sm font-semibold text-ink">No projects created yet</p>
              <p className="text-xs text-ink-muted mt-1">Create a project to attach knowledge base files and custom system instructions.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {projects.map((proj) => (
                <Link
                  key={proj.id}
                  href={`/projects/${proj.id}`}
                  className="p-4 bg-surface hover:bg-surface-elevated border border-outline rounded-card flex flex-col justify-between transition-all duration-150 hover:border-accent/50 shadow-2xs group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-input bg-accent-subtle text-accent flex items-center justify-center font-bold text-xs">
                        <FolderKanban className="w-4 h-4" />
                      </div>
                      <Badge variant="accent">
                        <Users className="w-3 h-3 mr-1" />
                        {proj.role || 'Owner'}
                      </Badge>
                    </div>

                    <h3 className="font-heading text-base font-semibold text-ink group-hover:text-accent transition-colors truncate">
                      {proj.title}
                    </h3>
                    <p className="text-xs text-ink-muted mt-1 line-clamp-2 leading-relaxed">
                      {proj.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-outline flex items-center justify-between text-[11px] text-ink-muted">
                    <span className="flex items-center gap-1 font-mono">
                      <FileText className="w-3.5 h-3.5 text-accent" />
                      {proj.documentCount ?? 0} docs
                    </span>
                    <span className="text-accent font-medium group-hover:translate-x-0.5 transition-transform">
                      Open workspace &rarr;
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: AI Memory Control Panel */}
        <div className="space-y-4">
          <div className="p-5 bg-surface border border-outline rounded-card shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-outline">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-accent" />
                <h3 className="font-heading font-semibold text-sm text-ink">Assistant Memory</h3>
              </div>
              {/* On/Off Switch */}
              <button
                type="button"
                onClick={() => setMemoryEnabled((prev) => !prev)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-chip transition-colors duration-200 focus:outline-none ${
                  memoryEnabled ? 'bg-accent-button' : 'bg-outline-strong'
                }`}
                role="switch"
                aria-checked={memoryEnabled}
              >
                <span
                  className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                    memoryEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <p className="text-xs text-ink-muted mt-2 leading-relaxed">
              Memories carry across chats to retain user preferences. You can inspect, edit, or delete them anytime.
            </p>

            {memoryEnabled && (
              <div className="mt-4 space-y-2">
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {memories.map((mem, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-2 p-2 bg-surface-elevated rounded-input border border-outline text-xs text-ink"
                    >
                      <span className="leading-normal">{mem}</span>
                      <button
                        onClick={() => handleDeleteMemory(idx)}
                        className="text-ink-muted hover:text-rose-500 p-0.5 shrink-0"
                        title="Delete memory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Add a new custom memory..."
                    value={newMemory}
                    onChange={(e) => setNewMemory(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddMemory()}
                    className="flex-1 bg-surface text-ink text-xs px-2.5 py-1.5 rounded-input border border-outline focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <Button variant="secondary" size="sm" onClick={handleAddMemory}>
                    Add
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-outline rounded-card max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-heading text-lg font-semibold text-ink mb-1">Create new Project</h3>
            <p className="text-xs text-ink-muted mb-4">
              A project groups knowledge documents and custom instructions together.
            </p>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <Input
                label="Project Title"
                placeholder="e.g. Mobile App Redesign"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                autoFocus
              />

              <Input
                label="Description (Optional)"
                placeholder="Short summary of project scope..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-ink">Custom Project Instructions</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Act as a senior Flutter architect. Always cite referenced specs."
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  className="bg-surface text-ink border border-outline rounded-input p-2.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Create project
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
