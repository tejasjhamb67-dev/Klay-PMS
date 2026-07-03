"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Portfolio", sub: "At a glance" },
  { href: "/projections", label: "Growth & Projections", sub: "1–30 year outlook" },
  { href: "/rebalance", label: "Rebalancing Studio", sub: "Test a new mix" },
  { href: "/advantage", label: "The Klay Advantage", sub: "DIY vs advised" },
  { href: "/scenarios", label: "Scenario Lab", sub: "Life events & stress" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 shrink-0 bg-navy text-navyink flex flex-col min-h-screen sticky top-0 max-h-screen">
      <div className="px-6 pt-8 pb-6 border-b border-white/10">
        <div className="font-display text-2xl tracking-wide">KLAY</div>
        <div className="text-[11px] uppercase tracking-[0.22em] opacity-60 mt-1">Capital · Private Clients</div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`block rounded-md px-3 py-2.5 transition-colors ${
                active ? "bg-white/10 border-l-2 border-gold" : "hover:bg-white/5 border-l-2 border-transparent"
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
