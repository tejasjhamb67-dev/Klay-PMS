"use client";

import { useEffect, useMemo, useState } from "react";
import { SleeveLegend, StackedWeightBar, useTheme } from "@/components/charts";
import { Card, CardTitle, Disclaimer, PageHeader } from "@/components/ui";
import { useClient } from "@/components/client-context";
import { SLEEVES } from "@/lib/finance/assumptions";
import { currentWeights, totalValue } from "@/lib/finance/engine";
import { inr, pct } from "@/lib/finance/format";
import { compareRebalance, renormalise } from "@/lib/finance/rebalance";
import { SLEEVE_IDS, SleeveId, Weights } from "@/lib/finance/types";

export default function RebalancePage() {
  const theme = useTheme();
  const { client: portfolio } = useClient();
  const total = totalValue(portfolio.holdings);
  const current = useMemo(() => currentWeights(portfolio), [portfolio]);

  const presets: { label: string; weights: Weights }[] = useMemo(
    () => [
      { label: "Current", weights: current },
      { label: "Klay proposed", weights: portfolio.targetWeights },
      {
        label: "Defensive",
        weights: { equities: 0.3, fixedIncome: 0.45, alternatives: 0.1, tactical: 0.05, cash: 0.1 },
      },
      {
        label: "Growth",
        weights: { equities: 0.65, fixedIncome: 0.12, alternatives: 0.15, tactical: 0.06, cash: 0.02 },
      },
    ],
    [current, portfolio.targetWeights]
  );

  const [proposed, setProposed] = useState<Weights>({ ...current });
  // reset the sliders when the selected client changes
  useEffect(() => setProposed({ ...current }), [portfolio.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const cmp = useMemo(() => compareRebalance(total, current, proposed), [total, current, proposed]);
  const tenYear = cmp.horizons.find((h) => h.years === 10)!;

  const setSleeve = (s: SleeveId, v: number) => setProposed((w) => renormalise(w, s, v));

  const statRow = (
    label: string,
    before: string,
    after: string,
    better?: boolean | null
  ) => (
    <tr className="border-b border-hairline last:border-0">
      <td className="py-2.5 text-ink2">{label}</td>
      <td className="py-2.5 text-right tnum text-ink2">{before}</td>
      <td className={`py-2.5 text-right tnum font-medium ${better == null ? "text-ink" : better ? "text-good" : "text-bad"}`}>
        {after}
      </td>
    </tr>
  );

  return (
    <div>
      <PageHeader
        title="Rebalancing Studio"
        subtitle="Move the sliders to test a different mix. Every number updates live: what you gain, what you give up, and how the risk profile shifts — before a single rupee moves."
      />

      <div className="grid lg:grid-cols-5 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardTitle hint="Drag a sleeve — the others re-scale to keep 100%">Proposed mix</CardTitle>
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => setProposed({ ...p.weights })}
                className="px-2.5 py-1 rounded text-xs border border-hairline2 text-ink2 hover:bg-raised transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="space-y-4">
            {SLEEVE_IDS.map((s) => (
              <div key={s}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="flex items-center text-ink">
                    <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ background: theme.sleeve[s] }} />
                    {SLEEVES[s].label}
                  </span>
                  <span className="tnum text-ink">
                    {pct(proposed[s], 1)} <span className="text-ink3 text-xs">from {pct(current[s], 1)}</span>
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.5}
                  value={proposed[s] * 100}
                  onChange={(e) => setSleeve(s, Number(e.target.value) / 100)}
                  className="w-full"
                />
              </div>
            ))}
          </div>
          <div className="mt-5">
            <div className="text-[11px] uppercase tracking-wide text-ink3 mb-1.5">Before</div>
            <StackedWeightBar weights={current} labelInBar />
            <div className="text-[11px] uppercase tracking-wide text-ink3 mb-1.5 mt-3">After</div>
            <StackedWeightBar weights={proposed} labelInBar />
            <SleeveLegend />
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <CardTitle hint="The trade-off, stated plainly">What changes</CardTitle>
          <div
            className={`rounded-md px-4 py-3 mb-4 text-sm border ${
              Math.abs(tenYear.delta) < total * 0.001
                ? "border-hairline text-ink2"
                : tenYear.delta < 0
                  ? "border-bad/30 bg-bad/5 text-ink"
                  : "border-good/30 bg-good/5 text-ink"
            }`}
          >
            {Math.abs(tenYear.delta) < total * 0.001 ? (
              "This mix is essentially unchanged — no meaningful trade-off either way."
            ) : tenYear.delta < 0 ? (
              <>
                Over 10 years, this shift is expected to <strong>leave {inr(-tenYear.delta)} on the table</strong> in
                exchange for a {pct(cmp.before.volatility - cmp.after.volatility, 1)} calmer ride and a smaller worst
                year.
              </>
            ) : (
              <>
                Over 10 years, this shift <strong>adds {inr(tenYear.delta)} of expected value</strong> — but the
                portfolio will swing harder along the way ({pct(cmp.after.volatility)} vs {pct(cmp.before.volatility)}{" "}
                volatility).
              </>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-ink3 mb-1">Risk & return</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-ink3 border-b border-hairline2">
                    <th className="py-1.5 text-left font-medium">Measure</th>
                    <th className="py-1.5 text-right font-medium">Before</th>
                    <th className="py-1.5 text-right font-medium">After</th>
                  </tr>
                </thead>
                <tbody>
                  {statRow("Expected return", pct(cmp.before.expectedReturn), pct(cmp.after.expectedReturn), cmp.after.expectedReturn >= cmp.before.expectedReturn)}
                  {statRow("Volatility", pct(cmp.before.volatility), pct(cmp.after.volatility), cmp.after.volatility <= cmp.before.volatility)}
                  {statRow("Return per unit risk", cmp.before.sharpe.toFixed(2), cmp.after.sharpe.toFixed(2), cmp.after.sharpe >= cmp.before.sharpe)}
                  {statRow("Bad year (1-in-20)", pct(cmp.before.var95, 1, { signed: true }), pct(cmp.after.var95, 1, { signed: true }), cmp.after.var95 >= cmp.before.var95)}
                  {statRow("Typical deep drawdown", pct(cmp.before.expectedDrawdown), pct(cmp.after.expectedDrawdown), cmp.after.expectedDrawdown >= cmp.before.expectedDrawdown)}
                </tbody>
              </table>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-ink3 mb-1">Expected value by horizon</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-ink3 border-b border-hairline2">
                    <th className="py-1.5 text-left font-medium">Horizon</th>
                    <th className="py-1.5 text-right font-medium">Before</th>
                    <th className="py-1.5 text-right font-medium">After</th>
                    <th className="py-1.5 text-right font-medium">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {cmp.horizons.map((h) => (
                    <tr key={h.years} className="border-b border-hairline last:border-0">
                      <td className="py-2 text-ink2">{h.years}y</td>
                      <td className="py-2 text-right tnum text-ink2">{inr(h.before)}</td>
                      <td className="py-2 text-right tnum text-ink">{inr(h.after)}</td>
                      <td className={`py-2 text-right tnum ${h.delta >= 0 ? "text-good" : "text-bad"}`}>
                        {inr(h.delta, { signed: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardTitle hint="Share of total portfolio risk each sleeve is responsible for">Risk attribution</CardTitle>
          <div className="text-[11px] uppercase tracking-wide text-ink3 mb-1.5">Before</div>
          <StackedWeightBar weights={cmp.beforeRisk} labelInBar />
          <div className="text-[11px] uppercase tracking-wide text-ink3 mb-1.5 mt-3">After</div>
          <StackedWeightBar weights={cmp.afterRisk} labelInBar />
          <SleeveLegend />
          <Disclaimer>
            Risk attribution uses the covariance of sleeves, so a sleeve can contribute more risk than its weight —
            equities typically dominate risk even in balanced mixes.
          </Disclaimer>
        </Card>

        <Card>
          <CardTitle hint="Orders Klay would execute to reach the proposed mix">Implied trades</CardTitle>
          {cmp.trades.length === 0 ? (
            <p className="text-sm text-ink3">No trades — the proposed mix matches the current portfolio.</p>
          ) : (
            <div className="space-y-2.5">
              {cmp.trades
                .slice()
                .sort((a, b) => b.amount - a.amount)
                .map((t) => (
                  <div key={t.sleeve} className="flex items-center justify-between text-sm border-b border-hairline pb-2 last:border-0">
                    <span className="flex items-center text-ink">
                      <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ background: theme.sleeve[t.sleeve] }} />
                      {SLEEVES[t.sleeve].label}
                    </span>
                    <span className={`tnum font-medium ${t.amount >= 0 ? "text-good" : "text-bad"}`}>
                      {t.amount >= 0 ? "Buy" : "Sell"} {inr(Math.abs(t.amount))}
                    </span>
                  </div>
                ))}
              <div className="flex items-center justify-between text-xs text-ink3 pt-1">
                <span>One-way turnover</span>
                <span className="tnum">{pct(cmp.turnover)} of portfolio</span>
              </div>
            </div>
          )}
          <Disclaimer>
            Execution is sequenced by your Klay advisor for tax efficiency and market impact — large shifts are
            typically staged over weeks, not traded in one day.
          </Disclaimer>
        </Card>
      </div>
    </div>
  );
}
