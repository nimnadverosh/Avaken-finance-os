"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { addDayKey, todayKey } from "./dates";
import type { NewTaskInput, PlannerState, PlannerTask } from "./types";

const STORAGE_KEY = "avaken.planner.v2";

/* ------------------------------------------------------------------ */
/*  Seed — a calm starter so the planner never feels empty             */
/* ------------------------------------------------------------------ */

function buildSeed(): PlannerState {
  const today = todayKey();
  const tomorrow = addDayKey(today, 1);
  let order = 0;
  const t = (
    title: string,
    day: string | null,
    opts: { done?: boolean; duration?: number | null } = {},
  ): PlannerTask => ({
    id: crypto.randomUUID(),
    title,
    done: opts.done ?? false,
    duration: opts.duration ?? null,
    day,
    order: order++,
    createdAt: Date.now() - order * 1000,
    completedAt: opts.done ? Date.now() - 3_600_000 : null,
  });

  return {
    tasks: [
      t("Review Tide balance", today, { duration: 15 }),
      t("Deep work block", today, { duration: 90 }),
      t("Reply to TikTok Shop emails", today, { done: true }),
      t("Approve Q4 VAT figures", tomorrow, { duration: 45 }),
      t("Gym", tomorrow),
      // Brain Dump
      t("Call accountant re: dividends", null),
      t("Book flights for March", null),
      t("Idea: automate monthly P&L export", null),
    ],
  };
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

interface PlannerContextValue extends PlannerState {
  hydrated: boolean;
  addTask: (input: NewTaskInput) => string;
  updateTask: (id: string, patch: Partial<PlannerTask>) => void;
  toggleDone: (id: string) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, day: string | null) => void;
  reorderTask: (id: string, day: string | null, beforeId: string | null) => void;
  tasksForDay: (day: string) => PlannerTask[];
  inboxTasks: () => PlannerTask[];
}

const PlannerContext = createContext<PlannerContextValue | null>(null);

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlannerState>({ tasks: [] });
  const [hydrated, setHydrated] = useState(false);
  const orderCounter = useRef(0);

  useEffect(() => {
    let loaded: PlannerState | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) loaded = JSON.parse(raw) as PlannerState;
    } catch {
      loaded = null;
    }
    const initial = loaded ?? buildSeed();
    orderCounter.current = initial.tasks.reduce((m, t) => Math.max(m, t.order), 0) + 1;
    setState(initial);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* non-fatal */
    }
  }, [state, hydrated]);

  const nextOrder = useCallback(() => orderCounter.current++, []);

  const addTask = useCallback(
    (input: NewTaskInput) => {
      const id = crypto.randomUUID();
      const task: PlannerTask = {
        id,
        title: input.title.trim(),
        done: false,
        duration: input.duration ?? null,
        day: input.day ?? null,
        order: nextOrder(),
        createdAt: Date.now(),
        completedAt: null,
      };
      setState((s) => ({ tasks: [...s.tasks, task] }));
      return id;
    },
    [nextOrder],
  );

  const updateTask = useCallback((id: string, patch: Partial<PlannerTask>) => {
    setState((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  }, []);

  const toggleDone = useCallback((id: string) => {
    setState((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id
          ? { ...t, done: !t.done, completedAt: !t.done ? Date.now() : null }
          : t,
      ),
    }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setState((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  }, []);

  const moveTask = useCallback((id: string, day: string | null) => {
    setState((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, day } : t)),
    }));
  }, []);

  const reorderTask = useCallback(
    (id: string, day: string | null, beforeId: string | null) => {
      setState((s) => {
        const moving = s.tasks.find((t) => t.id === id);
        if (!moving) return s;
        const container = s.tasks
          .filter((t) => t.day === day && t.id !== id)
          .sort((a, b) => a.order - b.order);
        const idx = beforeId ? container.findIndex((t) => t.id === beforeId) : container.length;
        const insertAt = idx === -1 ? container.length : idx;
        const reordered = [
          ...container.slice(0, insertAt),
          { ...moving, day },
          ...container.slice(insertAt),
        ];
        const orderMap = new Map(reordered.map((t, i) => [t.id, i]));
        return {
          tasks: s.tasks.map((t) =>
            orderMap.has(t.id) ? { ...t, day, order: orderMap.get(t.id)! } : t,
          ),
        };
      });
    },
    [],
  );

  const tasksForDay = useCallback(
    (day: string) =>
      state.tasks
        .filter((t) => t.day === day)
        .sort((a, b) => Number(a.done) - Number(b.done) || a.order - b.order),
    [state.tasks],
  );

  const inboxTasks = useCallback(
    () =>
      state.tasks
        .filter((t) => t.day === null && !t.done)
        .sort((a, b) => a.order - b.order),
    [state.tasks],
  );

  const value = useMemo<PlannerContextValue>(
    () => ({
      ...state,
      hydrated,
      addTask,
      updateTask,
      toggleDone,
      deleteTask,
      moveTask,
      reorderTask,
      tasksForDay,
      inboxTasks,
    }),
    [
      state,
      hydrated,
      addTask,
      updateTask,
      toggleDone,
      deleteTask,
      moveTask,
      reorderTask,
      tasksForDay,
      inboxTasks,
    ],
  );

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error("usePlanner must be used within PlannerProvider");
  return ctx;
}
