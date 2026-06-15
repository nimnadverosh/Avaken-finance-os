"use client";

import { useCallback, useRef, useState } from "react";
import { FileSpreadsheet, Shield, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPTED =
  ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

function isExcel(file: File): boolean {
  return /\.(xlsx|xls)$/i.test(file.name);
}

/**
 * Drag-and-drop (or click / browse) zone for monthly TikTok earnings exports.
 * Accepts a single `.xlsx`; rejects non-Excel files with inline guidance.
 */
export function TikTokUploadZone({
  onFile,
  disabled,
  disabledReason,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const file = Array.from(files)[0];
      if (!file) return;
      if (!isExcel(file)) {
        setRejected(`"${file.name}" isn't an Excel file. Upload the .xlsx export from TikTok Shop.`);
        return;
      }
      setRejected(null);
      onFile(file);
    },
    [onFile],
  );

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        onKeyDown={(e) => e.key === "Enter" && !disabled && inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "group relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed px-6 py-14 transition-all sm:min-h-[300px]",
          dragging
            ? "border-primary bg-primary/[0.08] scale-[1.01]"
            : "border-border-strong bg-card/40 hover:border-primary/50 hover:bg-primary/[0.04]",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.06),transparent_55%)]" />
        <div className="relative flex max-w-xl flex-col items-center text-center">
          <div className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-border-strong bg-elevated/80 shadow-lg transition-transform group-hover:scale-105">
            {dragging ? (
              <FileSpreadsheet className="size-7 text-primary" />
            ) : (
              <Upload className="size-7 text-primary" />
            )}
          </div>
          <p className="text-lg font-semibold leading-snug sm:text-xl">
            Drop your monthly TikTok earnings report
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            The <span className="font-medium text-foreground">earningsreport_YYYY_MM…xlsx</span> file
            from TikTok Shop → Affiliate → Earnings — or click to browse
          </p>
          <p className="mt-4 text-xs text-subtle">
            {disabled && disabledReason
              ? disabledReason
              : "Excel .xlsx · parsed instantly in your browser · one month per file"}
          </p>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Shield className="size-3.5 text-primary/80" />
            Nothing leaves your device — parsing is 100% client-side
          </p>
        </div>
      </div>

      {rejected && (
        <p className="rounded-xl border border-negative/30 bg-negative/[0.06] px-4 py-2.5 text-sm text-negative">
          {rejected}
        </p>
      )}
    </div>
  );
}
