"use client";

/**
 * Minimal, dependency-free toast.
 *
 * `useToast()` returns a `toast()` trigger plus a `node` you render anywhere in
 * the component tree. The toast portals to <body>, animates in, and auto-dismisses.
 * Kept self-contained so it needs no global provider in the root layout.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

interface ToastState {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

const VARIANTS: Record<ToastVariant, { icon: typeof CheckCircle2; ring: string; text: string }> = {
  success: { icon: CheckCircle2, ring: "border-primary/40 shadow-[0_0_0_1px_rgba(16,185,129,0.25),0_18px_50px_-20px_rgba(16,185,129,0.6)]", text: "text-primary" },
  error: { icon: AlertCircle, ring: "border-negative/40 shadow-[0_0_0_1px_rgba(244,63,94,0.25)]", text: "text-negative" },
  info: { icon: Info, ring: "border-border-strong", text: "text-info" },
};

export function useToast(autoDismissMs = 4500) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => setMounted(true), []);

  const dismiss = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  const show = useCallback(
    (next: { title: string; description?: string; variant?: ToastVariant }) => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      setToast({ id: Date.now(), variant: "success", ...next });
      timerRef.current = window.setTimeout(() => setToast(null), autoDismissMs);
    },
    [autoDismissMs],
  );

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const node =
    mounted && toast
      ? createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
            <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
          </div>,
          document.body,
        )
      : null;

  return { toast: show, dismiss, node };
}

function ToastCard({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  const variant = VARIANTS[toast.variant];
  const Icon = variant.icon;
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border bg-elevated/95 px-4 py-3.5 backdrop-blur-xl",
        "animate-[fade-up_0.3s_ease-out]",
        variant.ring,
      )}
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", variant.text)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-[13px] text-muted-foreground">{toast.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-md p-0.5 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
