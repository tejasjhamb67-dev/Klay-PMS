import { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-surface border border-hairline rounded-lg p-5 ${className}`}>{children}</div>
  );
}

export function CardTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-ink">{children}</h3>
      {hint && <p className="text-xs text-ink3 mt-0.5">{hint}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="mb-6">
      <h1 className="font-display text-3xl text-ink">{title}</h1>
      <p className="text-sm text-ink2 mt-1 max-w-2xl">{subtitle}</p>
    </header>
  );
}

export function StatTile({
  label,
  value,
  delta,
  deltaGood,
  hint,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaGood?: boolean;
  hint?: string;
}) {
  return (
    <Card>
      <div className="text-xs uppercase tracking-wide text-ink3">{label}</div>
      <div className="text-2xl font-semibold text-ink mt-1.5 tnum">{value}</div>
      {delta && (
        <div className={`text-xs mt-1 tnum ${deltaGood === false ? "text-bad" : "text-good"}`}>{delta}</div>
      )}
      {hint && <div className="text-[11px] text-ink3 mt-1">{hint}</div>}
    </Card>
  );
}

export function Dot({ color }: { color: string }) {
  return <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle" style={{ background: color }} />;
}

export function Disclaimer({ children }: { children: ReactNode }) {
  return <p className="text-[11px] text-ink3 leading-relaxed mt-4">{children}</p>;
}
