"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, Shield, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SCREENSHOT_MAX_FILES } from "@/lib/screenshots/validation";
import { ENTITIES } from "@/lib/entity-context";
import type { HermesEntityHint } from "@/lib/hermes/types";

interface ScreenshotUploadZoneProps {
  entityHint: HermesEntityHint;
  onEntityHintChange: (hint: HermesEntityHint) => void;
  onUpload: (files: File[]) => void;
  disabled?: boolean;
}

export function ScreenshotUploadZone({
  entityHint,
  onEntityHintChange,
  onUpload,
  disabled,
}: ScreenshotUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [staged, setStaged] = useState<File[]>([]);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const list = Array.from(incoming).filter((f) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic)$/i.test(f.name));
    setStaged((prev) => {
      const merged = [...prev, ...list].slice(0, SCREENSHOT_MAX_FILES);
      return merged;
    });
  }, []);

  const removeStaged = (index: number) => {
    setStaged((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = () => {
    if (staged.length > 0) onUpload(staged);
  };

  const entityOptions: { id: HermesEntityHint; label: string; accent: string; sub: string }[] = [
    { id: "auto", label: "Auto-detect", accent: "#a78bfa", sub: "Hermes picks Personal vs Avaken" },
    ...ENTITIES.filter((e) => e.id !== "consolidated").map((e) => ({
      id: e.id as HermesEntityHint,
      label: e.label,
      accent: e.accent,
      sub: e.description,
    })),
  ];

  return (
    <div className="space-y-5">
      {/* Entity selector */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {entityOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onEntityHintChange(opt.id)}
            className={cn(
              "rounded-xl border p-3 text-left transition-all",
              entityHint === opt.id
                ? "border-primary/40 bg-primary/[0.06] shadow-[0_0_0_1px_rgba(16,185,129,0.25)]"
                : "border-border/80 bg-card/60 hover:border-border-strong hover:bg-white/[0.02]",
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className="size-2 rounded-full"
                style={{ background: opt.accent, boxShadow: entityHint === opt.id ? `0 0 8px ${opt.accent}` : undefined }}
              />
              <span className="text-sm font-medium">{opt.label}</span>
            </div>
            <p className="mt-1 pl-4 text-[11px] text-muted-foreground">{opt.sub}</p>
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-10 transition-all",
          dragging
            ? "border-primary bg-primary/[0.06]"
            : "border-border-strong bg-card/40 hover:border-primary/40 hover:bg-primary/[0.03]",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,.heic"
          multiple
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-border-strong bg-elevated/80 transition-transform group-hover:scale-105">
            <Upload className="size-6 text-primary" />
          </div>
          <p className="text-base font-semibold">Drop screenshots here</p>
          <p className="mt-1 text-sm text-muted-foreground">or click to browse · up to {SCREENSHOT_MAX_FILES} images</p>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-subtle">
            <Shield className="size-3 text-primary/80" />
            Bank apps, Stripe, TikTok Shop, receipts — JPEG, PNG, WebP, HEIC
          </p>
        </div>
      </div>

      {/* Staged thumbnails */}
      {staged.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {staged.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="flex items-center gap-2 rounded-lg border border-border/80 bg-surface/80 py-1.5 pl-2 pr-1 text-xs"
              >
                <ImagePlus className="size-3.5 text-primary" />
                <span className="max-w-[140px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeStaged(i);
                  }}
                  className="rounded p-0.5 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={submit}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-semibold transition-all",
              "bg-primary text-primary-foreground",
              "shadow-[0_0_0_1px_rgba(16,185,129,0.4),0_12px_40px_-12px_rgba(16,185,129,0.55)]",
              "hover:bg-emerald hover:shadow-[0_0_0_1px_rgba(52,211,153,0.5),0_16px_48px_-12px_rgba(16,185,129,0.65)]",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            <SparklesIcon />
            {disabled ? "Sending to Hermes…" : "Analyse with Hermes"}
          </button>
        </div>
      )}
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.2 4.2L17 8l-3.8 1.2L12 14l-1.2-4.8L7 8l3.8-.8L12 3z" />
      <path d="M5 16l.6 2.2L8 19l-2.2.7L5 22l-.6-2.3L2 19l2.2-.5L5 16z" />
      <path d="M19 14l.5 1.8L21 17l-1.8.6L19 20l-.5-1.9L17 17l1.8-.4L19 14z" />
    </svg>
  );
}
