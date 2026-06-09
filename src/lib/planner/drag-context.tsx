"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface DragContextValue {
  draggingId: string | null;
  startDrag: (id: string) => void;
  endDrag: () => void;
}

const DragContext = createContext<DragContextValue | null>(null);

export function DragProvider({ children }: { children: React.ReactNode }) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const startDrag = useCallback((id: string) => setDraggingId(id), []);
  const endDrag = useCallback(() => setDraggingId(null), []);
  const value = useMemo(
    () => ({ draggingId, startDrag, endDrag }),
    [draggingId, startDrag, endDrag],
  );
  return <DragContext.Provider value={value}>{children}</DragContext.Provider>;
}

export function useDrag() {
  const ctx = useContext(DragContext);
  if (!ctx) throw new Error("useDrag must be used within DragProvider");
  return ctx;
}
