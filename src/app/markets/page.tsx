"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { HBar, useTheme } from "@/components/charts";
import { Card, CardTitle, Disclaimer, PageHeader } from "@/components/ui";
import { useClient } from "@/components/client-context";
import { useMarket } from "@/components/market-context";
import { SLEEVES } from "@/lib/finance/assumptions";
import { sleeveValues, totalValue } from "@/lib/finance/engine";
import { inr, pct } from "@/lib/finance/format";
import { fetchLiveMarket, LIVE_INSTRUMENTS, LiveMarket, nseMarketOpen } from "@/lib/finance/live";
import { BETAS } from "@/lib/finance/scenario";
import { SLEEVE_IDS, SleeveId } from "@/lib/finance/types";

const REFRESH_MS = 60_000;

function Spark({ data, color }: { data: number[]; color: string }) {
  const pts = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-8 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={pts} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <Line dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function MarketsPage() {
  const theme = useTheme();
  const { client: portfolio } = useClient();
  const { snapshot } = useMarket();
  const total = totalValue(portfolio.holdings);
  const values = useMemo(() => sleeveValues(portfolio.holdings), [portfolio]);

  const [live, setLive] = useState<LiveMarket | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchLiveMarket().then((m) => {
      setLive(m);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const open = nseMarketOpen();
  const nifty = live?.quotes["^NSEI"];
  const gold = live?.quotes["GOLDBEES.NS"];
  const fx = live?.quotes["USDINR=X"];
  const anyLive = live && Object.keys(live.quotes).length > 0;

  // Estimated intraday move per sleeve via the factor model: equity beta ×
  // today's Nifty move + FX beta × today's INR move; tactical uses the live
  // gold print directly (it IS the sleeve's dominant asset).
  const dayImpacts = useMemo(() => {
    if (!nifty) return null;
    const niftyChg = nifty.changePct / 100;
    const fxChg = (fx?.changePct ?? 0) / 100;
    const goldChg = (gold?.changePct ?? 0) / 100;
    return SLEEVE_IDS.map((s: SleeveId) => {
      const chg = s === "tactical" && gold ? goldChg : BETAS[s].equity * niftyChg + BETAS[s].fx * fxChg;
      return { sleeve: s, pct: chg, amount: values[s] * chg };
    });
  }, [nifty, gold, fx, values]);
  const dayTotal = dayImpacts?.reduce((s, i) => s + i.amount, 0) ?? 0;
  const maxImpact = Math.max(...(dayImpacts?.map((i) => Math.abs(i.amount)) ?? [1]), 1);

  const chip = (v: number) => (
    <span className={`tnum text-sm font-medium ${v >= 0 ? "text-good" : "text-bad"}`}>
      {v >= 0 ? "+" : "−"}{Math.abs(v).toFixed(2)}%
    </span>
  );

  return (
    <div>
      <PageHeader
        title="Markets — Live"
        subtitle="Quotes pulled by your browser right now, and what today's tape means for your portfolio — estimated through the same factor model that powers the Scenario Lab."
      />

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <span
          className={`text-xs px-2.5 py-1 rounded-full border ${
            open ? "border-good/40 text-good" : "border-hairline2 text-ink3"
          }`}
        >
          {open ? "● NSE open" : "○ NSE closed"}
        </span>
        <span className="text-xs text-ink3 tnum">
          {live
            ? `Quotes as of ${live.fetchedAt.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} IST`
            : "Fetching…"}
        </span>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-xs px-2.5 py-1 rounded border border-hairline2 text-ink2 hover:bg-raised transition-colors disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh now"}
        </button>
        <span className="text-[11px] text-ink3">Auto-refreshes every 60s</span>
      </div>

      {!anyLive && !loading && (
        <div className="rounded-md px-4 py-3 mb-5 text-sm border border-hairline text-ink2">
          Live relays are unreachable from this network right now — showing the last daily close from the Klay data
          pipeline instead{snapshot ? ` (as of ${snapshot.asOf})` : ""}. Everything below updates the moment a relay
          responds.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="text-xs uppercase tracking-wide text-ink3">Nifty 50</div>
          <div className="flex items-end justify-between mt-1.5">
            <div>
              <div className="text-2xl font-semibold text-ink tnum">
                {(nifty?.price ?? snapshot?.raw.nifty.level ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </div>
              {chip(nifty?.changePct ?? snapshot?.raw.nifty.dayChangePct ?? 0)}
            </div>
            {nifty && <Spark data={nifty.spark} color={theme.sleeve.equities} />}
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-ink3">Gold ETF</div>
          <div className="flex items-end justify-between mt-1.5">
            <div>
              <div className="text-2xl font-semibold text-ink tnum">
                {gold ? `₹${gold.price.toFixed(1)}` : snapshot ? `₹${snapshot.raw.goldEtf.level.toFixed(1)}` : "—"}
              </div>
              {chip(gold?.changePct ?? snapshot?.raw.goldEtf.dayChangePct ?? 0)}
            </div>
            {gold && <Spark data={gold.spark} color={theme.sleeve.tactical} />}
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-ink3">USD / INR</div>
          <div className="flex items-end justify-between mt-1.5">
            <div>
              <div className="text-2xl font-semibold text-ink tnum">
                {(fx?.price ?? snapshot?.raw.usdInr.level ?? 0).toFixed(2)}
              </div>
              {chip(fx?.changePct ?? snapshot?.raw.usdInr.dayChangePct ?? 0)}
            </div>
            {fx && fx.spark.length > 2 && <Spark data={fx.spark} color={theme.sleeve.cash} />}
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-ink3">10Y G-sec · CPI</div>
          <div className="text-2xl font-semibold text-ink tnum mt-1.5">
            {snapshot ? `${(snapshot.raw.gsec10Y * 100).toFixed(2)}%` : "—"}
          </div>
          <div className="text-xs text-ink3 mt-0.5 tnum">
            CPI {snapshot ? `${(snapshot.raw.cpiYoY * 100).toFixed(1)}%` : "—"} · prev close / monthly
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardTitle hint="Today's market moves, pushed through your actual sleeve exposures">
            Your portfolio today — {portfolio.clientName.split(" ")[0]}
          </CardTitle>
          {dayImpacts ? (
            <>
              <div className="flex items-baseline gap-3 mb-4">
                <span className={`text-3xl font-semibold tnum ${dayTotal >= 0 ? "text-good" : "text-bad"}`}>
                  {inr(dayTotal, { signed: true })}
                </span>
                <span className="text-sm text-ink2 tnum">
                  {pct(dayTotal / total, 2, { signed: true })} of {inr(total)} · estimated
                </span>
              </div>
              {dayImpacts
                .filter((i) => Math.abs(i.amount) > total * 0.00005)
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
                    color={i.amount >= 0 ? theme.good : theme.bad}
                    valueLabel={inr(i.amount, { signed: true })}
                  />
                ))}
              <Disclaimer>
                Estimated by applying today&apos;s index, gold and currency moves to each sleeve through its factor
                sensitivities — the same model as the Scenario Lab. Actual strategy-level marks arrive with the
                end-of-day NAVs.
              </Disclaimer>
            </>
          ) : (
            <p className="text-sm text-ink3">Waiting for a live Nifty quote to estimate today&apos;s move…</p>
          )}
        </Card>

        <Card>
          <CardTitle hint="Live prints for the instruments behind each sleeve">Products on the tape</CardTitle>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ink3 border-b border-hairline2">
                <th className="py-2 font-medium">Instrument</th>
                <th className="py-2 font-medium">Sleeve</th>
                <th className="py-2 font-medium text-right">Last</th>
                <th className="py-2 font-medium text-right">Today</th>
              </tr>
            </thead>
            <tbody>
              {LIVE_INSTRUMENTS.map((inst) => {
                const q = live?.quotes[inst.symbol];
                return (
                  <tr key={inst.symbol} className="border-b border-hairline last:border-0">
                    <td className="py-2.5 text-ink">{inst.label}</td>
                    <td className="py-2.5 text-xs text-ink3">{inst.group}</td>
                    <td className="py-2.5 text-right tnum text-ink">
                      {q ? q.price.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"}
                    </td>
                    <td className="py-2.5 text-right">{q ? chip(q.changePct) : <span className="text-ink3 text-xs">no feed</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Disclaimer>
            Quotes are fetched directly by your browser via public relays and may be delayed up to ~15 minutes
            depending on the exchange feed. Long-term planning numbers come from the audited daily snapshot, not from
            this ticker.
          </Disclaimer>
        </Card>
      </div>
    </div>
  );
}
