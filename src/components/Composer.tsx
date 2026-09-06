"use client";

import {
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  MicIcon,
  PaperclipIcon,
  SendIcon,
} from "@/components/ui/Icons";

interface ComposerProps {
  onSend: (text: string, files?: File[]) => void;
  onStop?: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
}

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult:
    | ((event: {
        resultIndex: number;
        results: {
          length: number;
          [index: number]: {
            isFinal: boolean;
            [index: number]: {
              transcript: string;
            };
          };
        };
      }) => void)
    | null;
  onerror:
    | ((event: { error: string }) => void)
    | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function Composer({
  onSend,
  onStop,
  disabled,
  isGenerating = false,
}: ComposerProps) {
  const [value, setValue] = useState("");
  const [selectedFiles, setSelectedFiles] =
    useState<File[]>([]);
  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);
  const [previewFile, setPreviewFile] =
    useState<File | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] =
    useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] =
    useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const recognitionRef =
    useRef<SpeechRecognitionInstance | null>(null);

  const voiceBaseRef = useRef("");
  const voiceFinalRef = useRef("");

  useEffect(() => {
    if (!previewFile || !previewFile.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(previewFile);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [previewFile]);

  function handleSend() {
    const trimmed = value.trim();

    if (!trimmed && selectedFiles.length === 0) return;
    if (disabled) return;

    onSend(
      trimmed,
      selectedFiles.length > 0 ? selectedFiles : undefined
    );

    setValue("");
    setSelectedFiles([]);
    setPreviewFile(null);
    setIsPreviewOpen(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleKeyDown(
    e: KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(e.target.files ?? []);

    if (files.length === 0) return;

    const maxSize = 15 * 1024 * 1024;

    const oversizedFile = files.find(
      (file) => file.size > maxSize
    );

    if (oversizedFile) {
      setVoiceError(
        `"${oversizedFile.name}" is too large. Maximum size is 15 MB per file.`
      );

      e.target.value = "";
      return;
    }

    setVoiceError(null);

    setSelectedFiles((prev) => [
      ...prev,
      ...files,
    ]);

    e.target.value = "";
  }

  function addDroppedFiles(files: File[]) {
    if (files.length === 0) return;

    const maxSize = 15 * 1024 * 1024;

    const oversizedFile = files.find(
      (file) => file.size > maxSize
    );

    if (oversizedFile) {
      setVoiceError(
        `"${oversizedFile.name}" is too large. Maximum size is 15 MB per file.`
      );
      return;
    }

    setVoiceError(null);

    setSelectedFiles((prev) => [
      ...prev,
      ...files,
    ]);
  }

  function handleDragEnter(
    e: React.DragEvent<HTMLDivElement>
  ) {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }

  function handleDragOver(
    e: React.DragEvent<HTMLDivElement>
  ) {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.types.includes("Files")) {
      e.dataTransfer.dropEffect = "copy";
      setIsDragging(true);
    }
  }

  function handleDragLeave(
    e: React.DragEvent<HTMLDivElement>
  ) {
    e.preventDefault();
    e.stopPropagation();

    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }

  function handleDrop(
    e: React.DragEvent<HTMLDivElement>
  ) {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(false);

    const files = Array.from(
      e.dataTransfer.files ?? []
    );

    if (files.length > 0) {
      addDroppedFiles(files);
    }
  }

  function toggleVoice() {
    setVoiceError(null);

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError(
        "Voice input is not supported in this browser. Try Chrome or Edge."
      );
      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    voiceBaseRef.current = value.trim();
    voiceFinalRef.current = "";

    recognition.onresult = (event) => {
      let interimTranscript = "";

      for (
        let i = event.resultIndex ?? 0;
        i < event.results.length;
        i++
      ) {
        const transcript =
          event.results[i][0]?.transcript ?? "";

        if (event.results[i].isFinal) {
          voiceFinalRef.current += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const combined = [
        voiceBaseRef.current,
        voiceFinalRef.current,
        interimTranscript,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      setValue(combined);
    };

    recognition.onerror = (event) => {
      console.error(
        "Speech recognition error:",
        event.error
      );

      setListening(false);

      if (event.error === "not-allowed") {
        setVoiceError(
          "Microphone permission was denied. Allow microphone access for localhost."
        );
      } else {
        setVoiceError(
          `Voice input error: ${event.error}`
        );
      }
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;

      const combined = [
        voiceBaseRef.current,
        voiceFinalRef.current,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      setValue(combined);

      voiceBaseRef.current = "";
      voiceFinalRef.current = "";
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setListening(true);
    } catch (error) {
      console.error(
        "Failed to start speech recognition:",
        error
      );
      setListening(false);
      recognitionRef.current = null;
    }
  }

  return (
    <div className="w-full">
      {selectedFiles.length > 0 && (
        <div className="mb-2 flex max-w-full items-center justify-end gap-2 overflow-x-auto px-1 py-1">
          {selectedFiles.map((file, index) => {
            const isImage = file.type.startsWith("image/");

            return (
              <div
                key={`${file.name}-${file.lastModified}-${index}`}
                className="group relative shrink-0"
              >
                {isImage ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewFile(file);
                      setIsPreviewOpen(true);
                    }}
                    className="block overflow-hidden rounded-xl border border-border bg-surface transition hover:opacity-90"
                    aria-label={`Preview ${file.name}`}
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="h-16 w-16 object-cover"
                      onLoad={(e) => {
                        URL.revokeObjectURL(e.currentTarget.src);
                      }}
                    />
                  </button>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-surface text-text-muted">
                    <PaperclipIcon
                      width={20}
                      height={20}
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedFiles((prev) =>
                      prev.filter((_, i) => i !== index)
                    );

                    if (previewFile === file) {
                      setPreviewFile(null);
                      setIsPreviewOpen(false);
                    }
                  }}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/80 text-xs text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                  aria-label={`Remove ${file.name}`}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {isPreviewOpen && previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setIsPreviewOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <button
            type="button"
            onClick={() => setIsPreviewOpen(false)}
            className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-2xl text-white hover:bg-black/80"
            aria-label="Close image preview"
          >
            ×
          </button>

          <img
            src={previewUrl}
            alt={previewFile?.name ?? "Image preview"}
            className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {voiceError && (
        <div className="mb-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-danger">
          {voiceError}
        </div>
      )}

      <div
        className={`flex w-full items-end gap-2 rounded-2xl border border-border bg-surface px-3 py-2.5 shadow-lg shadow-black/20 transition ${
          isDragging ? "ring-2 ring-accent/50" : ""
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-accent bg-surface/95 text-sm font-medium text-text">
            Drop files here
          </div>
        )}

        <button
          onClick={() =>
            fileInputRef.current?.click()
          }
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-hover hover:text-text"
          aria-label="Attach a file or image"
          type="button"
          disabled={false}
        >
          <PaperclipIcon
            width={17}
            height={17}
          />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept="image/*,.pdf,.txt,.md,.csv,.json,.js,.jsx,.ts,.tsx,.css,.html"
          onChange={handleFileChange}
        />

        <textarea
          value={value}
          onChange={(e) =>
            setValue(e.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder={
            listening
              ? "Listening..."
              : "Ask anything..."
          }
          rows={1}
          disabled={false}
          className="max-h-40 flex-1 resize-none bg-transparent py-2 text-[15px] text-text placeholder:text-text-faint focus:outline-none disabled:opacity-50"
        />

        <button
          onClick={toggleVoice}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-surface-hover ${
            listening
              ? "text-accent"
              : "text-text-muted"
          }`}
          aria-label={
            listening
              ? "Stop voice input"
              : "Voice input"
          }
          type="button"
          disabled={false}
        >
          <MicIcon
            width={17}
            height={17}
          />
        </button>

        {isGenerating && (
          <button
            onClick={onStop}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-text text-bg transition-opacity hover:opacity-80"
            aria-label="Stop generating"
            type="button"
          >
            <span className="h-3.5 w-3.5 rounded-[3px] bg-bg" />
          </button>
        )}

        <button
          onClick={handleSend}
          disabled={!value.trim() && selectedFiles.length === 0}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-gradient text-white disabled:opacity-40"
          aria-label="Send"
          type="button"
        >
          <SendIcon
            width={16}
            height={16}
          />
        </button>
      </div>
    </div>
  );
}
