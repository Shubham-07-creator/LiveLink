'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sidebar, type ConversationItem } from '@/components/layout/Sidebar';
import { ChatComposer, type AttachedFile } from '@/components/chat/ChatComposer';
import { MessageBubble, type MessageData } from '@/components/chat/MessageBubble';
import { SuggestedFollowUps } from '@/components/chat/SuggestedFollowUps';
import { ThemeSelector } from '@/components/layout/ThemeSelector';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/contexts/ToastContext';
import { Sparkles, LayoutDashboard, Code2, Cpu, Compass } from 'lucide-react';

export default function HomePage() {
  const { info, error: toastError } = useToast();
  const [conversations, setConversations] = useState<ConversationItem[]>([
    { id: 'c1', title: 'Interactive React Financial Dashboard', updatedAt: 'Today', isStarred: true }
  ]);
  const [currentChatId, setCurrentChatId] = useState<string>('c1');
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fastModel = process.env.NEXT_PUBLIC_MODEL_FAST || 'Gemini 1.5 Flash';
  const smartModel = process.env.NEXT_PUBLIC_MODEL_SMART || 'Gemini 1.5 Flash';

  // Abort on Esc key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isStreaming) {
        handleStopStreaming();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStreaming]);

  const handleStopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      info('Generation stopped');
    }
  }, [info]);

  const handleSendMessage = async (text: string, modelTier: 'fast' | 'smart' = 'smart') => {
    if (!text.trim() || isStreaming) return;

    setSuggestions([]);

    const userMessageId = `u-${Date.now()}`;
    const assistantMessageId = `a-${Date.now() + 1}`;

    const newUserMsg: MessageData = {
      id: userMessageId,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      versions: [text],
      versionIndex: 0
    };

    const newAssistantMsg: MessageData = {
      id: assistantMessageId,
      sender: 'assistant',
      content: '',
      thinkingContent: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, newUserMsg];
    setMessages([...updatedMessages, newAssistantMsg]);
    setIsStreaming(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.sender, content: m.content })),
          conversationId: currentChatId,
          modelTier
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      if (!response.body) throw new Error('No streaming body received');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';
      let accumulatedThinking = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const event = JSON.parse(trimmed.slice(6));

            if (event.type === 'text') {
              accumulatedText += event.delta;
            } else if (event.type === 'reasoning') {
              accumulatedThinking += event.delta;
            } else if (event.type === 'error') {
              toastError(event.error);
            }

            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, content: accumulatedText, thinkingContent: accumulatedThinking }
                  : m
              )
            );
          } catch {
            // Partial JSON ignore
          }
        }
      }

      // Fetch auto title and suggestions if this was the first exchange
      if (messages.length === 0 && accumulatedText) {
        fetch('/api/chat/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userPrompt: text,
            assistantResponse: accumulatedText
          })
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.title) {
              setConversations((prev) =>
                prev.map((c) => (c.id === currentChatId ? { ...c, title: data.title } : c))
              );
            }
            if (Array.isArray(data.suggestions)) {
              setSuggestions(data.suggestions);
            }
          })
          .catch(() => {});
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        info('Generation stopped');
      } else {
        toastError((err as Error)?.message || 'Streaming failed');
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleEditUserMessage = (messageId: string, newContent: string) => {
    const targetIndex = messages.findIndex((m) => m.id === messageId);
    if (targetIndex === -1) return;

    const targetMsg = messages[targetIndex];
    const newVersions = [...(targetMsg.versions || [targetMsg.content]), newContent];

    const updatedUserMsg: MessageData = {
      ...targetMsg,
      content: newContent,
      versions: newVersions,
      versionIndex: newVersions.length - 1
    };

    // Keep conversation history up to the edited message, then stream new answer
    const truncatedHistory = [...messages.slice(0, targetIndex), updatedUserMsg];
    setMessages(truncatedHistory);
    handleSendMessage(newContent);
  };

  const handleSwitchVersion = (messageId: string, targetIndex: number) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === messageId && m.versions && m.versions[targetIndex]) {
          return {
            ...m,
            content: m.versions[targetIndex],
            versionIndex: targetIndex
          };
        }
        return m;
      })
    );
  };

  const handleRetryAssistant = (messageId: string) => {
    const targetIndex = messages.findIndex((m) => m.id === messageId);
    if (targetIndex <= 0) return;

    const lastUserMessage = messages[targetIndex - 1];
    if (lastUserMessage && lastUserMessage.sender === 'user') {
      const truncated = messages.slice(0, targetIndex);
      setMessages(truncated);
      handleSendMessage(lastUserMessage.content);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  const handleNewChat = () => {
    const newId = `c-${Date.now()}`;
    const newConv: ConversationItem = {
      id: newId,
      title: 'New conversation',
      updatedAt: 'Just now'
    };
    setConversations((prev) => [newConv, ...prev]);
    setCurrentChatId(newId);
    setMessages([]);
    setSuggestions([]);
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

  const currentTitle = conversations.find((c) => c.id === currentChatId)?.title || 'New conversation';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-app text-ink font-body">
      {/* 1. Left Collapsible Sidebar */}
      <Sidebar
        conversations={conversations}
        currentChatId={currentChatId}
        onSelectChat={(id) => {
          setCurrentChatId(id);
          setMessages([]);
        }}
        onNewChat={handleNewChat}
        onDeleteChat={(id) => setConversations((prev) => prev.filter((c) => c.id !== id))}
        onToggleStar={(id) =>
          setConversations((prev) =>
            prev.map((c) => (c.id === id ? { ...c, isStarred: !c.isStarred } : c))
          )
        }
      />

      {/* 2. Main Chat Canvas */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-app relative">
        {/* Top Navbar */}
        <header className="h-14 border-b border-outline px-4 flex items-center justify-between bg-surface/70 backdrop-blur-md z-20 shrink-0">
          <div className="flex items-center gap-2.5">
            <h2 className="font-heading font-semibold text-sm text-ink truncate max-w-xs sm:max-w-md">
              {currentTitle}
            </h2>
            <Badge variant="accent">Free Tier</Badge>
          </div>

          <div className="flex items-center gap-2">
            <ThemeSelector />
          </div>
        </header>

        {/* Message Thread Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center">
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
                    onClick={() => handleSendMessage(p.description, 'smart')}
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
            <div className="w-full max-w-3xl mx-auto flex flex-col">
              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isStreaming={isStreaming && m.id === messages[messages.length - 1]?.id}
                  onEdit={handleEditUserMessage}
                  onRetry={handleRetryAssistant}
                  onDelete={handleDeleteMessage}
                  onSwitchVersion={handleSwitchVersion}
                />
              ))}

              {/* Suggested Follow-Ups */}
              {suggestions.length > 0 && !isStreaming && (
                <SuggestedFollowUps
                  suggestions={suggestions}
                  onSelectSuggestion={(txt) => handleSendMessage(txt)}
                />
              )}
            </div>
          )}
        </div>

        {/* Chat Composer */}
        <ChatComposer
          onSendMessage={handleSendMessage}
          isStreaming={isStreaming}
          onStopStreaming={handleStopStreaming}
          fastModelName={fastModel}
          smartModelName={smartModel}
        />
      </main>
    </div>
  );
}
