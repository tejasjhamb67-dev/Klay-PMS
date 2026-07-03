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

/** Merge live-derived return/risk onto the static priors (frictions, betas
 *  and liquidity characteristics always come from the priors/IC). */
export function mergeAssumptions(snapshot: MarketSnapshot): Record<SleeveId, SleeveAssumption> {
  return Object.fromEntries(
    SLEEVE_IDS.map((s) => [
      s,
      {
        ...ASSUMPTIONS[s],
        expectedReturn: snapshot.derived.sleeves[s]?.expectedReturn ?? ASSUMPTIONS[s].expectedReturn,
        volatility: snapshot.derived.sleeves[s]?.volatility ?? ASSUMPTIONS[s].volatility,
      },
    ])
  ) as Record<SleeveId, SleeveAssumption>;
}
