import { ClientPortfolio } from "../finance/types";

/**
 * Demo relationship used until the real data layer is wired up.
 * Structure mirrors what a custodian/fund-accounting feed will provide.
 */
export const DEMO_CLIENT: ClientPortfolio = {
  clientName: "Mehta Family Office",
  relationshipSince: "2019-04-01",
  baseCurrency: "INR",
  targetWeights: {
    equities: 0.5,
    fixedIncome: 0.3,
    alternatives: 0.12,
    tactical: 0.05,
    cash: 0.03,
  },
  holdings: [
    // Equities — ₹13.0 Cr
    { id: "eq1", name: "Klay Core Equity PMS", sleeve: "equities", value: 8.5e7, invested: 6.2e7, cagr: 0.138, since: "2019-04-01" },
    { id: "eq2", name: "Klay Emerging Leaders (Mid-cap)", sleeve: "equities", value: 3.0e7, invested: 2.1e7, cagr: 0.162, since: "2020-01-15" },
    { id: "eq3", name: "Global Equity Feeder", sleeve: "equities", value: 1.5e7, invested: 1.3e7, cagr: 0.081, since: "2021-06-10" },
    // Fixed income — ₹7.0 Cr
    { id: "fi1", name: "Corporate Bond Ladder (AAA/AA+)", sleeve: "fixedIncome", value: 4.0e7, invested: 3.5e7, cagr: 0.074, since: "2019-08-01" },
    { id: "fi2", name: "Gilt & SDL Portfolio", sleeve: "fixedIncome", value: 2.0e7, invested: 1.8e7, cagr: 0.068, since: "2020-03-01" },
    { id: "fi3", name: "Structured Credit Note", sleeve: "fixedIncome", value: 1.0e7, invested: 0.9e7, cagr: 0.092, since: "2022-02-01" },
    // Alternatives — ₹3.0 Cr
    { id: "alt1", name: "Klay Private Opportunities AIF II", sleeve: "alternatives", value: 2.0e7, invested: 1.5e7, cagr: 0.158, since: "2020-09-01" },
    { id: "alt2", name: "REIT & InvIT Basket", sleeve: "alternatives", value: 1.0e7, invested: 0.95e7, cagr: 0.088, since: "2022-07-01" },
    // Tactical — ₹1.5 Cr
    { id: "tac1", name: "Sovereign Gold Bonds", sleeve: "tactical", value: 0.9e7, invested: 0.6e7, cagr: 0.124, since: "2019-11-01" },
    { id: "tac2", name: "Opportunistic Momentum Sleeve", sleeve: "tactical", value: 0.6e7, invested: 0.5e7, cagr: 0.148, since: "2023-01-15" },
    // Cash — ₹0.5 Cr
    { id: "c1", name: "Overnight & Liquid Funds", sleeve: "cash", value: 0.5e7, invested: 0.5e7, cagr: 0.063, since: "2019-04-01" },
  ],
};
