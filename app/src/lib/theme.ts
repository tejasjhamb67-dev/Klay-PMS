"use client";

import { useEffect, useState } from "react";
import { SleeveId } from "./finance/types";

/** Chart colors need concrete hex values (Recharts can't read CSS vars in all
 *  props), so we mirror the globals.css tokens here per color scheme. Both
 *  palettes validated with the dataviz six-checks script. */
export interface ChartTheme {
  sleeve: Record<SleeveId, string>;
  ink: string;
  inkSecondary: string;
  inkMuted: string;
  grid: string;
  axis: string;
  surface: string;
  gold: string;
  navy: string;
  good: string;
  bad: string;
  band: string; // projection fan fill
  bandOuter: string;
}

const LIGHT: ChartTheme = {
  sleeve: { equities: "#2a78d6", fixedIncome: "#1baf7a", alternatives: "#4a3aa7", tactical: "#eda100", cash: "#898781" },
  ink: "#14171c",
  inkSecondary: "#565349",
  inkMuted: "#8a877f",
  grid: "#e3e1d8",
  axis: "#c9c6bb",
  surface: "#fdfcfa",
  gold: "#b08a2e",
  navy: "#0e2038",
  good: "#0e7a0e",
  bad: "#c03535",
  band: "rgba(42,120,214,0.16)",
  bandOuter: "rgba(42,120,214,0.08)",
};

const DARK: ChartTheme = {
  sleeve: { equities: "#3987e5", fixedIncome: "#199e70", alternatives: "#9085e9", tactical: "#c98500", cash: "#9a978f" },
  ink: "#f4f3ee",
  inkSecondary: "#c3c2b7",
  inkMuted: "#8f9aa8",
  grid: "#22334c",
  axis: "#33465f",
  surface: "#101c2e",
  gold: "#d4af4e",
  navy: "#0e2038",
  good: "#35b04a",
  bad: "#e05c5c",
  band: "rgba(57,135,229,0.22)",
  bandOuter: "rgba(57,135,229,0.10)",
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
