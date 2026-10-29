'use client';

import React, { useState } from 'react';
import { Flag, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '@/contexts/ToastContext';

export interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  messageId: string;
  messageContent: string;
}

export function ReportModal({ open, onClose, messageId, messageContent }: ReportModalProps) {
  const { success, error: toastError } = useToast();
  const [reason, setReason] = useState('Harmful, offensive, or biased content');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const reasons = [
    'Harmful, offensive, or biased content',
    'Hallucination or severe factual inaccuracy',
    'Security or privacy concern',
    'Dangerous goods or weapons violation',
    'Other safety guideline issue'
  ];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/safety/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          content: messageContent,
          reason: details ? `${reason}: ${details}` : reason
        })
      });

      if (!res.ok) throw new Error('Submission failed');
      success('Thank you. Your report has been submitted for moderation review.');
      onClose();
    } catch {
      toastError('Could not submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-outline rounded-card max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-outline mb-4">
          <div className="flex items-center gap-2 text-rose-600">
            <Flag className="w-4 h-4" />
            <h3 className="font-heading font-semibold text-base text-ink">Report Message</h3>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-ink-muted mb-1 block">Message Excerpt</label>
            <div className="p-2.5 rounded-input bg-surface-elevated border border-outline text-xs text-ink-muted line-clamp-3 font-mono">
              {messageContent || '(Empty content)'}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-muted mb-1 block">Select Reason</label>
            <div className="space-y-1.5">
              {reasons.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-2 p-2 rounded-input border text-xs cursor-pointer transition-colors ${
                    reason === r ? 'border-rose-500 bg-rose-500/5 text-ink font-medium' : 'border-outline hover:bg-surface-elevated text-ink-muted'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-rose-500"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-muted mb-1 block">Additional details (Optional)</label>
            <textarea
              rows={2}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide more context..."
              className="w-full bg-surface text-ink placeholder:text-ink-muted text-xs p-2.5 rounded-input border border-outline focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
