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
import type {
  EnergyLevel,
  NewTaskInput,
  PlannerState,
  PlannerTask,
  Recurrence,
} from "./types";

const STORAGE_KEY = "avaken.planner.v1";

/* ------------------------------------------------------------------ */
/*  Finance-linked task suggestions — bridges the planner to Finance OS */
/* ------------------------------------------------------------------ */

export const FINANCE_SUGGESTIONS = [
  { label: "Review Tide balance", href: "/dashboard", tag: "finance" as const },
  { label: "Reconcile transactions", href: "/transactions", tag: "finance" as const },
  { label: "Check VAT position", href: "/vat", tag: "finance" as const },
  { label: "Review affiliate payouts", href: "/affiliates", tag: "finance" as const },
  { label: "Cancel unused subscriptions", href: "/subscriptions", tag: "finance" as const },
  { label: "Rebalance portfolio", href: "/portfolio", tag: "finance" as const },
  { label: "Read AI insights", href: "/insights", tag: "finance" as const },
];

/** One-tap routines that ADHD-friendly planners benefit from re-adding daily. */
export const ROUTINE_SUGGESTIONS: Array<{
  title: string;
  duration: number;
  recurrence: Recurrence;
  energy: EnergyLevel;
  tag: PlannerTask["tag"];
}> = [
  { title: "Morning brain dump + plan", duration: 15, recurrence: "daily", energy: "medium", tag: "admin" },
  { title: "Deep work block", duration: 90, recurrence: "weekdays", energy: "high", tag: "deep" },
  { title: "Inbox zero", duration: 20, recurrence: "weekdays", energy: "low", tag: "admin" },
  { title: "Move your body", duration: 30, recurrence: "daily", energy: "medium", tag: "health" },
  { title: "Weekly money review", duration: 30, recurrence: "weekly", energy: "medium", tag: "finance" },
  { title: "Shutdown + tomorrow's top 3", duration: 10, recurrence: "daily", energy: "low", tag: "admin" },
];

/* ------------------------------------------------------------------ */
/*  Seed data — shown on first load so the planner never feels empty    */
/* ------------------------------------------------------------------ */

function buildSeed(): PlannerState {
  const today = todayKey();
  const tomorrow = addDayKey(today, 1);
  let order = 0;
  const t = (
    partial: Omit<PlannerTask, "id" | "order" | "createdAt" | "completedAt"> &
      Partial<Pick<PlannerTask, "completedAt">>,
  ): PlannerTask => ({
    id: crypto.randomUUID(),
    order: order++,
    createdAt: Date.now() - order * 1000,
    completedAt: partial.done ? Date.now() - 3_600_000 : null,
    ...partial,
  });

  return {
    pomodoroCount: 0,
    energyByDay: { [today]: "high" },
    tasks: [
      t({
        title: "Review Tide balance",
        notes: "Check Avaken Ltd float before payday",
        done: false,
        duration: 15,
        day: today,
        startMinutes: 9 * 60,
        energy: "medium",
        recurrence: "none",
        tag: "finance",
        financeLink: { label: "Review Tide balance", href: "/dashboard" },
      }),
      t({
        title: "Deep work: affiliate dashboard",
        done: false,
        duration: 90,
        day: today,
        startMinutes: 10 * 60,
        energy: "high",
        recurrence: "none",
        tag: "deep",
        financeLink: null,
      }),
      t({
        title: "Reply to TikTok Shop emails",
        done: true,
        duration: 30,
        day: today,
        startMinutes: null,
        energy: "low",
        recurrence: "none",
        tag: "admin",
        financeLink: null,
      }),
      t({
        title: "Approve Q4 VAT figures",
        done: false,
        duration: 45,
        day: tomorrow,
        startMinutes: 11 * 60,
        energy: "high",
        recurrence: "none",
        tag: "finance",
        financeLink: { label: "Check VAT position", href: "/vat" },
      }),
      t({
        title: "Gym",
        done: false,
        duration: 60,
        day: tomorrow,
        startMinutes: null,
        energy: "medium",
        recurrence: "none",
        tag: "health",
        financeLink: null,
      }),
      // Brain dump (inbox) items
      t({
        title: "Idea: automate monthly P&L export",
        done: false,
        duration: 30,
        day: null,
        startMinutes: null,
        energy: null,
        recurrence: "none",
        tag: null,
        financeLink: null,
      }),
      t({
        title: "Call accountant re: dividends",
        done: false,
        duration: 20,
        day: null,
        startMinutes: null,
        energy: null,
        recurrence: "none",
        tag: "finance",
        financeLink: null,
      }),
      t({
        title: "Book flights for March",
        done: false,
        duration: 20,
        day: null,
        startMinutes: null,
        energy: null,
        recurrence: "none",
        tag: "personal",
        financeLink: null,
      }),
    ],
  };
}

/* ------------------------------------------------------------------ */
/*  Recurrence helpers                                                  */
/* ------------------------------------------------------------------ */

function nextRecurrenceDay(day: string, recurrence: Recurrence): string | null {
  if (recurrence === "none") return null;
  if (recurrence === "weekly") return addDayKey(day, 7);
  if (recurrence === "daily") return addDayKey(day, 1);
  // weekdays: skip Sat/Sun
  let next = addDayKey(day, 1);
  for (let i = 0; i < 7; i++) {
    const dow = new Date(next).getDay();
    if (dow !== 0 && dow !== 6) return next;
    next = addDayKey(next, 1);
  }
  return next;
}

/* ------------------------------------------------------------------ */
/*  Context                                                             */
/* ------------------------------------------------------------------ */

