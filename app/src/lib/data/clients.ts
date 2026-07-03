import { ClientProfile } from "../finance/types";

/**
 * Ten hypothetical client relationships from the Klay IC Notes (June 2026).
 * Arvind Jain, Suresh Dalmia and Karan Nair carry the exact current-vs-proposed
 * allocations from their detailed IC pages; the remaining seven are constructed
 * to match their mandate line on the IC cover (mandate, corpus, life stage).
 * `targetWeights` is the Klay-proposed IPS allocation; holdings are the
 * client's CURRENT portfolio, so every screen shows current vs proposed.
 */
export const CLIENTS: ClientProfile[] = [
  {
    id: "arvind",
    cashflows: [
      { id: "cf1", label: "Director income — invested surplus", kind: "inflow", amountPerYear: 3.0e6, startYear: 0, endYear: null, growthRate: 0.05, contingent: "business" },
      { id: "cf2", label: "Household expenses", kind: "outflow", amountPerYear: 2.2e6, startYear: 0, endYear: null, growthRate: 0.06 },
      { id: "cf3", label: "Son's education (Year 2)", kind: "outflow", amountPerYear: 3.6e6, startYear: 2, endYear: 3, growthRate: 0 },
      { id: "cf4", label: "Daughter's education (Year 3)", kind: "outflow", amountPerYear: 3.0e6, startYear: 3, endYear: 4, growthRate: 0 },
    ],
    clientName: "Arvind Jain",
    mandate: "Pre-Exit Business Owner",
    horizon: "6–7 years (pre-exit)",
    thesis:
      "The only liquid 18% of a business-owner's net worth must work differently from the illiquid 80% — capital security and income bridge today, full reconstruction at exit.",
    relationshipSince: "2026-01-01",
    baseCurrency: "INR",
    targetWeights: { equities: 0.25, fixedIncome: 0.6, alternatives: 0.12, tactical: 0.03, cash: 0 },
    holdings: [
      { id: "a1", name: "Bank FDs (fragmented)", sleeve: "fixedIncome", value: 2.2e7, invested: 2.05e7, cagr: 0.064, since: "2022-04-01" },
      { id: "a2", name: "LIC Endowment Policies", sleeve: "fixedIncome", value: 0.18e7, invested: 0.16e7, cagr: 0.045, since: "2018-06-01" },
      { id: "a3", name: "Regular-Plan Debt MFs", sleeve: "fixedIncome", value: 0.59e7, invested: 0.55e7, cagr: 0.062, since: "2023-01-15" },
      { id: "a4", name: "Regular-Plan Equity MFs", sleeve: "equities", value: 1.4e7, invested: 1.05e7, cagr: 0.115, since: "2021-08-01" },
      { id: "a5", name: "Direct Equity (mixed sectors)", sleeve: "equities", value: 0.42e7, invested: 0.33e7, cagr: 0.124, since: "2022-02-01" },
      { id: "a6", name: "Sovereign Gold Bonds", sleeve: "alternatives", value: 0.55e7, invested: 0.4e7, cagr: 0.112, since: "2021-11-01" },
      { id: "a7", name: "Savings & Sweep", sleeve: "cash", value: 0.16e7, invested: 0.16e7, cagr: 0.035, since: "2022-04-01" },
    ],
  },
  {
    id: "suresh",
    cashflows: [
      { id: "cf1", label: "Family drawdown (0.7% WR)", kind: "outflow", amountPerYear: 3.6e6, startYear: 0, endYear: null, growthRate: 0.06 },
    ],
    clientName: "Suresh Dalmia",
    mandate: "Post-Exit First-Time Investor",
    horizon: "30+ years (perpetuity-lite)",
    thesis:
      "At 0.7% withdrawal and a 30-year horizon, every month of FD-only positioning destroys real wealth permanently — the highest-risk decision is choosing not to invest in equity.",
    relationshipSince: "2026-04-01",
    baseCurrency: "INR",
    targetWeights: { equities: 0.52, fixedIncome: 0.32, alternatives: 0.12, tactical: 0.04, cash: 0 },
    holdings: [
      { id: "s1", name: "Bank FDs (exit proceeds)", sleeve: "fixedIncome", value: 50e7, invested: 47e7, cagr: 0.064, since: "2025-01-01" },
      { id: "s2", name: "Savings & Sweep", sleeve: "cash", value: 2e7, invested: 2e7, cagr: 0.035, since: "2025-01-01" },
    ],
  },
  {
    id: "karan",
    cashflows: [
      { id: "cf1", label: "AED salary savings — SIP", kind: "inflow", amountPerYear: 1.65e6, startYear: 0, endYear: null, growthRate: 0.08, contingent: "salary" },
      { id: "cf2", label: "Children's education (Years 7–8)", kind: "outflow", amountPerYear: 2.5e6, startYear: 7, endYear: 9, growthRate: 0 },
    ],
    clientName: "Karan Nair",
    mandate: "NRI UAE Accumulator",
    horizon: "8–10 years (accumulation)",
    thesis:
      "AED salary is the fixed income sleeve — the portfolio has one job: maximum equity accumulation toward a ₹6–7 Cr India return corpus, with zero income generation obligation.",
    relationshipSince: "2026-02-01",
    baseCurrency: "INR",
    targetWeights: { equities: 0.65, fixedIncome: 0.2, alternatives: 0.12, tactical: 0.03, cash: 0 },
    holdings: [
      { id: "k1", name: "NRE Fixed Deposits", sleeve: "fixedIncome", value: 1.1e7, invested: 1.0e7, cagr: 0.0675, since: "2022-09-01" },
      { id: "k2", name: "NRO Fixed Deposits", sleeve: "fixedIncome", value: 0.62e7, invested: 0.58e7, cagr: 0.045, since: "2023-03-01" },
      { id: "k3", name: "Nifty 500 Index MF (NRE)", sleeve: "equities", value: 0.58e7, invested: 0.45e7, cagr: 0.132, since: "2022-12-01" },
    ],
  },
  {
    id: "priya",
    cashflows: [
      { id: "cf1", label: "USD salary savings — remitted", kind: "inflow", amountPerYear: 2.0e6, startYear: 0, endYear: null, growthRate: 0.07, contingent: "salary" },
    ],
    clientName: "Priya Krishnaswamy",
    mandate: "NRI US Citizen — PFIC-Constrained",
    horizon: "12–15 years",
    thesis:
      "US tax residency makes Indian mutual funds punitive (PFIC) — the mandate is direct equity and PMS structures that compound in India without triggering US tax drag.",
    relationshipSince: "2026-03-01",
    baseCurrency: "INR",
    targetWeights: { equities: 0.55, fixedIncome: 0.28, alternatives: 0.12, tactical: 0.03, cash: 0.02 },
    holdings: [
      { id: "p1", name: "T-Bills & NRO FDs", sleeve: "fixedIncome", value: 6e7, invested: 5.7e7, cagr: 0.052, since: "2023-06-01" },
      { id: "p2", name: "Direct India Equity (PFIC-safe)", sleeve: "equities", value: 7.5e7, invested: 5.8e7, cagr: 0.128, since: "2021-10-01" },
      { id: "p3", name: "Savings & Sweep", sleeve: "cash", value: 1.5e7, invested: 1.5e7, cagr: 0.038, since: "2023-06-01" },
    ],
  },
  {
    id: "meena",
    cashflows: [
      { id: "cf1", label: "Living expenses", kind: "outflow", amountPerYear: 1.2e6, startYear: 0, endYear: null, growthRate: 0.06 },
    ],
    clientName: "Meena Agarwal",
    mandate: "Retiree Widow — Two-Bucket",
    horizon: "20+ years (income first)",
    thesis:
      "A guaranteed income bucket covering ten years of expenses buys the emotional permission for the growth bucket to ride out any market — income certainty is the product.",
    relationshipSince: "2026-01-15",
    baseCurrency: "INR",
    targetWeights: { equities: 0.2, fixedIncome: 0.68, alternatives: 0.08, tactical: 0, cash: 0.04 },
    holdings: [
      { id: "m1", name: "SCSS + Post Office MIS", sleeve: "fixedIncome", value: 0.45e7, invested: 0.45e7, cagr: 0.082, since: "2020-04-01" },
      { id: "m2", name: "Bank FDs", sleeve: "fixedIncome", value: 0.95e7, invested: 0.88e7, cagr: 0.064, since: "2021-01-01" },
      { id: "m3", name: "Dividend-Plan Equity MFs", sleeve: "equities", value: 0.3e7, invested: 0.24e7, cagr: 0.1, since: "2019-07-01" },
      { id: "m4", name: "Savings Account", sleeve: "cash", value: 0.15e7, invested: 0.15e7, cagr: 0.035, since: "2020-04-01" },
    ],
  },
  {
    id: "bose",
    cashflows: [
      { id: "cf1", label: "Lifestyle & gifting", kind: "outflow", amountPerYear: 3.0e6, startYear: 0, endYear: null, growthRate: 0.05 },
    ],
    clientName: "Rajiv & Sunita Bose",
    mandate: "Retired Couple — Legacy Mandate",
    horizon: "25+ years (multi-generation)",
    thesis:
      "Income needs are already covered — the real client is the next generation, so the estate sleeve compounds in growth assets while the income sleeve never touches equity risk.",
    relationshipSince: "2025-11-01",
    baseCurrency: "INR",
    targetWeights: { equities: 0.35, fixedIncome: 0.45, alternatives: 0.15, tactical: 0.03, cash: 0.02 },
    holdings: [
      { id: "b1", name: "Bond & FD Ladder", sleeve: "fixedIncome", value: 3.5e7, invested: 3.3e7, cagr: 0.066, since: "2021-05-01" },
      { id: "b2", name: "Blue-chip MFs & Stocks", sleeve: "equities", value: 4e7, invested: 2.9e7, cagr: 0.118, since: "2019-09-01" },
      { id: "b3", name: "REIT & Property Fund", sleeve: "alternatives", value: 1.2e7, invested: 1.05e7, cagr: 0.09, since: "2022-06-01" },
      { id: "b4", name: "Savings & Sweep", sleeve: "cash", value: 0.8e7, invested: 0.8e7, cagr: 0.035, since: "2021-05-01" },
    ],
  },
  {
    id: "haresh",
    cashflows: [
      { id: "cf1", label: "Business dividends", kind: "inflow", amountPerYear: 1.5e7, startYear: 0, endYear: null, growthRate: 0.05, contingent: "business" },
      { id: "cf2", label: "Family office expenses", kind: "outflow", amountPerYear: 6.0e6, startYear: 0, endYear: null, growthRate: 0.06 },
    ],
    clientName: "Haresh Shah",
    mandate: "Family Office — Diamond Export",
    horizon: "10+ years (business-linked)",
    thesis:
      "With the operating business supplying concentrated cyclical equity risk, the family office portfolio is the diversifier — fixed income depth and non-correlated alternatives before listed equity.",
    relationshipSince: "2024-08-01",
    baseCurrency: "INR",
    targetWeights: { equities: 0.32, fixedIncome: 0.4, alternatives: 0.18, tactical: 0.06, cash: 0.04 },
    holdings: [
      { id: "h1", name: "PMS & Direct Equity", sleeve: "equities", value: 20e7, invested: 15e7, cagr: 0.13, since: "2021-04-01" },
      { id: "h2", name: "Bond Ladder & FDs", sleeve: "fixedIncome", value: 18e7, invested: 16.8e7, cagr: 0.068, since: "2021-04-01" },
      { id: "h3", name: "AIF Cat II (PE)", sleeve: "alternatives", value: 8e7, invested: 6e7, cagr: 0.16, since: "2022-01-01" },
      { id: "h4", name: "Gold & SGB", sleeve: "tactical", value: 4e7, invested: 3.1e7, cagr: 0.112, since: "2021-09-01" },
      { id: "h5", name: "Liquid Funds", sleeve: "cash", value: 2e7, invested: 2e7, cagr: 0.06, since: "2021-04-01" },
    ],
  },
  {
    id: "mehta",
    cashflows: [
      { id: "cf1", label: "Family distributions (2% WR)", kind: "outflow", amountPerYear: 4.0e7, startYear: 0, endYear: null, growthRate: 0.05 },
    ],
    clientName: "Mehta Family",
    mandate: "Family Office — Perpetuity",
    horizon: "Perpetual (multi-generation)",
    thesis:
      "A perpetuity mandate answers to the withdrawal rate, not the market cycle — majority growth assets, institutional alternatives access, and distribution discipline across generations.",
    relationshipSince: "2019-04-01",
    baseCurrency: "INR",
    targetWeights: { equities: 0.52, fixedIncome: 0.22, alternatives: 0.2, tactical: 0.04, cash: 0.02 },
    holdings: [
      { id: "f1", name: "Klay PMS, Index & International Equity", sleeve: "equities", value: 95e7, invested: 62e7, cagr: 0.135, since: "2019-04-01" },
      { id: "f2", name: "Sovereign & Corporate Bond Book", sleeve: "fixedIncome", value: 55e7, invested: 49e7, cagr: 0.071, since: "2019-04-01" },
      { id: "f3", name: "AIF / PE Vintages & REITs", sleeve: "alternatives", value: 35e7, invested: 24e7, cagr: 0.155, since: "2020-06-01" },
      { id: "f4", name: "Gold & Opportunistic", sleeve: "tactical", value: 10e7, invested: 8e7, cagr: 0.11, since: "2019-10-01" },
      { id: "f5", name: "Liquid & Overnight", sleeve: "cash", value: 5e7, invested: 5e7, cagr: 0.06, since: "2019-04-01" },
    ],
  },
  {
    id: "ananya",
    cashflows: [
      { id: "cf1", label: "Salary savings", kind: "inflow", amountPerYear: 3.0e6, startYear: 0, endYear: null, growthRate: 0.1, contingent: "salary" },
      { id: "cf2", label: "ESOP vesting (4 more years)", kind: "inflow", amountPerYear: 2.5e6, startYear: 0, endYear: 4, growthRate: 0, contingent: "salary" },
    ],
    clientName: "Ananya Reddy",
    mandate: "HNI Salaried — ESOP Concentration",
    horizon: "15+ years (accumulation)",
    thesis:
      "Salary, career and 76% of the portfolio all depend on one employer — every incremental rupee must diversify away from the stock she already can't avoid holding.",
    relationshipSince: "2026-05-01",
    baseCurrency: "INR",
    targetWeights: { equities: 0.55, fixedIncome: 0.28, alternatives: 0.1, tactical: 0.04, cash: 0.03 },
    holdings: [
      { id: "n1", name: "Employer ESOP / RSUs", sleeve: "equities", value: 2.9e7, invested: 1.4e7, cagr: 0.18, since: "2020-07-01" },
      { id: "n2", name: "Index Funds", sleeve: "equities", value: 0.35e7, invested: 0.28e7, cagr: 0.124, since: "2022-10-01" },
      { id: "n3", name: "Bank FDs", sleeve: "fixedIncome", value: 0.35e7, invested: 0.33e7, cagr: 0.064, since: "2023-02-01" },
      { id: "n4", name: "Savings Account", sleeve: "cash", value: 0.2e7, invested: 0.2e7, cagr: 0.035, since: "2023-02-01" },
    ],
  },
  {
    id: "arjun",
    cashflows: [
      { id: "cf1", label: "Living expenses", kind: "outflow", amountPerYear: 5.0e6, startYear: 0, endYear: null, growthRate: 0.06 },
    ],
    clientName: "Arjun Khanna",
    mandate: "Sudden Wealth — Two-Bucket",
    horizon: "25+ years",
    thesis:
      "Sudden wealth fails through speed, not markets — a decade of lifestyle certainty gets locked in first, then the growth bucket is deployed in phases the owner can emotionally survive.",
    relationshipSince: "2026-06-01",
    baseCurrency: "INR",
    targetWeights: { equities: 0.45, fixedIncome: 0.4, alternatives: 0.1, tactical: 0.03, cash: 0.02 },
    holdings: [
      { id: "j1", name: "Short-Term FDs", sleeve: "fixedIncome", value: 14e7, invested: 13.6e7, cagr: 0.064, since: "2025-09-01" },
      { id: "j2", name: "Savings & Sweep", sleeve: "cash", value: 6e7, invested: 6e7, cagr: 0.035, since: "2025-09-01" },
      { id: "j3", name: "Index Funds", sleeve: "equities", value: 2e7, invested: 1.9e7, cagr: 0.124, since: "2025-12-01" },
    ],
  },
];

export const DEFAULT_CLIENT_ID = "arvind";

export function getClient(id: string): ClientProfile {
  return CLIENTS.find((c) => c.id === id) ?? CLIENTS[0];
}
