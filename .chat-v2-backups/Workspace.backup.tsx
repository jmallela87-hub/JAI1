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

  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarExpanded(false);
    }
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
      .then(({ data }) => {
        setMessages((data ?? []) as Message[]);
      });
  }, [activeChatId, supabase]);

  async function handleSend(text: string, file?: File) {
    let chatId = activeChatId;

    if (!chatId) {
      const { data: newChat, error } = await supabase
        .from("chats")
        .insert({
          user_id: profile.id,
          title: generateChatTitle(
            text || file?.name || "New conversation"
          ),
        })
        .select()
        .single();

      if (error || !newChat) {
        console.error("Failed to create chat:", error);
        return;
      }

      chatId = newChat.id;
      setChats((prev) => [newChat as Chat, ...prev]);
      setActiveChatId(chatId);
    }

    let displayText = text.trim();

    if (file) {
      displayText = displayText
        ? `${displayText}\n\n[Attached file: ${file.name}]`
        : `[Attached file: ${file.name}]`;
    }

    const { data: userMessage, error: userMessageError } =
      await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          role: "user",
          content: displayText,
        })
        .select()
        .single();

    if (userMessageError || !userMessage) {
      console.error(
        "Failed to save user message:",
        userMessageError
      );
      return;
    }

    const updatedMessages = [
      ...messages,
      userMessage as Message,
    ];

    setMessages(updatedMessages);

    await supabase
      .from("chats")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", chatId);

    try {
      let attachment:
        | {
            name: string;
            type: string;
            data: string;
          }
        | undefined;

      if (file) {
        const dataUrl = await new Promise<string>(
          (resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
              if (typeof reader.result === "string") {
                resolve(reader.result);
              } else {
                reject(
                  new Error("Failed to read attachment")
                );
              }
            };

            reader.onerror = () => {
              reject(
                new Error("Failed to read attachment")
              );
            };

            reader.readAsDataURL(file);
          }
        );

        attachment = {
          name: file.name,
          type: file.type || "application/octet-stream",
          data: dataUrl,
        };
      }

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          attachment,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "AI request failed"
        );
      }

      const answer =
        result.answer ||
        "I couldn't generate a response.";

      const {
        data: assistantMessage,
        error: assistantError,
      } = await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          role: "assistant",
          content: answer,
        })
        .select()
        .single();

      if (assistantError || !assistantMessage) {
        throw new Error(
          "Failed to save AI response"
        );
      }

      const savedAssistantMessage =
        assistantMessage as Message;

      setMessages((prev) => [
        ...prev,
        {
          ...savedAssistantMessage,
          content: "",
        },
      ]);

      let index = 0;

      const animateResponse = () => {
        const step = Math.min(
          2,
          answer.length - index
        );

        index += step;

        setMessages((prev) =>
          prev.map((message) =>
            message.id === savedAssistantMessage.id
              ? {
                  ...message,
                  content: answer.slice(0, index),
                }
              : message
          )
        );

        if (index < answer.length) {
          window.setTimeout(animateResponse, 18);
        }
      };

      animateResponse();

      await supabase
        .from("chats")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("id", chatId);
    } catch (error) {
      console.error("JAI response error:", error);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          chat_id: chatId!,
          role: "assistant",
          content:
            error instanceof Error
              ? `Sorry, I couldn't respond right now. ${error.message}`
              : "Sorry, I couldn't respond right now.",
          created_at: new Date().toISOString(),
        },
      ]);
    }
  }

  async function handleNewChat() {
    setActiveChatId(null);
    setMobileSidebarOpen(false);
  }

  async function handleDeleteChat(id: string) {
    await supabase
      .from("chats")
      .delete()
      .eq("id", id);

    setChats((prev) =>
      prev.filter((chat) => chat.id !== id)
    );

    if (activeChatId === id) {
      setActiveChatId(null);
    }
  }

  async function handleDeleteAllChats() {
    await supabase
      .from("chats")
      .delete()
      .eq("user_id", profile.id);

    setChats([]);
    setActiveChatId(null);
  }

  async function handleUpdateProfile(fields: {
    name: string;
    avatar_url?: string | null;
  }) {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        name: fields.name,
        avatar_url: fields.avatar_url ?? null,
      })
      .eq("id", profile.id)
      .select()
      .single();

    if (error || !data) {
      console.error("Failed to update profile:", error);
      throw new Error("Failed to save profile");
    }

    setProfile(data as Profile);
  }

  async function handleDeleteMemory(id: string) {
    await supabase
      .from("memories")
      .delete()
      .eq("id", id);

    setMemories((prev) =>
      prev.filter((memory) => memory.id !== id)
    );
  }

  async function handleClearMemories() {
    await supabase
      .from("memories")
      .delete()
      .eq("user_id", profile.id);

    setMemories([]);
  }

  async function handleSavePreferences(prefs: {
    personality: Personality;
    additional_instructions: string;
  }) {
    const { error } = await supabase
      .from("preferences")
      .upsert({
        user_id: profile.id,
        ...prefs,
      });

    if (error) {
      console.error(
        "Failed to save preferences:",
        error
      );
      return;
    }

    setPreferences((prev) => ({
      ...prev,
      ...prefs,
    }));
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg">
      {mobileSidebarOpen && (
        <button
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          aria-label="Close sidebar"
          onClick={() =>
            setMobileSidebarOpen(false)
          }
        />
      )}

      <div className="hidden md:block">
        <Sidebar
          expanded={sidebarExpanded}
          onCollapse={() =>
            setSidebarExpanded(false)
          }
          onExpand={() =>
            setSidebarExpanded(true)
          }
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={setActiveChatId}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          profile={profile}
          onOpenProfileMenu={() =>
            setProfileOverlayOpen(true)
          }
          isMobileOverlay={false}
        />
      </div>

      {mobileSidebarOpen && (
        <div className="md:hidden">
          <Sidebar
            expanded
            onCollapse={() =>
              setMobileSidebarOpen(false)
            }
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
            onOpenProfileMenu={() =>
              setProfileOverlayOpen(true)
            }
            isMobileOverlay
          />
        </div>
      )}

      <div className="relative flex-1">
        {!sidebarExpanded && (
          <button
            onClick={() => {
              if (window.innerWidth < 768) {
                setMobileSidebarOpen(true);
              } else {
                setSidebarExpanded(true);
              }
            }}
            className="absolute left-3 top-3 z-10 hidden text-sm font-medium text-text-muted hover:text-text md:block"
            aria-label="Open sidebar"
          >
            ☰
          </button>
        )}

        <button
          onClick={() =>
            setMobileSidebarOpen(true)
          }
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
          onClose={() =>
            setProfileOverlayOpen(false)
          }
          onSignOut={handleSignOut}
          onUpdateProfile={handleUpdateProfile}
          onDeleteMemory={handleDeleteMemory}
          onClearMemories={handleClearMemories}
          onDeleteAllChats={handleDeleteAllChats}
          onSavePreferences={
            handleSavePreferences
          }
        />
      )}
    </div>
  );
}