interface PlannerContextValue extends PlannerState {
  hydrated: boolean;
  addTask: (input: NewTaskInput) => string;
  updateTask: (id: string, patch: Partial<PlannerTask>) => void;
  toggleDone: (id: string) => void;
  deleteTask: (id: string) => void;
  /** Move a task to a day (or inbox when day is null) and optionally a timebox slot. */
  moveTask: (
    id: string,
    target: { day: string | null; startMinutes?: number | null; order?: number },
  ) => void;
  reorderTask: (id: string, day: string | null, beforeId: string | null) => void;
  setEnergy: (day: string, level: EnergyLevel) => void;
  incrementPomodoro: () => void;
  tasksForDay: (day: string) => PlannerTask[];
  inboxTasks: () => PlannerTask[];
  scheduledForDay: (day: string) => PlannerTask[];
}

const PlannerContext = createContext<PlannerContextValue | null>(null);

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlannerState>({
    tasks: [],
    energyByDay: {},
    pomodoroCount: 0,
  });
  const [hydrated, setHydrated] = useState(false);
  const orderCounter = useRef(0);

  // Hydrate from localStorage (or seed) after mount to avoid SSR mismatch.
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

  // Persist on every change once hydrated.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full / unavailable — non-fatal */
    }
  }, [state, hydrated]);

  const nextOrder = useCallback(() => orderCounter.current++, []);

  const addTask = useCallback(
    (input: NewTaskInput) => {
      const id = crypto.randomUUID();
      const task: PlannerTask = {
        id,
        title: input.title.trim(),
        notes: input.notes,
        done: false,
        duration: input.duration ?? 30,
        day: input.day ?? null,
        startMinutes: input.startMinutes ?? null,
        energy: input.energy ?? null,
        recurrence: input.recurrence ?? "none",
        tag: input.tag ?? null,
        financeLink: input.financeLink ?? null,
        order: nextOrder(),
        createdAt: Date.now(),
        completedAt: null,
      };
      setState((s) => ({ ...s, tasks: [...s.tasks, task] }));
      return id;
    },
    [nextOrder],
  );

  const updateTask = useCallback((id: string, patch: Partial<PlannerTask>) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  }, []);

  const toggleDone = useCallback(
    (id: string) => {
      setState((s) => {
        const task = s.tasks.find((t) => t.id === id);
        if (!task) return s;
        const nowDone = !task.done;
        let tasks = s.tasks.map((t) =>
          t.id === id
            ? { ...t, done: nowDone, completedAt: nowDone ? Date.now() : null }
            : t,
        );
        // Completing a recurring task spawns its next occurrence automatically.
        if (nowDone && task.recurrence !== "none" && task.day) {
          const next = nextRecurrenceDay(task.day, task.recurrence);
          if (next) {
            tasks = [
              ...tasks,
              {
                ...task,
                id: crypto.randomUUID(),
                done: false,
                completedAt: null,
                day: next,
                order: nextOrder(),
                createdAt: Date.now(),
              },
            ];
          }
        }
        return { ...s, tasks };
      });
    },
    [nextOrder],
  );

  const deleteTask = useCallback((id: string) => {
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
  }, []);

  const moveTask = useCallback(
    (
      id: string,
      target: { day: string | null; startMinutes?: number | null; order?: number },
    ) => {
      setState((s) => ({
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                day: target.day,
                startMinutes:
                  target.startMinutes !== undefined ? target.startMinutes : t.startMinutes,
                order: target.order ?? t.order,
              }
            : t,
        ),
      }));
    },
    [],
  );

  const reorderTask = useCallback(
    (id: string, day: string | null, beforeId: string | null) => {
      setState((s) => {
        const moving = s.tasks.find((t) => t.id === id);
        if (!moving) return s;
        const container = s.tasks
          .filter((t) => t.day === day && t.id !== id)
          .sort((a, b) => a.order - b.order);
        const idx = beforeId
          ? container.findIndex((t) => t.id === beforeId)
          : container.length;
        const insertAt = idx === -1 ? container.length : idx;
        const reordered = [
          ...container.slice(0, insertAt),
          { ...moving, day },
          ...container.slice(insertAt),
        ];
        const orderMap = new Map(reordered.map((t, i) => [t.id, i]));
        return {
          ...s,
          tasks: s.tasks.map((t) =>
            orderMap.has(t.id)
              ? { ...t, day, order: orderMap.get(t.id)! }
              : t,
          ),
        };
      });
    },
    [],
  );

  const setEnergy = useCallback((day: string, level: EnergyLevel) => {
    setState((s) => ({ ...s, energyByDay: { ...s.energyByDay, [day]: level } }));
  }, []);

  const incrementPomodoro = useCallback(() => {
    setState((s) => ({ ...s, pomodoroCount: s.pomodoroCount + 1 }));
  }, []);

  const tasksForDay = useCallback(
    (day: string) =>
      state.tasks
        .filter((t) => t.day === day)
        .sort((a, b) => Number(a.done) - Number(b.done) || a.order - b.order),
    [state.tasks],
  );

  const scheduledForDay = useCallback(
    (day: string) =>
      state.tasks
        .filter((t) => t.day === day && t.startMinutes !== null)
        .sort((a, b) => (a.startMinutes ?? 0) - (b.startMinutes ?? 0)),
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
      setEnergy,
      incrementPomodoro,
      tasksForDay,
      inboxTasks,
      scheduledForDay,
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
      setEnergy,
      incrementPomodoro,
      tasksForDay,
      inboxTasks,
      scheduledForDay,
    ],
  );

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error("usePlanner must be used within PlannerProvider");
  return ctx;
}
