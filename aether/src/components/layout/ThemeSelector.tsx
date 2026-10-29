'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, BookOpen } from 'lucide-react';
import type { ThemeMode } from '@/lib/tokens';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const options: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
    { mode: 'sepia', label: 'Sepia', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { mode: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5" /> }
  ];

  return (
    <div
      className="flex items-center gap-1 bg-surface border border-outline rounded-input p-1"
      role="group"
      aria-label="Theme selector"
    >
      {options.map(({ mode, label, icon }) => {
        const isActive = theme === mode;
        return (
          <button
            key={mode}
            onClick={() => setTheme(mode)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-input transition-all duration-150 ${
              isActive
                ? 'bg-accent-button text-ink-inverse shadow-sm'
                : 'text-ink-muted hover:text-ink hover:bg-surface-elevated'
            }`}
            aria-pressed={isActive}
            aria-label={`${label} theme`}
          >
            {icon}
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
