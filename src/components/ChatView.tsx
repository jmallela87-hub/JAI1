"use client";

import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import type { Message } from "@/lib/types";
import { Composer } from "@/components/Composer";
import { cn } from "@/lib/utils";

interface ChatViewProps {
  messages: Message[];
  onSend: (text: string, files?: File[]) => void;
  onStop?: () => void;
  isNewChat: boolean;
  isGenerating?: boolean;
  disabled?: boolean;
  questionnaire?: ReactNode;
}

export function ChatView({
  messages,
  onSend,
  onStop,
  isNewChat,
  disabled,
  isGenerating = false,
  questionnaire,
}: ChatViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ block: "end" });
    });

    return () => cancelAnimationFrame(frame);
  }, [messages]);

  if (isNewChat) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6">
        <h1 className="text-2xl font-medium text-text sm:text-3xl">
          What&rsquo;s on your mind?
        </h1>
        <div className="mt-8 w-full max-w-2xl">
          {questionnaire}

          {!questionnaire && (
            <Composer
              onSend={onSend}
              onStop={onStop}
              disabled={disabled}
            />
          )}
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

          {questionnaire}

          <div ref={bottomRef} />
        </div>
      </div>
      <div className="mx-auto w-full max-w-2xl px-4 pb-6 sm:px-0">
        <Composer
          onSend={onSend}
          onStop={onStop}
          disabled={disabled}
          isGenerating={isGenerating}
        />
      </div>
    </div>
  );
}

function downloadJAIFile(name: string, content: string) { const blob = new Blob([content], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }

const MessageBubble = memo(function MessageBubble({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<{ name: string; type: string; data: string } | null>(null);
  const isUser = message.role === "user";
  const imageAttachments = (message.attachments ?? []).filter((attachment) => attachment.type.startsWith("image/"));

  const fileMatches = Array.from(
    message.content.matchAll(
      /\[\[JAI_FILE:([^\]]+)\]\]([\s\S]*?)\[\[\/JAI_FILE\]\]/g
    )
  ).map((match) => ({
    name: match[1]?.trim() ?? "",
    content: match[2] ?? "",
  })).filter((file) => file.name && file.content.length > 0);

  const displayContent = message.content
    .replace(
      /\[\[JAI_FILE:[^\]]+\]\][\s\S]*?\[\[\/JAI_FILE\]\]/g,
      ""
    )
    .trim();

  return (
    <div
      className={cn("group flex flex-col", isUser ? "items-end" : "items-start")}
    >
      {imageAttachments.length > 0 && (
        <div className="mt-2 flex w-fit max-w-[85%] flex-wrap justify-end gap-2 self-end">
          {imageAttachments.map((attachment, index) => (
            <button
              key={`${attachment.name}-${index}`}
              type="button"
              onClick={() => setPreviewAttachment(attachment)}
              className="overflow-hidden rounded-2xl border border-border transition hover:opacity-90"
              aria-label={`Open image ${index + 1}`}
            >
              <img
                src={attachment.data}
                alt={attachment.name}
                className="max-h-80 max-w-[42vw] object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {previewAttachment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewAttachment(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <button
            type="button"
            onClick={() => setPreviewAttachment(null)}
            className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-2xl text-white hover:bg-black/80"
            aria-label="Close image preview"
          >
            ×
          </button>

          <img
            src={previewAttachment.data}
            alt={previewAttachment.name}
            className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {displayContent && (
        <div
          className={cn(
            "mt-2 max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
            isUser ? "bg-accent-gradient text-white" : "bg-surface text-text"
          )}
        >
          {displayContent}
        </div>
      )}

      {fileMatches.length > 0 && (
        <div className="mt-2 flex w-full max-w-[85%] flex-col gap-2">
          {fileMatches.map((file, index) => (
            <button
              key={`${file.name}-${index}`}
              type="button"
              onClick={() => downloadJAIFile(file.name, file.content)}
              className="flex w-full items-center gap-3 rounded-xl bg-surface px-4 py-3 text-left text-sm text-text transition hover:opacity-80"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-base">
                📄
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {file.name}
                </span>
                <span className="text-xs text-text-muted">
                  Download file
                </span>
              </span>

              <span className="shrink-0 text-text-muted">
                ↓
              </span>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => {
          navigator.clipboard.writeText(displayContent);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="mt-1 text-xs text-text-faint opacity-0 transition-opacity hover:text-text-muted group-hover:opacity-100"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
});
