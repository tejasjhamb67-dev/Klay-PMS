"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { setActiveAssumptions } from "@/lib/finance/assumptions";
import { MarketSnapshot, mergeAssumptions } from "@/lib/finance/market";

interface MarketContextValue {
  snapshot: MarketSnapshot | null;
}

const MarketContext = createContext<MarketContextValue>({ snapshot: null });

export function MarketProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/data/market-snapshot.json`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((snap: MarketSnapshot | null) => {
        if (!snap || cancelled) return;
        setActiveAssumptions(mergeAssumptions(snap));
        setSnapshot(snap);
      })
      .catch(() => {
        /* static priors remain active — the app never blocks on the feed */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <MarketContext.Provider value={{ snapshot }}>{children}</MarketContext.Provider>;
}

export function useMarket(): MarketContextValue {
  return useContext(MarketContext);
}
