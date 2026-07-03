"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClient } from "./client-context";
import { totalValue } from "@/lib/finance/engine";
import { inr } from "@/lib/finance/format";

const LINKS = [
  { href: "/", label: "Portfolio", sub: "At a glance" },
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
        <Image src="/klay-wordmark.png" alt="Klay" width={81} height={40} priority />
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
      <div className="px-6 py-5 border-t border-white/10 text-[11px] leading-relaxed opacity-50">
        Illustrative projections, not guarantees. Investments are subject to market risk. SEBI-registered portfolio
        manager.
      </div>
    </aside>
  );
}
