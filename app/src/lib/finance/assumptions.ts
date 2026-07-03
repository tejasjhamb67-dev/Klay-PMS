import { SleeveAssumption, SleeveId, SleeveMeta } from "./types";

/**
 * Long-run nominal capital market assumptions (INR).
 * These are the single source of truth for every projection in the app —
 * replace with Klay's official IC assumptions when available.
 */
export const ASSUMPTIONS: Record<SleeveId, SleeveAssumption> = {
  equities: {
    expectedReturn: 0.12,
    volatility: 0.165,
    exitCost: 0.011, // STCG/LTCG drag + impact cost on exit
    illiquidity: 0.05,
    equityBeta: 1.0,
    ratesBeta: -0.01,
  },
  fixedIncome: {
    expectedReturn: 0.073,
    volatility: 0.045,
    exitCost: 0.004,
    illiquidity: 0.1,
    equityBeta: 0.05,
    ratesBeta: -0.045, // ~4.5y duration book
  },
  alternatives: {
    expectedReturn: 0.145,
    volatility: 0.2,
    exitCost: 0.025, // exit loads / secondary discounts on AIF & PE
    illiquidity: 0.7,
    equityBeta: 0.55,
    ratesBeta: -0.015,
  },
  tactical: {
    expectedReturn: 0.115,
    volatility: 0.18,
    exitCost: 0.008,
    illiquidity: 0.1,
    equityBeta: 0.6,
    ratesBeta: -0.005,
  },
  cash: {
    expectedReturn: 0.062,
    volatility: 0.005,
    exitCost: 0.0,
    illiquidity: 0.0,
    equityBeta: 0.0,
    ratesBeta: 0.002,
  },
};

/** Sleeve-level correlation matrix, order = SLEEVE_IDS. */
export const CORRELATIONS: number[][] = [
  // eq    fi    alt   tac   cash
  [1.0, 0.1, 0.6, 0.7, 0.0], // equities
  [0.1, 1.0, 0.15, 0.1, 0.2], // fixed income
  [0.6, 0.15, 1.0, 0.5, 0.0], // alternatives
  [0.7, 0.1, 0.5, 1.0, 0.0], // tactical
  [0.0, 0.2, 0.0, 0.0, 1.0], // cash
];

export const RISK_FREE_RATE = 0.065;

/** Annual advisory fee charged by Klay on portfolio value. */
export const KLAY_FEE = 0.02;

export const SLEEVES: Record<SleeveId, SleeveMeta> = {
  equities: {
    id: "equities",
    label: "Equities",
    shortLabel: "EQ",
    description: "Listed equity across PMS strategies, mid-cap mandates and global equity.",
  },
  fixedIncome: {
    id: "fixedIncome",
    label: "Fixed Income",
    shortLabel: "FI",
    description: "Corporate credit, sovereign bonds and structured debt.",
  },
  alternatives: {
    id: "alternatives",
    label: "Alternatives",
    shortLabel: "ALT",
    description: "Category II/III AIFs, private markets, REITs & InvITs.",
  },
  tactical: {
    id: "tactical",
    label: "Tactical",
    shortLabel: "TAC",
    description: "Gold, opportunistic and short-horizon positions.",
  },
  cash: {
    id: "cash",
    label: "Cash & Liquid",
    shortLabel: "CASH",
    description: "Liquid and overnight funds for near-term needs.",
  },
};
