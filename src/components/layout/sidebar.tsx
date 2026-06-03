"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LifeBuoy, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { navGroups, navItems } from "@/lib/nav";
import { useEntity } from "@/lib/entity-context";

export function Sidebar() {
  const pathname = usePathname();
  const { config } = useEntity();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-border/70 bg-surface/60 backdrop-blur-xl lg:flex">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="relative grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-emerald shadow-[0_8px_24px_-8px_rgba(16,185,129,0.7)]">
          <span className="text-sm font-bold text-primary-foreground">A</span>
          <span className="absolute -inset-px rounded-xl ring-1 ring-white/20" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">Avaken</div>
          <div className="text-[11px] text-subtle">Finance OS</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group}>
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">
              {group}
            </div>
            <div className="space-y-0.5">
              {navItems
                .filter((i) => i.group === group)
                .map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  const isDailyImport = item.href === "/import/screenshots";
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-white/[0.06] text-foreground"
                          : isDailyImport
                            ? "text-foreground/90 hover:bg-primary/[0.06] hover:text-foreground"
                            : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground",
                      )}
                    >
                      {active && (
                        <span
                          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full"
                          style={{ background: config.accent }}
                        />
                      )}
                      <item.icon
                        className={cn(
                          "size-[18px] shrink-0 transition-colors",
                          active ? "text-foreground" : "text-subtle group-hover:text-muted-foreground",
                        )}
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="space-y-0.5 border-t border-border/70 p-3">
        <Link
          href="https://github.com"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.03] hover:text-foreground"
        >
          <LifeBuoy className="size-[18px] text-subtle" />
          Support
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.03] hover:text-foreground"
        >
          <Settings className="size-[18px] text-subtle" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
