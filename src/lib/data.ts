import { createClient } from "@/lib/supabase/server";
import type { Chat, Memory, Preferences, Profile } from "@/lib/types";

export async function getWorkspaceData() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: chats }, { data: memories }, { data: preferences }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("chats")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("memories")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("preferences").select("*").eq("user_id", user.id).single(),
    ]);

  return {
    profile: profile as Profile,
    chats: (chats ?? []) as Chat[],
    memories: (memories ?? []) as Memory[],
    preferences:
      (preferences as Preferences) ?? {
        user_id: user.id,
        personality: "friendly_direct",
        additional_instructions: "",
      },
  };
}
