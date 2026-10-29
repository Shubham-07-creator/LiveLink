'use client';

import React, { useState } from 'react';
import { Sliders, X, Check, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '@/contexts/ToastContext';

export interface CustomStylesModalProps {
  open: boolean;
  onClose: () => void;
  onSaveStyle: (styleInstruction: string) => void;
}

export function CustomStylesModal({ open, onClose, onSaveStyle }: CustomStylesModalProps) {
  const { success } = useToast();
  const [selectedPreset, setSelectedPreset] = useState<'concise' | 'formal' | 'casual' | 'custom'>('concise');
  const [pastedSample, setPastedSample] = useState('');
  const [globalInstructions, setGlobalInstructions] = useState('');

  if (!open) return null;

  const presets = [
    {
      id: 'concise',
      label: 'Concise & Direct',
      desc: 'Short, punchy responses. No fluff, direct answers first.'
    },
    {
      id: 'formal',
      label: 'Formal & Editorial',
      desc: 'Academic, professional tone with comprehensive structural clarity.'
    },
    {
      id: 'casual',
      label: 'Warm & Casual',
      desc: 'Friendly, empathetic tone like chatting with a thoughtful colleague.'
    },
    {
      id: 'custom',
      label: 'Mimic Pasted Sample',
      desc: 'Paste a sample of your writing to teach the model your exact tone.'
    }
  ];

  const handleSave = () => {
    let instruction = '';
    if (selectedPreset === 'concise') {
      instruction = 'Style directive: Be extremely concise, direct, and eliminate filler words.';
    } else if (selectedPreset === 'formal') {
      instruction = 'Style directive: Use a formal, scholarly, and articulate editorial tone.';
    } else if (selectedPreset === 'casual') {
      instruction = 'Style directive: Use a warm, approachable, conversational tone.';
    } else if (selectedPreset === 'custom' && pastedSample.trim()) {
      instruction = `Style directive: Adopt the tone, syntax, and phrasing of the following sample:\n"${pastedSample.trim()}"`;
    }

    if (globalInstructions.trim()) {
      instruction += `\nGlobal custom instructions:\n${globalInstructions.trim()}`;
    }

    onSaveStyle(instruction);
    success('Writing style and custom instructions updated');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-outline rounded-card max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-outline mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-accent" />
            <h3 className="font-heading font-semibold text-base text-ink">Custom Writing Styles</h3>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset Selector */}
        <div className="space-y-2 mb-4">
          <p className="text-xs font-semibold text-ink">Response Tone Preset</p>
          <div className="grid grid-cols-1 gap-2">
            {presets.map((p) => {
              const isSelected = selectedPreset === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPreset(p.id as any)}
                  className={`p-2.5 rounded-input border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-accent bg-accent-subtle/30 shadow-2xs'
                      : 'border-outline hover:bg-surface-elevated'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-ink">{p.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-accent" />}
                  </div>
                  <p className="text-[11px] text-ink-muted leading-tight">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sample Pasting if Custom */}
        {selectedPreset === 'custom' && (
          <div className="mb-4 space-y-1">
            <label className="text-xs font-semibold text-ink">Paste Writing Sample</label>
            <textarea
              rows={3}
              placeholder="Paste a paragraph of your writing here..."
              value={pastedSample}
              onChange={(e) => setPastedSample(e.target.value)}
              className="w-full bg-surface-elevated text-ink border border-outline rounded-input p-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        )}

        {/* Global Custom Instructions */}
        <div className="mb-4 space-y-1">
          <label className="text-xs font-semibold text-ink">Global Instructions</label>
          <textarea
            rows={2}
            placeholder="e.g. Always provide code in TypeScript. Explain math step-by-step."
            value={globalInstructions}
            onChange={(e) => setGlobalInstructions(e.target.value)}
            className="w-full bg-surface-elevated text-ink border border-outline rounded-input p-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            Save style
          </Button>
        </div>
      </div>
    </div>
  );
}
