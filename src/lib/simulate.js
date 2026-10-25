// 蒙特卡洛 + 指标。浏览器和 Node 校验脚本共用同一份。
import {
  mulberry32,
  samplePERT,
  quantileSorted,
  mean,
} from "./distributions.js";

export const DEFAULT_SETTINGS = Object.freeze({
  workStart: 9 * 60 + 30,
  daysPerMonth: 22,
  lateTolerance: 0.05,
});

export const DEFAULT_MONTHS = 2000;
export const DEFAULT_SEED = 20260914;
export const MODEL_VERSION = "stable-route-seed-v2-2026-10-25";

function routeSeed(seed, id) {
  // Preserve the archived complete city presets' sample streams; other IDs
  // use a stable hash. Reordering or removing a route cannot reseed its peers.
  const preset = /^(hangzhou|beijing|shanghai|shenzhen)-([0-5])$/.exec(id);
  let offset;
  if (preset) offset = 7919 * (Number(preset[2]) + 1);
  else {
    offset = 2166136261;
    for (let i = 0; i < id.length; i++)
      offset = Math.imul(offset ^ id.charCodeAt(i), 16777619) >>> 0;
  }
  return (seed + offset) >>> 0;
}

/** 分位数函数的步长：0.001，对应迟到概率能分辨到 0.1%。 */
const Q_STEPS = 1000;

/**
 * 对一个方案抽 months × daysPerMonth 天，每天早晚各抽一次（返程假设与去程同分布）。
 * 返回排好序的单程样本 + 每月往返总和（分钟）。月花费同样按往返算，两者口径一致。
 */
export function sampleOption(option, daysPerMonth, months, rng) {
  const n = months * daysPerMonth * 2;
  const daily = new Float64Array(n);
  const monthly = new Float64Array(months);
  let k = 0;
  for (let m = 0; m < months; m++) {
    let sum = 0;
    for (let d = 0; d < daysPerMonth * 2; d++) {
      const records = option.observations;
      const t = records?.length
        ? records[Math.floor(rng() * records.length)]
        : samplePERT(option.min, option.mode, option.max, rng);
      daily[k++] = t;
      sum += t;
    }
    monthly[m] = sum;
  }
  daily.sort();
  monthly.sort();
  return { daily, monthly };
}

/** 排序样本中 > threshold 的比例（严格大于 = 迟到）。二分。 */
export function fractionAbove(sorted, threshold) {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= threshold) lo = mid + 1;
    else hi = mid;
  }
  return (sorted.length - lo) / sorted.length;
}

/**
 * 建议出门时刻 = 上班时刻 − 耗时分布的 (1 − 阈值) 分位数，向下取整到 roundTo 分钟。
 * 阈值为 0 时分位数取样本最大值，即「按最慢的一次算」。
 */
export function suggestedDeparture(
  sortedDaily,
  workStart,
  lateTolerance,
  roundTo = 1,
) {
  const q =
    sortedDaily[
      Math.max(0, Math.ceil((1 - lateTolerance) * sortedDaily.length) - 1)
    ];
  const raw = workStart - q;
  return Math.floor(raw / roundTo) * roundTo;
}

/** 单日耗时直方图，bin 宽 1 分钟，范围覆盖 [min, max]。 */
export function histogram(sortedDaily, binWidth = 1) {
  const lo = Math.floor(sortedDaily[0] / binWidth) * binWidth;
  const hi =
    Math.ceil(sortedDaily[sortedDaily.length - 1] / binWidth) * binWidth;
  const bins = Math.max(1, Math.round((hi - lo) / binWidth));
  const counts = new Array(bins).fill(0);
  for (let i = 0; i < sortedDaily.length; i++) {
    let b = Math.floor((sortedDaily[i] - lo) / binWidth);
    if (b >= bins) b = bins - 1;
    counts[b]++;
  }
  return { binStart: lo, binWidth, counts };
}

/** 分位数函数表：quantiles[i] = Q(i / Q_STEPS)。图 2 用它反查任意出门时刻的迟到概率。 */
function quantileTable(sortedDaily) {
  const out = new Array(Q_STEPS + 1);
  for (let i = 0; i <= Q_STEPS; i++)
    out[i] = quantileSorted(sortedDaily, i / Q_STEPS);
  return out;
}

