"use client";

import { useEffect, useState } from "react";
import { Bell, Command, Search } from "lucide-react";
import { EntitySwitcher } from "./entity-switcher";
import { useEntity } from "@/lib/entity-context";
import { greeting } from "@/lib/format";

export function Topbar() {
  const { config } = useEntity();
  // Compute greeting client-side only to avoid SSR/CSR timezone drift.
  const [salutation, setSalutation] = useState<string>("Welcome");
  useEffect(() => setSalutation(greeting()), []);

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/70 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-4 px-5 lg:px-8">
        {/* Greeting */}
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-semibold tracking-tight">
            {salutation}, Director
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            <span style={{ color: config.accent }}>{config.label}</span> · {config.description}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Search */}
          <button className="hidden items-center gap-2 rounded-lg border border-border/80 bg-surface/60 px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground md:flex">
            <Search className="size-3.5" />
            <span>Search…</span>
            <span className="ml-3 flex items-center gap-0.5 rounded border border-border-strong bg-white/[0.04] px-1 py-0.5 text-[10px]">
              <Command className="size-2.5" />K
            </span>
          </button>

          <EntitySwitcher />

          <button className="relative grid size-9 place-items-center rounded-lg border border-border/80 bg-surface/60 text-muted-foreground transition-colors hover:text-foreground">
            <Bell className="size-4" />
            <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" />
          </button>

          {/* Avatar */}
          <button className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-violet to-info text-xs font-semibold text-white shadow-inner">
            DR
          </button>
        </div>
      </div>
    </header>
  );
}
