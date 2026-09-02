"use client";

import { KeyboardEvent, useRef, useState } from "react";
import { MicIcon, PaperclipIcon, SendIcon } from "@/components/ui/Icons";

interface ComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function Composer({ onSend, disabled }: ComposerProps) {
  const [value, setValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex w-full items-end gap-2 rounded-2xl border border-border bg-surface px-3 py-2.5 shadow-lg shadow-black/20">
      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-hover hover:text-text"
        aria-label="Attach a file or image"
        type="button"
      >
        <PaperclipIcon width={17} height={17} />
      </button>
      <input ref={fileInputRef} type="file" className="hidden" multiple />

      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything..."
        rows={1}
        className="max-h-40 flex-1 resize-none bg-transparent py-2 text-[15px] text-text placeholder:text-text-faint focus:outline-none"
      />

      <button
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-hover hover:text-text"
        aria-label="Voice input"
        type="button"
      >
        <MicIcon width={17} height={17} />
      </button>

      <button
        onClick={handleSend}
        disabled={!value.trim() || disabled}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-gradient text-white disabled:opacity-40"
        aria-label="Send"
        type="button"
      >
        <SendIcon width={16} height={16} />
      </button>
    </div>
  );
}
