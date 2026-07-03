// Core domain types for the Klay PMS engine.

export type SleeveId = "equities" | "fixedIncome" | "alternatives" | "tactical" | "cash";

export const SLEEVE_IDS: SleeveId[] = ["equities", "fixedIncome", "alternatives", "tactical", "cash"];

export interface SleeveMeta {
  id: SleeveId;
  label: string;
  shortLabel: string;
  description: string;
}

/** Long-run capital market assumptions for one sleeve (nominal, INR). */
export interface SleeveAssumption {
  /** Expected arithmetic annual return, e.g. 0.115 = 11.5% */
  expectedReturn: number;
  /** Annualised volatility of returns */
  volatility: number;
  /** Blended annual cost of exiting: exit loads, spreads, cap-gains drag (fraction of amount sold) */
  exitCost: number;
  /** 0 (fully liquid, T+1) .. 1 (locked up). Drives liquidity haircut in scenario engine. */
  illiquidity: number;
  /** Sensitivity of sleeve to a broad equity shock (beta to equities) */
  equityBeta: number;
  /** Approx. rupee-duration proxy: % move per +100bp rates */
  ratesBeta: number;
}

export interface Holding {
  id: string;
  name: string;
  sleeve: SleeveId;
  /** Current market value in INR */
  value: number;
  /** Amount originally invested in INR */
  invested: number;
  /** Realised CAGR since inception (the "rate at which it is growing") */
  cagr: number;
  /** Inception date ISO string */
  since: string;
}

export interface ClientPortfolio {
  clientName: string;
  relationshipSince: string;
  baseCurrency: "INR";
  holdings: Holding[];
  /** IPS / mandate target weights, summing to 1 */
  targetWeights: Record<SleeveId, number>;
}

/** Weights by sleeve, summing to 1. */
export type Weights = Record<SleeveId, number>;

export interface PortfolioStats {
  expectedReturn: number; // arithmetic
  geometricReturn: number; // ~ arithmetic - vol^2/2, used for compounding
  volatility: number;
  sharpe: number;
  /** 5% one-year value-at-risk as a return (negative number) */
  var95: number;
  /** Heuristic expected peak-to-trough drawdown over a full cycle */
  expectedDrawdown: number;
}

export interface ProjectionPoint {
  year: number;
  median: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
}
