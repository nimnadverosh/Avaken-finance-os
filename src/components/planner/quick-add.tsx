"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, CornerDownLeft, Inbox, Sun } from "lucide-react";
import { usePlanner } from "@/lib/planner/store";
import { addDayKey, todayKey, formatDuration } from "@/lib/planner/dates";

/** Parses a trailing duration token ("30m", "1h", "90") out of the raw text. */
function parseDuration(text: string): { title: string; duration: number | null } {
  const match = text.match(/\s(\d{1,3})\s*(m|min|h|hr)?$/i);
  if (!match) return { title: text, duration: null };
  const n = parseInt(match[1], 10);
  const unit = (match[2] ?? "m").toLowerCase();
  const minutes = unit.startsWith("h") ? n * 60 : n;
  return { title: text.slice(0, match.index).trim(), duration: minutes };
}

export function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addTask } = usePlanner();
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue("");
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const parsed = useMemo(() => parseDuration(value.trim()), [value]);
  const cleanTitle = parsed.title || value.trim();

  if (!open) return null;

  const add = (day: string | null) => {
    if (!cleanTitle) return;
    addTask({ title: cleanTitle, day, duration: parsed.duration });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[16vh]">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
      <div className="glass-strong relative w-full max-w-md overflow-hidden rounded-2xl shadow-[0_32px_64px_-24px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-3 border-b border-border/50 px-4">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                add(null);
              } else if (e.key === "Enter") {
                e.preventDefault();
                add(todayKey());
              }
            }}
            placeholder="Add a task…"
            className="h-14 w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-subtle"
          />
          {parsed.duration && (
            <span className="shrink-0 rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-medium tabular text-primary">
              {formatDuration(parsed.duration)}
            </span>
          )}
        </div>

        {cleanTitle && (
          <div className="p-2">
            <Row icon={<Sun className="size-4 text-warning" />} label="Today" hint="↵" onClick={() => add(todayKey())} />
            <Row icon={<CalendarDays className="size-4 text-info" />} label="Tomorrow" onClick={() => add(addDayKey(todayKey(), 1))} />
            <Row icon={<Inbox className="size-4 text-muted-foreground" />} label="Brain Dump" hint="⌘↵" onClick={() => add(null)} />
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
    >
      {icon}
      <span className="flex-1 truncate text-sm text-foreground">{label}</span>
      {hint ? (
        <span className="rounded border border-border-strong bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-subtle">{hint}</span>
      ) : (
        <CornerDownLeft className="size-3.5 text-subtle opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}
