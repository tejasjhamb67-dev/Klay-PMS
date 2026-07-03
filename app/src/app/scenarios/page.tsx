"use client";

import { useMemo, useState } from "react";
import { HBar, SleeveLegend, StackedWeightBar, useTheme } from "@/components/charts";
import { Card, CardTitle, Disclaimer, PageHeader } from "@/components/ui";
import { useClient } from "@/components/client-context";
import { SLEEVES } from "@/lib/finance/assumptions";
import { sleeveValues, totalValue } from "@/lib/finance/engine";
import { inr, parseInr, pct } from "@/lib/finance/format";
import {
  LIFE_EVENT_PRESETS,
  MacroShock,
  NamedScenario,
  planLifeEvent,
  runShock,
  SCENARIO_LIBRARY,
  ScenarioGroup,
  shockedValues,
  ZERO_SHOCK,
} from "@/lib/finance/scenario";

const GROUPS: ScenarioGroup[] = ["Historical replays", "Macro & policy", "Crisis & shocks"];

const WHEN_OPTIONS = [
  { label: "Now", v: 0 },
  { label: "In 1y", v: 1 },
  { label: "In 2y", v: 2 },
  { label: "In 3y", v: 3 },
  { label: "In 5y", v: 5 },
];

const TREATMENT_COPY = {
  "sell-now": { label: "Raise today", cls: "text-bad" },
  reserve: { label: "Park in reserve now", cls: "text-accent" },
  "stay-invested": { label: "Stays invested", cls: "text-good" },
} as const;

