'use client';

import React from 'react';
import { Code2, LayoutDashboard, FileCode, FileText, Image as ImageIcon, ChevronRight } from 'lucide-react';
import type { ArtifactMeta } from '@/lib/artifacts/parser';

export interface ArtifactCardProps {
  meta: ArtifactMeta;
  version?: number;
  onClick: () => void;
}

export function ArtifactCard({ meta, version = 1, onClick }: ArtifactCardProps) {
  const getIcon = () => {
    if (meta.type.includes('react')) return <LayoutDashboard className="w-5 h-5 text-accent" />;
    if (meta.type.includes('html')) return <Code2 className="w-5 h-5 text-blue-500" />;
    if (meta.type.includes('svg')) return <ImageIcon className="w-5 h-5 text-emerald-500" />;
    if (meta.type.includes('markdown')) return <FileText className="w-5 h-5 text-amber-500" />;
    return <FileCode className="w-5 h-5 text-purple-500" />;
  };

  return (
    <div
      onClick={onClick}
      className="my-3 p-3.5 bg-surface hover:bg-surface-elevated border border-outline rounded-card flex items-center justify-between cursor-pointer transition-all duration-150 shadow-2xs hover:border-accent/50 group select-none"
      role="button"
      tabIndex={0}
      aria-label={`Open artifact: ${meta.title}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 bg-surface-elevated rounded-input border border-outline shrink-0">
          {getIcon()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold text-ink truncate group-hover:text-accent transition-colors">
              {meta.title}
            </h4>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-chip bg-surface-elevated text-ink-muted border border-outline">
              v{version}
            </span>
          </div>
          <p className="text-[11px] text-ink-muted truncate font-mono mt-0.5">
            {meta.language} • {meta.identifier}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 text-ink-muted group-hover:text-accent transition-colors pl-2">
        <span className="text-xs font-medium hidden sm:inline">Open</span>
        <ChevronRight className="w-4 h-4" />
      </div>
    </div>
  );
}
