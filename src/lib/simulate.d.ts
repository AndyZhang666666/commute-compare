import type {
  CommuteOption,
  GlobalSettings,
  SimulateOptions,
  OptionMetrics,
  SimulationResult,
  Champions,
} from "./types";

export const DEFAULT_SETTINGS: Readonly<GlobalSettings>;
export const DEFAULT_MONTHS: number;
export const DEFAULT_SEED: number;

export function sampleOption(
  option: CommuteOption,
  daysPerMonth: number,
  months: number,
  rng: () => number,
): { daily: Float64Array; monthly: Float64Array };
export function fractionAbove(sorted: ArrayLike<number>, threshold: number): number;
export function suggestedDeparture(
  sortedDaily: ArrayLike<number>,
  workStart: number,
  lateTolerance: number,
  roundTo?: number,
): number;
export function histogram(
  sortedDaily: ArrayLike<number>,
  binWidth?: number,
): { binStart: number; binWidth: number; counts: number[] };
export function computeOptionMetrics(
  option: CommuteOption,
  settings: GlobalSettings,
  months: number,
  rng: () => number,
  roundTo?: number,
): OptionMetrics;
export function pickChampions(options: OptionMetrics[]): Champions;
export function simulate(
  options: CommuteOption[],
  settings?: GlobalSettings,
  opts?: SimulateOptions,
): SimulationResult;
export function lateProbAtDeparture(metrics: OptionMetrics, workStart: number, departure: number): number;
export function fmtClock(minutes: number): string;
export function parseClock(str: string): number;
