'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { Sidebar, type ConversationItem } from '@/components/layout/Sidebar';
import { ChatComposer, type AttachedFile } from '@/components/chat/ChatComposer';
import { MessageBubble, type MessageData } from '@/components/chat/MessageBubble';
import { SuggestedFollowUps } from '@/components/chat/SuggestedFollowUps';
import { ArtifactCard } from '@/components/artifacts/ArtifactCard';
import { ArtifactPanel } from '@/components/artifacts/ArtifactPanel';
import { ThemeSelector } from '@/components/layout/ThemeSelector';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/contexts/ToastContext';
import { ArtifactStreamParser, type ArtifactMeta } from '@/lib/artifacts/parser';
import { ARTIFACT_SYSTEM_PROMPT } from '@/lib/artifacts/prompt';
import type { ArtifactVersionItem } from '@/components/artifacts/VersionHistory';
import { Sparkles, LayoutDashboard, Code2, Cpu, Compass } from 'lucide-react';

interface ActiveArtifactState {
  meta: ArtifactMeta;
  code: string;
  versions: ArtifactVersionItem[];
  currentVersion: number;
}

export default function HomePage() {
  const { info, error: toastError } = useToast();
  const [conversations, setConversations] = useState<ConversationItem[]>([
    { id: 'c1', title: 'Interactive React Financial Dashboard', updatedAt: 'Today', isStarred: true }
  ]);
  const [currentChatId, setCurrentChatId] = useState<string>('c1');
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeArtifact, setActiveArtifact] = useState<ActiveArtifactState | null>(null);
  const [artifactMap, setArtifactMap] = useState<Record<string, ActiveArtifactState>>({});

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

    const parser = new ArtifactStreamParser();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.sender, content: m.content })),
          conversationId: currentChatId,
          modelTier,
          system: ARTIFACT_SYSTEM_PROMPT
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
      let accumulatedChatText = '';
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

            if (event.type === 'reasoning') {
              accumulatedThinking += event.delta;
            } else if (event.type === 'error') {
              toastError(event.error);
            } else if (event.type === 'text') {
              // Pass chunk through streaming state machine artifact parser
              for (const parserEvent of parser.feed(event.delta)) {
                if (parserEvent.type === 'text') {
                  accumulatedChatText += parserEvent.content;
                } else if (parserEvent.type === 'artifact_start') {
                  const meta = parserEvent.meta;
                  setActiveArtifact((prev) => {
                    const existing = artifactMap[meta.identifier];
                    const nextVer = existing ? existing.versions.length + 1 : 1;
                    const newState: ActiveArtifactState = {
                      meta,
                      code: '',
                      versions: existing ? existing.versions : [{ version: 1, content: '', timestamp: 'Just now' }],
                      currentVersion: nextVer
                    };
                    return newState;
                  });
                } else if (parserEvent.type === 'artifact_delta') {
                  setActiveArtifact((prev) => (prev ? { ...prev, code: prev.code + parserEvent.delta } : prev));
                } else if (parserEvent.type === 'artifact_end') {
                  const meta = parserEvent.meta;
                  const finalCode = parserEvent.content;
                  setArtifactMap((prev) => {
                    const existing = prev[meta.identifier];
                    const nextVer = existing ? existing.versions.length + 1 : 1;
                    const newVersions: ArtifactVersionItem[] = existing
                      ? [...existing.versions, { version: nextVer, content: finalCode, timestamp: 'Just now' }]
                      : [{ version: 1, content: finalCode, timestamp: 'Just now' }];

                    const updated: ActiveArtifactState = {
                      meta,
                      code: finalCode,
                      versions: newVersions,
                      currentVersion: nextVer
                    };
                    setActiveArtifact(updated);
                    return { ...prev, [meta.identifier]: updated };
                  });
                }
              }
            }

            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, content: accumulatedChatText, thinkingContent: accumulatedThinking }
                  : m
              )
            );
          } catch {
            // Partial JSON
          }
        }
      }

      // Flush remaining parser buffer
      for (const parserEvent of parser.finish()) {
        if (parserEvent.type === 'text') {
          accumulatedChatText += parserEvent.content;
        } else if (parserEvent.type === 'artifact_end') {
          const meta = parserEvent.meta;
          const finalCode = parserEvent.content;
          setArtifactMap((prev) => {
            const existing = prev[meta.identifier];
            const nextVer = existing ? existing.versions.length + 1 : 1;
            const updated: ActiveArtifactState = {
              meta,
              code: finalCode,
              versions: existing
                ? [...existing.versions, { version: nextVer, content: finalCode, timestamp: 'Just now' }]
                : [{ version: 1, content: finalCode, timestamp: 'Just now' }],
              currentVersion: nextVer
            };
            setActiveArtifact(updated);
            return { ...prev, [meta.identifier]: updated };
          });
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: accumulatedChatText, thinkingContent: accumulatedThinking }
            : m
        )
      );

      // Lenient Fallback: Check if response has large fenced code block without tags
      const fallbackMeta = ArtifactStreamParser.detectLenientCodeBlock(accumulatedChatText);
      if (fallbackMeta && !artifactMap[fallbackMeta.identifier]) {
        const codeMatch = /```(\w+)?\n([\s\S]*?)```/.exec(accumulatedChatText);
        if (codeMatch && codeMatch[2]) {
          const fallbackState: ActiveArtifactState = {
            meta: fallbackMeta,
            code: codeMatch[2].trim(),
            versions: [{ version: 1, content: codeMatch[2].trim(), timestamp: 'Just now' }],
            currentVersion: 1
          };
          setArtifactMap((prev) => ({ ...prev, [fallbackMeta.identifier]: fallbackState }));
        }
      }

      // Fetch auto title & suggestions
      if (messages.length === 0 && accumulatedChatText) {
        fetch('/api/chat/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userPrompt: text,
            assistantResponse: accumulatedChatText
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

  const handleFixWithAI = (errorMsg: string, currentCode: string) => {
    const prompt = `The preview sandbox produced the following error:
\`\`\`
${errorMsg}
\`\`\`

Here is my current code:
\`\`\`
${currentCode.slice(0, 3000)}
\`\`\`

Please fix the error and provide the updated complete artifact.`;
    handleSendMessage(prompt, 'smart');
  };

  const handleRestoreVersion = (ver: number) => {
    if (!activeArtifact) return;
    const target = activeArtifact.versions.find((v) => v.version === ver);
    if (!target) return;

    setActiveArtifact((prev) =>
      prev ? { ...prev, code: target.content, currentVersion: ver } : null
    );
    info(`Restored version v${ver}`);
  };

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
        onNewChat={() => {
          const newId = `c-${Date.now()}`;
          setConversations((prev) => [{ id: newId, title: 'New conversation', updatedAt: 'Just now' }, ...prev]);
          setCurrentChatId(newId);
          setMessages([]);
          setSuggestions([]);
          setActiveArtifact(null);
        }}
        onDeleteChat={(id) => setConversations((prev) => prev.filter((c) => c.id !== id))}
        onToggleStar={(id) =>
          setConversations((prev) =>
            prev.map((c) => (c.id === id ? { ...c, isStarred: !c.isStarred } : c))
          )
        }
      />

      {/* 2. Main Content Area with Resizable Split-Screen Panels */}
      <div className="flex-1 flex min-w-0 h-full overflow-hidden">
        <PanelGroup orientation="horizontal" className="h-full w-full">
          {/* Chat Canvas Panel */}
          <Panel defaultSize={activeArtifact ? 50 : 100} minSize={30} className="flex flex-col h-full bg-app relative min-w-0">
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

            {/* Message Thread */}
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
                    <button
                      onClick={() => handleSendMessage('Create an interactive React analytics dashboard with stats and charts', 'smart')}
                      className="p-3.5 bg-surface hover:bg-surface-elevated border border-outline rounded-card text-left transition-all duration-150 group hover:border-accent/40 hover:shadow-xs active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <LayoutDashboard className="w-4 h-4 text-accent" />
                        <span className="text-xs font-semibold text-ink group-hover:text-accent transition-colors">
                          Interactive Dashboard
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted leading-relaxed line-clamp-2">
                        Build a full React analytics widget with live artifact preview
                      </p>
                    </button>
                    <button
                      onClick={() => handleSendMessage('Design a clean REST & GraphQL API schema with Zod validation', 'smart')}
                      className="p-3.5 bg-surface hover:bg-surface-elevated border border-outline rounded-card text-left transition-all duration-150 group hover:border-accent/40 hover:shadow-xs active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Code2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-semibold text-ink group-hover:text-accent transition-colors">
                          Clean API Architecture
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted leading-relaxed line-clamp-2">
                        Design a REST endpoint schema with Zod validation
                      </p>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-3xl mx-auto flex flex-col">
                  {messages.map((m) => (
                    <div key={m.id}>
                      <MessageBubble
                        message={m}
                        isStreaming={isStreaming && m.id === messages[messages.length - 1]?.id}
                      />
                      {/* If message generated an artifact, show clickable Artifact Card */}
                      {Object.values(artifactMap).map((art) => (
                        <ArtifactCard
                          key={art.meta.identifier}
                          meta={art.meta}
                          version={art.currentVersion}
                          onClick={() => setActiveArtifact(art)}
                        />
                      ))}
                    </div>
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
          </Panel>

          {/* Resizable Split Divider & Artifact Side Panel */}
          {activeArtifact && (
            <>
              <PanelResizeHandle className="w-1.5 bg-outline/40 hover:bg-accent/60 transition-colors cursor-col-resize active:bg-accent" />
              <Panel defaultSize={50} minSize={30} className="h-full">
                <ArtifactPanel
                  meta={activeArtifact.meta}
                  code={activeArtifact.code}
                  versions={activeArtifact.versions}
                  currentVersion={activeArtifact.currentVersion}
                  onClose={() => setActiveArtifact(null)}
                  onRestoreVersion={handleRestoreVersion}
                  onFixWithAI={handleFixWithAI}
                />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </div>
  );
}
