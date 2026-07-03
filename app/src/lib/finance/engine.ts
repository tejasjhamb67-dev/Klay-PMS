import { ASSUMPTIONS, CORRELATIONS, RISK_FREE_RATE } from "./assumptions";
import {
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
  const er = SLEEVE_IDS.reduce((s, id, i) => s + w[i] * ASSUMPTIONS[id].expectedReturn, 0);
  let variance = 0;
  for (let i = 0; i < SLEEVE_IDS.length; i++) {
    for (let j = 0; j < SLEEVE_IDS.length; j++) {
      variance +=
        w[i] * w[j] * CORRELATIONS[i][j] * ASSUMPTIONS[SLEEVE_IDS[i]].volatility * ASSUMPTIONS[SLEEVE_IDS[j]].volatility;
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
      cov += w[j] * CORRELATIONS[i][j] * ASSUMPTIONS[SLEEVE_IDS[i]].volatility * ASSUMPTIONS[SLEEVE_IDS[j]].volatility;
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
