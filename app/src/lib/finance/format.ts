// INR formatting helpers. Clients think in lakhs and crores, so we do too.

const CRORE = 1e7;
const LAKH = 1e5;

/** ₹18.42 Cr / ₹42.5 L / ₹85,000 — compact money for tiles and tooltips. */
export function inr(value: number, opts?: { signed?: boolean }): string {
  const sign = value < 0 ? "−" : opts?.signed && value > 0 ? "+" : "";
  const v = Math.abs(value);
  if (v >= CRORE) return `${sign}₹${(v / CRORE).toFixed(v / CRORE >= 100 ? 0 : 2)} Cr`;
  if (v >= LAKH) return `${sign}₹${(v / LAKH).toFixed(1)} L`;
  return `${sign}₹${Math.round(v).toLocaleString("en-IN")}`;
}

/** 12.4% — one decimal by default. */
export function pct(value: number, decimals = 1, opts?: { signed?: boolean }): string {
  const sign = value < 0 ? "−" : opts?.signed && value > 0 ? "+" : "";
  return `${sign}${Math.abs(value * 100).toFixed(decimals)}%`;
}

/** Compact axis-tick money: ₹90 Cr / ₹50 L — no decimals, never wraps. */
export function inrAxis(value: number): string {
  const v = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (v >= CRORE) return `${sign}₹${Math.round(v / CRORE)} Cr`;
  if (v >= LAKH) return `${sign}₹${Math.round(v / LAKH)} L`;
  return `${sign}₹${Math.round(v)}`;
}

/** Parse a user-entered rupee amount that may use Cr/L shorthand ("1.5cr", "75l", "5000000"). */
export function parseInr(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/[₹,\s]/g, "");
  const m = s.match(/^([\d.]+)(cr|crore|crores|l|lakh|lakhs|k)?$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!isFinite(n)) return null;
  const unit = m[2];
  if (unit?.startsWith("cr")) return n * CRORE;
  if (unit?.startsWith("l")) return n * LAKH;
  if (unit === "k") return n * 1e3;
  return n;
}
