import { CORRELATIONS, getAssumptions, RISK_FREE_RATE } from "./assumptions";
import {
  Cashflow,
  ClientPortfolio,
  Holding,
  PortfolioStats,
  ProjectionPoint,
  SLEEVE_IDS,
  SleeveId,
  Weights,
} from "./types";

// ---------- Portfolio composition ----------

export function totalValue(holdings: Holding[]): number {
  return holdings.reduce((s, h) => s + h.value, 0);
}

export function sleeveValues(holdings: Holding[]): Record<SleeveId, number> {
  const out = Object.fromEntries(SLEEVE_IDS.map((s) => [s, 0])) as Record<SleeveId, number>;
  for (const h of holdings) out[h.sleeve] += h.value;
  return out;
}

export function currentWeights(portfolio: ClientPortfolio): Weights {
  const values = sleeveValues(portfolio.holdings);
  const total = totalValue(portfolio.holdings);
  return Object.fromEntries(SLEEVE_IDS.map((s) => [s, total > 0 ? values[s] / total : 0])) as Weights;
}

/** Value-weighted realised CAGR per sleeve — "the rate at which it is growing". */
export function sleeveGrowthRates(holdings: Holding[]): Record<SleeveId, number> {
  const out = Object.fromEntries(SLEEVE_IDS.map((s) => [s, 0])) as Record<SleeveId, number>;
  const values = sleeveValues(holdings);
  for (const h of holdings) {
    if (values[h.sleeve] > 0) out[h.sleeve] += h.cagr * (h.value / values[h.sleeve]);
  }
  return out;
}

export function portfolioCagr(holdings: Holding[]): number {
  const total = totalValue(holdings);
  return holdings.reduce((s, h) => s + h.cagr * (h.value / total), 0);
}

// ---------- Risk / return statistics ----------

/** Full covariance-based stats for any weight vector. */
export function portfolioStats(weights: Weights): PortfolioStats {
  const w = SLEEVE_IDS.map((s) => weights[s] ?? 0);
  const er = SLEEVE_IDS.reduce((s, id, i) => s + w[i] * getAssumptions()[id].expectedReturn, 0);
  let variance = 0;
  for (let i = 0; i < SLEEVE_IDS.length; i++) {
    for (let j = 0; j < SLEEVE_IDS.length; j++) {
      variance +=
        w[i] * w[j] * CORRELATIONS[i][j] * getAssumptions()[SLEEVE_IDS[i]].volatility * getAssumptions()[SLEEVE_IDS[j]].volatility;
    }
  }
  const vol = Math.sqrt(Math.max(variance, 0));
  const geometric = er - (vol * vol) / 2;
  return {
    expectedReturn: er,
    geometricReturn: geometric,
    volatility: vol,
    sharpe: vol > 0 ? (er - RISK_FREE_RATE) / vol : 0,
    var95: er - 1.645 * vol,
    expectedDrawdown: -Math.min(0.95, vol * 2.2),
  };
}

/**
 * Percentage risk contribution per sleeve: how much of total portfolio
 * variance each sleeve is responsible for. Sums to 1.
 */
export function riskContributions(weights: Weights): Record<SleeveId, number> {
  const w = SLEEVE_IDS.map((s) => weights[s] ?? 0);
  const contrib: number[] = SLEEVE_IDS.map((_, i) => {
    let cov = 0;
    for (let j = 0; j < SLEEVE_IDS.length; j++) {
      cov += w[j] * CORRELATIONS[i][j] * getAssumptions()[SLEEVE_IDS[i]].volatility * getAssumptions()[SLEEVE_IDS[j]].volatility;
    }
    return w[i] * cov;
  });
  const total = contrib.reduce((s, c) => s + c, 0);
  return Object.fromEntries(
    SLEEVE_IDS.map((s, i) => [s, total > 0 ? contrib[i] / total : 0])
  ) as Record<SleeveId, number>;
}

// ---------- Projections ----------

const Z = { p10: -1.2816, p25: -0.6745, p75: 0.6745, p90: 1.2816 };

/**
 * Lognormal wealth projection: median compounds at the geometric rate,
 * percentile bands widen with sigma * sqrt(t). Annual net drag (e.g. fees)
 * is subtracted from the geometric rate before compounding.
 */
export function projectWealth(
  startValue: number,
  weights: Weights,
  years: number,
  options?: { annualDrag?: number; stepsPerYear?: number }
): ProjectionPoint[] {
  const stats = portfolioStats(weights);
  const g = stats.geometricReturn - (options?.annualDrag ?? 0);
  const sigma = stats.volatility;
  const steps = options?.stepsPerYear ?? (years <= 5 ? 4 : 1);
  const points: ProjectionPoint[] = [];
  for (let i = 0; i <= years * steps; i++) {
    const t = i / steps;
    const drift = g * t;
    const spread = sigma * Math.sqrt(t);
    points.push({
      year: t,
      median: startValue * Math.exp(drift),
      p10: startValue * Math.exp(drift + Z.p10 * spread),
      p25: startValue * Math.exp(drift + Z.p25 * spread),
      p75: startValue * Math.exp(drift + Z.p75 * spread),
      p90: startValue * Math.exp(drift + Z.p90 * spread),
    });
  }
  return points;
}

