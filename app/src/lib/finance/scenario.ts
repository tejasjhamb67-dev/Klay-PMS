import { ASSUMPTIONS } from "./assumptions";
import { medianValueAt, portfolioStats } from "./engine";
import { SLEEVE_IDS, SleeveId, Weights } from "./types";

/**
 * Generalised liquidity engine.
 *
 * Any life event — a car, a house, a wedding, a business infusion, an
 * emergency — reduces to the same mathematical problem: raise ₹C by time T
 * while destroying as little of the portfolio's future as possible.
 *
 * The engine sells in small slices. Each slice goes to whichever sleeve is
 * cheapest to sell *right now*, where cost per rupee is:
 *
 *   growth foregone over the remaining horizon
 * + exit friction (loads, spreads, tax drag)
 * + illiquidity haircut (forced discount on hard-to-sell assets)
 * + drift penalty (quadratic — grows as a sleeve falls below its target
 *   weight, so no single sleeve gets hollowed out)
 *
 * Because cost is marginal and re-evaluated per slice, the same machinery
 * answers thousands of scenarios: change the amount, the horizon, the urgency
 * or the portfolio and the optimal funding mix changes with it.
 */

export interface LiquidityPlanInput {
  amount: number; // cash needed, INR
  /** Years until the cash is needed. 0 = immediately. */
  horizon: number;
  /** Years the client expects to stay invested after the event (drives growth-foregone). */
  investmentHorizon: number;
  values: Record<SleeveId, number>;
  targetWeights: Weights;
}

export interface SleeveWithdrawal {
  sleeve: SleeveId;
  amount: number;
  share: number; // fraction of the raise
  costPerRupee: number; // average marginal cost paid on this sleeve
}

export interface LiquidityPlan {
  feasible: boolean;
  withdrawals: SleeveWithdrawal[];
  naive: SleeveWithdrawal[]; // pro-rata comparison ("what most people do")
  /** Median portfolio value at the investment horizon: optimal vs pro-rata funding */
  optimalFutureValue: number;
  naiveFutureValue: number;
  savings: number; // rupees preserved by funding it the smart way
  frictionCost: number; // explicit exit costs paid under the optimal plan
  weightsAfter: Weights;
  weightsBefore: Weights;
  /** If the need is 1–3 years out: recommended de-risking reserve to build now. */
  reserveAdvice: { moveNow: number; fundFrom: SleeveId[] } | null;
}

const SLICES = 400;

function marginalCost(
  sleeve: SleeveId,
  values: Record<SleeveId, number>,
  total: number,
  target: Weights,
  yearsInvested: number
): number {
  const a = ASSUMPTIONS[sleeve];
  // Growth given up by not holding this rupee for the remaining horizon
  const growthForegone = Math.exp(a.expectedReturn * yearsInvested) - 1;
  const friction = a.exitCost + a.illiquidity * 0.03;
  // Quadratic drift penalty: selling below target gets progressively expensive
  const weightNow = total > 0 ? values[sleeve] / total : 0;
  const drift = Math.max(0, target[sleeve] - weightNow);
  const driftPenalty = 6 * drift * drift;
  return growthForegone + friction + driftPenalty;
}

export function planLiquidity(input: LiquidityPlanInput): LiquidityPlan {
  const startTotal = SLEEVE_IDS.reduce((s, id) => s + input.values[id], 0);
  const weightsBefore = Object.fromEntries(
    SLEEVE_IDS.map((s) => [s, startTotal > 0 ? input.values[s] / startTotal : 0])
  ) as Weights;

  const feasible = input.amount < startTotal * 0.98;
  const raise = Math.min(input.amount, startTotal * 0.98);
  const slice = raise / SLICES;
  const yearsInvested = Math.max(input.investmentHorizon - input.horizon, 1);

  // --- Optimal: greedy marginal-cost slicing ---
  const values = { ...input.values };
  const sold = Object.fromEntries(SLEEVE_IDS.map((s) => [s, 0])) as Record<SleeveId, number>;
  const costPaid = Object.fromEntries(SLEEVE_IDS.map((s) => [s, 0])) as Record<SleeveId, number>;
  for (let i = 0; i < SLICES; i++) {
    const totalNow = SLEEVE_IDS.reduce((s, id) => s + values[id], 0);
    let best: SleeveId | null = null;
    let bestCost = Infinity;
    for (const s of SLEEVE_IDS) {
      if (values[s] < slice) continue;
      const c = marginalCost(s, values, totalNow, input.targetWeights, yearsInvested);
      if (c < bestCost) {
        bestCost = c;
        best = s;
      }
    }
    if (!best) break;
    values[best] -= slice;
    sold[best] += slice;
    costPaid[best] += bestCost * slice;
  }

  const withdrawals: SleeveWithdrawal[] = SLEEVE_IDS.filter((s) => sold[s] > raise * 0.001).map((s) => ({
    sleeve: s,
    amount: sold[s],
    share: sold[s] / raise,
    costPerRupee: costPaid[s] / sold[s],
  })).sort((a, b) => b.amount - a.amount);

  // --- Naive comparison: pro-rata across current weights ---
  const naiveValues = { ...input.values };
  const naive: SleeveWithdrawal[] = SLEEVE_IDS.filter((s) => weightsBefore[s] > 0.001).map((s) => {
    const amt = raise * weightsBefore[s];
    naiveValues[s] -= amt;
    return {
      sleeve: s,
      amount: amt,
      share: weightsBefore[s],
      costPerRupee:
        Math.exp(ASSUMPTIONS[s].expectedReturn * yearsInvested) - 1 + ASSUMPTIONS[s].exitCost + ASSUMPTIONS[s].illiquidity * 0.03,
    };
  });

  const remainingOptimal = SLEEVE_IDS.reduce((s, id) => s + values[id], 0);
  const remainingNaive = SLEEVE_IDS.reduce((s, id) => s + naiveValues[id], 0);
  const weightsAfter = Object.fromEntries(
    SLEEVE_IDS.map((s) => [s, remainingOptimal > 0 ? values[s] / remainingOptimal : 0])
  ) as Weights;
  const naiveWeights = Object.fromEntries(
    SLEEVE_IDS.map((s) => [s, remainingNaive > 0 ? naiveValues[s] / remainingNaive : 0])
  ) as Weights;

  const frictionOptimal = withdrawals.reduce(
    (s, w) => s + w.amount * (ASSUMPTIONS[w.sleeve].exitCost + ASSUMPTIONS[w.sleeve].illiquidity * 0.03),
    0
  );
  const frictionNaive = naive.reduce(
    (s, w) => s + w.amount * (ASSUMPTIONS[w.sleeve].exitCost + ASSUMPTIONS[w.sleeve].illiquidity * 0.03),
    0
  );

  const optimalFutureValue = medianValueAt(remainingOptimal - frictionOptimal, weightsAfter, yearsInvested);
  const naiveFutureValue = medianValueAt(remainingNaive - frictionNaive, naiveWeights, yearsInvested);

  // --- De-risking advice when the need is dated, not immediate ---
  let reserveAdvice: LiquidityPlan["reserveAdvice"] = null;
  if (input.horizon >= 0.75 && input.horizon <= 3) {
    // Money needed in 1–3 years should not ride equity volatility. Park the
    // present value of the need in cash/short FI now, funded from overweights.
    const eqStats = portfolioStats(weightsBefore);
    const shortfallRisk = eqStats.volatility * Math.sqrt(input.horizon);
    if (shortfallRisk > 0.05) {
      reserveAdvice = {
        moveNow: raise / Math.exp(ASSUMPTIONS.cash.expectedReturn * input.horizon),
        fundFrom: withdrawals.map((w) => w.sleeve).filter((s) => s !== "cash" && s !== "fixedIncome"),
      };
    }
  }

  return {
    feasible,
    withdrawals,
    naive,
    optimalFutureValue,
    naiveFutureValue,
    savings: optimalFutureValue - naiveFutureValue,
    frictionCost: frictionOptimal,
    weightsAfter,
    weightsBefore,
    reserveAdvice,
  };
}

