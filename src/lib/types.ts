export type Personality = "friendly_direct" | "concise" | "detailed";

export interface Profile {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  approved: boolean;
  created_at: string;
}

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  chat_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
  attachments?: {
    name: string;
    type: string;
    data: string;
  }[];
}

export interface Memory {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface Preferences {
  user_id: string;
  personality: Personality;
  additional_instructions: string | null;
}
