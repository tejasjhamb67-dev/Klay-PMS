"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { CLIENTS, DEFAULT_CLIENT_ID, getClient } from "@/lib/data/clients";
import { ClientProfile } from "@/lib/finance/types";
import { useMarket } from "./market-context";

interface ClientContextValue {
  client: ClientProfile;
  clients: ClientProfile[];
  setClientId: (id: string) => void;
}

const ClientContext = createContext<ClientContextValue | null>(null);

const STORAGE_KEY = "klay-selected-client";

export function ClientProvider({ children }: { children: ReactNode }) {
  const [clientId, setClientId] = useState(DEFAULT_CLIENT_ID);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && CLIENTS.some((c) => c.id === saved)) setClientId(saved);
  }, []);

  const select = (id: string) => {
    setClientId(id);
    window.localStorage.setItem(STORAGE_KEY, id);
  };

  return (
    <ClientContext.Provider value={{ client: getClient(clientId), clients: CLIENTS, setClientId: select }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient(): ClientContextValue {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error("useClient must be used inside ClientProvider");
  // Subscribe every consumer to market data too: when the daily snapshot
  // loads and swaps the active assumptions, all pages recompute.
  useMarket();
  return ctx;
}
