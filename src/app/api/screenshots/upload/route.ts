import { NextResponse } from "next/server";
import { analyzeScreenshotsWithHermes } from "@/lib/hermes/client";
import type { HermesAnalyzeResponse } from "@/lib/hermes/types";
import {
  parseEntityHint,
  validateScreenshotFiles,
} from "@/lib/screenshots/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Accepts multipart screenshots, forwards in-memory to Hermes Agent on the user's VPS,
 * returns structured transactions. Raw images are never persisted on Finance OS.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const entityHint = parseEntityHint(formData.get("entity"));

    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (value instanceof File && (key === "images" || key.startsWith("images"))) {
        files.push(value);
      }
    }

    const validated = validateScreenshotFiles(files);
    if (!validated.ok) {
      return NextResponse.json(
        { success: false, error: validated.error, code: "VALIDATION" },
        { status: 400 },
      );
    }

    const buffers = await Promise.all(
      validated.files.map(async (file) => ({
        name: file.name,
        type: file.type || "image/jpeg",
        buffer: Buffer.from(await file.arrayBuffer()),
      })),
    );

    const result = await analyzeScreenshotsWithHermes(buffers, entityHint);

    // Explicitly drop references (GC); no disk writes occurred.
    buffers.length = 0;

    if (!result.success) {
      const status =
        result.code === "VALIDATION" || result.code === "BAD_IMAGE"
          ? 400
          : result.code === "HERMES_REJECTED"
            ? 401
            : result.code === "TIMEOUT"
              ? 504
              : 502;
      return NextResponse.json(result, { status });
    }

    const normalized: HermesAnalyzeResponse = {
      ...result,
      transactions: result.transactions.map((t, i) => ({
        ...t,
        id: t.id || `preview-${result.batchId.slice(0, 8)}-${i}`,
      })),
    };

    return NextResponse.json(normalized);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json(
      { success: false, error: message, code: "INTERNAL" },
      { status: 500 },
    );
  }
}
