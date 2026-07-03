import { medianValueAt, portfolioStats, riskContributions } from "./engine";
import { PortfolioStats, SLEEVE_IDS, SleeveId, Weights } from "./types";

export interface RebalanceComparison {
  before: PortfolioStats;
  after: PortfolioStats;
  beforeRisk: Record<SleeveId, number>;
  afterRisk: Record<SleeveId, number>;
  /** Median projected value at each checkpoint horizon for both mixes. */
  horizons: { years: number; before: number; after: number; delta: number }[];
  /** Rupee amount to move per sleeve (positive = buy, negative = sell). */
  trades: { sleeve: SleeveId; amount: number }[];
  turnover: number; // total one-way turnover as fraction of portfolio
}

/** Everything a client needs to see before committing to a new mix. */
export function compareRebalance(
  totalValue: number,
  before: Weights,
  after: Weights,
  horizonYears: number[] = [1, 2, 5, 10]
): RebalanceComparison {
  const trades = SLEEVE_IDS.map((s) => ({
    sleeve: s,
    amount: (after[s] - before[s]) * totalValue,
  })).filter((t) => Math.abs(t.amount) > 1);
  const turnover = trades.reduce((s, t) => s + Math.max(t.amount, 0), 0) / totalValue;
  return {
    before: portfolioStats(before),
    after: portfolioStats(after),
    beforeRisk: riskContributions(before),
    afterRisk: riskContributions(after),
    horizons: horizonYears.map((years) => {
      const b = medianValueAt(totalValue, before, years);
      const a = medianValueAt(totalValue, after, years);
      return { years, before: b, after: a, delta: a - b };
    }),
    trades,
    turnover,
  };
}

/** Re-normalise a weight vector after the user drags one sleeve's slider.
 *  The changed sleeve keeps its new value; the rest scale proportionally. */
export function renormalise(weights: Weights, changed: SleeveId, newValue: number): Weights {
  const clamped = Math.min(1, Math.max(0, newValue));
  const othersTotal = SLEEVE_IDS.filter((s) => s !== changed).reduce((s, id) => s + weights[id], 0);
  const remaining = 1 - clamped;
  const out = { ...weights, [changed]: clamped };
  for (const s of SLEEVE_IDS) {
    if (s === changed) continue;
    out[s] = othersTotal > 0 ? (weights[s] / othersTotal) * remaining : remaining / (SLEEVE_IDS.length - 1);
  }
  return out;
}
