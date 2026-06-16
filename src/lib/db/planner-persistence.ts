import { eq } from "drizzle-orm";
import { db, hasDatabase } from "@/db/index";
import { plannerTasks } from "@/db/schema";
import type { PlannerTask } from "@/lib/planner/types";

function mapTask(row: typeof plannerTasks.$inferSelect): PlannerTask {
  return {
    id: row.id,
    title: row.title,
    done: row.done,
    duration: row.duration,
    day: row.day,
    order: row.order,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
  };
}

export async function readPlannerTasks(): Promise<PlannerTask[]> {
  if (!hasDatabase()) return [];
  const rows = await db.select().from(plannerTasks).orderBy(plannerTasks.order);
  return rows.map(mapTask);
}

export async function replacePlannerTasks(tasks: PlannerTask[]): Promise<void> {
  if (!hasDatabase()) throw new Error("DATABASE_URL is not configured");

  await db.delete(plannerTasks);

  if (tasks.length === 0) return;

  await db.insert(plannerTasks).values(
    tasks.map((t) => ({
      id: t.id,
      title: t.title,
      done: t.done,
      duration: t.duration,
      day: t.day,
      order: t.order,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
    })),
  );
}

export async function upsertPlannerTask(task: PlannerTask): Promise<PlannerTask> {
  if (!hasDatabase()) throw new Error("DATABASE_URL is not configured");

  await db
    .insert(plannerTasks)
    .values({
      id: task.id,
      title: task.title,
      done: task.done,
      duration: task.duration,
      day: task.day,
      order: task.order,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
    })
    .onConflictDoUpdate({
      target: plannerTasks.id,
      set: {
        title: task.title,
        done: task.done,
        duration: task.duration,
        day: task.day,
        order: task.order,
        completedAt: task.completedAt,
      },
    });

  return task;
}

export async function deletePlannerTask(id: string): Promise<boolean> {
  if (!hasDatabase()) return false;
  await db.delete(plannerTasks).where(eq(plannerTasks.id, id));
  return true;
}

export async function plannerTaskCount(): Promise<number> {
  if (!hasDatabase()) return 0;
  const rows = await db.select({ id: plannerTasks.id }).from(plannerTasks);
  return rows.length;
}
