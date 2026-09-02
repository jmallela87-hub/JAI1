/**
 * Generates a chat title locally from the first user message.
 * No AI call — trims to a handful of words so titles are fast and free.
 */
export function generateChatTitle(firstMessage: string): string {
  const cleaned = firstMessage.trim().replace(/\s+/g, " ");
  if (!cleaned) return "New chat";

  const words = cleaned.split(" ");
  const maxWords = 6;
  const title = words.slice(0, maxWords).join(" ");

  return words.length > maxWords ? `${title}…` : title;
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function getInitial(name: string | null | undefined, email: string) {
  const source = name?.trim() || email;
  return source.charAt(0).toUpperCase();
}