export default function ScenariosPage() {
  const theme = useTheme();
  const { client: portfolio } = useClient();
  const total = totalValue(portfolio.holdings);
  const values = useMemo(() => sleeveValues(portfolio.holdings), [portfolio]);

  // ---- life event state ----
  const [amountText, setAmountText] = useState("80L");
  const [startYears, setStartYears] = useState(0);
  const [years, setYears] = useState(1);
  const [backdropId, setBackdropId] = useState("none");

  // ---- stress lab state ----
  const [stressId, setStressId] = useState(SCENARIO_LIBRARY[0].id);
  const [custom, setCustom] = useState<MacroShock>({ ...ZERO_SHOCK, equity: -0.25 });

  const perYear = parseInr(amountText) ?? 0;
  const backdrop: NamedScenario | null = useMemo(
    () => SCENARIO_LIBRARY.find((s) => s.id === backdropId) ?? null,
    [backdropId]
  );
  const planningValues = useMemo(
    () => (backdrop ? shockedValues(values, backdrop.shock) : values),
    [values, backdrop]
  );
  const backdropDrop = useMemo(() => (backdrop ? runShock(values, backdrop.shock) : null), [values, backdrop]);

  const plan = useMemo(
    () =>
      perYear > 0
        ? planLifeEvent({
            perYear,
            startYears,
            years,
            investmentHorizon: 10,
            values: planningValues,
            targetWeights: portfolio.targetWeights,
          })
        : null,
    [perYear, startYears, years, planningValues, portfolio.targetWeights]
  );

  const activeScenario = SCENARIO_LIBRARY.find((s) => s.id === stressId) ?? null;
  const activeShock = stressId === "custom" ? custom : activeScenario!.shock;
  const stress = useMemo(() => runShock(values, activeShock), [values, activeShock]);
  const maxImpact = Math.max(...stress.sleeveImpacts.map((i) => Math.abs(i.amount)), 1);
  const liq = plan?.liquidity ?? null;

  const slider = (
    label: string,
    value: number,
    display: string,
    min: number,
    max: number,
    step: number,
    onChange: (v: number) => void
  ) => (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-ink2">{label}</span>
        <span className="tnum text-ink font-medium">{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Scenario Lab"
        subtitle="Scenarios are limitless, so the engine is general: any cash need is an optimisation over what to sell and when; any market event is a combination of five macro forces. Name it, or build it yourself."
      />

      {/* ================= Life events ================= */}
      <Card className="mb-6">
        <CardTitle hint="One-time or spread over years — education, a house, a wedding, an emergency. Optionally plan it under a stressed market.">
          Fund a life event
        </CardTitle>

        <div className="flex gap-1.5 flex-wrap mb-4">
          {LIFE_EVENT_PRESETS.map((q) => (
            <button
              key={q.id}
              onClick={() => {
                setAmountText(q.perYear);
                setStartYears(q.startYears);
                setYears(q.years);
              }}
              className="px-2.5 py-1.5 rounded-full text-xs border border-hairline text-ink3 hover:text-ink hover:bg-raised transition-colors"
            >
              {q.label}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-4 flex-wrap mb-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-ink3 mb-1">
              {years > 1 ? "Amount per year" : "Amount needed"}
            </label>
            <input
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              placeholder="e.g. 60L or 1.5cr"
              className="bg-raised border border-hairline2 rounded-md px-3 py-2 text-sm text-ink w-36 tnum outline-none focus:border-accent"
            />
            <div className="text-[11px] text-ink3 mt-1 tnum">{perYear > 0 ? `= ${inr(perYear)}${years > 1 ? "/yr" : ""}` : "Use L / Cr shorthand"}</div>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-ink3 mb-1">Starting</label>
            <div className="flex gap-1">
              {WHEN_OPTIONS.map((o) => (
                <button
                  key={o.v}
                  onClick={() => setStartYears(o.v)}
                  className={`px-2.5 py-2 rounded text-xs border transition-colors ${
                    startYears === o.v ? "bg-navy text-navyink border-navy" : "border-hairline2 text-ink2 hover:bg-raised"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-ink3 mb-1">For</label>
            <select
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="bg-raised border border-hairline2 rounded-md px-2.5 py-2 text-sm text-ink outline-none cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? "One-time" : `${n} years running`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-ink3 mb-1">Market backdrop</label>
            <select
              value={backdropId}
              onChange={(e) => setBackdropId(e.target.value)}
              className="bg-raised border border-hairline2 rounded-md px-2.5 py-2 text-sm text-ink outline-none cursor-pointer max-w-56"
            >
              <option value="none">Normal markets</option>
              {SCENARIO_LIBRARY.map((s) => (
                <option key={s.id} value={s.id}>
                  During: {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {backdrop && backdropDrop && (
          <div className="rounded-md px-4 py-3 mb-4 text-sm border border-bad/30 bg-bad/5 text-ink">
            Planned under <strong>{backdrop.label}</strong>: the portfolio is first marked down{" "}
            {pct(backdropDrop.totalImpactPct, 1)} to {inr(backdropDrop.valueAfter)} — the funding plan below works with
            what remains.
          </div>
        )}

        {plan && liq && perYear > 0 && (
          <>
            {!liq.feasible && (
              <div className="rounded-md px-4 py-3 mb-4 text-sm border border-bad/30 bg-bad/5 text-ink">
                What must move today exceeds what the portfolio can fund. Showing the maximum possible — speak to your
                advisor about staging or credit against the portfolio.
              </div>
            )}

            {years > 1 && (
              <div className="mb-5">
                <div className="text-[11px] uppercase tracking-wide text-ink3 mb-2">
                  Funding timeline — {inr(plan.totalNeed)} total, {pct(plan.needAsShareOfPortfolio, 0)} of the portfolio
                </div>
                <div className="grid md:grid-cols-2 gap-x-8">
                  {plan.tranches.map((t, i) => (
                    <div key={i} className="flex items-center justify-between text-sm border-b border-hairline py-2">
                      <span className="text-ink2">{t.year <= 0 ? "Today" : `Year ${t.year}`}</span>
                      <span className="tnum text-ink">{inr(t.amount)}</span>
                      <span className={`text-xs ${TREATMENT_COPY[t.treatment].cls}`}>{TREATMENT_COPY[t.treatment].label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-ink3 mt-2 max-w-3xl">
                  Instalments due within 3 years are pre-funded into liquid & short-duration reserves today (
                  {inr(plan.reserveNow)}) so market swings can’t touch them; later instalments (
                  {inr(plan.stayInvested)}) keep compounding until they’re needed.
                </p>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-ink3 mb-2">
                  What moves today ({inr(plan.sellNow + plan.reserveNow)}) — lowest-cost sourcing
                </div>
                {liq.withdrawals.map((w) => (
                  <HBar
                    key={w.sleeve}
                    label={
                      <span className="flex items-center">
                        <span className="w-2 h-2 rounded-full mr-1.5" style={{ background: theme.sleeve[w.sleeve] }} />
                        {SLEEVES[w.sleeve].label}
                      </span>
                    }
                    value={w.amount}
                    max={Math.max(...liq.withdrawals.map((x) => x.amount))}
                    color={theme.sleeve[w.sleeve]}
                    valueLabel={inr(w.amount)}
                  />
                ))}
                <div className="mt-4">
                  <div className="text-[11px] uppercase tracking-wide text-ink3 mb-1.5">Allocation before</div>
                  <StackedWeightBar weights={liq.weightsBefore} labelInBar />
                  <div className="text-[11px] uppercase tracking-wide text-ink3 mb-1.5 mt-3">Allocation after funding</div>
                  <StackedWeightBar weights={liq.weightsAfter} labelInBar />
                  <SleeveLegend />
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-ink3 mb-2">Why this way</div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between border-b border-hairline pb-2.5">
                    <span className="text-ink2">Portfolio in 10y — funded this way</span>
                    <span className="tnum font-medium text-ink">{inr(liq.optimalFutureValue)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-hairline pb-2.5">
                    <span className="text-ink2">Portfolio in 10y — sold pro-rata instead</span>
                    <span className="tnum text-ink2">{inr(liq.naiveFutureValue)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-hairline pb-2.5">
                    <span className="text-ink">Wealth preserved by funding it smartly</span>
                    <span className="tnum font-semibold text-good">{inr(liq.savings, { signed: true })}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink2">Exit costs & friction paid</span>
                    <span className="tnum text-ink2">{inr(liq.frictionCost)}</span>
                  </div>
                </div>

                <div
                  className={`rounded-md px-4 py-3 mt-4 text-sm border ${
                    plan.needAsShareOfPortfolio < 0.1
                      ? "border-good/30 bg-good/5"
                      : plan.needAsShareOfPortfolio < 0.3
                        ? "border-hairline"
                        : "border-bad/30 bg-bad/5"
                  } text-ink`}
                >
                  {plan.needAsShareOfPortfolio < 0.1 ? (
                    <>This is {pct(plan.needAsShareOfPortfolio, 0)} of the portfolio — comfortably fundable without disturbing the long-term plan.</>
                  ) : plan.needAsShareOfPortfolio < 0.3 ? (
                    <>This is {pct(plan.needAsShareOfPortfolio, 0)} of the portfolio — fundable, and worth sequencing with your advisor for tax.</>
                  ) : (
                    <>This is {pct(plan.needAsShareOfPortfolio, 0)} of the portfolio — a material draw that reshapes the plan. The IC would model this alongside your other goals.</>
                  )}
                </div>
              </div>
            </div>
            <Disclaimer>
              The engine sells in small slices, always from the sleeve that is cheapest to sell at that moment —
              balancing growth foregone, exit loads and taxes, illiquidity, and drift from your mandate. Change any
              input and the answer changes with it. Tax treatment is estimated; final sequencing is confirmed by your
              advisor.
            </Disclaimer>
          </>
        )}
      </Card>

      {/* ================= Stress lab ================= */}
      <Card>
        <CardTitle hint="Five macro forces — equities, rates, inflation, the rupee, liquidity — drive every scenario. Pick a named one or build your own.">
          Stress laboratory
        </CardTitle>

        <div className="space-y-2 mb-4">
          {GROUPS.map((g) => (
            <div key={g} className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-[0.15em] text-ink3 w-32 shrink-0">{g}</span>
              {SCENARIO_LIBRARY.filter((s) => s.group === g).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStressId(s.id)}
                  className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                    stressId === s.id ? "bg-navy text-navyink border-navy" : "border-hairline2 text-ink2 hover:bg-raised"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          ))}
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] uppercase tracking-[0.15em] text-ink3 w-32 shrink-0">Your own</span>
            <button
              onClick={() => setStressId("custom")}
              className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                stressId === "custom" ? "bg-navy text-navyink border-navy" : "border-hairline2 text-ink2 hover:bg-raised"
              }`}
            >
              Build a scenario
            </button>
          </div>
        </div>

        {stressId === "custom" ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 mb-5 max-w-3xl">
            {slider("Equity market", custom.equity * 100, pct(custom.equity, 0, { signed: true }), -60, 30, 1, (v) =>
              setCustom((c) => ({ ...c, equity: v / 100 }))
            )}
            {slider("Interest rates", custom.ratesBp, `${custom.ratesBp >= 0 ? "+" : "−"}${Math.abs(custom.ratesBp)}bp`, -300, 300, 25, (v) =>
              setCustom((c) => ({ ...c, ratesBp: v }))
            )}
            {slider("Inflation surprise", custom.inflationPp, `${custom.inflationPp >= 0 ? "+" : "−"}${Math.abs(custom.inflationPp)}pp`, -3, 8, 0.5, (v) =>
              setCustom((c) => ({ ...c, inflationPp: v }))
            )}
            {slider("Rupee depreciation", custom.inrDepreciation * 100, pct(custom.inrDepreciation, 0), -5, 25, 1, (v) =>
              setCustom((c) => ({ ...c, inrDepreciation: v / 100 }))
            )}
            {slider("Liquidity crunch", custom.liquidityCrunch * 100, pct(custom.liquidityCrunch, 0), 0, 100, 5, (v) =>
              setCustom((c) => ({ ...c, liquidityCrunch: v / 100 }))
            )}
          </div>
        ) : (
          <p className="text-sm text-ink2 mb-5 max-w-3xl">{activeScenario?.description}</p>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-ink3 mb-2">Impact by sleeve</div>
            {stress.sleeveImpacts
              .filter((i) => Math.abs(i.amount) > total * 0.0005)
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
            <div className="text-[11px] uppercase tracking-wide text-ink3 mb-2 mt-5">What drove it</div>
            {stress.factorContributions.map((f) => (
              <div key={f.label} className="flex items-center justify-between text-sm border-b border-hairline py-1.5 last:border-0">
                <span className="text-ink2">{f.label}</span>
                <span className={`tnum ${f.amount < 0 ? "text-bad" : "text-good"}`}>{inr(f.amount, { signed: true })}</span>
              </div>
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
              <span className="text-ink2">Portfolio after the event</span>
              <span className="tnum font-medium text-ink">{inr(stress.valueAfter)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink2">Expected time to recover</span>
              <span className="tnum text-ink">
                {stress.recoveryYears > 0.05 ? `${stress.recoveryYears.toFixed(1)} years` : "—"}
              </span>
            </div>
            <Disclaimer>
              Each sleeve carries a sensitivity to all five forces — equities take market beta and rate pain, bonds are
              duration, alternatives are the liquidity casualty, gold in the tactical sleeve rises with inflation and a
              weak rupee, cash is immune. That is why the portfolio falls far less than the headline equity number, and
              why any scenario you can describe can be expressed here.
            </Disclaimer>
          </div>
        </div>
      </Card>
    </div>
  );
}
