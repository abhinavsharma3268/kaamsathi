import { getGeminiConfig, isAiConfigured } from "@/lib/ai";
import { jsonNoStore } from "@/lib/api-guard";

export const runtime = "nodejs";

export async function GET() {
  const { model } = getGeminiConfig();
  return jsonNoStore({
    ok: true,
    aiConfigured: isAiConfigured(),
    model: isAiConfigured() ? model : null,
  });
}
