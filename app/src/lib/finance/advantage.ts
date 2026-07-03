import { KLAY_FEE } from "./assumptions";
import { portfolioStats } from "./engine";
import { Weights } from "./types";

/**
 * The Klay Advantage: what the same starting capital earns DIY vs advised.
 *
 * Both paths start from the same market return for the client's mix.
 * DIY loses to the behaviour gap (mistimed entries/exits — DALBAR-style
 * studies put this at 1.5–2% p.a.), product selection drag and undisciplined
 * rebalancing. The advised path adds Klay's sources of value and subtracts
 * the full 2% fee — the fee is never hidden.
 */
export interface AdvantageAssumptions {
  behaviourGap: number; // return lost to timing mistakes when self-directed
  diyProductDrag: number; // retail share classes / distributor commissions
  rebalancingAlpha: number; // disciplined rebalancing & drift control
  accessAlpha: number; // institutional access: AIFs, primary deals, direct bonds
  taxAlpha: number; // asset location, harvesting, exit sequencing
}

export const DEFAULT_ADVANTAGE: AdvantageAssumptions = {
  behaviourGap: 0.015,
  diyProductDrag: 0.005,
  rebalancingAlpha: 0.006,
  accessAlpha: 0.008,
  taxAlpha: 0.005,
};

export interface AdvantagePoint {
  year: number;
  diy: number;
  klay: number;
  gap: number;
  feesPaid: number; // cumulative fees paid to Klay so far
}

export interface AdvantageResult {
  points: AdvantagePoint[];
  diyRate: number;
  klayRate: number;
  netEdge: number; // klayRate - diyRate
  fee: number;
  components: { label: string; value: number; kind: "gain" | "fee" }[];
}

export function klayAdvantage(
  startValue: number,
  weights: Weights,
  years: number,
  a: AdvantageAssumptions = DEFAULT_ADVANTAGE
): AdvantageResult {
  const market = portfolioStats(weights).geometricReturn;
  const diyRate = market - a.behaviourGap - a.diyProductDrag;
  const klayGross = market + a.rebalancingAlpha + a.accessAlpha + a.taxAlpha;
  const klayRate = klayGross - KLAY_FEE;

  const points: AdvantagePoint[] = [];
  let feesPaid = 0;
  for (let t = 0; t <= years; t++) {
    const klay = startValue * Math.exp(klayRate * t);
    // fee on average portfolio value across the year, approximated on the path
    if (t > 0) feesPaid += KLAY_FEE * startValue * Math.exp(klayRate * (t - 0.5));
    points.push({
      year: t,
      diy: startValue * Math.exp(diyRate * t),
      klay,
      gap: klay - startValue * Math.exp(diyRate * t),
      feesPaid,
    });
  }

  return {
    points,
    diyRate,
    klayRate,
    netEdge: klayRate - diyRate,
    fee: KLAY_FEE,
    components: [
      { label: "Behaviour gap avoided", value: a.behaviourGap, kind: "gain" },
      { label: "Institutional pricing vs retail", value: a.diyProductDrag, kind: "gain" },
      { label: "Access: AIFs, primaries, direct bonds", value: a.accessAlpha, kind: "gain" },
      { label: "Disciplined rebalancing", value: a.rebalancingAlpha, kind: "gain" },
      { label: "Tax-aware structuring", value: a.taxAlpha, kind: "gain" },
      { label: "Klay advisory fee", value: -KLAY_FEE, kind: "fee" },
    ],
  };
}
