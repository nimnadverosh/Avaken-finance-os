"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Shield, Sparkles, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SCREENSHOT_MAX_FILES } from "@/lib/screenshots/validation";
import { detectBankFromFilename } from "@/lib/screenshots/detect-bank";
import { ENTITIES } from "@/lib/entity-context";
import type { HermesEntityHint } from "@/lib/hermes/types";

export interface StagedScreenshot {
  file: File;
  previewUrl: string;
  bank: string;
  bankAccent: string;
}

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
  const zoneRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [staged, setStaged] = useState<StagedScreenshot[]>([]);

  const revokeAll = useCallback((items: StagedScreenshot[]) => {
    items.forEach((s) => URL.revokeObjectURL(s.previewUrl));
  }, []);

  useEffect(() => () => revokeAll(staged), [staged, revokeAll]);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const list = Array.from(incoming).filter(
        (f) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic)$/i.test(f.name),
      );
      setStaged((prev) => {
        const room = SCREENSHOT_MAX_FILES - prev.length;
        const next = list.slice(0, room).map((file) => {
          const bank = detectBankFromFilename(file.name);
          return {
            file,
            previewUrl: URL.createObjectURL(file),
            bank: bank.name,
            bankAccent: bank.accent,
          };
        });
        return [...prev, ...next];
      });
    },
    [],
  );

  const removeStaged = (index: number) => {
    setStaged((prev) => {
      const item = prev[index];
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearStaged = () => {
    revokeAll(staged);
    setStaged([]);
  };

  const submit = () => {
    if (staged.length > 0) onUpload(staged.map((s) => s.file));
  };

  useEffect(() => {
    const el = zoneRef.current;
    if (!el) return;
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) {
        e.preventDefault();
        addFiles(files);
      }
    };
    el.addEventListener("paste", onPaste);
    return () => el.removeEventListener("paste", onPaste);
  }, [addFiles]);

  const entityOptions: { id: HermesEntityHint; label: string; accent: string; sub: string }[] = [
    { id: "auto", label: "Auto-detect", accent: "#a78bfa", sub: "Recommended · Hermes picks Personal vs Avaken" },
    ...ENTITIES.filter((e) => e.id !== "consolidated").map((e) => ({
      id: e.id as HermesEntityHint,
      label: e.label,
      accent: e.accent,
      sub: e.description,
    })),
  ];

  return (
    <div ref={zoneRef} className="space-y-5 outline-none" tabIndex={0}>
      <div className="rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Daily workflow:</span> drop every banking screenshot
          from today in one go — Hermes extracts all transactions in a single pass.
        </p>
      </div>

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
                style={{
                  background: opt.accent,
                  boxShadow: entityHint === opt.id ? `0 0 8px ${opt.accent}` : undefined,
                }}
              />
              <span className="text-sm font-medium">{opt.label}</span>
            </div>
            <p className="mt-1 pl-4 text-[11px] text-muted-foreground">{opt.sub}</p>
          </button>
        ))}
      </div>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && !disabled && inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "group relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed px-6 py-14 transition-all sm:min-h-[320px]",
          dragging
            ? "border-primary bg-primary/[0.08] scale-[1.01]"
            : "border-border-strong bg-card/40 hover:border-primary/50 hover:bg-primary/[0.04]",
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
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.06),transparent_55%)]" />
        <div className="relative flex max-w-xl flex-col items-center text-center">
          <div className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-border-strong bg-elevated/80 shadow-lg transition-transform group-hover:scale-105">
            <Upload className="size-7 text-primary" />
          </div>
          <p className="text-lg font-semibold leading-snug sm:text-xl">
            Drop all your banking screenshots here
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Starling, RBS, Barclays, Amex, Apple Pay, Tide, and more — or click to browse
          </p>
          <p className="mt-4 text-xs text-subtle">
            Up to {SCREENSHOT_MAX_FILES} images · paste from clipboard (⌘V) · JPEG, PNG, WebP, HEIC
          </p>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Shield className="size-3.5 text-primary/80" />
            Processed on your VPS · never stored on Avaken
          </p>
        </div>
      </div>

      {staged.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">
              {staged.length} of {SCREENSHOT_MAX_FILES} screenshots ready
            </p>
            <button
              type="button"
              onClick={clearStaged}
              disabled={disabled}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {staged.map((item, i) => (
              <div
                key={`${item.file.name}-${i}`}
                className="group relative overflow-hidden rounded-lg border border-border/80 bg-surface/60"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewUrl}
                  alt={item.file.name}
                  className="aspect-[4/3] w-full object-cover object-top"
                />
                <span
                  className="absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[9px] font-semibold backdrop-blur-md"
                  style={{
                    background: "rgba(7,8,11,0.75)",
                    color: item.bankAccent,
                  }}
                >
                  {item.bank}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeStaged(i);
                  }}
                  className="absolute right-1 top-1 rounded-md bg-background/80 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {staged.length < SCREENSHOT_MAX_FILES && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
                className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border-strong text-subtle hover:border-primary/40 hover:text-muted-foreground"
              >
                <ImagePlus className="size-5" />
                <span className="text-[10px]">Add more</span>
              </button>
            )}
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={submit}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-2xl py-5 text-lg font-semibold transition-all",
              "bg-primary text-primary-foreground",
              "shadow-[0_0_0_1px_rgba(16,185,129,0.4),0_12px_40px_-12px_rgba(16,185,129,0.55)]",
              "hover:bg-emerald",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            <Sparkles className="size-5" />
            {disabled
              ? "Hermes is analysing…"
              : `Analyse ${staged.length} screenshot${staged.length === 1 ? "" : "s"}`}
          </button>
        </div>
      )}
    </div>
  );
}
