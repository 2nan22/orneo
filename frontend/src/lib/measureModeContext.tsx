// frontend/src/lib/measureModeContext.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { MeasureMode } from "@/components/ui/MeasurementToggle";

const STORAGE_KEY = "orneo_measure_mode";

interface MeasureModeContextValue {
  measureMode: MeasureMode;
  setMeasureMode: (mode: MeasureMode) => void;
}

const MeasureModeContext = createContext<MeasureModeContextValue>({
  measureMode: "level",
  setMeasureMode: () => {},
});

export function MeasureModeProvider({ children }: { children: React.ReactNode }) {
  const [measureMode, setMeasureModeState] = useState<MeasureMode>("level");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "score" || stored === "level") {
      setMeasureModeState(stored);
    }
  }, []);

  function setMeasureMode(mode: MeasureMode) {
    setMeasureModeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }

  return (
    <MeasureModeContext.Provider value={{ measureMode, setMeasureMode }}>
      {children}
    </MeasureModeContext.Provider>
  );
}

export function useMeasureMode(): MeasureModeContextValue {
  return useContext(MeasureModeContext);
}
