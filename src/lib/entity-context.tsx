"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Entity } from "./data/types";

interface EntityConfig {
  id: Entity;
  label: string;
  accent: string;
  description: string;
}

export const ENTITIES: EntityConfig[] = [
  { id: "personal", label: "Personal", accent: "#38bdf8", description: "Starling · RBS · Barclays · eToro" },
  { id: "avaken", label: "Avaken", accent: "#10b981", description: "Avaken Ltd · Tide · TikTok Shop" },
  { id: "consolidated", label: "Consolidated", accent: "#a78bfa", description: "Everything, combined" },
];

interface Ctx {
  entity: Entity;
  setEntity: (e: Entity) => void;
  config: EntityConfig;
}

const EntityContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "avaken.entity";

export function EntityProvider({ children }: { children: React.ReactNode }) {
  const [entity, setEntityState] = useState<Entity>("consolidated");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Entity | null;
    if (stored && ENTITIES.some((e) => e.id === stored)) {
      setEntityState(stored);
    }
  }, []);

  const setEntity = useCallback((e: Entity) => {
    setEntityState(e);
    window.localStorage.setItem(STORAGE_KEY, e);
  }, []);

  const config = ENTITIES.find((e) => e.id === entity)!;

  return (
    <EntityContext.Provider value={{ entity, setEntity, config }}>
      {children}
    </EntityContext.Provider>
  );
}

export function useEntity() {
  const ctx = useContext(EntityContext);
  if (!ctx) throw new Error("useEntity must be used within EntityProvider");
  return ctx;
}
