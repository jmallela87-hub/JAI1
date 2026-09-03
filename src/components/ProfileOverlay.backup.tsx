"use client";

import { useRef, useState } from "react";
import type { Memory, Personality, Preferences, Profile } from "@/lib/types";
import { cn, getInitial } from "@/lib/utils";
import {
  BrainIcon,
  CameraIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LogOutIcon,
  MailIcon,
  SettingsIcon,
  ShieldIcon,
  TrashIcon,
  UserIcon,
} from "@/components/ui/Icons";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type View =
  | "menu"
  | "editProfile"
  | "memory"
  | "settings"
  | "security"
  | "responsePreferences";

interface ProfileOverlayProps {
  profile: Profile;
  memories: Memory[];
  preferences: Preferences;
  onClose: () => void;
  onSignOut: () => void;
  onUpdateProfile: (fields: { name: string; avatar_url?: string | null }) => Promise<void>;
  onDeleteMemory: (id: string) => Promise<void>;
  onClearMemories: () => Promise<void>;
  onDeleteAllChats: () => Promise<void>;
  onSavePreferences: (prefs: {
    personality: Personality;
    additional_instructions: string;
  }) => Promise<void>;
}

export function ProfileOverlay({
  profile,
  memories,
  preferences,
  onClose,
  onSignOut,
  onUpdateProfile,
  onDeleteMemory,
  onClearMemories,
  onDeleteAllChats,
  onSavePreferences,
}: ProfileOverlayProps) {
  const [view, setView] = useState<View>("menu");

  return (
    <div className="fixed inset-0 z-50">
      <button
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="absolute bottom-4 left-4 w-[calc(100%-2rem)] max-w-sm overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl sm:bottom-20 sm:left-4">
        {view === "menu" && (
          <MenuView
            profile={profile}
            onNavigate={setView}
            onSignOut={onSignOut}
          />
        )}
        {view === "editProfile" && (
          <EditProfileView
            profile={profile}
            onBack={() => setView("menu")}
            onSave={onUpdateProfile}
          />
        )}
        {view === "memory" && (
          <MemoryView
            memories={memories}
            onBack={() => setView("menu")}
            onDelete={onDeleteMemory}
            onClearAll={onClearMemories}
          />
        )}
        {view === "settings" && (
          <SettingsView
            profile={profile}
            onBack={() => setView("menu")}
            onNavigate={setView}
            onDeleteAllChats={onDeleteAllChats}
            onSignOut={onSignOut}
          />
        )}
        {view === "security" && (
          <SecurityView profile={profile} onBack={() => setView("settings")} />
        )}
        {view === "responsePreferences" && (
          <ResponsePreferencesView
            preferences={preferences}
            onBack={() => setView("settings")}
            onSave={onSavePreferences}
          />
        )}
      </div>
    </div>
  );
}

function PanelHeader({
  title,
  onBack,
}: {
  title: string;
  onBack?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border-soft px-5 py-4">
      {onBack && (
        <button
          onClick={onBack}
          className="rounded-lg p-1 text-text-muted hover:bg-surface-hover hover:text-text"
          aria-label="Back"
        >
          <ChevronLeftIcon width={18} height={18} />
        </button>
      )}
      <h2 className="text-[15px] font-semibold text-text">{title}</h2>
    </div>
  );
}

function Row({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-5 py-3.5 text-left text-sm hover:bg-surface-hover",
        danger ? "text-danger" : "text-text"
      )}
    >
      <span className={danger ? "text-danger" : "text-text-muted"}>{icon}</span>
      <span className="flex-1">{label}</span>
      {!danger && (
        <ChevronRightIcon width={15} height={15} className="text-text-faint" />
      )}
    </button>
  );
}

