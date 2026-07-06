"use client";

/**
 * Live intraday quotes, fetched by the BROWSER (the site is static, so there
 * is no server to hide keys behind — and none are needed).
 *
 * Yahoo Finance's chart API has the data but no CORS headers, so calls are
 * routed through public CORS relays, tried in order. Every quote carries its
 * timestamp; if all relays fail the UI falls back to the daily snapshot and
 * says so. Verified reachable via CI probe before shipping.
 */

export interface LiveQuote {
  symbol: string;
  label: string;
  price: number;
  changePct: number; // vs previous close
  spark: number[]; // intraday closes for a sparkline
  asOf: Date;
}

export interface LiveMarket {
  quotes: Record<string, LiveQuote>;
  fetchedAt: Date;
}

/** Instruments shown in the Markets section (proxy per sleeve). */
export const LIVE_INSTRUMENTS: { symbol: string; label: string; group: string }[] = [
  { symbol: "^NSEI", label: "Nifty 50", group: "Equities" },
  { symbol: "^NSEBANK", label: "Nifty Bank", group: "Equities" },
  { symbol: "GOLDBEES.NS", label: "Gold ETF (GOLDBEES)", group: "Tactical" },
  { symbol: "EMBASSY.NS", label: "Embassy Office Parks REIT", group: "Alternatives" },
  { symbol: "USDINR=X", label: "USD / INR", group: "Currency" },
];

// Order verified by CI probe: corsproxy.io free tier serves browsers (blocks
// servers) and sends ACAO:*; allorigins is the flaky backup.
const RELAYS: ((url: string) => string)[] = [
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
];

interface YahooChart {
  chart: {
    result: {
      meta: { regularMarketPrice: number; chartPreviousClose: number; regularMarketTime: number };
      indicators: { quote: { close: (number | null)[] }[] };
    }[];
  };
}

async function fetchChart(symbol: string): Promise<LiveQuote | null> {
  const target = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m`;
  for (const relay of RELAYS) {
    try {
      const res = await fetch(relay(target), { signal: AbortSignal.timeout(12000) });
      if (!res.ok) continue;
      const data = (await res.json()) as YahooChart;
      const r = data.chart?.result?.[0];
      if (!r?.meta?.regularMarketPrice) continue;
      const closes = (r.indicators?.quote?.[0]?.close ?? []).filter((c): c is number => c != null);
      const prev = r.meta.chartPreviousClose;
      const inst = LIVE_INSTRUMENTS.find((i) => i.symbol === symbol);
      return {
        symbol,
        label: inst?.label ?? symbol,
        price: r.meta.regularMarketPrice,
        changePct: prev > 0 ? ((r.meta.regularMarketPrice - prev) / prev) * 100 : 0,
        spark: closes.length > 1 ? closes : [prev, r.meta.regularMarketPrice],
        asOf: new Date(r.meta.regularMarketTime * 1000),
      };
    } catch {
      // try next relay
    }
  }
  return null;
}

/** Keyless CORS-open FX source (daily reference rate) as a USDINR fallback. */
async function fetchFxFallback(): Promise<LiveQuote | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const d = (await res.json()) as { rates?: { INR?: number }; time_last_update_unix?: number };
    if (!d.rates?.INR) return null;
    return {
      symbol: "USDINR=X",
      label: "USD / INR (daily reference)",
      price: d.rates.INR,
      changePct: 0,
      spark: [d.rates.INR, d.rates.INR],
      asOf: new Date((d.time_last_update_unix ?? Date.now() / 1000) * 1000),
    };
  } catch {
    return null;
  }
}

export async function fetchLiveMarket(): Promise<LiveMarket> {
  const results = await Promise.all(LIVE_INSTRUMENTS.map((i) => fetchChart(i.symbol)));
  const quotes: Record<string, LiveQuote> = {};
  for (const q of results) if (q) quotes[q.symbol] = q;
  if (!quotes["USDINR=X"]) {
    const fx = await fetchFxFallback();
    if (fx) quotes[fx.symbol] = fx;
  }
  return { quotes, fetchedAt: new Date() };
}

/** NSE cash session: 09:15–15:30 IST, Monday–Friday. */
export function nseMarketOpen(now = new Date()): boolean {
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const day = ist.getDay();
  if (day === 0 || day === 6) return false;
  const mins = ist.getHours() * 60 + ist.getMinutes();
  return mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30;
}
