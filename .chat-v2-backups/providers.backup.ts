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
