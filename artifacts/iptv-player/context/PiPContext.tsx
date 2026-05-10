import React, { createContext, useCallback, useContext, useState } from "react";

interface PiPState {
  url: string;
  name: string;
  channelId?: string;
}

interface PiPContextValue {
  pip: PiPState | null;
  startPiP: (url: string, name: string, channelId?: string) => void;
  stopPiP: () => void;
}

const PiPContext = createContext<PiPContextValue | null>(null);

export function PiPProvider({ children }: { children: React.ReactNode }) {
  const [pip, setPip] = useState<PiPState | null>(null);

  const startPiP = useCallback((url: string, name: string, channelId?: string) => {
    setPip({ url, name, channelId });
  }, []);

  const stopPiP = useCallback(() => {
    setPip(null);
  }, []);

  return (
    <PiPContext.Provider value={{ pip, startPiP, stopPiP }}>
      {children}
    </PiPContext.Provider>
  );
}

export function usePiP() {
  const ctx = useContext(PiPContext);
  if (!ctx) throw new Error("usePiP must be used within PiPProvider");
  return ctx;
}
