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

async function callOpenRouter(
  messages: AIMessage[],
  attachments?: AIAttachment[],
  apiKey = process.env.OPENROUTER_API_KEY,
  model = "@preset/jai-free"
): Promise<ProviderResult> {

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
        !attachments?.length
      ) {
        return message;
      }

      const content: Array<Record<string, unknown>> = [
        {
          type: "text",
          text: message.content,
        },
      ];

      for (const attachment of attachments) {
        if (isImage(attachment.type)) {
          content.push({
            type: "image_url",
            image_url: {
              url: attachment.data,
            },
          });
        } else if (isPdf(attachment.type)) {
          content.push({
            type: "file",
            file: {
              filename: attachment.name,
              file_data: attachment.data,
            },
          });
        }
      }

      return {
        role: message.role,
        content,
      };
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
        model,
        messages: openRouterMessages,
        ...(attachments?.some((attachment) => isPdf(attachment.type))
          ? {
              plugins: [
                {
                  id: "file-parser",
                  pdf: {
                    engine: "cloudflare-ai",
                  },
                },
              ],
            }
          : {}),
        temperature: 0.2,
        max_tokens: 700,
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
  attachments?: AIAttachment[],
  signal?: AbortSignal
): Promise<{
  provider: "openrouter";
  fallbackUsed: boolean;
}> {
  async function streamOpenRouter(
    apiKey: string | undefined,
    model: string
  ) {
    if (!apiKey) {
      throw new Error("OpenRouter API key is not configured");
    }

    const openRouterMessages = messages.map((message, index) => {
      const isLast = index === messages.length - 1;

      if (!isLast || !attachments?.length) {
        return message;
      }

      const content: Array<Record<string, unknown>> = [
        {
          type: "text",
          text: message.content,
        },
      ];

      for (const attachment of attachments) {
        if (isImage(attachment.type)) {
          content.push({
            type: "image_url",
            image_url: {
              url: attachment.data,
            },
          });
        } else if (isPdf(attachment.type)) {
          content.push({
            type: "file",
            file: {
              filename: attachment.name,
              file_data: attachment.data,
            },
          });
        }
      }

      return {
        role: message.role,
        content,
      };
    });

    try {
      console.log(`[OpenRouter] Trying model: ${model}`);

      // Do not impose a total generation timeout.
      // Large/complex answers may legitimately take longer than 7 seconds.
      // User cancellation still aborts the request immediately.
      const requestSignal = signal;

      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          signal: requestSignal,
          body: JSON.stringify({
            model,
            messages: openRouterMessages,
            stream: true,
            temperature: 0.2,
            max_tokens: 8192,
            ...(attachments?.some((attachment) =>
              isPdf(attachment.type)
            )
              ? {
                  plugins: [
                    {
                      id: "file-parser",
                      pdf: {
                        engine: "cloudflare-ai",
                      },
                    },
                  ],
                }
              : {}),
          }),
        }
      );

      if (!response.ok || !response.body) {
        const errorText = await response.text();

        throw new Error(
          `OpenRouter ${model} failed: ${response.status} ${errorText.slice(
            0,
            500
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

        buffer += decoder
          .decode(value, { stream: true })
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n");

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;

          const jsonText = line.slice(5).trim();

          if (!jsonText || jsonText === "[DONE]") {
            continue;
          }

          try {
            const data = JSON.parse(jsonText);

            const text =
              data?.choices?.[0]?.delta?.content ?? "";

            if (text) {
              onChunk(text);
            }
          } catch {
            // Ignore malformed/incomplete SSE chunks.
          }
        }
      }

      console.log(`[OpenRouter] Success: ${model}`);

      return "openrouter" as const;
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }

      console.error(
        `[OpenRouter] ${model} failed:`,
        error instanceof Error ? error.message : error
      );

      throw error;
    }
  }

  // PRIMARY: OpenRouter account #1 / MiniMax M3
  try {
    const provider = await streamOpenRouter(
      process.env.OPENROUTER_API_KEY,
      "@preset/jai-free"
    );

    return {
      provider,
      fallbackUsed: false,
    };
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }

    console.error(
      "[OpenRouter] Primary failed. Trying secondary:",
      error
    );
  }

  // SECONDARY: OpenRouter account #2 / NVIDIA Nemotron
  try {
    const provider = await streamOpenRouter(
      process.env.OPENROUTER_API_KEY_2,
      "@preset/jai-nvidia-free"
    );

    return {
      provider,
      fallbackUsed: true,
    };
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }

    console.error(
      "[OpenRouter] Secondary failed:",
      error
    );

    throw new Error(
      "All configured OpenRouter providers are unavailable"
    );
  }
}

export async function generateAIResponse(
  messages: AIMessage[],
  attachments?: AIAttachment[]
): Promise<
  ProviderResult & {
    fallbackUsed: boolean;
  }
> {
  // PRIMARY: OpenRouter account #1 / MiniMax M3
  try {
    const result = await callOpenRouter(
      messages,
      attachments,
      process.env.OPENROUTER_API_KEY,
      "@preset/jai-free"
    );

    return {
      ...result,
      fallbackUsed: false,
    };
  } catch (primaryError) {
    console.error(
      "[OpenRouter] Primary failed. Trying secondary:",
      primaryError
    );
  }

  // SECONDARY: OpenRouter account #2 / NVIDIA Nemotron
  try {
    const result = await callOpenRouter(
      messages,
      attachments,
      process.env.OPENROUTER_API_KEY_2,
      "@preset/jai-nvidia-free"
    );

    return {
      ...result,
      fallbackUsed: true,
    };
  } catch (secondaryError) {
    console.error(
      "[OpenRouter] Secondary failed:",
      secondaryError
    );

    throw new Error(
      "All configured OpenRouter providers are unavailable"
    );
  }
}
