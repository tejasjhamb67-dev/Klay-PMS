"use client";

import { useEffect, useState } from "react";
import { SleeveId } from "./finance/types";

/** Chart colors need concrete hex values (Recharts can't read CSS vars in all
 *  props), so we mirror the globals.css tokens here per color scheme. Palette
 *  from the Klay marketing deck; both modes validated with the dataviz
 *  six-checks script (light: worst adjacent CVD ΔE 15.7; dark: 14.4). */
export interface ChartTheme {
  sleeve: Record<SleeveId, string>;
  ink: string;
  inkSecondary: string;
  inkMuted: string;
  grid: string;
  axis: string;
  surface: string;
  accent: string;
  navy: string;
  good: string;
  bad: string;
  band: string; // projection fan fill
  bandOuter: string;
}

const LIGHT: ChartTheme = {
  sleeve: { equities: "#006af4", fixedIncome: "#00998a", alternatives: "#ef4888", tactical: "#ff7e4c", cash: "#878b95" },
  ink: "#14121f",
  inkSecondary: "#4c4a5c",
  inkMuted: "#8a8899",
  grid: "#e6e5ee",
  axis: "#d0cfdd",
  surface: "#ffffff",
  accent: "#006af4",
  navy: "#181530",
  good: "#0e7a0e",
  bad: "#c03535",
  band: "rgba(0,106,244,0.14)",
  bandOuter: "rgba(0,106,244,0.07)",
};

const DARK: ChartTheme = {
  sleeve: { equities: "#3d8bff", fixedIncome: "#009184", alternatives: "#e85387", tactical: "#e2602f", cash: "#9a97a8" },
  ink: "#f4f3fa",
  inkSecondary: "#c5c3d4",
  inkMuted: "#918fa6",
  grid: "#2b2750",
  axis: "#3b3766",
  surface: "#1a1636",
  accent: "#3d8bff",
  navy: "#181530",
  good: "#35b04a",
  bad: "#e05c5c",
  band: "rgba(61,139,255,0.20)",
  bandOuter: "rgba(61,139,255,0.09)",
};

export function useChartTheme(): ChartTheme {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return dark ? DARK : LIGHT;
}
