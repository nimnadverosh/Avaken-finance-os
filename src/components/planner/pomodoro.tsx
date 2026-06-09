"use client";

import { useEffect, useRef, useState } from "react";
import { Coffee, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlanner } from "@/lib/planner/store";

const FOCUS_MIN = 25;
const BREAK_MIN = 5;

export function Pomodoro({ variant = "rail" }: { variant?: "rail" | "focus" }) {
  const { incrementPomodoro, pomodoroCount } = usePlanner();
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_MIN * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = (mode === "focus" ? FOCUS_MIN : BREAK_MIN) * 60;

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          // Session finished — flip mode.
          if (mode === "focus") incrementPomodoro();
          const nextMode = mode === "focus" ? "break" : "focus";
          setMode(nextMode);
          setRunning(false);
          return (nextMode === "focus" ? FOCUS_MIN : BREAK_MIN) * 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, mode, incrementPomodoro]);

  const reset = () => {
    setRunning(false);
    setSecondsLeft(total);
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const progress = 1 - secondsLeft / total;

  if (variant === "focus") {
    const size = 220;
    const stroke = 6;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    return (
      <div className="flex flex-col items-center gap-5">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={mode === "focus" ? "#10b981" : "#38bdf8"}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - progress)}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-semibold tabular tracking-tight">
              {mm}:{ss}
            </span>
            <span className="mt-1 flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-subtle">
              {mode === "focus" ? <Timer className="size-3" /> : <Coffee className="size-3" />}
              {mode}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRunning((r) => !r)}
            className="flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground shadow-[0_8px_24px_-8px_rgba(16,185,129,0.6)] transition-colors hover:bg-emerald"
          >
            {running ? <Pause className="size-4" /> : <Play className="size-4" />}
            {running ? "Pause" : "Start"}
          </button>
          <button
            onClick={reset}
            className="grid size-11 place-items-center rounded-xl border border-border-strong bg-white/[0.02] text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>
        <p className="text-[11px] text-subtle">{pomodoroCount} focus sessions completed</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-white/[0.02] p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {mode === "focus" ? (
            <Timer className="size-3.5 text-primary" />
          ) : (
            <Coffee className="size-3.5 text-info" />
          )}
          <span className="text-xs font-medium capitalize">{mode}</span>
        </div>
        <span className="text-2xl font-semibold tabular tracking-tight">
          {mm}:{ss}
        </span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={cn("h-full rounded-full transition-all duration-1000", mode === "focus" ? "bg-primary" : "bg-info")}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="mt-2.5 flex items-center gap-1.5">
        <button
          onClick={() => setRunning((r) => !r)}
          className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/[0.05] text-xs font-medium text-foreground transition-colors hover:bg-white/[0.08]"
        >
          {running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          {running ? "Pause" : "Start"}
        </button>
        <button
          onClick={reset}
          aria-label="Reset timer"
          className="grid size-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-white/[0.06] hover:text-foreground"
        >
          <RotateCcw className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
