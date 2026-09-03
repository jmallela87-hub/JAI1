"use client";

import { useEffect, useRef, useState } from "react";
import type { Message } from "@/lib/types";
import { Composer } from "@/components/Composer";
import { cn } from "@/lib/utils";

interface ChatViewProps {
  messages: Message[];
  onSend: (text: string, file?: File) => void;
  isNewChat: boolean;
  disabled?: boolean;
}

export function ChatView({
  messages,
  onSend,
  isNewChat,
  disabled,
}: ChatViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  if (isNewChat) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6">
        <h1 className="text-2xl font-medium text-text sm:text-3xl">
          What&rsquo;s on your mind?
        </h1>
        <div className="mt-8 w-full max-w-2xl">
          <Composer onSend={onSend} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-0">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {disabled && (
            <div className="flex items-center gap-1 px-4 py-3 text-text-muted">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-text-muted" />
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-text-muted"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-text-muted"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="mx-auto w-full max-w-2xl px-4 pb-6 sm:px-0">
        <Composer onSend={onSend} />
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  return (
    <div
      className={cn("group flex flex-col", isUser ? "items-end" : "items-start")}
    >
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
          isUser ? "bg-accent-gradient text-white" : "bg-surface text-text"
        )}
      >
        {message.content}
      </div>
      <button
        onClick={() => {
          navigator.clipboard.writeText(message.content);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="mt-1 text-xs text-text-faint opacity-0 transition-opacity hover:text-text-muted group-hover:opacity-100"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
