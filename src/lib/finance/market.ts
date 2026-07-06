import { ASSUMPTIONS } from "./assumptions";
import { SleeveAssumption, SLEEVE_IDS, SleeveId } from "./types";

/**
 * Shape of app/public/data/market-snapshot.json, produced daily by
 * scripts/fetch-market-data.mjs (GitHub Actions, 19:00 IST after close).
 * The app treats it as data, never as a hard dependency.
 */
export interface MarketSnapshot {
  asOf: string; // trading date the closes belong to
  generatedAt: string;
  source: "live" | "fixture";
  raw: {
    nifty: { level: number; dayChangePct: number };
    niftyPe: number | null;
    niftyDivYield: number | null;
    gsec10Y: number; // decimal, e.g. 0.0662
    tbill: number;
    cpiYoY: number; // decimal
    usdInr: { level: number; dayChangePct: number };
    goldEtf: { level: number; dayChangePct: number };
  };
  derived: {
    sleeves: Record<SleeveId, { expectedReturn: number; volatility: number }>;
    notes: string[];
  };
}

/** IC pins from public/data/ic-overrides.json — the top of the precedence
 *  chain: IC overrides > daily snapshot > static priors. */
export interface ICOverrides {
  updatedAt: string;
  note?: string;
  sleeves: Partial<
    Record<SleeveId, { expectedReturn?: number; volatility?: number; note?: string; setBy?: string }>
  >;
}

/** Merge live-derived return/risk onto the static priors, then apply IC pins
 *  on top (frictions, betas and liquidity always come from the priors/IC). */
export function mergeAssumptions(
  snapshot: MarketSnapshot | null,
  overrides?: ICOverrides | null
): Record<SleeveId, SleeveAssumption> {
  return Object.fromEntries(
    SLEEVE_IDS.map((s) => {
      const pin = overrides?.sleeves?.[s];
      return [
        s,
        {
          ...ASSUMPTIONS[s],
          expectedReturn:
            pin?.expectedReturn ?? snapshot?.derived.sleeves[s]?.expectedReturn ?? ASSUMPTIONS[s].expectedReturn,
          volatility: pin?.volatility ?? snapshot?.derived.sleeves[s]?.volatility ?? ASSUMPTIONS[s].volatility,
        },
      ];
    })
  ) as Record<SleeveId, SleeveAssumption>;
}
