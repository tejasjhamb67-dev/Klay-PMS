import { ASSUMPTIONS } from "./assumptions";
import { medianValueAt, portfolioStats } from "./engine";
import { SLEEVE_IDS, SleeveId, Weights } from "./types";

/*
 * The Scenario Lab rests on two general engines, because every scenario a
 * client can imagine reduces to one of two mathematical shapes (or both):
 *
 *  1. A CASH NEED  — "raise ₹C by time T" (education, house, wedding,
 *     medical, business). Solved by the marginal-cost liquidity optimiser.
 *  2. A MARKET SHOCK — "the world moves" (crash, rate hike, inflation, INR
 *     crisis, war, disaster). Solved by a macro factor model: five factors,
 *     each sleeve with a sensitivity to each, so ANY combination — named
 *     replay or hand-built — propagates consistently through the portfolio.
 *
 * Compound scenarios ("crisis hits AND the wedding is next year") chain the
 * two: shock the values first, then run the liquidity plan on what remains.
 */

// ============================================================
// 1 · MACRO FACTOR MODEL
// ============================================================

export interface MacroShock {
  /** Broad equity market move, e.g. -0.45 = −45% */
  equity: number;
  /** Parallel interest-rate move in basis points, e.g. +200 */
  ratesBp: number;
  /** Inflation surprise in percentage points, e.g. +3 */
  inflationPp: number;
  /** INR depreciation vs USD, e.g. 0.15 = rupee weakens 15% */
  inrDepreciation: number;
  /** Liquidity crunch severity 0–1: spreads blow out, illiquids gap down */
  liquidityCrunch: number;
}

export const ZERO_SHOCK: MacroShock = { equity: 0, ratesBp: 0, inflationPp: 0, inrDepreciation: 0, liquidityCrunch: 0 };

/** How each sleeve responds to each factor (immediate mark-to-market). */
interface FactorBetas {
  equity: number; // per 1.00 broad-equity move
  per100bp: number; // per +100bp rates (duration effect)
  perPpInflation: number; // per +1pp inflation surprise
  fx: number; // per 1.00 (100%) INR depreciation
  liquidity: number; // per full-severity crunch
}

const BETAS: Record<SleeveId, FactorBetas> = {
  // Listed equity: full market beta; hurt by rate spikes and inflation
  // surprises; mild net FX gain (exporters, global sleeve); sold hard in
  // liquidity crunches.
  equities: { equity: 1.0, per100bp: -0.035, perPpInflation: -0.015, fx: 0.05, liquidity: -0.12 },
  // Bonds: duration is the story (~4.5y book); small equity spillover via
  // credit; inflation erodes; crunches widen spreads.
  fixedIncome: { equity: 0.04, per100bp: -0.045, perPpInflation: -0.008, fx: -0.01, liquidity: -0.04 },
  // AIF/PE/REIT: roughly half equity beta, real-asset inflation protection,
  // but the biggest casualty of a liquidity crunch (marks gap, exits freeze).
  alternatives: { equity: 0.55, per100bp: -0.02, perPpInflation: 0.01, fx: 0.03, liquidity: -0.22 },
  // Gold-heavy tactical: low equity beta, RISES with inflation and INR
  // weakness (gold is priced in USD) — the portfolio's crisis hedge.
  tactical: { equity: 0.25, per100bp: -0.008, perPpInflation: 0.02, fx: 0.35, liquidity: -0.05 },
  // Cash: immune; earns slightly more when rates rise.
  cash: { equity: 0, per100bp: 0.002, perPpInflation: -0.002, fx: 0, liquidity: 0 },
};

const FACTOR_LABELS: { key: keyof MacroShock; label: string }[] = [
  { key: "equity", label: "Equity market" },
  { key: "ratesBp", label: "Interest rates" },
  { key: "inflationPp", label: "Inflation" },
  { key: "inrDepreciation", label: "Rupee (FX)" },
  { key: "liquidityCrunch", label: "Liquidity crunch" },
];

function sleeveShockPct(sleeve: SleeveId, s: MacroShock): number {
  const b = BETAS[sleeve];
  const pct =
    b.equity * s.equity +
    b.per100bp * (s.ratesBp / 100) +
    b.perPpInflation * s.inflationPp +
    b.fx * s.inrDepreciation +
    b.liquidity * s.liquidityCrunch;
  return sleeve === "cash" ? Math.max(pct, -0.01) : Math.max(pct, -0.95);
}

