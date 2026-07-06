"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { setActiveAssumptions } from "@/lib/finance/assumptions";
import { ICOverrides, MarketSnapshot, mergeAssumptions } from "@/lib/finance/market";

interface MarketContextValue {
  snapshot: MarketSnapshot | null;
  overrides: ICOverrides | null;
}

const MarketContext = createContext<MarketContextValue>({ snapshot: null, overrides: null });

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function MarketProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MarketContextValue>({ snapshot: null, overrides: null });

  useEffect(() => {
    let cancelled = false;
    const grab = <T,>(path: string): Promise<T | null> =>
      fetch(`${BASE}${path}`, { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<T>) : null))
        .catch(() => null);

    Promise.all([
      grab<MarketSnapshot>("/data/market-snapshot.json"),
      grab<ICOverrides>("/data/ic-overrides.json"),
    ]).then(([snapshot, overrides]) => {
      if (cancelled || (!snapshot && !overrides)) return;
      // Precedence: IC overrides > daily snapshot > static priors.
      setActiveAssumptions(mergeAssumptions(snapshot, overrides));
      setState({ snapshot, overrides });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return <MarketContext.Provider value={state}>{children}</MarketContext.Provider>;
}

export function useMarket(): MarketContextValue {
  return useContext(MarketContext);
}