/** Point-in-time projected median value after `years`. */
export function medianValueAt(startValue: number, weights: Weights, years: number, annualDrag = 0): number {
  const stats = portfolioStats(weights);
  return startValue * Math.exp((stats.geometricReturn - annualDrag) * years);
}

// ---------- Cashflow-aware projections (Monte Carlo) ----------

/** Income-shock overlay: scale contingent flows by `factor` for `years`. */
export interface IncomeShock {
  target: "salary" | "business";
  factor: number; // 0 = stops entirely, 0.5 = halved
  years: number;
}

/** Signed net flow during year index `y` (0 = the coming year), in rupees. */
export function netFlowAt(cashflows: Cashflow[], y: number, shock?: IncomeShock): number {
  let net = 0;
  for (const cf of cashflows) {
    if (y < cf.startYear || (cf.endYear !== null && y >= cf.endYear)) continue;
    let amount = cf.amountPerYear * Math.pow(1 + cf.growthRate, y - cf.startYear);
    if (shock && cf.contingent === shock.target && y < shock.years) amount *= shock.factor;
    net += cf.kind === "inflow" ? amount : -amount;
  }
  return net;
}

// Deterministic RNG so charts are stable across renders.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Wealth projection with cashflows layered on the stochastic growth path.
 * Closed-form lognormal breaks once money moves in and out, so we simulate:
 * yearly steps, log-returns ~ N(geometric, sigma), flows landing mid-year,
 * paths floored at zero (ruin is allowed to show up, not hidden).
 */
export function projectWealthWithFlows(
  startValue: number,
  weights: Weights,
  years: number,
  cashflows: Cashflow[],
  options?: { shock?: IncomeShock; paths?: number; seed?: number }
): ProjectionPoint[] {
  const stats = portfolioStats(weights);
  const g = stats.geometricReturn;
  const sigma = stats.volatility;
  const nPaths = options?.paths ?? 1500;
  const rand = mulberry32(options?.seed ?? 20260703);

  const values = new Float64Array(nPaths).fill(startValue);
  const points: ProjectionPoint[] = [
    { year: 0, median: startValue, p10: startValue, p25: startValue, p75: startValue, p90: startValue },
  ];

  for (let t = 1; t <= years; t++) {
    const flow = netFlowAt(cashflows, t - 1, options?.shock);
    for (let p = 0; p < nPaths; p++) {
      // Box-Muller
      const u1 = Math.max(rand(), 1e-12);
      const u2 = rand();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const r = g + sigma * z;
      values[p] = Math.max(0, values[p] * Math.exp(r) + flow * Math.exp(r / 2));
    }
    const sorted = Array.from(values).sort((a, b) => a - b);
    const q = (frac: number) => sorted[Math.min(nPaths - 1, Math.floor(frac * nPaths))];
    points.push({ year: t, median: q(0.5), p10: q(0.1), p25: q(0.25), p75: q(0.75), p90: q(0.9) });
  }
  return points;
}

export interface IncomeShockResult {
  base: ProjectionPoint[];
  shocked: ProjectionPoint[];
  netFlowNowBase: number;
  netFlowNowShocked: number;
  wealth10yBase: number;
  wealth10yShocked: number;
  delta10y: number;
  /** Years of net spending covered by cash + fixed income if the shock hits
   *  today — how long before a single equity unit must be sold. Infinity if
   *  the shocked flows are still net positive. */
  runwayYears: number;
}

/** What a job loss / dividend cut does to the wealth path and to liquidity. */
export function analyseIncomeShock(
  startValue: number,
  weights: Weights,
  liquidAssets: number,
  cashflows: Cashflow[],
  shock: IncomeShock,
  years = 15
): IncomeShockResult {
  const base = projectWealthWithFlows(startValue, weights, years, cashflows);
  const shocked = projectWealthWithFlows(startValue, weights, years, cashflows, { shock });
  const at = (pts: ProjectionPoint[], y: number) => pts[Math.min(y, pts.length - 1)].median;
  const netFlowNowShocked = netFlowAt(cashflows, 0, shock);
  return {
    base,
    shocked,
    netFlowNowBase: netFlowAt(cashflows, 0),
    netFlowNowShocked,
    wealth10yBase: at(base, 10),
    wealth10yShocked: at(shocked, 10),
    delta10y: at(shocked, 10) - at(base, 10),
    runwayYears: netFlowNowShocked >= 0 ? Infinity : liquidAssets / -netFlowNowShocked,
  };
}
