"use client";

import { useMemo, useState } from "react";
import { FanChart, useTheme } from "@/components/charts";
import { Card, CardTitle, Disclaimer, PageHeader, StatTile } from "@/components/ui";
import { useClient } from "@/components/client-context";
import { getAssumptions, SLEEVES } from "@/lib/finance/assumptions";
import {
  currentWeights,
  netFlowAt,
  portfolioStats,
  projectWealthWithFlows,
  sleeveGrowthRates,
  totalValue,
} from "@/lib/finance/engine";
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
  const [includeFlows, setIncludeFlows] = useState(true);

  const flows = includeFlows ? portfolio.cashflows : [];
  const netNow = netFlowAt(portfolio.cashflows, 0);
  const points = useMemo(
    () => projectWealthWithFlows(total, weights, years, flows),
    [total, weights, years, flows]
  );
  const last = points[points.length - 1];
  const checkpoints = PRESETS.filter((y) => y <= years);
  const checkpointRows = useMemo(
    () => checkpoints.map((y) => ({ years: y, ...points[Math.min(y, points.length - 1)] })),
    [checkpoints, points]
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
          Simulated from today’s value of {inr(total)} across 1,500 market paths at your current allocation
          {includeFlows && portfolio.cashflows.length > 0 ? ", with your cashflow schedule layered on every path" : ""}.
          Bands reflect the statistical range of outcomes — illustrative, not guaranteed.
        </Disclaimer>
      </Card>

      {portfolio.cashflows.length > 0 && (
        <Card className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle hint="Salaries, SIPs, expenses and planned draws — layered onto every projected path">
              Cashflow schedule
            </CardTitle>
            <label className="flex items-center gap-2 text-xs text-ink2 cursor-pointer">
              <input type="checkbox" checked={includeFlows} onChange={(e) => setIncludeFlows(e.target.checked)} />
              Include in projection
            </label>
          </div>
          <div className="grid md:grid-cols-2 gap-x-8">
            {portfolio.cashflows.map((cf) => (
              <div key={cf.id} className="flex items-center justify-between text-sm border-b border-hairline py-2">
                <span className="text-ink pr-3">
                  {cf.label}
                  {cf.contingent && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-accentsoft text-ink2 whitespace-nowrap">
                      {cf.contingent}-linked
                    </span>
                  )}
                </span>
                <span className="text-xs text-ink3 shrink-0 mr-4">
                  {cf.startYear === 0 && cf.endYear === null
                    ? "ongoing"
                    : cf.endYear === null
                      ? `from year ${cf.startYear}`
                      : cf.endYear - cf.startYear === 1
                        ? `year ${cf.startYear}`
                        : `years ${cf.startYear}–${cf.endYear - 1}`}
                  {cf.growthRate > 0 ? ` · +${(cf.growthRate * 100).toFixed(0)}%/yr` : ""}
                </span>
                <span className={`tnum shrink-0 ${cf.kind === "inflow" ? "text-good" : "text-bad"}`}>
                  {cf.kind === "inflow" ? "+" : "−"}{inr(cf.amountPerYear)}/yr
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm mt-3">
            <span className="text-ink font-medium">Net this year</span>
            <span className={`tnum font-semibold ${netNow >= 0 ? "text-good" : "text-bad"}`}>
              {inr(netNow, { signed: true })}
            </span>
          </div>
        </Card>
      )}

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
