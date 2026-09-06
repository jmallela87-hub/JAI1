"use client";

import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
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
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-8 sm:px-0">
        <div className="mx-auto flex min-w-0 max-w-2xl flex-col gap-6">
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
      <div className="mx-auto w-full min-w-0 max-w-2xl px-4 pb-6 sm:px-0">
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

async function downloadJAIFile(name: string, content: string) {
  try {
    const safeName = name
      .trim()
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\\.{2,}/g, ".")
      .slice(0, 180);

    if (!safeName || !content) return;

    const response = await fetch("/api/files", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: safeName,
        content,
      }),
    });

    if (!response.ok) {
      throw new Error(`File download failed (${response.status})`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = safeName;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (error) {
    console.error("[FILE DOWNLOAD] Error:", error);
  }
}
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
            "mt-2 min-w-0 max-w-[85%] overflow-hidden rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
            isUser ? "bg-accent-gradient text-white" : "bg-surface text-text"
          )}
        >
          <div className="min-w-0 break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="mb-4 mt-2 text-xl font-semibold leading-tight">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mb-3 mt-5 text-lg font-semibold leading-tight">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mb-2 mt-4 text-base font-semibold leading-tight">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="mb-3 last:mb-0">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="break-words">
                    {children}
                  </li>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="my-3 border-l-2 border-border pl-4 text-text-muted">
                    {children}
                  </blockquote>
                ),
                hr: () => (
                  <hr className="my-5 border-border" />
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all underline underline-offset-2 hover:opacity-80"
                  >
                    {children}
                  </a>
                ),
                table: ({ children }) => (
                  <div className="my-4 min-w-0 max-w-full overflow-x-auto rounded-xl border border-border">
                    <table className="w-max min-w-full border-collapse text-sm">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-white/5">
                    {children}
                  </thead>
                ),
                tbody: ({ children }) => (
                  <tbody>
                    {children}
                  </tbody>
                ),
                tr: ({ children }) => (
                  <tr className="border-b border-border last:border-b-0">
                    {children}
                  </tr>
                ),
                th: ({ children }) => (
                  <th className="whitespace-nowrap px-3 py-2 text-left font-semibold">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-3 py-2 align-top">
                    {children}
                  </td>
                ),
                code: ({ className, children, ...props }) => {
                  const content = String(children);
                  const languageMatch = /language-([\w-]+)/.exec(className || "");
                  const language = languageMatch?.[1]?.toLowerCase();

                  const isBlock =
                    Boolean(languageMatch) ||
                    content.includes("\n");

                  if (isBlock) {
                    return (
                      <SyntaxHighlighter
                        language={language || "text"}
                        style={oneDark}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          padding: "16px",
                          borderRadius: "12px",
                          fontSize: "13px",
                          lineHeight: "1.6",
                          overflowX: "auto",
                          background: "#0d1117",
                          color: "#e6edf3",
                        }}
                        codeTagProps={{
                          style: {
                            display: "block",
                            fontFamily:
                              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                            color: "#e6edf3",
                          },
                        }}
                        wrapLongLines={false}
                      >
                        {content.replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    );
                  }

                  return (
                    <code
                      className="rounded-md bg-black/20 px-1.5 py-0.5 font-mono text-[0.9em]"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                strong: ({ children }) => (
                  <strong className="font-semibold">
                    {children}
                  </strong>
                ),
                del: ({ children }) => (
                  <del className="opacity-70">
                    {children}
                  </del>
                ),
              }}
            >
              {displayContent}
            </ReactMarkdown>
          </div>
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
