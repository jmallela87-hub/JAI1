import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAIResponse, AIMessage } from "@/lib/ai/providers";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const messages = body.messages as AIMessage[];

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

    const result = await generateAIResponse(safeMessages);

    return NextResponse.json({
      success: true,
      answer: result.text,
      provider: result.provider,
      fallbackUsed: result.fallbackUsed,
    });
  } catch (error) {
    console.error("AI API error:", error);

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
