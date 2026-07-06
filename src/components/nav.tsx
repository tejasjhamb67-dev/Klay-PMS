"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import wordmark from "../../public/klay-wordmark.png";
import { useClient } from "./client-context";
import { useMarket } from "./market-context";
import { totalValue } from "@/lib/finance/engine";
import { inr } from "@/lib/finance/format";

const LINKS = [
  { href: "/", label: "Portfolio", sub: "At a glance" },
  { href: "/markets", label: "Markets", sub: "Live right now" },
  { href: "/projections", label: "Growth & Projections", sub: "1–30 year outlook" },
  { href: "/rebalance", label: "Rebalancing Studio", sub: "Test a new mix" },
  { href: "/advantage", label: "The Klay Advantage", sub: "DIY vs advised" },
  { href: "/scenarios", label: "Scenario Lab", sub: "Life events & stress" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { client, clients, setClientId } = useClient();
  return (
    <aside className="w-64 shrink-0 bg-navy text-navyink flex flex-col min-h-screen sticky top-0 max-h-screen">
      <div className="px-6 pt-8 pb-5 border-b border-white/10">
        <Image src={wordmark} alt="Klay" width={81} height={40} priority />
        <div className="text-[11px] uppercase tracking-[0.22em] opacity-60 mt-2.5">Capital · Private Clients</div>
      </div>
      <div className="px-4 pt-4 pb-1">
        <label className="block text-[10px] uppercase tracking-[0.18em] opacity-50 mb-1.5 px-1">Client</label>
        <select
          value={client.id}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full bg-white/10 border border-white/15 rounded-md px-2.5 py-2 text-sm text-white outline-none cursor-pointer hover:bg-white/15 transition-colors [&>option]:text-ink [&>option]:bg-surface"
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.clientName} · {inr(totalValue(c.holdings))}
            </option>
          ))}
        </select>
      </div>
      <nav className="flex-1 px-3 py-3 space-y-1">
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`block rounded-md px-3 py-2.5 transition-colors ${
                active ? "bg-white/10 border-l-2 border-accent" : "hover:bg-white/5 border-l-2 border-transparent"
              }`}
            >
              <div className={`text-sm ${active ? "text-white" : "text-navyink/85"}`}>{l.label}</div>
              <div className="text-[11px] opacity-50">{l.sub}</div>
            </Link>
          );
        })}
      </nav>
      <MarketRibbon />
      <div className="px-6 py-5 border-t border-white/10 text-[11px] leading-relaxed opacity-50">
        Illustrative projections, not guarantees. Investments are subject to market risk. SEBI-registered portfolio
        manager.
      </div>
    </aside>
  );
}

function MarketRibbon() {
  const { snapshot } = useMarket();
  if (!snapshot) return null;
  const { raw } = snapshot;
  const asOf = new Date(snapshot.asOf).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const chip = (delta: number) => (
    <span className={delta >= 0 ? "text-emerald-400" : "text-red-400"}>
      {delta >= 0 ? "+" : "−"}{Math.abs(delta).toFixed(1)}%
    </span>
  );
  return (
    <div className="px-6 py-4 border-t border-white/10 text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-[0.18em] opacity-50">Markets · {asOf} close</span>
        {snapshot.source === "fixture" && (
          <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/10 opacity-70">seed</span>
        )}
      </div>
      <div className="space-y-1.5 opacity-90 tnum">
        <div className="flex justify-between"><span className="opacity-60">Nifty 50</span><span>{raw.nifty.level.toLocaleString("en-IN")} {chip(raw.nifty.dayChangePct)}</span></div>
        <div className="flex justify-between"><span className="opacity-60">10Y G-sec</span><span>{(raw.gsec10Y * 100).toFixed(2)}%</span></div>
        <div className="flex justify-between"><span className="opacity-60">CPI (YoY)</span><span>{(raw.cpiYoY * 100).toFixed(1)}%</span></div>
        <div className="flex justify-between"><span className="opacity-60">USD/INR</span><span>{raw.usdInr.level.toFixed(2)} {chip(raw.usdInr.dayChangePct)}</span></div>
      </div>
    </div>
  );
}
