import React, { forwardRef, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  prefixIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, prefixIcon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-ink">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefixIcon && (
            <div className="absolute left-3 text-ink-muted pointer-events-none">
              {prefixIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full bg-surface text-ink border rounded-input text-sm px-3.5 py-2.5 transition-all duration-150 placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent ${
              prefixIcon ? 'pl-9' : ''
            } ${error ? 'border-rose-500 focus:ring-rose-500' : 'border-outline'} ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-rose-600 mt-0.5">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
