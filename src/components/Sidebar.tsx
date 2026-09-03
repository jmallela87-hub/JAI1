"use client";

import { useMemo, useRef, useState } from "react";
import type { Chat, Profile } from "@/lib/types";
import { cn, getInitial } from "@/lib/utils";
import {
  CloseIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  UserIcon,
} from "@/components/ui/Icons";

interface SidebarProps {
  expanded: boolean;
  onCollapse: () => void;
  onExpand: () => void;
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  profile: Profile;
  onOpenProfileMenu: () => void;
  isMobileOverlay: boolean;
}

export function Sidebar({
  expanded,
  onCollapse,
  onExpand,
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  profile,
  onOpenProfileMenu,
  isMobileOverlay,
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredChats = useMemo(() => {
    if (!query.trim()) return chats;

    const q = query.trim().toLowerCase();

    return chats.filter((chat) =>
      chat.title.toLowerCase().includes(q)
    );
  }, [chats, query]);

  function startLongPress(id: string) {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }

    longPressTimer.current = setTimeout(() => {
      setConfirmDeleteId(id);
    }, 550);
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleDelete(id: string) {
    onDeleteChat(id);
    setConfirmDeleteId(null);
  }

  if (!expanded) {
    return (
      <div className="flex h-full w-14 flex-col items-start border-r border-border-soft bg-bg px-3 py-4">
        <button
          onClick={onExpand}
          className="text-lg font-semibold tracking-tight text-text"
          aria-label="Expand sidebar"
        >
          JAI
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full w-[280px] flex-col border-r border-border-soft bg-bg px-3 py-4",
        isMobileOverlay && "fixed inset-y-0 left-0 z-40 shadow-2xl"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-lg font-semibold tracking-tight text-text">
          JAI
        </span>

        <button
          onClick={onCollapse}
          className="rounded-lg p-1.5 text-text-muted hover:bg-surface-hover hover:text-text"
          aria-label="Collapse sidebar"
        >
          <CloseIcon width={16} height={16} />
        </button>
      </div>

      {/* New Chat */}
      <button
        onClick={onNewChat}
        className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-medium text-text hover:bg-surface-hover"
      >
        <PlusIcon width={16} height={16} />
        New Chat
      </button>

      {/* Search */}
      <div className="relative mt-2.5">
        <SearchIcon
          width={15}
          height={15}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint"
        />

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats"
          className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
        />
      </div>

      {/* Chat History */}
      <div className="mt-4 flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <p className="mt-6 px-1 text-sm text-text-faint">
            {chats.length === 0 ? "No chats yet." : "No matching chats."}
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {filteredChats.map((chat) => (
              <li key={chat.id} className="relative">
                {/* Chat */}
                <button
                  onClick={() => {
                    if (confirmDeleteId === chat.id) return;
                    onSelectChat(chat.id);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    cancelLongPress();
                    setConfirmDeleteId(chat.id);
                  }}
                  onTouchStart={() => startLongPress(chat.id)}
                  onTouchEnd={cancelLongPress}
                  onTouchMove={cancelLongPress}
                  onMouseDown={(e) => {
                    if (e.button === 0) {
                      startLongPress(chat.id);
                    }
                  }}
                  onMouseUp={cancelLongPress}
                  onMouseLeave={cancelLongPress}
                  className={cn(
                    "w-full truncate rounded-lg px-3 py-2.5 text-left text-sm text-text-muted hover:bg-surface-hover hover:text-text",
                    activeChatId === chat.id &&
                      "bg-surface-hover text-text"
                  )}
                >
                  {chat.title}
                </button>

                {/* Delete Menu */}
                {confirmDeleteId === chat.id && (
                  <div className="absolute left-2 right-2 top-full z-30 mt-1 overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-xl shadow-black/30">
                    <button
                      onClick={() => handleDelete(chat.id)}
                      className="flex w-full items-center gap-2 rounded-lg bg-red-600 px-3 py-2.5 text-left text-sm font-medium text-white transition hover:bg-red-700"
                    >
                      <TrashIcon width={15} height={15} />
                      Delete chat
                    </button>

                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="mt-1 w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-text-muted transition hover:bg-surface-hover hover:text-text"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Profile */}
      <button
        onClick={onOpenProfileMenu}
        className="mt-3 flex items-center gap-3 rounded-xl border border-border-soft bg-surface px-3 py-2.5 text-left hover:bg-surface-hover"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised text-sm font-medium text-text">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <UserIcon width={16} height={16} />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-text">
            {profile.name || getInitial(profile.name, profile.email)}
          </span>

          <span className="block truncate text-xs text-text-faint">
            View profile
          </span>
        </span>
      </button>
    </div>
  );
}