'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  MessageSquarePlus,
  Search,
  FolderKanban,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  LogOut,
  User,
  Star,
  Trash2,
  Settings,
  ShieldCheck,
  Database
} from 'lucide-react';
import { ThemeSelector } from './ThemeSelector';
import { UsageMeter } from './UsageMeter';

export interface ConversationItem {
  id: string;
  title: string;
  updatedAt: string;
  isStarred?: boolean;
}

export interface SidebarProps {
  conversations?: ConversationItem[];
  currentChatId?: string;
  onSelectChat?: (id: string) => void;
  onNewChat?: () => void;
  onDeleteChat?: (id: string) => void;
  onToggleStar?: (id: string) => void;
  userName?: string;
  userEmail?: string;
  onSignOut?: () => void;
  onOpenDataControls?: () => void;
}

export function Sidebar({
  conversations = [],
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onToggleStar,
  userName = 'Guest User',
  userEmail,
  onSignOut,
  onOpenDataControls
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside
      className={`h-screen flex flex-col bg-sidebar border-r border-outline transition-all duration-200 select-none z-30 shrink-0 ${
        isCollapsed ? 'w-16' : 'w-64 sm:w-72'
      }`}
      aria-label="Sidebar navigation"
    >
      {/* Header with App Branding & Collapse Toggle */}
      <div className="flex items-center justify-between p-3.5 border-b border-outline/60">
        {!isCollapsed && (
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-input bg-accent-button text-ink-inverse flex items-center justify-center font-heading font-bold text-sm shadow-xs">
              Æ
            </div>
            <span className="font-heading font-semibold text-base text-ink tracking-tight group-hover:text-accent transition-colors">
              Aether
            </span>
          </Link>
        )}
        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="p-1.5 text-ink-muted hover:text-ink hover:bg-sidebar-active rounded-input transition-colors duration-150 mx-auto"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>

      {/* New Chat Action */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className={`w-full flex items-center gap-2.5 bg-surface hover:bg-surface-elevated text-ink border border-outline rounded-input py-2 text-sm font-medium shadow-2xs transition-all duration-150 active:scale-[0.99] ${
            isCollapsed ? 'justify-center px-0' : 'px-3'
          }`}
          title="Start new conversation"
          aria-label="New chat"
        >
          <MessageSquarePlus className="w-4 h-4 text-accent shrink-0" />
          {!isCollapsed && <span>New chat</span>}
        </button>
      </div>

      {/* Search & Navigation (When Expanded) */}
      {!isCollapsed && (
        <div className="px-3 pb-2 flex flex-col gap-2">
          {/* Search bar */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-ink-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search chats... (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface text-ink placeholder:text-ink-muted text-xs pl-8 pr-2.5 py-1.5 rounded-input border border-outline focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Projects Link */}
          <Link
            href="/projects"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-input text-xs font-medium text-ink-muted hover:text-ink hover:bg-sidebar-active transition-colors duration-150"
          >
            <FolderKanban className="w-4 h-4 text-accent shrink-0" />
            <span>Projects & Knowledge Base</span>
          </Link>

          {/* Admin & Quotas Dashboard */}
          <Link
            href="/admin"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-input text-xs font-medium text-ink-muted hover:text-ink hover:bg-sidebar-active transition-colors duration-150"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Admin & Free-Tier Quotas</span>
          </Link>

          {/* Data Controls Trigger */}
          {onOpenDataControls && (
            <button
              onClick={onOpenDataControls}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-input text-xs font-medium text-ink-muted hover:text-ink hover:bg-sidebar-active transition-colors duration-150 text-left"
            >
              <Database className="w-4 h-4 text-ink-muted shrink-0" />
              <span>Data & Privacy Controls</span>
            </button>
          )}
        </div>
      )}

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {!isCollapsed && filtered.length === 0 && (
          <p className="text-center text-xs text-ink-muted py-6">
            {searchQuery ? 'No matching chats found' : 'No conversations yet'}
          </p>
        )}

        {filtered.map((chat) => {
          const isActive = chat.id === currentChatId;
          return (
            <div
              key={chat.id}
              className={`group relative flex items-center gap-2 px-2.5 py-2 rounded-input text-xs cursor-pointer transition-all duration-150 ${
                isActive
                  ? 'bg-sidebar-active text-ink font-semibold'
                  : 'text-ink-muted hover:text-ink hover:bg-sidebar-active/60'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
              onClick={() => onSelectChat?.(chat.id)}
            >
              <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-accent' : 'text-ink-muted'}`} />
              {!isCollapsed && (
                <>
                  <span className="truncate flex-1 leading-normal">{chat.title}</span>
                  {/* Action buttons on hover */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStar?.(chat.id);
                      }}
                      className="p-1 hover:text-amber-500 rounded text-ink-muted"
                      title={chat.isStarred ? 'Unstar chat' : 'Star chat'}
                    >
                      <Star className={`w-3 h-3 ${chat.isStarred ? 'fill-amber-400 text-amber-500' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat?.(chat.id);
                      }}
                      className="p-1 hover:text-rose-500 rounded text-ink-muted"
                      title="Delete chat"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Free-Tier Daily Usage Meter */}
      {!isCollapsed && <UsageMeter />}

      {/* Bottom Footer: User Profile, Theme & Sign Out */}
      <div className="p-3 border-t border-outline/60 flex flex-col gap-2">
        {!isCollapsed && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Theme</span>
            <ThemeSelector />
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className={`flex items-center gap-2 min-w-0 ${isCollapsed ? 'mx-auto' : ''}`}>
            <div className="w-8 h-8 rounded-chip bg-accent-subtle text-accent flex items-center justify-center font-bold text-xs shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink truncate">{userName}</p>
                <p className="text-[10px] text-ink-muted truncate">{userEmail || 'Free Plan'}</p>
              </div>
            )}
          </div>

          {!isCollapsed && onSignOut && (
            <button
              onClick={onSignOut}
              className="p-1.5 text-ink-muted hover:text-rose-500 rounded-input transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
