"use client";

import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { HBar, TooltipShell, useTheme } from "@/components/charts";
import { Card, CardTitle, Disclaimer, PageHeader, StatTile } from "@/components/ui";
import { DEMO_CLIENT } from "@/lib/data/client";
import { klayAdvantage } from "@/lib/finance/advantage";
import { currentWeights, totalValue } from "@/lib/finance/engine";
import { inr, inrAxis, pct } from "@/lib/finance/format";

const HORIZONS = [5, 10, 15, 20, 25];

export default function AdvantagePage() {
  const theme = useTheme();
  const portfolio = DEMO_CLIENT;
  const total = totalValue(portfolio.holdings);
  const weights = useMemo(() => currentWeights(portfolio), [portfolio]);
  const [years, setYears] = useState(15);

  const result = useMemo(() => klayAdvantage(total, weights, years), [total, weights, years]);
  const last = result.points[result.points.length - 1];
  const maxComponent = Math.max(...result.components.map((c) => Math.abs(c.value)));

  const chartData = result.points.map((p) => ({
    ...p,
    gapBand: [p.diy, p.klay] as [number, number],
  }));

  return (
    <div>
      <PageHeader
        title="The Klay Advantage"
        subtitle="The same money, two paths: managing it yourself versus investing with Klay. Our 2% fee is on the table in full — the question is what you get for it."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatTile label={`With Klay in ${years}y`} value={inr(last.klay)} hint={`Compounding at ${pct(result.klayRate)} net of all fees`} />
        <StatTile label={`Do-it-yourself in ${years}y`} value={inr(last.diy)} hint={`Compounding at ${pct(result.diyRate)} after typical DIY drag`} />
        <StatTile label="The advantage" value={inr(last.gap)} delta={`${pct(result.netEdge)} p.a. net edge`} />
        <StatTile label="Total fees you paid Klay" value={inr(last.feesPaid)} hint="Fully counted in the Klay line" deltaGood={false} />
      </div>

      <Card className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle hint="Both lines start from today’s portfolio and the same market return">
            Wealth over time — Klay vs DIY
          </CardTitle>
          <div className="flex items-center gap-1">
            {HORIZONS.map((y) => (
              <button
                key={y}
                onClick={() => setYears(y)}
                className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                  years === y ? "bg-navy text-navyink border-navy" : "border-hairline2 text-ink2 hover:bg-raised"
                }`}
              >
                {y}y
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
            <CartesianGrid stroke={theme.grid} strokeWidth={1} vertical={false} />
            <XAxis
              dataKey="year"
              tickFormatter={(y) => `${y}y`}
              stroke={theme.axis}
              tick={{ fill: theme.inkMuted, fontSize: 11 }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => inrAxis(v)}
              stroke="transparent"
              tick={{ fill: theme.inkMuted, fontSize: 11 }}
              tickLine={false}
              width={64}
            />
            <Area dataKey="gapBand" fill={theme.band} stroke="none" isAnimationActive={false} />
            <Line dataKey="klay" stroke={theme.gold} strokeWidth={2.5} dot={false} isAnimationActive={false} name="With Klay" />
            <Line dataKey="diy" stroke={theme.inkMuted} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} name="DIY" />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as (typeof chartData)[number];
                return (
                  <TooltipShell
                    title={`Year ${label}`}
                    rows={[
                      { dot: theme.gold, label: "With Klay", value: inr(p.klay) },
                      { dot: theme.inkMuted, label: "DIY", value: inr(p.diy) },
                      { label: "Advantage", value: inr(p.gap, { signed: true }) },
                      { label: "Cumulative Klay fees", value: inr(p.feesPaid) },
                    ]}
                  />
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex gap-4 text-xs text-ink2 mt-1">
          <span className="flex items-center"><span className="w-4 h-0.5 mr-1.5 rounded" style={{ background: theme.gold }} /> With Klay (net of 2% fee)</span>
          <span className="flex items-center"><span className="w-4 border-t-2 border-dashed mr-1.5" style={{ borderColor: theme.inkMuted }} /> Do-it-yourself</span>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardTitle hint="Annual return impact of each element, in percentage points">Where the edge comes from</CardTitle>
          <div className="mt-2">
            {result.components.map((c) => (
              <HBar
                key={c.label}
                label={c.label}
                value={c.value}
                max={maxComponent}
                color={c.kind === "fee" ? theme.bad : theme.gold}
                valueLabel={pct(c.value, 1, { signed: true })}
              />
            ))}
            <div className="flex items-center gap-3 py-2 mt-1 border-t border-hairline2">
              <div className="w-44 shrink-0 text-xs font-semibold text-ink">Net edge vs DIY</div>
              <div className="flex-1" />
              <div className="w-20 text-right text-xs tnum font-semibold text-good">{pct(result.netEdge, 1, { signed: true })}</div>
            </div>
          </div>
          <Disclaimer>
            The behaviour gap reflects long-running studies of self-directed investors buying high and selling low
            (DALBAR and equivalents). Access and tax figures are Klay estimates for a portfolio of this size and mix.
          </Disclaimer>
        </Card>

        <Card>
          <CardTitle hint="The honest ledger: what you pay, what you keep">The fee, in context</CardTitle>
          <table className="w-full text-sm mt-1">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-ink3 border-b border-hairline2">
                <th className="py-2 text-left font-medium">Horizon</th>
                <th className="py-2 text-right font-medium">Fees paid</th>
                <th className="py-2 text-right font-medium">Extra wealth vs DIY</th>
                <th className="py-2 text-right font-medium">Multiple</th>
              </tr>
            </thead>
            <tbody>
              {HORIZONS.filter((y) => y <= years).map((y) => {
                const p = result.points[y];
                return (
                  <tr key={y} className="border-b border-hairline last:border-0">
                    <td className="py-2.5 text-ink2">{y} years</td>
                    <td className="py-2.5 text-right tnum text-ink2">{inr(p.feesPaid)}</td>
                    <td className="py-2.5 text-right tnum text-good">{inr(p.gap, { signed: true })}</td>
                    <td className="py-2.5 text-right tnum font-medium text-ink">
                      {p.feesPaid > 0 ? `${(p.gap / p.feesPaid).toFixed(1)}×` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Disclaimer>
            “Multiple” is the extra wealth created per rupee of fees paid. Both paths assume the same underlying market
            returns; the difference is discipline, access and structure. Illustrative — actual results vary with
            markets and mandate.
          </Disclaimer>
        </Card>
      </div>
    </div>
  );
}
