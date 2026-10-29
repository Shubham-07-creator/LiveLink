'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/contexts/ToastContext';
import { ThemeSelector } from '@/components/layout/ThemeSelector';
import { Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        // Register API call
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to register account');
        }

        success('Account created successfully! Signing you in...');
      }

      // NextAuth Credentials Sign In
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        toastError(result.error);
        setLoading(false);
        return;
      }

      success('Welcome back to Aether!');
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-app p-4 sm:p-8">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-input bg-accent-button text-ink-inverse flex items-center justify-center font-heading font-bold text-sm shadow-xs">
            Æ
          </div>
          <span className="font-heading font-semibold text-lg text-ink">Aether</span>
        </div>
        <ThemeSelector />
      </div>

      {/* Main Card Container */}
      <div className="max-w-md w-full mx-auto my-12 bg-surface border border-outline rounded-card p-6 sm:p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-input bg-accent-subtle text-accent mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="font-heading text-2xl font-semibold text-ink tracking-tight">
            {isRegister ? 'Create your Aether account' : 'Welcome back to Aether'}
          </h1>
          <p className="text-xs text-ink-muted mt-1.5 font-body">
            Zero-cost, private editorial AI assistant with live artifacts.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-surface-elevated border border-outline rounded-input p-1 mb-6">
          <button
            type="button"
            onClick={() => setIsRegister(false)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-input transition-all duration-150 ${
              !isRegister ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(true)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-input transition-all duration-150 ${
              isRegister ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
            }`}
          >
            Create account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isRegister && (
            <Input
              label="Full name"
              type="text"
              placeholder="e.g. Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}

          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" variant="primary" size="md" isLoading={loading} className="w-full mt-2">
            <span>{isRegister ? 'Get started for free' : 'Sign in to account'}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>

        {/* Zero-Cost Disclaimer */}
        <div className="mt-6 pt-4 border-t border-outline flex items-center justify-center gap-1.5 text-[11px] text-ink-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>100% Free Tier • No credit card required</span>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-ink-muted py-4">
        &copy; {new Date().getFullYear()} Aether. Clean editorial AI with live artifacts and knowledge base.
      </footer>
    </div>
  );
}
