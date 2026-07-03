# Live Market Data & Prediction Layer — Architecture

Status: **approved direction, not yet built.** This document is the build spec for the next sessions.

## Goal

Every trading-day close, pull real Indian market data, derive forward-looking expected returns per sleeve
(equities, bonds, gold, alternatives, cash), fold in macro (inflation, rates, FX) and client-specific flows
(director salary drawdowns, SIPs, withdrawals), and feed the whole app from that snapshot — so projections,
rebalancing math, the Klay Advantage and the Scenario Lab all run off yesterday's close instead of static
assumptions.

## Design principles

1. **The app never blocks on a feed.** `assumptions.ts` becomes the *fallback prior*; a daily snapshot
   overrides it when fresh. A dead API can never blank a client screen.
2. **Building-block predictions, not black-box ML.** Every expected return must be explainable to a client
   and an IC in one sentence. (This is also what Aladdin/JPM LTCMA do.)
3. **Everything versioned and dated.** Each snapshot stores its raw inputs + derived outputs + timestamp, so
   any screen can say "as of 3 Jul 2026 close" and any number can be audited.
4. **Advisor override wins.** The IC can pin any assumption; overrides carry an audit note. Data informs,
   the IC decides — that's the regulatory-safe posture.

## Architecture (zero-infra v1 → database later)

```
GitHub Action (cron, 19:00 IST Mon–Fri, after official closes)
  └─ scripts/fetch-market-data.ts
       1. FETCH   raw series (with per-series fallback chain + last-good cache)
       2. VALIDATE staleness / spike / missing checks → alert on failure
       3. DERIVE  capital-market assumptions + macro dashboard (logic below)
       4. WRITE   app/public/data/market-snapshot.json  (committed) ── v1
                  → later: Supabase table + Vercel revalidate webhook ── v2
App reads snapshot via a MarketDataProvider (client context, like ClientProvider)
  └─ merge order: IC overrides  >  snapshot  >  static ASSUMPTIONS
```

Why this v1: no servers, no keys to leak, free, and the snapshot history lives in git — a daily audit trail
for free. Upgrade path to Supabase/Postgres when auth and per-client data land (Phase D).

## Data sources (free-tier v1, licensed later)

| Series | Primary | Fallback | Cadence |
|---|---|---|---|
| Nifty 50 / Nifty 500 level, P/E, div yield | NSE indices endpoints | Yahoo Finance (^NSEI, ^CRSLDX) | daily |
| 10Y G-sec yield | RBI DBIE / CCIL | FRED (IRLTLT01ININ...) | daily |
| T-bill / repo (cash rate) | RBI | FRED | weekly |
| CPI inflation YoY | MOSPI | FRED (INDCPI...) | monthly |
| USD/INR | RBI reference rate | Yahoo (USDINR=X) | daily |
| Gold (INR) | GOLDBEES.NS proxy | LBMA USD × USDINR | daily |
| REITs | Embassy/Mindspace on NSE via Yahoo | — | daily |
| AIF/PE marks | SEBI AIF quarterly stats | listed proxy + premium | quarterly |
| Corporate spreads (AAA) | CCIL/CRISIL indices | fixed 60–80bp prior | weekly |

Notes: NSE's public endpoints are rate-limited and finicky → always keep the Yahoo fallback. AIF/PE has no
daily price; it is *modelled* (0.55 equity beta + illiquidity premium), marked quarterly. Decision needed
from Klay ops later: a licensed feed (TrueData / Global DataFeeds) once this is client-facing production.

## Prediction methodology (the DERIVE step)

**Equities** — building blocks: `E[r] = dividend yield + expected nominal earnings growth ± valuation
mean-reversion`, where nominal growth ≈ CPI + long-run real GDP prior (IC-set, ~6.5%), and the reversion
term amortises the gap between current Nifty P/E and its 10-year average over 10 years, capped ±2%/yr.
Every input is on the snapshot, so the number defends itself.

**Fixed income** — starting yield is destiny: `E[r] = current ladder YTM (G-sec + AAA spread) − default
drag`. Duration from the book (for the rate-shock model, which then uses the *actual* 10Y level as its
starting point).

**Cash** — current T-bill/repo yield. **Gold/tactical** — expected CPI + long-run real gold return prior
(~1.5%) + INR drift term. **Alternatives** — listed-equity block + IC-set access/illiquidity premium
(quarterly). 

**Risk** — EWMA volatility (λ=0.97) and correlations from daily returns, shrunk 50/50 toward the long-run
priors in `assumptions.ts` so one wild week doesn't whipsaw every client's fan chart. VaR/drawdown formulas
unchanged — they just consume the live vol.

## Client cashflows (director salary, SIPs, drawdowns)

Extend `ClientProfile` with a `cashflows: Cashflow[]` schedule:

```ts
interface Cashflow {
  label: string;                 // "Director salary", "Equity SIP", "Living expenses"
  kind: "inflow" | "outflow";
  amountPerYear: number;         // INR
  startYear: number; endYear: number | null;
  growthRate: number;            // e.g. salary +8%/yr, expenses +6% (inflation-linked)
  contingent?: "salary" | "business" | null;  // ties to stress scenarios (job loss = inflow → 0)
}
```

Engine change: `projectWealth` becomes cashflow-aware — deterministic flows layered on the stochastic
growth path (year-by-year recursion instead of the closed form; percentile bands via the same lognormal
step). This unlocks: IC-note income-adequacy tests ("FI income covers expenses 3×"), Arvind's director-income
cut scenario, Karan's SIP accumulation, Meena's monthly drawdown — and the Scenario Lab gets personal
scenarios (job loss, dividend cut) as first-class citizens: an income shock is just `contingent` flows
zeroing out under a named scenario.

## App surface changes

- **"Markets as of <date>" ribbon** (sidebar footer): Nifty, 10Y, CPI, USDINR, gold — with day change.
- Projections/Rebalance/Advantage consume live CMAs; each screen footnotes its assumption source + date.
- Scenario Lab factor shocks start from *actual* current levels (a +200bp hike from the real 6.8%, not an abstract one).
- Advisor overrides file (`data/ic-overrides.json` v1): `{ sleeve, field, value, note, setBy, date }`.

## Build phases (resume at 4pm)

- **A. Snapshot pipeline** — fetch script + GitHub Action cron + snapshot JSON + `MarketDataProvider` with fallback + "as of" ribbon. *(first, ~1 session)*
- **B. Derived CMA engine** — building-block expected returns + EWMA risk + override merge; screens go live-data.
- **C. Cashflow-aware clients** — schedules per IC note client, cashflow projections, income-shock scenarios.
- **D. Production hardening** — Supabase storage, auth, per-client API, licensed data feed, alerting.

## Open decisions for Tejas

1. Yahoo/FRED/RBI free sources OK for v1? (Licensed feed only when client-facing production.)
2. Vercel as deploy target (needed for the cron→revalidate path in v2)?
3. Long-run priors: confirm with IC — real GDP 6.5%, real gold 1.5%, AIF premium +3%, AAA spread 70bp.
