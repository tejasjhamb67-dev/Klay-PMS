"use client";

import { ReactNode } from "react";
import {
  Area,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { SLEEVES } from "@/lib/finance/assumptions";
import { inr, inrAxis } from "@/lib/finance/format";
import { ProjectionPoint, SLEEVE_IDS, SleeveId } from "@/lib/finance/types";
import { ChartTheme, useChartTheme } from "@/lib/theme";

// ---------- shared tooltip chrome ----------

export function TooltipShell({ title, rows }: { title: string; rows: { dot?: string; label: string; value: string }[] }) {
  return (
    <div className="bg-raised border border-hairline2 rounded-md px-3 py-2 shadow-lg text-xs">
      <div className="font-semibold text-ink mb-1">{title}</div>
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center text-ink2">
            {r.dot && <span className="w-2 h-2 rounded-full mr-1.5 inline-block" style={{ background: r.dot }} />}
            {r.label}
          </span>
          <span className="tnum text-ink">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- allocation donut ----------

export function AllocationDonut({
  values,
  total,
}: {
  values: Record<SleeveId, number>;
  total: number;
}) {
  const theme = useChartTheme();
  const data = SLEEVE_IDS.filter((s) => values[s] > 0).map((s) => ({
    id: s,
    name: SLEEVES[s].label,
    value: values[s],
  }));
  return (
    <div className="relative h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={1.5}
            stroke={theme.surface}
            strokeWidth={2}
            startAngle={90}
            endAngle={-270}
          >
            {data.map((d) => (
              <Cell key={d.id} fill={theme.sleeve[d.id]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0];
              const id = (p.payload as { id: SleeveId }).id;
              return (
                <TooltipShell
                  title={String(p.name)}
                  rows={[
                    { dot: theme.sleeve[id], label: "Value", value: inr(Number(p.value)) },
                    { label: "Weight", value: `${((Number(p.value) / total) * 100).toFixed(1)}%` },
                  ]}
                />
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-[11px] uppercase tracking-wide text-ink3">Total</div>
        <div className="text-xl font-semibold text-ink tnum">{inr(total)}</div>
      </div>
    </div>
  );
}

// ---------- projection fan chart ----------

export function FanChart({
  points,
  height = 320,
  markers,
}: {
  points: ProjectionPoint[];
  height?: number;
  markers?: number[];
}) {
  const theme = useChartTheme();
  const data = points.map((p) => ({
    ...p,
    outer: [p.p10, p.p90] as [number, number],
    inner: [p.p25, p.p75] as [number, number],
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
        <CartesianGrid stroke={theme.grid} strokeWidth={1} vertical={false} />
        <XAxis
          dataKey="year"
          type="number"
          domain={[0, "dataMax"]}
          ticks={markers}
          tickFormatter={(y) => `${y}y`}
          stroke={theme.axis}
          tick={{ fill: theme.inkMuted, fontSize: 11 }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => inrAxis(v)}
          stroke="transparent"
          tick={{ fill: theme.inkMuted, fontSize: 11 }}
          tickLine={false}
          width={64}
        />
        <Area dataKey="outer" fill={theme.bandOuter} stroke="none" isAnimationActive={false} />
        <Area dataKey="inner" fill={theme.band} stroke="none" isAnimationActive={false} />
        <Line dataKey="median" stroke={theme.sleeve.equities} strokeWidth={2} dot={false} isAnimationActive={false} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as ProjectionPoint;
            return (
              <TooltipShell
                title={`Year ${Number(label).toFixed(1)}`}
                rows={[
                  { label: "Strong markets (90th)", value: inr(p.p90) },
                  { dot: theme.sleeve.equities, label: "Expected (median)", value: inr(p.median) },
                  { label: "Weak markets (10th)", value: inr(p.p10) },
                ]}
              />
            );
          }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ---------- horizontal weight/contribution bar ----------

export function StackedWeightBar({
  weights,
  labelInBar = false,
}: {
  weights: Record<SleeveId, number>;
  labelInBar?: boolean;
}) {
  const theme = useChartTheme();
  return (
    <div className="flex h-7 rounded overflow-hidden" style={{ gap: 2 }}>
      {SLEEVE_IDS.filter((s) => weights[s] > 0.001).map((s) => (
        <div
          key={s}
          title={`${SLEEVES[s].label}: ${(weights[s] * 100).toFixed(1)}%`}
          className="flex items-center justify-center text-[10px] font-medium text-white/95 min-w-0"
          style={{ width: `${weights[s] * 100}%`, background: theme.sleeve[s] }}
        >
          {labelInBar && weights[s] > 0.08 ? `${Math.round(weights[s] * 100)}%` : ""}
        </div>
      ))}
    </div>
  );
}

export function SleeveLegend({ items }: { items?: SleeveId[] }) {
  const theme = useChartTheme();
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink2 mt-2">
      {(items ?? SLEEVE_IDS).map((s) => (
        <span key={s} className="flex items-center">
          <span className="w-2.5 h-2.5 rounded-full mr-1.5" style={{ background: theme.sleeve[s] }} />
          {SLEEVES[s].label}
        </span>
      ))}
    </div>
  );
}

// ---------- generic labelled horizontal bars (impacts, components) ----------

export function HBar({
  label,
  value,
  max,
  color,
  valueLabel,
}: {
  label: ReactNode;
  value: number; // may be negative
  max: number; // scale bound (abs)
  color: string;
  valueLabel: string;
}) {
  const width = Math.min(100, (Math.abs(value) / max) * 100);
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="w-44 shrink-0 text-xs text-ink2">{label}</div>
      <div className="flex-1 h-4 relative">
        <div
          className="absolute top-0.5 h-3 rounded-[3px]"
          style={{ width: `${width}%`, background: color, left: 0 }}
        />
      </div>
      <div className="w-20 text-right text-xs tnum text-ink">{valueLabel}</div>
    </div>
  );
}

export function useTheme(): ChartTheme {
  return useChartTheme();
}
