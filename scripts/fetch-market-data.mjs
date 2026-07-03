#!/usr/bin/env node
/**
 * Daily market-data pipeline (runs in GitHub Actions at 19:00 IST, Mon–Fri).
 *
 *   fetch → validate → derive capital-market assumptions → write snapshot
 *
 * Sources (per-series fallback chain; a failed series falls back to the
 * previous snapshot's value rather than killing the run):
 *   Nifty 50, GOLDBEES, USDINR ......... Yahoo Finance chart API → Stooq CSV
 *   India 10Y G-sec, CPI ............... FRED CSV (no key required)
 *   Nifty P/E & dividend yield ......... NSE (best-effort; prior if blocked)
 *
 * Output: app/public/data/market-snapshot.json  (committed by the Action)
 * Run locally: node scripts/fetch-market-data.mjs [--dry-run]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const OUT = resolve(import.meta.dirname, "../app/public/data/market-snapshot.json");
const DRY = process.argv.includes("--dry-run");
const UA = { "User-Agent": "Mozilla/5.0 (compatible; KlayPMS/1.0)" };

// ---- IC priors used by the derive step (mirror docs/MARKET-DATA-ARCHITECTURE.md) ----
const PRIORS = {
  realGdpGrowth: 0.065,
  niftyPeAverage: 22.0,
  reversionCapPa: 0.02,
  aaaSpread: 0.007,
  defaultDrag: 0.002,
  realGoldReturn: 0.015,
  inrDriftPa: 0.02,
  goldFxBeta: 0.35,
  goldShareOfTactical: 0.6,
  opportunisticPrior: 0.115,
  altPremiumOverEquity: 0.025,
  vol: { equities: 0.165, fixedIncome: 0.045, alternatives: 0.2, tactical: 0.18, cash: 0.005 },
  volShrink: 0.5, // weight on live EWMA vs prior
};

const notes = [];
const failures = [];

async function get(url, as = "json") {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return as === "json" ? res.json() : res.text();
}

// ---------- source adapters ----------

async function yahooDaily(symbol, range = "1y") {
  const d = await get(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`
  );
  const r = d.chart.result[0];
  const closes = r.indicators.quote[0].close.filter((c) => c != null);
  if (closes.length < 20) throw new Error(`thin history for ${symbol}`);
  return { closes, last: closes[closes.length - 1], prev: closes[closes.length - 2], ts: r.timestamp.at(-1) };
}

async function stooqLast(symbol) {
  const csv = await get(`https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv&h&e=csv`, "text");
  const cells = csv.trim().split("\n")[1].split(",");
  const close = parseFloat(cells[6]);
  const open = parseFloat(cells[3]);
  if (!isFinite(close)) throw new Error(`stooq parse ${symbol}`);
  return { closes: [open, close], last: close, prev: open, ts: Date.parse(cells[1]) / 1000 };
}

async function series(label, attempts) {
  for (const [name, fn] of attempts) {
    try {
      const v = await fn();
      notes.push(`${label}: ${name}`);
      return v;
    } catch (e) {
      failures.push(`${label} via ${name}: ${e.message}`);
    }
  }
  return null;
}

async function fredLatest(seriesId) {
  const csv = await get(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`, "text");
  const rows = csv.trim().split("\n").slice(1).map((l) => l.split(","));
  const valid = rows.filter((r) => r[1] !== "." && isFinite(parseFloat(r[1])));
  if (!valid.length) throw new Error(`no data ${seriesId}`);
  return valid.map((r) => ({ date: r[0], value: parseFloat(r[1]) }));
}

async function nseIndexStats() {
  // NSE requires a cookie warm-up and often blocks CI — strictly best-effort.
  const home = await fetch("https://www.nseindia.com", { headers: UA, signal: AbortSignal.timeout(15000) });
  const cookie = home.headers.getSetCookie?.().map((c) => c.split(";")[0]).join("; ") ?? "";
  const res = await fetch("https://www.nseindia.com/api/allIndices", {
    headers: { ...UA, cookie, accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`nse ${res.status}`);
  const data = await res.json();
  const nifty = data.data.find((i) => i.index === "NIFTY 50");
  if (!nifty?.pe) throw new Error("nifty row missing");
  return { pe: parseFloat(nifty.pe), dy: parseFloat(nifty.yield) / 100 };
}

// ---------- derive helpers ----------

function ewmaVol(closes, lambda = 0.97) {
  let variance = 0;
  let initialised = false;
  for (let i = 1; i < closes.length; i++) {
    const r = Math.log(closes[i] / closes[i - 1]);
    if (!initialised) {
      variance = r * r;
      initialised = true;
    } else {
      variance = lambda * variance + (1 - lambda) * r * r;
    }
  }
  return Math.sqrt(variance * 252);
}

const pct1 = (x) => Math.round(x * 1e4) / 1e4;

// ---------- main ----------

const previous = JSON.parse(readFileSync(OUT, "utf8"));

const [nifty, gold, fx, gsecRows, cpiRows, nseStats] = await Promise.all([
  series("nifty", [
    ["yahoo ^NSEI", () => yahooDaily("^NSEI")],
    ["stooq ^nsei", () => stooqLast("^nsei")],
  ]),
  series("gold", [
    ["yahoo GOLDBEES.NS", () => yahooDaily("GOLDBEES.NS")],
  ]),
  series("usdinr", [
    ["yahoo USDINR=X", () => yahooDaily("USDINR=X")],
    ["stooq usdinr", () => stooqLast("usdinr")],
  ]),
  series("gsec10Y", [["fred IRLTLT01ININM156N", () => fredLatest("IRLTLT01ININM156N")]]),
  series("cpi", [["fred INDCPIALLMINMEI", () => fredLatest("INDCPIALLMINMEI")]]),
  series("nifty P/E & yield", [["nse allIndices", () => nseIndexStats()]]),
]);

const prev = previous.raw;
const raw = {
  nifty: nifty
    ? { level: Math.round(nifty.last), dayChangePct: pct1(((nifty.last - nifty.prev) / nifty.prev) * 100) }
    : prev.nifty,
  niftyPe: nseStats?.pe ?? prev.niftyPe,
  niftyDivYield: nseStats?.dy ?? prev.niftyDivYield,
  gsec10Y: gsecRows ? pct1(gsecRows.at(-1).value / 100) : prev.gsec10Y,
  tbill: gsecRows ? pct1(gsecRows.at(-1).value / 100 - 0.006) : prev.tbill, // 3M ≈ 10Y − 60bp prior
  cpiYoY: cpiRows && cpiRows.length > 13
    ? pct1(cpiRows.at(-1).value / cpiRows.at(-13).value - 1)
    : prev.cpiYoY,
  usdInr: fx
    ? { level: pct1(fx.last), dayChangePct: pct1(((fx.last - fx.prev) / fx.prev) * 100) }
    : prev.usdInr,
  goldEtf: gold
    ? { level: pct1(gold.last), dayChangePct: pct1(((gold.last - gold.prev) / gold.prev) * 100) }
    : prev.goldEtf,
};

// -- building-block expected returns (see docs/MARKET-DATA-ARCHITECTURE.md) --
const dy = raw.niftyDivYield ?? 0.012;
const pe = raw.niftyPe ?? PRIORS.niftyPeAverage;
const reversion = Math.max(
  -PRIORS.reversionCapPa,
  Math.min(PRIORS.reversionCapPa, (PRIORS.niftyPeAverage - pe) / pe / 10)
);
const eqReturn = dy + raw.cpiYoY + PRIORS.realGdpGrowth + reversion;
const fiReturn = raw.gsec10Y + PRIORS.aaaSpread - PRIORS.defaultDrag;
const goldBlock = raw.cpiYoY + PRIORS.realGoldReturn + PRIORS.goldFxBeta * PRIORS.inrDriftPa;
const tacReturn =
  PRIORS.goldShareOfTactical * goldBlock + (1 - PRIORS.goldShareOfTactical) * PRIORS.opportunisticPrior;

const shrink = (live, prior) =>
  live != null && isFinite(live) ? pct1(PRIORS.volShrink * live + (1 - PRIORS.volShrink) * prior) : prior;
const eqVol = shrink(nifty?.closes?.length > 60 ? ewmaVol(nifty.closes) : null, PRIORS.vol.equities);
const tacVol = shrink(gold?.closes?.length > 60 ? ewmaVol(gold.closes) : null, PRIORS.vol.tactical);

const snapshot = {
  asOf: nifty?.ts ? new Date(nifty.ts * 1000).toISOString().slice(0, 10) : previous.asOf,
  generatedAt: new Date().toISOString(),
  source: nifty && gsecRows ? "live" : previous.source,
  raw,
  derived: {
    sleeves: {
      equities: { expectedReturn: pct1(eqReturn), volatility: eqVol },
      fixedIncome: { expectedReturn: pct1(fiReturn), volatility: PRIORS.vol.fixedIncome },
      alternatives: {
        expectedReturn: pct1(eqReturn + PRIORS.altPremiumOverEquity),
        volatility: PRIORS.vol.alternatives,
      },
      tactical: { expectedReturn: pct1(tacReturn), volatility: tacVol },
      cash: { expectedReturn: raw.tbill, volatility: PRIORS.vol.cash },
    },
    notes: [
      `equities: divYield ${(dy * 100).toFixed(2)}% + nominal growth (CPI ${(raw.cpiYoY * 100).toFixed(1)}% + real ${(PRIORS.realGdpGrowth * 100).toFixed(1)}%) + reversion ${(reversion * 100).toFixed(2)}% (P/E ${pe} vs ${PRIORS.niftyPeAverage})`,
      `fixedIncome: 10Y ${(raw.gsec10Y * 100).toFixed(2)}% + spread ${(PRIORS.aaaSpread * 100).toFixed(1)}% − default ${(PRIORS.defaultDrag * 100).toFixed(1)}%`,
      `tactical: ${PRIORS.goldShareOfTactical * 100}% gold (CPI + ${(PRIORS.realGoldReturn * 100).toFixed(1)}% real + FX drift) + opportunistic prior`,
      `alternatives: equities + ${(PRIORS.altPremiumOverEquity * 100).toFixed(1)}% access/illiquidity premium`,
      ...notes,
      ...failures.map((f) => `FALLBACK USED — ${f}`),
    ],
  },
};

// -- validate before writing: refuse absurd values, keep last good instead --
const sane =
  snapshot.raw.nifty.level > 5000 &&
  snapshot.raw.gsec10Y > 0.03 &&
  snapshot.raw.gsec10Y < 0.12 &&
  snapshot.raw.usdInr.level > 60 &&
  snapshot.raw.usdInr.level < 130 &&
  snapshot.derived.sleeves.equities.expectedReturn > 0.02 &&
  snapshot.derived.sleeves.equities.expectedReturn < 0.25;

if (!sane) {
  console.error("VALIDATION FAILED — keeping previous snapshot", JSON.stringify(snapshot.raw));
  process.exit(1);
}

if (DRY) {
  console.log(JSON.stringify(snapshot, null, 2));
} else {
  writeFileSync(OUT, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(`snapshot written: asOf=${snapshot.asOf} source=${snapshot.source}`);
  if (failures.length) console.log(failures.map((f) => `  fallback: ${f}`).join("\n"));
}
