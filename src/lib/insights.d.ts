import type { OptionMetrics, SimulationResult } from "./types";

export function championSummary(result: SimulationResult): string;
export function departureInsight(result: SimulationResult): string;
export function pricePerMinute(a: OptionMetrics, b: OptionMetrics): number | null;
export function priceInsights(result: SimulationResult): string[];