export function computeOptionMetrics(
  option,
  settings,
  months,
  rng,
  roundTo = 1,
) {
  const { daily, monthly } = sampleOption(
    option,
    settings.daysPerMonth,
    months,
    rng,
  );
  const p10 = quantileSorted(daily, 0.1);
  const p50 = quantileSorted(daily, 0.5);
  const p90 = quantileSorted(daily, 0.9);
  const suggested = suggestedDeparture(
    daily,
    settings.workStart,
    settings.lateTolerance,
    roundTo,
  );
  const departure =
    option.departureOverride == null || Number.isNaN(option.departureOverride)
      ? suggested
      : option.departureOverride;
  // 出门时刻 + 耗时 > 上班时刻 ⇔ 耗时 > 上班时刻 − 出门时刻
  const lateProb = fractionAbove(daily, settings.workStart - departure);
  const lateProbAtSuggested = fractionAbove(
    daily,
    settings.workStart - suggested,
  );

  return {
    id: option.id,
    name: option.name,
    daily: {
      mean: mean(daily),
      p10,
      p50,
      p90,
      spread: p90 - p10,
      histogram: histogram(daily, 1),
      quantiles: quantileTable(daily),
    },
    monthly: {
      hoursP10: quantileSorted(monthly, 0.1) / 60,
      hoursP50: quantileSorted(monthly, 0.5) / 60,
      hoursP90: quantileSorted(monthly, 0.9) / 60,
      cost: option.cost * 2 * settings.daysPerMonth,
    },
    suggestedDeparture: suggested,
    departure,
    lateProb,
    lateProbAtSuggested,
  };
}

/**
 * 三个冠军：最省时间（月中位时间最小）、最稳（P90−P10 最小）、最便宜（月花费最小）。
 * 三个可能是三个不同方案 —— 这正是页面要说的事。
 */
export function pickChampions(options) {
  const by = (key) =>
    options.reduce((best, o) => (key(o) < key(best) ? o : best), options[0]).id;
  return {
    fastest: by((o) => o.monthly.hoursP50),
    steadiest: by((o) => o.daily.spread),
    cheapest: by((o) => o.monthly.cost),
  };
}

export function simulate(options, settings = DEFAULT_SETTINGS, opts = {}) {
  const months = opts.months ?? DEFAULT_MONTHS;
  const seed = opts.seed ?? DEFAULT_SEED;
  const roundTo = opts.roundTo ?? 1;
  // 每个方案一个独立子种子：增删某个方案不影响其他方案的数字。
  const results = options.map((o) => {
    const rng = mulberry32(routeSeed(seed, o.id));
    return computeOptionMetrics(o, settings, months, rng, roundTo);
  });
  return {
    modelVersion: MODEL_VERSION,
    settings,
    months,
    seed,
    options: results,
    champions: results.length
      ? pickChampions(results)
      : { fastest: "", steadiest: "", cheapest: "" },
  };
}

/**
 * 图 2 用：给定出门时刻，从分位数表反查迟到概率。
 * 迟到概率 = P(耗时 > workStart − departure) = 1 − F(workStart − departure)。
 */
export function lateProbAtDeparture(metrics, workStart, departure) {
  const budget = workStart - departure;
  const q = metrics.daily.quantiles;
  // 二分找最小 i 使 q[i] > budget → F(budget) ≈ i / Q_STEPS
  let lo = 0;
  let hi = q.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (q[mid] <= budget) lo = mid + 1;
    else hi = mid;
  }
  return Math.max(0, Math.min(1, 1 - lo / Q_STEPS));
}

/** 分钟数 → "HH:MM" */
export function fmtClock(minutes) {
  const raw = Math.round(minutes);
  const m = ((raw % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${raw < 0 ? "前日 " : raw >= 1440 ? "次日 " : ""}${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** "HH:MM" → 分钟数 */
export function parseClock(str) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(str).trim());
  if (!m) return NaN;
  const h = Number(m[1]),
    minute = Number(m[2]);
  return h <= 23 && minute <= 59 ? h * 60 + minute : NaN;
}
