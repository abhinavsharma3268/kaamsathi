import { NextResponse } from "next/server";
import { getGeminiConfig, isAiConfigured } from "@/lib/ai";

export const runtime = "nodejs";

export async function GET() {
  const { model } = getGeminiConfig();
  return NextResponse.json({
    ok: true,
    aiConfigured: isAiConfigured(),
    model: isAiConfigured() ? model : null,
  });
}
