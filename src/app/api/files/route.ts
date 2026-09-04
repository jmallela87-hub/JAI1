import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const fileName =
      typeof body.fileName === "string" ? body.fileName.trim() : "";

    const content =
      typeof body.content === "string" ? body.content : "";

    if (!fileName || !content) {
      return NextResponse.json(
        { error: "fileName and content are required." },
        { status: 400 }
      );
    }

    if (
      fileName.includes("..") ||
      fileName.includes("/") ||
      fileName.includes("\\")
    ) {
      return NextResponse.json(
        { error: "Invalid file name." },
        { status: 400 }
      );
    }

    return new Response(content, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[FILES API] Error:", error);

    return NextResponse.json(
      { error: "Unable to create file." },
      { status: 500 }
    );
  }
}
