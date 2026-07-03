"use client";

import { useMemo, useState } from "react";
import { FanChart, useTheme } from "@/components/charts";
import { Card, CardTitle, Disclaimer, PageHeader, StatTile } from "@/components/ui";
import { useClient } from "@/components/client-context";
import { getAssumptions, SLEEVES } from "@/lib/finance/assumptions";
import { currentWeights, portfolioStats, projectWealth, sleeveGrowthRates, totalValue } from "@/lib/finance/engine";
import { inr, pct } from "@/lib/finance/format";
import { SLEEVE_IDS } from "@/lib/finance/types";

const PRESETS = [1, 2, 5, 10, 20, 30];

export default function ProjectionsPage() {
  const theme = useTheme();
  const { client: portfolio } = useClient();
  const total = totalValue(portfolio.holdings);
  const weights = currentWeights(portfolio);
  const growth = sleeveGrowthRates(portfolio.holdings);
  const stats = portfolioStats(weights);
  const [years, setYears] = useState(10);

  const points = useMemo(() => projectWealth(total, weights, years), [total, weights, years]);
  const last = points[points.length - 1];
  const checkpoints = PRESETS.filter((y) => y <= years);
  const checkpointRows = useMemo(
    () =>
      checkpoints.map((y) => {
        const p = projectWealth(total, weights, y, { stepsPerYear: 1 });
        return { years: y, ...p[p.length - 1] };
      }),
    [checkpoints, total, weights]
  );

  return (
    <div>
      <PageHeader
        title="Growth & Projections"
        subtitle="Where the portfolio is headed if it keeps compounding — with an honest range for strong and weak markets, not a single rosy line."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatTile label={`Expected value in ${years}y`} value={inr(last.median)} hint="Median outcome" />
        <StatTile label="If markets are strong" value={inr(last.p90)} hint="Better than 9 in 10 outcomes" />
        <StatTile label="If markets are weak" value={inr(last.p10)} hint="Worse than 9 in 10 outcomes" />
        <StatTile
          label="Compounding rate used"
          value={pct(stats.geometricReturn)}
          hint={`From your current mix (risk ${pct(stats.volatility)})`}
        />
      </div>

      <Card className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <CardTitle hint="Median path with 25–75% (dark) and 10–90% (light) outcome bands">
            Projected portfolio value
          </CardTitle>
          <div className="flex items-center gap-1">
            {PRESETS.map((y) => (
              <button
                key={y}
                onClick={() => setYears(y)}
                className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                  years === y
                    ? "bg-navy text-navyink border-navy"
                    : "border-hairline2 text-ink2 hover:border-hairline2 hover:bg-raised"
                }`}
              >
                {y}y
              </button>
            ))}
            <div className="flex items-center gap-2 ml-3">
              <input
                type="range"
                min={1}
                max={40}
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-28"
              />
              <span className="text-xs tnum text-ink2 w-8">{years}y</span>
            </div>
          </div>
        </div>
        <FanChart points={points} markers={checkpoints} />
        <Disclaimer>
          Projections compound today’s value of {inr(total)} at the geometric expected return of your current
          allocation. Bands reflect the statistical range of outcomes given the portfolio’s volatility — they are
          illustrative, not guaranteed.
        </Disclaimer>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardTitle hint="Median and band values at each checkpoint">Milestones</CardTitle>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ink3 border-b border-hairline2">
                <th className="py-2 font-medium">Horizon</th>
                <th className="py-2 font-medium text-right">Weak (P10)</th>
                <th className="py-2 font-medium text-right">Expected</th>
                <th className="py-2 font-medium text-right">Strong (P90)</th>
              </tr>
            </thead>
            <tbody>
              {checkpointRows.map((r) => (
                <tr key={r.years} className="border-b border-hairline last:border-0">
                  <td className="py-2.5 text-ink">{r.years} year{r.years > 1 ? "s" : ""}</td>
                  <td className="py-2.5 text-right tnum text-ink2">{inr(r.p10)}</td>
                  <td className="py-2.5 text-right tnum font-medium text-ink">{inr(r.median)}</td>
                  <td className="py-2.5 text-right tnum text-ink2">{inr(r.p90)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <CardTitle hint="Realised growth vs the long-run rate we plan with">Growth rates by sleeve</CardTitle>
          <div className="space-y-3">
            {SLEEVE_IDS.map((s) => (
              <div key={s} className="border-b border-hairline pb-2.5 last:border-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center text-ink">
                    <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ background: theme.sleeve[s] }} />
                    {SLEEVES[s].label}
                  </span>
                  <span className="tnum text-ink">{pct(growth[s])} <span className="text-ink3">now</span></span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-ink3 mt-0.5 pl-[18px]">
                  <span>{SLEEVES[s].description}</span>
                  <span className="tnum shrink-0 ml-3">plan: {pct(getAssumptions()[s].expectedReturn)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