export interface StressResult {
  sleeveImpacts: { sleeve: SleeveId; pct: number; amount: number }[];
  /** Rupee impact attributed to each macro factor — "what drove it" */
  factorContributions: { label: string; amount: number }[];
  totalImpactPct: number;
  totalImpactAmount: number;
  valueAfter: number;
  /** Years for the median path to recover the loss (0 if no loss) */
  recoveryYears: number;
}

export function runShock(values: Record<SleeveId, number>, shock: MacroShock): StressResult {
  const total = SLEEVE_IDS.reduce((s, id) => s + values[id], 0);
  const weights = Object.fromEntries(
    SLEEVE_IDS.map((s) => [s, total > 0 ? values[s] / total : 0])
  ) as Weights;

  const sleeveImpacts = SLEEVE_IDS.map((s) => {
    const pct = sleeveShockPct(s, shock);
    return { sleeve: s, pct, amount: values[s] * pct };
  });

  const factorContributions = FACTOR_LABELS.map(({ key, label }) => {
    const iso: MacroShock = { ...ZERO_SHOCK, [key]: shock[key] };
    const amount = SLEEVE_IDS.reduce((sum, s) => sum + values[s] * sleeveShockPct(s, iso), 0);
    return { label, amount };
  }).filter((f) => Math.abs(f.amount) > total * 0.0005);

  const totalImpactAmount = sleeveImpacts.reduce((s, i) => s + i.amount, 0);
  const totalImpactPct = total > 0 ? totalImpactAmount / total : 0;
  const valueAfter = total + totalImpactAmount;
  const g = portfolioStats(weights).geometricReturn;
  const recoveryYears = totalImpactAmount < 0 && valueAfter > 0 ? Math.log(total / valueAfter) / g : 0;

  return { sleeveImpacts, factorContributions, totalImpactPct, totalImpactAmount, valueAfter, recoveryYears };
}

/** Apply a shock and return the marked-down sleeve values. */
export function shockedValues(values: Record<SleeveId, number>, shock: MacroShock): Record<SleeveId, number> {
  return Object.fromEntries(
    SLEEVE_IDS.map((s) => [s, values[s] * (1 + sleeveShockPct(s, shock))])
  ) as Record<SleeveId, number>;
}

// ------------------------------------------------------------
// Named scenario library — each is just a point in factor space.
// ------------------------------------------------------------

export type ScenarioGroup = "Historical replays" | "Macro & policy" | "Crisis & shocks";

export interface NamedScenario {
  id: string;
  label: string;
  group: ScenarioGroup;
  description: string;
  shock: MacroShock;
}

