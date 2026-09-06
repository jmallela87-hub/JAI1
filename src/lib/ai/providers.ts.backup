export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIAttachment = {
  name: string;
  type: string;
  data: string;
};

type ProviderResult = {
  text: string;
  provider: "gemini" | "openrouter";
};

const GEMINI_COOLDOWN_MS = 60_000;
let geminiCooldownUntil = 0;

function isGeminiCoolingDown() {
  return Date.now() < geminiCooldownUntil;
}

function startGeminiCooldown() {
  geminiCooldownUntil = Date.now() + GEMINI_COOLDOWN_MS;
}

function dataUrlToBase64(dataUrl: string) {
  const commaIndex = dataUrl.indexOf(",");

  if (commaIndex === -1) {
    return dataUrl;
  }

  return dataUrl.slice(commaIndex + 1);
}

function isImage(type: string) {
  return type.startsWith("image/");
}

function isPdf(type: string) {
  return type === "application/pdf";
}

async function callGemini(
  messages: AIMessage[],
  attachment?: AIAttachment
): Promise<ProviderResult> {
  const apiKey =
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Gemini API key is not configured"
    );
  }

  const system =
    messages.find(
      (m) => m.role === "system"
    )?.content ?? "";

  const normalMessages = messages.filter(
    (m) => m.role !== "system"
  );

  const contents = normalMessages.map(
    (m, index) => {
      const isLast =
        index === normalMessages.length - 1;

      const parts: Array<
        | { text: string }
        | {
            inlineData: {
              mimeType: string;
              data: string;
            };
          }
      > = [
        {
          text: m.content,
        },
      ];

      if (
        isLast &&
        attachment &&
        (isImage(attachment.type) ||
          isPdf(attachment.type))
      ) {
        parts.push({
          inlineData: {
            mimeType: attachment.type,
            data: dataUrlToBase64(
              attachment.data
            ),
          },
        });
      }

      return {
        role:
          m.role === "assistant"
            ? "model"
            : "user",
        parts,
      };
    }
  );

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        ...(system
          ? {
              systemInstruction: {
                parts: [{ text: system }],
              },
            }
          : {}),
        contents,
      }),
    }
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `Gemini request failed: ${response.status} ${errorText.slice(
        0,
        300
      )}`
    );
  }

  const data = await response.json();

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map(
        (part: { text?: string }) =>
          part.text ?? ""
      )
      .join("") ?? "";

  if (!text) {
    throw new Error(
      "Gemini returned an empty response"
    );
  }

  return {
    text,
    provider: "gemini",
  };
}

async function callOpenRouter(
  messages: AIMessage[],
  attachment?: AIAttachment
): Promise<ProviderResult> {
  const apiKey =
    process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OpenRouter API key is not configured"
    );
  }

  const openRouterMessages =
    messages.map((message, index) => {
      const isLast =
        index === messages.length - 1;

      if (
        !isLast ||
        !attachment
      ) {
        return message;
      }

      if (isImage(attachment.type)) {
        return {
          role: message.role,
          content: [
            {
              type: "text",
              text: message.content,
            },
            {
              type: "image_url",
              image_url: {
                url: attachment.data,
              },
            },
          ],
        };
      }

      if (isPdf(attachment.type)) {
        return {
          role: message.role,
          content: [
            {
              type: "text",
              text: message.content,
            },
            {
              type: "file",
              file: {
                filename: attachment.name,
                file_data: attachment.data,
              },
            },
          ],
        };
      }

      return message;
    });

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
        messages: openRouterMessages,
        temperature: 0.2,
      }),
    }
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `OpenRouter request failed: ${response.status} ${errorText.slice(
        0,
        300
      )}`
    );
  }

  const data = await response.json();

  const text =
    data?.choices?.[0]?.message
      ?.content ?? "";

  if (!text) {
    throw new Error(
      "OpenRouter returned an empty response"
    );
  }

  return {
    text,
    provider: "openrouter",
  };
}


