"use client";

import { AllocationDonut, SleeveLegend, StackedWeightBar, useTheme } from "@/components/charts";
import { Card, CardTitle, Disclaimer, PageHeader, StatTile } from "@/components/ui";
import { DEMO_CLIENT } from "@/lib/data/client";
import { SLEEVES } from "@/lib/finance/assumptions";
import {
  currentWeights,
  portfolioCagr,
  portfolioStats,
  sleeveGrowthRates,
  sleeveValues,
  totalValue,
} from "@/lib/finance/engine";
import { inr, pct } from "@/lib/finance/format";
import { SLEEVE_IDS } from "@/lib/finance/types";

export default function OverviewPage() {
  const theme = useTheme();
  const portfolio = DEMO_CLIENT;
  const total = totalValue(portfolio.holdings);
  const invested = portfolio.holdings.reduce((s, h) => s + h.invested, 0);
  const values = sleeveValues(portfolio.holdings);
  const weights = currentWeights(portfolio);
  const growth = sleeveGrowthRates(portfolio.holdings);
  const cagr = portfolioCagr(portfolio.holdings);
  const stats = portfolioStats(weights);

  return (
    <div>
      <PageHeader
        title={portfolio.clientName}
        subtitle={`Relationship since ${new Date(portfolio.relationshipSince).getFullYear()} · All figures as of today, in INR.`}
      />

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
                      {pct(weights[s], 1)} of portfolio · target {pct(portfolio.targetWeights[s], 0)}
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
            <div className="text-[11px] uppercase tracking-wide text-ink3 mb-1.5 mt-3">Mandate target</div>
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
          Values shown are for the demo relationship. CAGR is since inception of each strategy, net of underlying fund
          expenses, gross of advisory fees.
        </Disclaimer>
      </Card>
    </div>
  );
}
