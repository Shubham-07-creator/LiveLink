'use client';

import React, { useState } from 'react';
import { Sidebar, type ConversationItem } from '@/components/layout/Sidebar';
import { ChatComposer, type AttachedFile } from '@/components/chat/ChatComposer';
import { ThemeSelector } from '@/components/layout/ThemeSelector';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/contexts/ToastContext';
import { Sparkles, Code2, LayoutDashboard, Cpu, Compass } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function HomePage() {
  const { info } = useToast();
  const [conversations, setConversations] = useState<ConversationItem[]>([
    { id: '1', title: 'Interactive React Financial Dashboard', updatedAt: 'Today', isStarred: true },
    { id: '2', title: 'PostgreSQL pgvector Architecture', updatedAt: 'Yesterday' }
  ]);
  const [currentChatId, setCurrentChatId] = useState<string>('1');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const fastModel = process.env.NEXT_PUBLIC_MODEL_FAST || 'Gemini 1.5 Flash';
  const smartModel = process.env.NEXT_PUBLIC_MODEL_SMART || 'Gemini 1.5 Flash';

  const handleSendMessage = (text: string, modelTier: 'fast' | 'smart', files: AttachedFile[]) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    info(`Prompt queued for ${modelTier.toUpperCase()} tier model`);
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentChatId('');
    info('New conversation started');
  };

  const starterPrompts = [
    {
      icon: <LayoutDashboard className="w-4 h-4 text-accent" />,
      title: 'Interactive Dashboard',
      description: 'Build a full React analytics widget with live artifact preview'
    },
    {
      icon: <Code2 className="w-4 h-4 text-emerald-600" />,
      title: 'Clean API Architecture',
      description: 'Design a REST & GraphQL endpoint schema with Zod validation'
    },
    {
      icon: <Cpu className="w-4 h-4 text-blue-600" />,
      title: 'Algorithm Optimization',
      description: 'Analyze time complexity & refactor search trees'
    },
    {
      icon: <Compass className="w-4 h-4 text-amber-600" />,
      title: 'Project Brainstorming',
      description: 'Explore zero-cost architecture strategies for web apps'
    }
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-app text-ink font-body">
      {/* 1. Left Collapsible Sidebar */}
      <Sidebar
        conversations={conversations}
        currentChatId={currentChatId}
        onSelectChat={(id) => setCurrentChatId(id)}
        onNewChat={handleNewChat}
        onDeleteChat={(id) => setConversations((prev) => prev.filter((c) => c.id !== id))}
        onToggleStar={(id) =>
          setConversations((prev) =>
            prev.map((c) => (c.id === id ? { ...c, isStarred: !c.isStarred } : c))
          )
        }
      />

      {/* 2. Main Chat Center */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-app relative">
        {/* Top Navbar */}
        <header className="h-14 border-b border-outline px-4 flex items-center justify-between bg-surface/70 backdrop-blur-md z-20">
          <div className="flex items-center gap-2.5">
            <h2 className="font-heading font-semibold text-sm text-ink truncate max-w-xs sm:max-w-md">
              {currentChatId ? 'Interactive React Financial Dashboard' : 'New conversation'}
            </h2>
            <Badge variant="accent">Free Tier</Badge>
          </div>

          <div className="flex items-center gap-2">
            <ThemeSelector />
          </div>
        </header>

        {/* Messages or Welcome Empty State */}
        <div className="flex-1 overflow-y-auto px-4 py-8 flex flex-col items-center justify-between">
          {messages.length === 0 ? (
            <div className="w-full max-w-2xl mx-auto my-auto flex flex-col items-center text-center animate-in fade-in duration-300">
              <div className="w-12 h-12 rounded-input bg-accent-subtle text-accent flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-ink tracking-tight">
                Where should we begin today?
              </h1>
              <p className="text-sm text-ink-muted mt-2 max-w-md leading-relaxed font-body">
                Aether creates interactive live artifacts, renders markdown & math, and searches project knowledge at zero cost.
              </p>

              {/* Starter Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-8 text-left">
                {starterPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(p.description, 'smart', [])}
                    className="p-3.5 bg-surface hover:bg-surface-elevated border border-outline rounded-card text-left transition-all duration-150 group hover:border-accent/40 hover:shadow-xs active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {p.icon}
                      <span className="text-xs font-semibold text-ink group-hover:text-accent transition-colors">
                        {p.title}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted leading-relaxed line-clamp-2">
                      {p.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full max-w-3xl mx-auto space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-card p-4 text-sm leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-accent-subtle text-ink border border-accent/20'
                        : 'bg-surface text-ink border border-outline shadow-xs'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat Composer */}
        <ChatComposer
          onSendMessage={handleSendMessage}
          isStreaming={isStreaming}
          onStopStreaming={() => setIsStreaming(false)}
          fastModelName={fastModel}
          smartModelName={smartModel}
        />
      </main>
    </div>
  );
}
