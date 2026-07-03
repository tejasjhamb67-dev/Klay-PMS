# Klay PMS — Private Client Portal

A client-facing portfolio intelligence application for **Klay Capital**: a modern tool for a legacy PMS house. Clients see their portfolio at a glance, project it decades forward, test rebalancing moves before committing, quantify the value of being advised, and stress-test any life event against their wealth.

## Product sections

| Section | What it does |
|---|---|
| **Portfolio** | Total value, allocation across Equities / Fixed Income / Alternatives / Tactical / Cash, current growth rate (CAGR) of every holding, current mix vs mandate target. |
| **Growth & Projections** | Lognormal fan-chart projection of portfolio value over 1–40 years with honest 10–90% outcome bands, milestone table, realised vs planned growth per sleeve. |
| **Rebalancing Studio** | Live sliders to test any mix. Shows expected return / volatility / Sharpe / bad-year / drawdown before vs after, expected value by horizon ("what you leave on the table"), covariance-based risk attribution, and the implied trades. |
| **The Klay Advantage** | DIY vs advised wealth paths from the same market return. The 2% fee is fully counted and shown; the edge is decomposed into behaviour gap, access, rebalancing discipline and tax alpha. Includes a fees-paid vs extra-wealth ledger. |
| **Scenario Lab** | A *generalised* liquidity engine: any life event = raise ₹C by time T at minimum damage. Greedy marginal-cost optimiser balances growth foregone, exit friction, illiquidity and mandate drift — works for thousands of scenarios, not canned events. Plus parametric stress tests (2008 replay, pandemic, rate spike, correction) with recovery-time estimates. |

## Architecture

```
app/                      Next.js 15 + TypeScript + Tailwind v4 + Recharts
  src/lib/finance/        Pure, testable financial engine (no UI)
    assumptions.ts        Capital market assumptions, correlations, fee — single source of truth
    engine.ts             Covariance stats, lognormal projections, risk contributions
    rebalance.ts          Mix comparison, renormalisation, implied trades
    advantage.ts          DIY vs advised model
    scenario.ts           Liquidity optimiser + stress scenarios
    format.ts             ₹ Cr/L formatting & parsing
  src/lib/data/client.ts  Demo relationship (mirrors a future custodian feed)
  src/lib/theme.ts        Chart palette (CVD-validated, light + dark)
  src/app/                One route per product section
```

All computation currently runs client-side against a demo portfolio. The engine is deliberately separated from the UI so a real data layer (custodian/fund-accounting feed, auth, per-client API) can replace `lib/data` without touching the product.

## Run locally

```bash
cd app
npm install
npm run dev     # http://localhost:3000
```

## Branding

Placeholder palette (deep navy + gold on ivory) lives in `app/src/app/globals.css` (`:root` tokens) and `app/src/lib/theme.ts`. Swap those two files' values for the official Klay deck colors — nothing else changes. Chart colors are validated for colorblind safety; re-validate after swapping.

## Roadmap

- [ ] Official Klay brand tokens + logo from the marketing deck
- [ ] Auth (client login) & multi-client data model
- [ ] Real portfolio data feed (custodian / Wealth Spectrum / fund accounting export)
- [ ] Advisor-configurable capital market assumptions
- [ ] PDF/print statements, goal tracking, WhatsApp/email review summaries

---
*All projections are illustrative, not guarantees. Investments are subject to market risk.*
