export const SCREENSHOT_MAX_FILES = 15;
export const SCREENSHOT_MAX_BYTES = 8 * 1024 * 1024; // 8 MB per image

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const ALLOWED_EXT = /\.(jpe?g|png|webp|heic|heif)$/i;

export function isAllowedImage(file: File): boolean {
  if (ALLOWED_MIME.has(file.type)) return true;
  return ALLOWED_EXT.test(file.name);
}

export interface ValidatedUpload {
  files: File[];
  entityHint: "personal" | "avaken" | "auto";
}

export function parseEntityHint(raw: FormDataEntryValue | null): ValidatedUpload["entityHint"] {
  const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (v === "personal" || v === "avaken") return v;
  return "auto";
}

export function validateScreenshotFiles(files: File[]): { ok: true; files: File[] } | { ok: false; error: string } {
  if (files.length === 0) {
    return { ok: false, error: "Add at least one screenshot." };
  }
  if (files.length > SCREENSHOT_MAX_FILES) {
    return { ok: false, error: `Maximum ${SCREENSHOT_MAX_FILES} images per upload.` };
  }
  for (const file of files) {
    if (!isAllowedImage(file)) {
      return { ok: false, error: `"${file.name}" is not a supported image (JPEG, PNG, WebP, HEIC).` };
    }
    if (file.size > SCREENSHOT_MAX_BYTES) {
      return { ok: false, error: `"${file.name}" exceeds 8 MB.` };
    }
  }
  return { ok: true, files };
}
