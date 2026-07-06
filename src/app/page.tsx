"use client";

import { AllocationDonut, SleeveLegend, StackedWeightBar, useTheme } from "@/components/charts";
import { Card, CardTitle, Disclaimer, PageHeader, StatTile } from "@/components/ui";
import { useClient } from "@/components/client-context";
import { SLEEVES } from "@/lib/finance/assumptions";
import {
  currentWeights,
  portfolioCagr,
  portfolioStats,
  projectWealthWithFlows,
  sleeveGrowthRates,
  sleeveValues,
  totalValue,
} from "@/lib/finance/engine";
import { inr, pct } from "@/lib/finance/format";
import { SLEEVE_IDS } from "@/lib/finance/types";

export default function OverviewPage() {
  const theme = useTheme();
  const { client: portfolio } = useClient();
  const total = totalValue(portfolio.holdings);
  const invested = portfolio.holdings.reduce((s, h) => s + h.invested, 0);
  const values = sleeveValues(portfolio.holdings);
  const weights = currentWeights(portfolio);
  const growth = sleeveGrowthRates(portfolio.holdings);
  const cagr = portfolioCagr(portfolio.holdings);
  const stats = portfolioStats(weights);
  const maxGoalYear = Math.max(...portfolio.goals.map((g) => g.targetYear), 0);
  const goalPath =
    maxGoalYear > 0 ? projectWealthWithFlows(total, weights, maxGoalYear, portfolio.cashflows) : null;

  return (
    <div>
      <PageHeader
        title={portfolio.clientName}
        subtitle={`${portfolio.mandate} · Horizon: ${portfolio.horizon} · All figures in INR.`}
      />

      <div className="border-l-2 border-accent bg-accentsoft/40 rounded-r-md px-4 py-3 mb-6 max-w-3xl">
        <div className="text-[10px] uppercase tracking-[0.18em] text-ink3 mb-0.5">Investment thesis — Klay IC</div>
        <p className="text-sm text-ink2 leading-relaxed">{portfolio.thesis}</p>
      </div>

      {portfolio.goals.length > 0 && goalPath && (
        <Card className="mb-6">
          <CardTitle hint="Median projected value at each goal date, with your cashflow schedule included">
            Goals — is the plan on track?
          </CardTitle>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
            {portfolio.goals.map((g) => {
              const projected = goalPath[Math.min(g.targetYear, goalPath.length - 1)].median;
              const funded = g.targetAmount > 0 ? projected / g.targetAmount : 1;
              const status = funded >= 1 ? "on track" : funded >= 0.85 ? "nearly there" : "needs attention";
              const color = funded >= 1 ? "text-good" : funded >= 0.85 ? "text-ink2" : "text-bad";
              return (
                <div key={g.id}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-ink pr-2">{g.label}</span>
                    <span className={`text-xs font-medium shrink-0 ${color}`}>{status}</span>
                  </div>
                  <div className="h-2 rounded bg-hairline mt-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded ${funded >= 0.85 ? "bg-accent" : "bg-bad"}`}
                      style={{ width: `${Math.min(funded, 1) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-ink3 mt-1 tnum">
                    <span>target {inr(g.targetAmount)} · year {g.targetYear}</span>
                    <span>projected {inr(projected)} ({Math.round(funded * 100)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatTile label="Portfolio value" value={inr(total)} delta={`${inr(total - invested, { signed: true })} since inception`} deltaGood={total >= invested} />
        <StatTile label="Portfolio growth rate" value={pct(cagr)} hint="Value-weighted CAGR across holdings" />
        <StatTile label="Expected long-run return" value={pct(stats.expectedReturn)} hint="Based on current mix & Klay assumptions" />
        <StatTile label="Portfolio risk" value={pct(stats.volatility)} hint={`A bad year (1-in-20): ${pct(stats.var95, 1, { signed: true })}`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardTitle hint="Where the portfolio sits across the four sleeves">Asset allocation</CardTitle>
          <AllocationDonut values={values} total={total} />
          <SleeveLegend />
        </Card>
        <Card>
          <CardTitle hint="Current weight vs the mandate target, and how each sleeve has grown">Sleeves</CardTitle>
          <div className="space-y-3">
            {SLEEVE_IDS.map((s) => (
              <div key={s} className="flex items-center justify-between border-b border-hairline pb-2.5 last:border-0">
                <div className="flex items-center min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full mr-2.5 shrink-0" style={{ background: theme.sleeve[s] }} />
                  <div>
                    <div className="text-sm text-ink">{SLEEVES[s].label}</div>
                    <div className="text-[11px] text-ink3">
                      {pct(weights[s], 1)} of portfolio · proposed {pct(portfolio.targetWeights[s], 0)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm tnum text-ink">{inr(values[s])}</div>
                  <div className="text-[11px] tnum text-good">growing {pct(growth[s])} p.a.</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wide text-ink3 mb-1.5">Current mix</div>
            <StackedWeightBar weights={weights} labelInBar />
            <div className="text-[11px] uppercase tracking-wide text-ink3 mb-1.5 mt-3">Klay proposed (IPS)</div>
            <StackedWeightBar weights={portfolio.targetWeights} labelInBar />
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle hint="Every strategy in the relationship, with the rate at which it is compounding">Holdings</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ink3 border-b border-hairline2">
                <th className="py-2 pr-4 font-medium">Strategy</th>
                <th className="py-2 pr-4 font-medium">Sleeve</th>
                <th className="py-2 pr-4 font-medium text-right">Invested</th>
                <th className="py-2 pr-4 font-medium text-right">Current value</th>
                <th className="py-2 pr-4 font-medium text-right">Gain</th>
                <th className="py-2 font-medium text-right">CAGR</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.holdings.map((h) => (
                <tr key={h.id} className="border-b border-hairline last:border-0">
                  <td className="py-2.5 pr-4 text-ink">{h.name}</td>
                  <td className="py-2.5 pr-4">
                    <span className="flex items-center text-xs text-ink2">
                      <span className="w-2 h-2 rounded-full mr-1.5" style={{ background: theme.sleeve[h.sleeve] }} />
                      {SLEEVES[h.sleeve].label}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right tnum text-ink2">{inr(h.invested)}</td>
                  <td className="py-2.5 pr-4 text-right tnum text-ink">{inr(h.value)}</td>
                  <td className={`py-2.5 pr-4 text-right tnum ${h.value >= h.invested ? "text-good" : "text-bad"}`}>
                    {inr(h.value - h.invested, { signed: true })}
                  </td>
                  <td className="py-2.5 text-right tnum text-ink">{pct(h.cagr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Disclaimer>
          Hypothetical relationship for demonstration. CAGR is since inception of each strategy, net of underlying fund
          expenses, gross of advisory fees.
        </Disclaimer>
      </Card>
    </div>
  );
}
