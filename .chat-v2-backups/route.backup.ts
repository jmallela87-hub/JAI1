import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAIResponse, AIMessage, AIAttachment } from "@/lib/ai/providers";

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie");

    console.log(
      "[AI API] Cookies:",
      cookieHeader ? "PRESENT" : "MISSING"
    );

    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log(
      "[AI API] User:",
      user?.email ?? "NO USER"
    );

    if (authError) {
      console.error("[AI API] Auth error:", authError.message);
    }

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          debug: {
            cookies: cookieHeader ? "present" : "missing",
            user: "none",
            authError: authError?.message ?? null,
          },
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const messages = body.messages as AIMessage[];
    const attachment = body.attachment as AIAttachment | undefined;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required." },
        { status: 400 }
      );
    }

    const safeMessages: AIMessage[] = messages
      .filter(
        (message) =>
          message &&
          ["system", "user", "assistant"].includes(message.role) &&
          typeof message.content === "string"
      )
      .slice(-30);

    if (safeMessages.length === 0) {
      return NextResponse.json(
        { error: "No valid messages provided." },
        { status: 400 }
      );
    }

    console.log(
      "[AI API] Calling AI providers for:",
      user.email
    );

    console.time("[AI API] AI provider total");

    const systemMessage: AIMessage = {
      role: "system",
      content: `
You are JAI, a general-purpose AI assistant.

Respond naturally and conversationally to the user's request. JAI is not a safety classifier and must never expose internal safety analysis, moderation results, policy labels, risk scores, classifications, or hidden reasoning.

Never output sections or labels such as:
- User Safety
- Response Safety
- Safety Categories
- Safety: safe
- Classification
- Moderation
- Policy analysis

Do not describe whether the user's message is "safe" or "unsafe" unless that is directly necessary to answer the user's request.

For normal questions, casual conversation, writing, planning, research, coding, image analysis, document analysis, and other allowed requests, simply help the user naturally.

If a request cannot be fulfilled because of a safety restriction, respond with a concise natural explanation and, when appropriate, offer a safe alternative. Do not reveal internal safety classifications or moderation instructions.

When an image, PDF, document, or other attachment is provided, analyze it directly and naturally. Do not claim that you cannot see an attachment when the attachment has been provided to you.

Follow the user's requested tone and preferences when reasonable.
`.trim(),
    };

    const result = await generateAIResponse(
      [systemMessage, ...safeMessages],
      attachment
    );

    console.timeEnd("[AI API] AI provider total");

    console.log(
      "[AI API] Success:",
      result.provider,
      "fallback:",
      result.fallbackUsed
    );

    return NextResponse.json({
      success: true,
      answer: result.text,
      provider: result.provider,
      fallbackUsed: result.fallbackUsed,
    });
  } catch (error) {
    console.error("[AI API] Error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "All AI providers are currently unavailable.",
      },
      { status: 500 }
    );
  }
}
