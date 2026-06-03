"use client";

import { ENTITIES, useEntity } from "@/lib/entity-context";
import { cn } from "@/lib/utils";

export function EntitySwitcher() {
  const { entity, setEntity } = useEntity();

  return (
    <div className="relative flex items-center gap-0.5 rounded-xl border border-border/80 bg-surface/70 p-1 backdrop-blur">
      {ENTITIES.map((e) => {
        const active = entity === e.id;
        return (
          <button
            key={e.id}
            onClick={() => setEntity(e.id)}
            className={cn(
              "relative rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <span
                className="absolute inset-0 rounded-lg"
                style={{
                  background: `linear-gradient(180deg, ${e.accent}26, ${e.accent}0d)`,
                  boxShadow: `inset 0 0 0 1px ${e.accent}55`,
                }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              <span
                className="size-1.5 rounded-full transition-opacity"
                style={{ background: e.accent, opacity: active ? 1 : 0.5 }}
              />
              {e.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