export const SCENARIO_LIBRARY: NamedScenario[] = [
  // ---- Historical replays ----
  {
    id: "gfc2008",
    label: "2008 Global Financial Crisis",
    group: "Historical replays",
    description:
      "Credit system seizure: equities −45%, illiquid assets gap down as buyers vanish, central banks slash rates (which lifts bonds), gold catches the fear bid via a weaker rupee.",
    shock: { equity: -0.45, ratesBp: -150, inflationPp: -1, inrDepreciation: 0.08, liquidityCrunch: 0.7 },
  },
  {
    id: "covid2020",
    label: "2020 Pandemic Crash",
    group: "Historical replays",
    description:
      "Nifty −38% in 40 days with a scramble for cash — fast, violent, and fully recovered within a year. Rate cuts cushioned bonds; the crunch hit alternatives hardest.",
    shock: { equity: -0.32, ratesBp: -100, inflationPp: -0.5, inrDepreciation: 0.05, liquidityCrunch: 0.5 },
  },
  {
    id: "taper2013",
    label: "2013 Taper Tantrum",
    group: "Historical replays",
    description:
      "USD/INR fell from ₹54 to ₹68 in five months. The pain came through rates and the rupee, not equities — and gold (USD-priced) was the portfolio's best friend.",
    shock: { equity: -0.1, ratesBp: 150, inflationPp: 1.5, inrDepreciation: 0.2, liquidityCrunch: 0.3 },
  },
  {
    id: "dotcom2000",
    label: "2000 Tech Crash",
    group: "Historical replays",
    description:
      "A valuation reset concentrated in one sector: deep equity drawdown, but credit and currency stayed orderly — diversified sleeves barely noticed.",
    shock: { equity: -0.35, ratesBp: -100, inflationPp: -0.5, inrDepreciation: 0.02, liquidityCrunch: 0.2 },
  },
  // ---- Macro & policy ----
  {
    id: "ratehike",
    label: "RBI hikes +200bp",
    group: "Macro & policy",
    description:
      "Sticky inflation forces aggressive tightening. Bond prices fall with duration (income improves at the next rollover), equities de-rate, cash finally earns its keep.",
    shock: { equity: -0.1, ratesBp: 200, inflationPp: 1.5, inrDepreciation: 0.02, liquidityCrunch: 0.1 },
  },
  {
    id: "ratecut",
    label: "Easing cycle (−150bp)",
    group: "Macro & policy",
    description:
      "Inflation breaks, RBI cuts. Duration rallies, equity multiples expand — the scenario that rewards staying invested through the previous one.",
    shock: { equity: 0.12, ratesBp: -150, inflationPp: -1.5, inrDepreciation: -0.02, liquidityCrunch: 0 },
  },
  {
    id: "stagflation",
    label: "Stagflation (5 years)",
    group: "Macro & policy",
    description:
      "8% inflation with no growth: the slow-burn scenario. Bonds lose real value, equities compress, but gold and real-asset alternatives carry inflation through.",
    shock: { equity: -0.18, ratesBp: 150, inflationPp: 4, inrDepreciation: 0.1, liquidityCrunch: 0.2 },
  },
  {
    id: "inrcrisis",
    label: "Rupee crisis (−20%)",
    group: "Macro & policy",
    description:
      "Capital flight forces the RBI to defend the currency with emergency hikes. Everything rupee-denominated hurts — except gold and international assets, which are the hedge.",
    shock: { equity: -0.15, ratesBp: 200, inflationPp: 2, inrDepreciation: 0.2, liquidityCrunch: 0.4 },
  },
  {
    id: "creditcrunch",
    label: "Credit crunch",
    group: "Macro & policy",
    description:
      "An IL&FS-style freeze: spreads blow out, redemptions gate, anything illiquid marks down. The clean AAA/G-sec bias of the FI sleeve is exactly for this day.",
    shock: { equity: -0.2, ratesBp: 100, inflationPp: 0, inrDepreciation: 0.05, liquidityCrunch: 0.8 },
  },
  // ---- Crisis & shocks ----
  {
    id: "waroil",
    label: "War & oil shock",
    group: "Crisis & shocks",
    description:
      "Conflict spikes crude: imported inflation, weaker rupee, risk-off equities — and a strong gold bid. India's import bill makes this scenario FX-led.",
    shock: { equity: -0.15, ratesBp: 100, inflationPp: 3, inrDepreciation: 0.08, liquidityCrunch: 0.3 },
  },
  {
    id: "disaster",
    label: "Earthquake / natural disaster",
    group: "Crisis & shocks",
    description:
      "A severe regional disaster: markets dip briefly on disruption and insurance losses, supply chains push prices up modestly. Historically shallow and short for diversified portfolios — the real risk is personal, which is what the emergency reserve is for.",
    shock: { equity: -0.08, ratesBp: 25, inflationPp: 0.8, inrDepreciation: 0.02, liquidityCrunch: 0.15 },
  },
  {
    id: "recession",
    label: "Global recession",
    group: "Crisis & shocks",
    description:
      "Demand rolls over worldwide: earnings fall, central banks ease, credit tightens. A grind rather than a crash — bonds do their job while equities reset.",
    shock: { equity: -0.25, ratesBp: -100, inflationPp: -1, inrDepreciation: 0.06, liquidityCrunch: 0.4 },
  },
  {
    id: "election",
    label: "Election surprise",
    group: "Crisis & shocks",
    description:
      "An unexpected political outcome: a sharp sentiment gap down, modest FX wobble, then fundamentals reassert. Usually measured in weeks, not years.",
    shock: { equity: -0.12, ratesBp: 50, inflationPp: 0, inrDepreciation: 0.05, liquidityCrunch: 0.1 },
  },
  {
    id: "correction",
    label: "Standard correction",
    group: "Crisis & shocks",
    description:
      "A garden-variety −15% equity correction with nothing else broken. Happens every 2–3 years; the portfolio is built to shrug it off.",
    shock: { equity: -0.15, ratesBp: 0, inflationPp: 0, inrDepreciation: 0, liquidityCrunch: 0.05 },
  },
];

// ============================================================
// 2 · LIQUIDITY OPTIMISER (cash needs)
// ============================================================

export interface LiquidityPlanInput {
  amount: number; // cash needed, INR
  /** Years until the cash is needed. 0 = immediately. */
  horizon: number;
  /** Years the client expects to stay invested after the event. */
  investmentHorizon: number;
  values: Record<SleeveId, number>;
  targetWeights: Weights;
}

export interface SleeveWithdrawal {
  sleeve: SleeveId;
  amount: number;
  share: number;
  costPerRupee: number;
}

