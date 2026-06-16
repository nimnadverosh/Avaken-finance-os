import { NextResponse } from "next/server";
import { hasDatabase } from "@/db/index";
import { verifyAppAuth } from "@/lib/auth/session";
import {
  deletePlannerTask,
  readPlannerTasks,
  replacePlannerTasks,
  upsertPlannerTask,
} from "@/lib/db/planner-persistence";
import type { PlannerTask } from "@/lib/planner/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isTask(value: unknown): value is PlannerTask {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.title === "string" &&
    typeof v.done === "boolean" &&
    typeof v.order === "number" &&
    typeof v.createdAt === "number"
  );
}

export async function GET() {
  if (!hasDatabase()) {
    return NextResponse.json({ enabled: false, tasks: [] });
  }

  try {
    const tasks = await readPlannerTasks();
    return NextResponse.json({ enabled: true, tasks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load tasks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = verifyAppAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!hasDatabase()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { tasks?: unknown[] };
    if (!Array.isArray(body.tasks) || !body.tasks.every(isTask)) {
      return NextResponse.json({ error: "Invalid tasks array" }, { status: 400 });
    }

    await replacePlannerTasks(body.tasks);
    return NextResponse.json({ ok: true, count: body.tasks.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save tasks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = verifyAppAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!hasDatabase()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { task?: unknown };
    if (!isTask(body.task)) {
      return NextResponse.json({ error: "Invalid task" }, { status: 400 });
    }

    const saved = await upsertPlannerTask(body.task);
    return NextResponse.json({ task: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = verifyAppAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!hasDatabase()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await deletePlannerTask(id);
  return NextResponse.json({ ok: true });
}
