"use client";

import { useMemo, useState } from "react";
import { HBar, SleeveLegend, StackedWeightBar, useTheme } from "@/components/charts";
import { Card, CardTitle, Disclaimer, PageHeader } from "@/components/ui";
import { DEMO_CLIENT } from "@/lib/data/client";
import { SLEEVES } from "@/lib/finance/assumptions";
import { sleeveValues, totalValue } from "@/lib/finance/engine";
import { inr, parseInr, pct } from "@/lib/finance/format";
import { planLiquidity, runStress, STRESS_SCENARIOS } from "@/lib/finance/scenario";

const QUICK_EVENTS = [
  { label: "New car", amount: "80L", horizon: 0 },
  { label: "Holiday home", amount: "4cr", horizon: 1 },
  { label: "Wedding", amount: "2cr", horizon: 2 },
  { label: "Business infusion", amount: "6cr", horizon: 0 },
];

export default function ScenariosPage() {
  const theme = useTheme();
  const portfolio = DEMO_CLIENT;
  const total = totalValue(portfolio.holdings);
  const values = useMemo(() => sleeveValues(portfolio.holdings), [portfolio]);

  const [amountText, setAmountText] = useState("80L");
  const [horizon, setHorizon] = useState(0);
  const [stressId, setStressId] = useState(STRESS_SCENARIOS[0].id);

  const amount = parseInr(amountText) ?? 0;
  const plan = useMemo(
    () =>
      amount > 0
        ? planLiquidity({
            amount,
            horizon,
            investmentHorizon: 10,
            values,
            targetWeights: portfolio.targetWeights,
          })
        : null,
    [amount, horizon, values, portfolio.targetWeights]
  );

  const stress = useMemo(() => runStress(values, STRESS_SCENARIOS.find((s) => s.id === stressId)!), [values, stressId]);
  const maxImpact = Math.max(...stress.sleeveImpacts.map((i) => Math.abs(i.amount)), 1);

  return (
    <div>
      <PageHeader
        title="Scenario Lab"
        subtitle="Any life event is, mathematically, the same question: raise a given amount by a given date while giving up as little future wealth as possible. Enter yours — the engine works out the least damaging way to fund it."
      />

      {/* ---------- Liquidity planner ---------- */}
      <Card className="mb-6">
        <CardTitle hint="A car, a house, a wedding, an emergency — anything with an amount and a date">
          Fund a life event
        </CardTitle>
        <div className="flex items-end gap-4 flex-wrap mb-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-ink3 mb-1">Amount needed</label>
            <input
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              placeholder="e.g. 80L or 1.5cr"
              className="bg-raised border border-hairline2 rounded-md px-3 py-2 text-sm text-ink w-40 tnum outline-none focus:border-gold"
            />
            <div className="text-[11px] text-ink3 mt-1 tnum">{amount > 0 ? `= ${inr(amount)}` : "Use L / Cr shorthand"}</div>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-ink3 mb-1">When</label>
            <div className="flex gap-1">
              {[
                { label: "Now", v: 0 },
                { label: "In 1y", v: 1 },
                { label: "In 2y", v: 2 },
                { label: "In 3y", v: 3 },
              ].map((o) => (
                <button
                  key={o.v}
                  onClick={() => setHorizon(o.v)}
                  className={`px-2.5 py-2 rounded text-xs border transition-colors ${
                    horizon === o.v ? "bg-navy text-navyink border-navy" : "border-hairline2 text-ink2 hover:bg-raised"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap pb-0.5">
            {QUICK_EVENTS.map((q) => (
              <button
                key={q.label}
                onClick={() => {
                  setAmountText(q.amount);
                  setHorizon(q.horizon);
                }}
                className="px-2.5 py-1.5 rounded-full text-xs border border-hairline text-ink3 hover:text-ink hover:bg-raised transition-colors"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {plan && amount > 0 && (
          <>
            {!plan.feasible && (
              <div className="rounded-md px-4 py-3 mb-4 text-sm border border-bad/30 bg-bad/5 text-ink">
                This amount exceeds what the portfolio can fund. Showing the maximum possible raise instead — speak to
                your advisor about credit against the portfolio.
              </div>
            )}
            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-ink3 mb-2">
                  Recommended funding mix — lowest total cost
                </div>
                {plan.withdrawals.map((w) => (
                  <HBar
                    key={w.sleeve}
                    label={
                      <span className="flex items-center">
                        <span className="w-2 h-2 rounded-full mr-1.5" style={{ background: theme.sleeve[w.sleeve] }} />
                        {SLEEVES[w.sleeve].label}
                      </span>
                    }
                    value={w.amount}
                    max={Math.max(...plan.withdrawals.map((x) => x.amount))}
                    color={theme.sleeve[w.sleeve]}
                    valueLabel={inr(w.amount)}
                  />
                ))}
                <div className="mt-4">
                  <div className="text-[11px] uppercase tracking-wide text-ink3 mb-1.5">Allocation before</div>
                  <StackedWeightBar weights={plan.weightsBefore} labelInBar />
                  <div className="text-[11px] uppercase tracking-wide text-ink3 mb-1.5 mt-3">Allocation after funding</div>
                  <StackedWeightBar weights={plan.weightsAfter} labelInBar />
                  <SleeveLegend />
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-ink3 mb-2">Why this way</div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between border-b border-hairline pb-2.5">
                    <span className="text-ink2">Portfolio in 10y — funded this way</span>
                    <span className="tnum font-medium text-ink">{inr(plan.optimalFutureValue)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-hairline pb-2.5">
                    <span className="text-ink2">Portfolio in 10y — sold pro-rata instead</span>
                    <span className="tnum text-ink2">{inr(plan.naiveFutureValue)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-hairline pb-2.5">
                    <span className="text-ink">Wealth preserved by funding it smartly</span>
                    <span className="tnum font-semibold text-good">{inr(plan.savings, { signed: true })}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink2">Exit costs & friction paid</span>
                    <span className="tnum text-ink2">{inr(plan.frictionCost)}</span>
                  </div>
                </div>

                {plan.reserveAdvice && (
                  <div className="rounded-md px-4 py-3 mt-4 text-sm border border-gold/40 bg-goldsoft/40 text-ink">
                    <div className="font-semibold mb-1">Since you need this in {horizon} year{horizon > 1 ? "s" : ""}, not today:</div>
                    Move {inr(plan.reserveAdvice.moveNow)} into liquid & short-duration funds now. It grows safely to
                    your {inr(amount)} by the date you need it, and the money stops riding equity swings — a market
                    fall next year can no longer touch your plan.
                  </div>
                )}
              </div>
            </div>
            <Disclaimer>
              The engine sells in small slices, always from the sleeve that is cheapest to sell at that moment —
              balancing growth foregone, exit loads and taxes, illiquidity, and drift from your mandate. Change the
              amount or the date and the answer changes with it. Tax treatment is estimated; final sequencing is
              confirmed by your advisor.
            </Disclaimer>
          </>
        )}
      </Card>

      {/* ---------- Stress testing ---------- */}
      <Card>
        <CardTitle hint="How the portfolio behaves when markets misbehave">Stress tests</CardTitle>
        <div className="flex gap-1.5 flex-wrap mb-4">
          {STRESS_SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => setStressId(s.id)}
              className={`px-3 py-1.5 rounded text-xs border transition-colors ${
                stressId === s.id ? "bg-navy text-navyink border-navy" : "border-hairline2 text-ink2 hover:bg-raised"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-ink2 mb-5 max-w-2xl">{stress.scenario.description}</p>

        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-ink3 mb-2">Impact by sleeve</div>
            {stress.sleeveImpacts
              .filter((i) => Math.abs(i.amount) > 1)
              .map((i) => (
                <HBar
                  key={i.sleeve}
                  label={
                    <span className="flex items-center">
                      <span className="w-2 h-2 rounded-full mr-1.5" style={{ background: theme.sleeve[i.sleeve] }} />
                      {SLEEVES[i.sleeve].label}
                    </span>
                  }
                  value={i.amount}
                  max={maxImpact}
                  color={i.amount < 0 ? theme.bad : theme.good}
                  valueLabel={pct(i.pct, 1, { signed: true })}
                />
              ))}
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-hairline pb-2.5">
              <span className="text-ink2">Portfolio today</span>
              <span className="tnum text-ink">{inr(total)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-hairline pb-2.5">
              <span className="text-ink2">Estimated impact</span>
              <span className={`tnum font-semibold ${stress.totalImpactAmount < 0 ? "text-bad" : "text-good"}`}>
                {inr(stress.totalImpactAmount, { signed: true })} ({pct(stress.totalImpactPct, 1, { signed: true })})
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-hairline pb-2.5">
              <span className="text-ink2">Portfolio after the shock</span>
              <span className="tnum font-medium text-ink">{inr(stress.valueAfter)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink2">Expected time to recover</span>
              <span className="tnum text-ink">
                {stress.recoveryYears > 0 ? `${stress.recoveryYears.toFixed(1)} years` : "—"}
              </span>
            </div>
            <Disclaimer>
              Impacts flow through each sleeve’s sensitivity to equities and interest rates, plus scenario-specific
              effects on alternatives and gold. Recovery assumes the portfolio then compounds at its long-run expected
              rate. Diversification is why the portfolio falls far less than the headline equity number.
            </Disclaimer>
          </div>
        </div>
      </Card>
    </div>
  );
}