export interface LiquidityPlan {
  feasible: boolean;
  withdrawals: SleeveWithdrawal[];
  naive: SleeveWithdrawal[];
  optimalFutureValue: number;
  naiveFutureValue: number;
  savings: number;
  frictionCost: number;
  weightsAfter: Weights;
  weightsBefore: Weights;
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
  const growthForegone = Math.exp(a.expectedReturn * yearsInvested) - 1;
  const friction = a.exitCost + a.illiquidity * 0.03;
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

  const withdrawals: SleeveWithdrawal[] = SLEEVE_IDS.filter((s) => sold[s] > raise * 0.001)
    .map((s) => ({
      sleeve: s,
      amount: sold[s],
      share: sold[s] / raise,
      costPerRupee: costPaid[s] / sold[s],
    }))
    .sort((a, b) => b.amount - a.amount);

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

  let reserveAdvice: LiquidityPlan["reserveAdvice"] = null;
  if (input.horizon >= 0.75 && input.horizon <= 3) {
    const stats = portfolioStats(weightsBefore);
    const shortfallRisk = stats.volatility * Math.sqrt(input.horizon);
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

// ============================================================
// 3 · LIFE EVENTS — one-time or multi-year, optionally stressed
// ============================================================

export interface LifeEventPreset {
  id: string;
  label: string;
  perYear: string; // INR shorthand, per instalment
  startYears: number;
  years: number; // 1 = one-time
}

export const LIFE_EVENT_PRESETS: LifeEventPreset[] = [
  { id: "car", label: "New car", perYear: "80L", startYears: 0, years: 1 },
  { id: "house", label: "New house", perYear: "4cr", startYears: 1, years: 1 },
  { id: "edu-abroad", label: "Child's education (abroad)", perYear: "60L", startYears: 2, years: 4 },
  { id: "edu-india", label: "Child's education (India)", perYear: "20L", startYears: 1, years: 4 },
  { id: "wedding", label: "Wedding", perYear: "2cr", startYears: 2, years: 1 },
  { id: "medical", label: "Medical emergency", perYear: "50L", startYears: 0, years: 1 },
  { id: "business", label: "Business infusion", perYear: "6cr", startYears: 0, years: 1 },
  { id: "philanthropy", label: "Philanthropy pledge", perYear: "50L", startYears: 0, years: 5 },
];

export type TrancheTreatment = "sell-now" | "reserve" | "stay-invested";

export interface TranchePlanRow {
  year: number;
  amount: number;
  treatment: TrancheTreatment;
}

export interface EventPlan {
  totalNeed: number;
  needAsShareOfPortfolio: number;
  /** Raised from the portfolio today (tranches due now) */
  sellNow: number;
  /** Present value parked in liquid/short FI today for tranches due in ≤3y */
  reserveNow: number;
  /** Face value of tranches >3y away that stay fully invested */
  stayInvested: number;
  tranches: TranchePlanRow[];
  /** Optimal sourcing for everything that must move today (sellNow + reserveNow) */
  liquidity: LiquidityPlan | null;
}

export interface LifeEventInput {
  perYear: number;
  startYears: number;
  years: number;
  investmentHorizon: number;
  values: Record<SleeveId, number>;
  targetWeights: Weights;
}

export function planLifeEvent(input: LifeEventInput): EventPlan {
  const total = SLEEVE_IDS.reduce((s, id) => s + input.values[id], 0);
  const cashRate = ASSUMPTIONS.cash.expectedReturn;

  const tranches: TranchePlanRow[] = [];
  let sellNow = 0;
  let reserveNow = 0;
  let stayInvested = 0;
  for (let i = 0; i < input.years; i++) {
    const t = input.startYears + i;
    const amount = input.perYear;
    let treatment: TrancheTreatment;
    if (t <= 0) {
      treatment = "sell-now";
      sellNow += amount;
    } else if (t <= 3) {
      treatment = "reserve";
      reserveNow += amount / Math.exp(cashRate * t);
    } else {
      treatment = "stay-invested";
      stayInvested += amount;
    }
    tranches.push({ year: t, amount, treatment });
  }

  const moveToday = sellNow + reserveNow;
  const liquidity =
    moveToday > 0
      ? planLiquidity({
          amount: moveToday,
          horizon: 0,
          investmentHorizon: input.investmentHorizon,
          values: input.values,
          targetWeights: input.targetWeights,
        })
      : null;

  return {
    totalNeed: input.perYear * input.years,
    needAsShareOfPortfolio: total > 0 ? (input.perYear * input.years) / total : 1,
    sellNow,
    reserveNow,
    stayInvested,
    tranches,
    liquidity,
  };
}