// ---------------- Stress testing ----------------

export interface StressScenario {
  id: string;
  label: string;
  description: string;
  /** Broad equity market shock, e.g. -0.35 */
  equityShock: number;
  /** Parallel rates move in bp, e.g. +200 */
  ratesShockBp: number;
  /** Extra idiosyncratic hit to alternatives (liquidity crunch) */
  altShock: number;
  /** Flight-to-safety bid for cash/gold, applied to tactical */
  tacticalShock: number;
}

export const STRESS_SCENARIOS: StressScenario[] = [
  {
    id: "gfc",
    label: "2008-style crash",
    description: "Global financial crisis replay: equities −45%, credit freezes, alternatives gap down.",
    equityShock: -0.45,
    ratesShockBp: -150,
    altShock: -0.15,
    tacticalShock: 0.05,
  },
  {
    id: "covid",
    label: "Pandemic shock",
    description: "March-2020 style: fast −30% drawdown with a liquidity scramble.",
    equityShock: -0.3,
    ratesShockBp: -100,
    altShock: -0.1,
    tacticalShock: 0.02,
  },
  {
    id: "rates",
    label: "Inflation & rate spike",
    description: "Sticky inflation forces +200bp of hikes; bonds and equities fall together.",
    equityShock: -0.12,
    ratesShockBp: 200,
    altShock: -0.05,
    tacticalShock: 0.08,
  },
  {
    id: "correction",
    label: "Standard correction",
    description: "A garden-variety −15% equity correction. Happens every 2–3 years.",
    equityShock: -0.15,
    ratesShockBp: 0,
    altShock: -0.03,
    tacticalShock: 0.01,
  },
];

export interface StressResult {
  scenario: StressScenario;
  sleeveImpacts: { sleeve: SleeveId; pct: number; amount: number }[];
  totalImpactPct: number;
  totalImpactAmount: number;
  valueAfter: number;
  /** Years for the median path to recover the loss */
  recoveryYears: number;
}

export function runStress(
  values: Record<SleeveId, number>,
  scenario: StressScenario
): StressResult {
  const total = SLEEVE_IDS.reduce((s, id) => s + values[id], 0);
  const weights = Object.fromEntries(
    SLEEVE_IDS.map((s) => [s, total > 0 ? values[s] / total : 0])
  ) as Weights;

  const sleeveImpacts = SLEEVE_IDS.map((s) => {
    const a = ASSUMPTIONS[s];
    let pct = a.equityBeta * scenario.equityShock + a.ratesBeta * (scenario.ratesShockBp / 100);
    if (s === "alternatives") pct += scenario.altShock;
    if (s === "tactical") pct += scenario.tacticalShock;
    if (s === "cash") pct = Math.max(pct, 0);
    return { sleeve: s, pct, amount: values[s] * pct };
  });

  const totalImpactAmount = sleeveImpacts.reduce((s, i) => s + i.amount, 0);
  const totalImpactPct = total > 0 ? totalImpactAmount / total : 0;
  const valueAfter = total + totalImpactAmount;
  const g = portfolioStats(weights).geometricReturn;
  const recoveryYears = totalImpactPct < 0 ? Math.log(total / valueAfter) / g : 0;

  return { scenario, sleeveImpacts, totalImpactPct, totalImpactAmount, valueAfter, recoveryYears };
}
