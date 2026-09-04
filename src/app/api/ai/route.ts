import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAIResponseStream, AIMessage, AIAttachment } from "@/lib/ai/providers";

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

When the user explicitly asks you to create a downloadable file, create the file content directly using this exact format: [[JAI_FILE:filename.ext]] file content [[/JAI_FILE]]. Use the requested filename and put the complete file content between the markers. Do not tell the user to copy and paste the content or claim you cannot create files. Only use this format when the user explicitly asks for a downloadable file.\n\nFollow the user's requested tone and preferences when reasonable.
`.trim(),
    };

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await generateAIResponseStream(
            [systemMessage, ...safeMessages],
            (chunk) => {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "chunk",
                    text: chunk,
                  })}\n\n`
                )
              );
            },
            attachment,
            request.signal
          );

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                provider: result.provider,
                fallbackUsed: result.fallbackUsed,
              })}\n\n`
            )
          );

          controller.close();
        } catch (error) {
          console.error("[AI API] Streaming error:", error);

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error:
                  error instanceof Error
                    ? error.message
                    : "All AI providers are currently unavailable.",
              })}\n\n`
            )
          );

          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
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
