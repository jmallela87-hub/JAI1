"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  Chat,
  Memory,
  Message,
  Personality,
  Preferences,
  Profile,
} from "@/lib/types";
import { generateChatTitle } from "@/lib/utils";
import { Sidebar } from "@/components/Sidebar";
import { ChatView } from "@/components/ChatView";
import { ProfileOverlay } from "@/components/ProfileOverlay";

interface WorkspaceProps {
  profile: Profile;
  initialChats: Chat[];
  initialMemories: Memory[];
  initialPreferences: Preferences;
}

export function Workspace({
  profile: initialProfile,
  initialChats,
  initialMemories,
  initialPreferences,
}: WorkspaceProps) {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState(initialProfile);
  const [chats, setChats] = useState(initialChats);
  const [memories, setMemories] = useState(initialMemories);
  const [preferences, setPreferences] = useState(initialPreferences);

  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profileOverlayOpen, setProfileOverlayOpen] = useState(false);

  // Collapse to rail-only on small screens by default.
  useEffect(() => {
    if (window.innerWidth < 768) setSidebarExpanded(false);
  }, []);

  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }
    supabase
      .from("messages")
      .select("*")
      .eq("chat_id", activeChatId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data ?? []) as Message[]));
  }, [activeChatId, supabase]);

  async function handleSend(text: string) {
    let chatId = activeChatId;

    if (!chatId) {
      const { data: newChat, error } = await supabase
        .from("chats")
        .insert({ user_id: profile.id, title: generateChatTitle(text) })
        .select()
        .single();

      if (error || !newChat) return;

      chatId = newChat.id;
      setChats((prev) => [newChat as Chat, ...prev]);
      setActiveChatId(chatId);
    }

    const { data: userMessage } = await supabase
      .from("messages")
      .insert({ chat_id: chatId, role: "user", content: text })
      .select()
      .single();

    if (userMessage) {
      setMessages((prev) => [...prev, userMessage as Message]);
    }

    await supabase
      .from("chats")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", chatId);

    // The clarification + generation pipeline isn't wired up yet — this is
    // just the V1 foundation. Once connected, JAI's response (or its
    // clarifying questions) will be inserted here as an assistant message.
  }

  async function handleNewChat() {
    setActiveChatId(null);
    setMobileSidebarOpen(false);
  }

  async function handleDeleteChat(id: string) {
    await supabase.from("chats").delete().eq("id", id);
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (activeChatId === id) setActiveChatId(null);
  }

  async function handleDeleteAllChats() {
    await supabase.from("chats").delete().eq("user_id", profile.id);
    setChats([]);
    setActiveChatId(null);
  }

  async function handleUpdateProfile(fields: { name: string }) {
    await supabase
      .from("profiles")
      .update({ name: fields.name })
      .eq("id", profile.id);
    setProfile((prev) => ({ ...prev, ...fields }));
  }

  async function handleDeleteMemory(id: string) {
    await supabase.from("memories").delete().eq("id", id);
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleClearMemories() {
    await supabase.from("memories").delete().eq("user_id", profile.id);
    setMemories([]);
  }

  async function handleSavePreferences(prefs: {
    personality: Personality;
    additional_instructions: string;
  }) {
    await supabase
      .from("preferences")
      .upsert({ user_id: profile.id, ...prefs });
    setPreferences((prev) => ({ ...prev, ...prefs }));
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg">
      {/* Mobile overlay backdrop when the drawer is open */}
      {mobileSidebarOpen && (
        <button
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          aria-label="Close sidebar"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <div className="hidden md:block">
        <Sidebar
          expanded={sidebarExpanded}
          onCollapse={() => setSidebarExpanded(false)}
          onExpand={() => setSidebarExpanded(true)}
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={setActiveChatId}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          profile={profile}
          onOpenProfileMenu={() => setProfileOverlayOpen(true)}
          isMobileOverlay={false}
        />
      </div>

      {mobileSidebarOpen && (
        <div className="md:hidden">
          <Sidebar
            expanded
            onCollapse={() => setMobileSidebarOpen(false)}
            onExpand={() => {}}
            chats={chats}
            activeChatId={activeChatId}
            onSelectChat={(id) => {
              setActiveChatId(id);
              setMobileSidebarOpen(false);
            }}
            onNewChat={handleNewChat}
            onDeleteChat={handleDeleteChat}
            profile={profile}
            onOpenProfileMenu={() => setProfileOverlayOpen(true)}
            isMobileOverlay
          />
        </div>
      )}

      <div className="relative flex-1">
        {!sidebarExpanded && (
          <button
            onClick={() => {
              if (window.innerWidth < 768) setMobileSidebarOpen(true);
              else setSidebarExpanded(true);
            }}
            className="absolute left-3 top-3 z-10 hidden text-sm font-medium text-text-muted hover:text-text md:block"
          />
        )}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="absolute left-4 top-4 z-10 text-lg font-semibold text-text md:hidden"
          aria-label="Open sidebar"
        >
          JAI
        </button>

        <ChatView
          messages={messages}
          onSend={handleSend}
          isNewChat={!activeChatId}
        />
      </div>

      {profileOverlayOpen && (
        <ProfileOverlay
          profile={profile}
          memories={memories}
          preferences={preferences}
          onClose={() => setProfileOverlayOpen(false)}
          onSignOut={handleSignOut}
          onUpdateProfile={handleUpdateProfile}
          onDeleteMemory={handleDeleteMemory}
          onClearMemories={handleClearMemories}
          onDeleteAllChats={handleDeleteAllChats}
          onSavePreferences={handleSavePreferences}
        />
      )}
    </div>
  );
}
