export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ProviderResult = {
  text: string;
  provider: "gemini" | "openrouter";
};

async function callGemini(messages: AIMessage[]): Promise<ProviderResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Gemini API key is not configured");
  }

  const system = messages.find((m) => m.role === "system")?.content ?? "";

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: system }],
        },
        contents,
        generationConfig: {
          temperature: 0.2,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed: ${response.status}`);
  }

  const data = await response.json();

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("") ?? "";

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return {
    text,
    provider: "gemini",
  };
}

async function callOpenRouter(
  messages: AIMessage[]
): Promise<ProviderResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OpenRouter API key is not configured");
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages,
        temperature: 0.2,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`OpenRouter request failed: ${response.status}`);
  }

  const data = await response.json();

  const text = data?.choices?.[0]?.message?.content ?? "";

  if (!text) {
    throw new Error("OpenRouter returned an empty response");
  }

  return {
    text,
    provider: "openrouter",
  };
}

export async function generateAIResponse(
  messages: AIMessage[]
): Promise<ProviderResult & { fallbackUsed: boolean }> {
  try {
    const result = await callGemini(messages);

    return {
      ...result,
      fallbackUsed: false,
    };
  } catch (geminiError) {
    console.error("Gemini failed:", geminiError);
  }

  try {
    const result = await callOpenRouter(messages);

    return {
      ...result,
      fallbackUsed: true,
    };
  } catch (openRouterError) {
    console.error("OpenRouter failed:", openRouterError);
  }

  throw new Error("All configured AI providers are unavailable");
}
