import { tavily } from "@tavily/core";

const client = tavily({
  apiKey: process.env.TAVILY_API_KEY,
});

const CURRENT_INFO_PATTERNS = [
  /\b(current|currently|latest|today|tonight|tomorrow|yesterday|recent|recently)\b/i,
  /\b(now|right now|this week|this month|this year)\b/i,
  /\b(price|pricing|cost|availability|available|release date|launch date)\b/i,
  /\b(news|breaking|update|updates|status|outage)\b/i,
  /\b(ceo|president|founder|owner|leader)\b/i,
  /\b(version|documentation|docs|api changes|changelog)\b/i,
  /\b(weather|forecast|score|scores|standings|schedule)\b/i,
];

const EXPLICIT_SEARCH_PATTERNS = [
  /\bsearch (the )?web\b/i,
  /\bsearch online\b/i,
  /\blook (it|this|that) up\b/i,
  /\blook online\b/i,
  /\bfind online\b/i,
  /\bgoogle (it|this|that)\b/i,
  /\bcheck online\b/i,
  /\bverify online\b/i,
];

export function shouldUseWebSearch(query: string): boolean {
  const text = query.trim();

  if (!text) return false;

  return (
    EXPLICIT_SEARCH_PATTERNS.some((pattern) => pattern.test(text)) ||
    CURRENT_INFO_PATTERNS.some((pattern) => pattern.test(text))
  );
}

export async function searchWeb(query: string): Promise<string> {
  if (!process.env.TAVILY_API_KEY) {
    throw new Error("Tavily API key is not configured");
  }

  const startedAt = Date.now();

  console.log("[Web Search] Searching Tavily:", query);

  const response = await client.search(query, {
    searchDepth: "basic",
    maxResults: 5,
    includeAnswer: true,
  });

  console.log(
    `[AI TIMING] web search: ${Date.now() - startedAt}ms`
  );

  const results = response.results
    .map((result, index) => {
      return [
        `SOURCE ${index + 1}`,
        `Title: ${result.title}`,
        `URL: ${result.url}`,
        `Content: ${result.content}`,
      ].join("\n");
    })
    .join("\n\n");

  const answer =
    response.answer?.trim()
      ? `Tavily summary:\n${response.answer.trim()}\n\n`
      : "";

  return `${answer}${results}`.trim();
}