export async function generateAIResponseStream(
  messages: AIMessage[],
  onChunk: (chunk: string) => void,
  attachment?: AIAttachment,
  signal?: AbortSignal
): Promise<{
  provider: "gemini" | "openrouter";
  fallbackUsed: boolean;
}> {
  async function streamGemini() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("Gemini API key is not configured");
    }

    const system =
      messages.find((m) => m.role === "system")?.content ?? "";

    const normalMessages = messages.filter(
      (m) => m.role !== "system"
    );

    const contents = normalMessages.map((m, index) => {
      const isLast = index === normalMessages.length - 1;

      const parts: Array<
        | { text: string }
        | {
            inlineData: {
              mimeType: string;
              data: string;
            };
          }
      > = [{ text: m.content }];

      if (
        isLast &&
        attachment &&
        (isImage(attachment.type) || isPdf(attachment.type))
      ) {
        parts.push({
          inlineData: {
            mimeType: attachment.type,
            data: dataUrlToBase64(attachment.data),
          },
        });
      }

      return {
        role: m.role === "assistant" ? "model" : "user",
        parts,
      };
    });

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:streamGenerateContent?alt=sse",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        signal,
        body: JSON.stringify({
          ...(system
            ? {
                systemInstruction: {
                  parts: [{ text: system }],
                },
              }
            : {}),
          contents,
        }),
      }
    );

    if (!response.ok || !response.body) {
      const errorText = await response.text();

      throw new Error(
        `Gemini streaming failed: ${response.status} ${errorText.slice(
          0,
          300
        )}`
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        buffer += decoder.decode();
        break;
      }

      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n").replace(/\r/g, "\n");

      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const event of events) {
        const dataLine = event
          .split("\n")
          .find((line) => line.startsWith("data:"));

        if (!dataLine) continue;

        const jsonText = dataLine.slice(5).trim();

        if (!jsonText || jsonText === "[DONE]") continue;

        try {
          const data = JSON.parse(jsonText);

          const text =
            data?.candidates?.[0]?.content?.parts
              ?.map((part: { text?: string }) => part.text ?? "")
              .join("") ?? "";

          if (text) onChunk(text);
        } catch {
          // Ignore incomplete SSE chunks.
        }
      }
    }

    return "gemini" as const;
  }

  async function streamOpenRouter() {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error("OpenRouter API key is not configured");
    }

    const openRouterMessages = messages.map((message, index) => {
      const isLast = index === messages.length - 1;

      if (!isLast || !attachment) return message;

      if (isImage(attachment.type)) {
        return {
          role: message.role,
          content: [
            {
              type: "text",
              text: message.content,
            },
            {
              type: "image_url",
              image_url: {
                url: attachment.data,
              },
            },
          ],
        };
      }

      if (isPdf(attachment.type)) {
        return {
          role: message.role,
          content: [
            {
              type: "text",
              text: message.content,
            },
            {
              type: "file",
              file: {
                filename: attachment.name,
                file_data: attachment.data,
              },
            },
          ],
        };
      }

      return message;
    });

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal,
        body: JSON.stringify({
          model: "openrouter/free",
          messages: openRouterMessages,
          stream: true,
        }),
      }
    );

    if (!response.ok || !response.body) {
      const errorText = await response.text();

      throw new Error(
        `OpenRouter streaming failed: ${response.status} ${errorText.slice(
          0,
          300
        )}`
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n").replace(/\r/g, "\n");

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;

        const jsonText = line.slice(5).trim();

        if (!jsonText || jsonText === "[DONE]") continue;

        try {
          const data = JSON.parse(jsonText);
          const text =
            data?.choices?.[0]?.delta?.content ?? "";

          if (text) onChunk(text);
        } catch {
          // Ignore malformed/incomplete SSE chunks.
        }
      }
    }

    return "openrouter" as const;
  }

  if (!isGeminiCoolingDown()) {
    try {
      const provider = await streamGemini();

      return {
        provider,
        fallbackUsed: false,
      };
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : String(error);

      console.error("Gemini streaming failed:", error);

      if (message.includes("429")) {
        startGeminiCooldown();
        console.warn(
          "Gemini rate limit reached. Using OpenRouter for the next 60 seconds."
        );
      }
    }
  } else {
    console.log(
      "Gemini is temporarily cooling down. Using OpenRouter."
    );
  }

  try {
    const provider = await streamOpenRouter();

    return {
      provider,
      fallbackUsed: true,
    };
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }

    console.error("OpenRouter streaming failed:", error);
  }

  throw new Error("All configured AI providers are unavailable");
}

export async function generateAIResponse(
  messages: AIMessage[],
  attachment?: AIAttachment
): Promise<
  ProviderResult & {
    fallbackUsed: boolean;
  }
> {
  try {
    const result =
      await callGemini(
        messages,
        attachment
      );

    return {
      ...result,
      fallbackUsed: false,
    };
  } catch (geminiError) {
    console.error(
      "Gemini failed:",
      geminiError
    );
  }

  try {
    const result =
      await callOpenRouter(
        messages,
        attachment
      );

    return {
      ...result,
      fallbackUsed: true,
    };
  } catch (openRouterError) {
    console.error(
      "OpenRouter failed:",
      openRouterError
    );
  }

  throw new Error(
    "All configured AI providers are unavailable"
  );
}