function MenuView({
  profile,
  onNavigate,
  onSignOut,
}: {
  profile: Profile;
  onNavigate: (view: View) => void;
  onSignOut: () => void;
}) {
  return (
    <div>
      <div className="flex flex-col items-center gap-2 px-5 py-6">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-raised text-xl font-medium text-text">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            getInitial(profile.name, profile.email)
          )}
        </span>
        <span className="text-base font-semibold text-text">
          {profile.name || "Your account"}
        </span>
        <span className="text-sm text-text-faint">{profile.email}</span>
      </div>
      <div className="border-t border-border-soft">
        <Row
          icon={<UserIcon width={17} height={17} />}
          label="Edit profile"
          onClick={() => onNavigate("editProfile")}
        />
        <Row
          icon={<BrainIcon width={17} height={17} />}
          label="Memory"
          onClick={() => onNavigate("memory")}
        />
        <Row
          icon={<SettingsIcon width={17} height={17} />}
          label="Settings"
          onClick={() => onNavigate("settings")}
        />
      </div>
      <div className="border-t border-border-soft py-1">
        <Row
          icon={<LogOutIcon width={17} height={17} />}
          label="Sign out"
          onClick={onSignOut}
          danger
        />
      </div>
    </div>
  );
}

function EditProfileView({
  profile,
  onBack,
  onSave,
}: {
  profile: Profile;
  onBack: () => void;
  onSave: (fields: { name: string; avatar_url?: string | null }) => Promise<void>;
}) {
  const [name, setName] = useState(profile.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <PanelHeader title="Edit profile" onBack={onBack} />
      <div className="flex flex-col items-center gap-3 px-5 pt-6">
        <div className="relative">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-raised text-2xl font-medium text-text">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              getInitial(name, profile.email)
            )}
          </span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-accent-gradient text-white"
            aria-label="Change photo"
          >
            <CameraIcon width={14} height={14} />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              setPhotoError(null);
              setSaved(false);

              if (file.size > 5 * 1024 * 1024) {
                setPhotoError("Photo must be smaller than 5 MB.");
                e.target.value = "";
                return;
              }

              const reader = new FileReader();

              reader.onload = () => {
                if (typeof reader.result === "string") {
                  setAvatarUrl(reader.result);
                }
              };

              reader.readAsDataURL(file);
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 px-5 py-6">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-muted">Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-muted">Email</span>
          <Input value={profile.email} disabled className="opacity-60" />
          <span className="text-xs text-text-faint">
            Email cannot be changed.
          </span>
        </label>

        {photoError && (
          <p className="text-xs text-danger">{photoError}</p>
        )}

        {saved && (
          <p className="text-center text-sm font-medium text-green-500">
            Saved successfully
          </p>
        )}

        <Button
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            setSaved(false);
            setPhotoError(null);

            try {
              await onSave({
                name: name.trim(),
                avatar_url: avatarUrl,
              });
              setSaved(true);
            } catch (error) {
              console.error("Profile save failed:", error);
              setPhotoError("Could not save profile. Please try again.");
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function MemoryView({
  memories,
  onBack,
  onDelete,
  onClearAll,
}: {
  memories: Memory[];
  onBack: () => void;
  onDelete: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
}) {
  return (
    <div>
      <PanelHeader title="Memory" onBack={onBack} />
      <div className="flex flex-col items-center gap-1 px-5 pt-6 text-center">
        <BrainIcon width={24} height={24} className="text-accent" />
        <p className="mt-2 text-sm text-text-muted">
          JAI remembers things you explicitly ask it to remember.
        </p>
      </div>

      <div className="max-h-72 overflow-y-auto px-5 py-5">
        {memories.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-faint">
            Nothing saved yet. Ask JAI to remember something in a chat.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {memories.map((memory) => (
              <li
                key={memory.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border-soft bg-bg px-3.5 py-3 text-sm text-text"
              >
                <span className="leading-snug">&ldquo;{memory.content}&rdquo;</span>
                <button
                  onClick={() => onDelete(memory.id)}
                  className="shrink-0 text-text-faint hover:text-danger"
                  aria-label="Delete memory"
                >
                  <TrashIcon width={15} height={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {memories.length > 0 && (
        <div className="border-t border-border-soft px-5 py-4">
          <button
            onClick={onClearAll}
            className="text-sm font-medium text-danger"
          >
            Clear all memories
          </button>
        </div>
      )}
    </div>
  );
}

function SettingsView({
  profile,
  onBack,
  onNavigate,
  onDeleteAllChats,
  onSignOut,
}: {
  profile: Profile;
  onBack: () => void;
  onNavigate: (view: View) => void;
  onDeleteAllChats: () => Promise<void>;
  onSignOut: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div>
      <PanelHeader title="Settings" onBack={onBack} />

      <div className="px-5 pt-4">
        <p className="px-0 pb-1 text-xs font-medium text-text-faint">Account</p>
      </div>
      <Row
        icon={<MailIcon width={17} height={17} />}
        label={profile.email}
        onClick={() => onNavigate("security")}
      />
      <Row
        icon={<ShieldIcon width={17} height={17} />}
        label="Security"
        onClick={() => onNavigate("security")}
      />

      <div className="px-5 pt-4">
        <p className="px-0 pb-1 text-xs font-medium text-text-faint">
          Privacy &amp; Data
        </p>
      </div>
      {confirmingDelete ? (
        <div className="flex items-center justify-between px-5 py-3.5 text-sm">
          <span className="text-text-muted">Delete all chats?</span>
          <div className="flex gap-3">
            <button
              onClick={async () => {
                await onDeleteAllChats();
                setConfirmingDelete(false);
              }}
              className="font-medium text-danger"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              className="font-medium text-text-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <Row
          icon={<TrashIcon width={17} height={17} />}
          label="Delete all chats"
          onClick={() => setConfirmingDelete(true)}
        />
      )}

      <div className="px-5 pt-4">
        <p className="px-0 pb-1 text-xs font-medium text-text-faint">JAI</p>
      </div>
      <Row
        icon={<SettingsIcon width={17} height={17} />}
        label="Response preferences"
        onClick={() => onNavigate("responsePreferences")}
      />

      <div className="mt-1 border-t border-border-soft py-1">
        <Row
          icon={<LogOutIcon width={17} height={17} />}
          label="Sign out"
          onClick={onSignOut}
          danger
        />
      </div>
    </div>
  );
}

function SecurityView({
  profile,
  onBack,
}: {
  profile: Profile;
  onBack: () => void;
}) {
  return (
    <div>
      <PanelHeader title="Security" onBack={onBack} />
      <div className="flex flex-col gap-5 px-5 py-6">
        <div>
          <p className="text-xs font-medium text-text-muted">Email</p>
          <p className="mt-1 text-sm text-text">{profile.email}</p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-muted">Password</p>
            <p className="mt-1 text-sm tracking-widest text-text">••••••••</p>
          </div>
          <Button variant="ghost">Change password</Button>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-border-soft bg-bg px-4 py-3.5">
          <ShieldIcon width={18} height={18} className="mt-0.5 text-accent" />
          <div>
            <p className="text-sm font-medium text-text">Trusted access</p>
            <p className="mt-0.5 text-xs text-text-faint">
              Only approved people can access JAI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResponsePreferencesView({
  preferences,
  onBack,
  onSave,
}: {
  preferences: Preferences;
  onBack: () => void;
  onSave: (prefs: {
    personality: Personality;
    additional_instructions: string;
  }) => Promise<void>;
}) {
  const [personality, setPersonality] = useState<Personality>(
    preferences.personality
  );
  const [instructions, setInstructions] = useState(
    preferences.additional_instructions ?? ""
  );
  const [saving, setSaving] = useState(false);

  const options: { value: Personality; label: string }[] = [
    { value: "friendly_direct", label: "Friendly + direct" },
    { value: "concise", label: "Concise" },
    { value: "detailed", label: "Detailed" },
  ];

  return (
    <div>
      <PanelHeader title="Response preferences" onBack={onBack} />
      <div className="flex flex-col gap-5 px-5 py-6">
        <div>
          <p className="text-sm font-medium text-text">How should JAI respond?</p>
          <div className="mt-3 flex flex-col gap-2.5">
            {options.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2.5 text-sm text-text"
              >
                <input
                  type="radio"
                  name="personality"
                  checked={personality === opt.value}
                  onChange={() => setPersonality(opt.value)}
                  className="h-4 w-4 accent-accent"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-text">
            Additional instructions
          </p>
          <div className="relative mt-2">
            <textarea
              value={instructions}
              maxLength={500}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Tell JAI anything about how you want responses..."
              rows={4}
              className="w-full resize-none rounded-xl border border-border bg-bg px-3.5 py-3 text-sm text-text placeholder:text-text-faint focus:border-accent"
            />
            <span className="absolute bottom-2 right-3 text-xs text-text-faint">
              {instructions.length}/500
            </span>
          </div>
        </div>

        <Button
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await onSave({
              personality,
              additional_instructions: instructions,
            });
            setSaving(false);
          }}
        >
          {saving ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </div>
  );
}
