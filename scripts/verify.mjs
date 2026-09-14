// 校验脚本：用 Node 直接跑 src/lib/ 里的同一份代码，产物落 results/。
// README 里引用的所有数字都从这里来。固定种子，重跑字节一致（只有 generatedAt 会变）。
//
// 用法：node scripts/verify.mjs
//
// 1. PERT 分布正确性：采样 100,000 次，均值 vs 理论值、P50 右偏
// 2. 边界情况：min = mode = max；迟到阈值 0%
// 3. 四个预设案例全量指标，N = 5000 个月
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mulberry32, samplePERT, pertMean, quantile, mean } from "../src/lib/distributions.js";
import {
  simulate,
  DEFAULT_SETTINGS,
  suggestedDeparture,
  sampleOption,
  fmtClock,
} from "../src/lib/simulate.js";
import { PRESETS, presetToOptions } from "../src/lib/presets.js";
import { championSummary, departureInsight } from "../src/lib/insights.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "results");
mkdirSync(OUT, { recursive: true });

const SEED = 20260914;
const today = new Date().toISOString().slice(0, 10);
const r2 = (x) => Number(x.toFixed(2));
const r3 = (x) => Number(x.toFixed(3));

let failures = 0;
function check(cond, msg) {
  if (cond) console.log(`  ✓ ${msg}`);
  else {
    failures += 1;
    console.log(`  ✗ ${msg}`);
  }
}

// ---------- 1. 分布正确性 ----------
console.log("1. PERT(30, 40, 80) 采样 100,000 次");
{
  const N = 100_000;
  const rng = mulberry32(SEED);
  const xs = new Array(N);
  for (let i = 0; i < N; i++) xs[i] = samplePERT(30, 40, 80, rng);
  const theoretical = pertMean(30, 40, 80);
  const m = mean(xs);
  const p10 = quantile(xs, 0.1);
  const p50 = quantile(xs, 0.5);
  const p90 = quantile(xs, 0.9);
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  const meanErr = Math.abs(m - theoretical);
  check(meanErr < 0.3, `均值 ${r3(m)} vs 理论 ${theoretical}，误差 ${r3(meanErr)} < 0.3`);
  check(p50 >= 42 && p50 <= 44, `P50 = ${r2(p50)} 在 42–44 之间（右偏，中位数 < 均值）`);
  check(p50 < m, `P50 ${r2(p50)} < 均值 ${r2(m)}（右偏）`);
  check(lo >= 30 && hi <= 80, `样本范围 [${r2(lo)}, ${r2(hi)}] ⊂ [30, 80]`);

  // 再多校验两组三点，确认不是碰巧
  const extra = [
    [42, 48, 65],
    [28, 35, 70],
  ].map(([a, b, c]) => {
    const rng2 = mulberry32(SEED + 1);
    const ys = new Array(N);
    for (let i = 0; i < N; i++) ys[i] = samplePERT(a, b, c, rng2);
    const t = pertMean(a, b, c);
    const mm = mean(ys);
    check(Math.abs(mm - t) < 0.3, `PERT(${a},${b},${c}) 均值 ${r3(mm)} vs 理论 ${r3(t)}`);
    return { min: a, mode: b, max: c, samples: N, sampleMean: r3(mm), theoreticalMean: r3(t), meanError: r3(Math.abs(mm - t)), p50: r2(quantile(ys, 0.5)) };
  });

  const distributionCheck = {
    generatedAt: today,
    seed: SEED,
    samples: N,
    primary: {
      min: 30,
      mode: 40,
      max: 80,
      theoreticalMean: theoretical,
      sampleMean: r3(m),
      meanError: r3(meanErr),
      meanErrorTolerance: 0.3,
      p10: r2(p10),
      p50: r2(p50),
      p90: r2(p90),
      p50ExpectedRange: [42, 44],
      sampleMin: r2(lo),
      sampleMax: r2(hi),
      rightSkewed: p50 < m,
    },
    extra,
  };
  writeFileSync(resolve(OUT, "distribution-check.json"), JSON.stringify(distributionCheck, null, 2) + "\n");
}

// ---------- 2. 边界情况 ----------
console.log("2. 边界情况");
{
  const rng = mulberry32(SEED);
  let allEqual = true;
  for (let i = 0; i < 10_000; i++) if (samplePERT(45, 45, 45, rng) !== 45) allEqual = false;
  check(allEqual, "min = mode = max = 45 时 10,000 次采样恒为 45");

  const opt = { id: "x", name: "x", min: 30, mode: 40, max: 80, cost: 0 };
  const { daily } = sampleOption(opt, 22, 5000, mulberry32(SEED));
  const dep0 = suggestedDeparture(daily, DEFAULT_SETTINGS.workStart, 0, 1);
  const slowest = daily[daily.length - 1];
  const expected = Math.floor(DEFAULT_SETTINGS.workStart - slowest);
  check(
    dep0 === expected,
    `迟到阈值 0% → 建议出门 ${fmtClock(dep0)} = 上班时间 − 最慢样本 ${r2(slowest)} 分钟（${fmtClock(expected)}）`,
  );
  check(slowest <= 80 && slowest > 78, `最慢样本 ${r2(slowest)} 逼近理论上限 80`);

  // 建议出门时间处的迟到概率应 ≤ 阈值
  const res = simulate([opt], DEFAULT_SETTINGS, { months: 5000, seed: SEED });
  const o = res.options[0];
  check(
    o.lateProbAtSuggested <= DEFAULT_SETTINGS.lateTolerance,
    `建议出门 ${fmtClock(o.suggestedDeparture)} 时迟到概率 ${(o.lateProbAtSuggested * 100).toFixed(2)}% ≤ 5%`,
  );
  // 晚 1 分钟出门迟到率应超过阈值（否则建议时间不是「最晚」）
  const late1 = simulate([{ ...opt, departureOverride: o.suggestedDeparture + 1 }], DEFAULT_SETTINGS, {
    months: 5000,
    seed: SEED,
  }).options[0].lateProb;
  check(late1 > DEFAULT_SETTINGS.lateTolerance, `再晚 1 分钟出门迟到概率 ${(late1 * 100).toFixed(2)}% > 5%`);

  // 确定性：同种子两次结果一致
  const a = simulate([opt], DEFAULT_SETTINGS, { months: 200, seed: SEED }).options[0];
  const b = simulate([opt], DEFAULT_SETTINGS, { months: 200, seed: SEED }).options[0];
  check(a.daily.p50 === b.daily.p50 && a.lateProb === b.lateProb, "同种子重跑数字完全一致");
}

// ---------- 3. 预设案例全量指标 ----------
console.log("3. 四个预设案例，N = 5000 个月");
const MONTHS = 5000;
const presetsSummary = {
  generatedAt: today,
  seed: SEED,
  months: MONTHS,
  settings: { ...DEFAULT_SETTINGS, workStart: fmtClock(DEFAULT_SETTINGS.workStart) },
  note: "所有预设三点估计均为经验估计，非实测。",
  presets: [],
};
for (const preset of PRESETS) {
  const options = presetToOptions(preset);
  const res = simulate(options, DEFAULT_SETTINGS, { months: MONTHS, seed: SEED });
  const champions = res.champions;
  const nameOf = (id) => res.options.find((o) => o.id === id).name;
  console.log(`  ${preset.city} · ${preset.route}`);
  const rows = res.options.map((o) => {
    const input = options.find((x) => x.id === o.id);
    check(
      o.lateProbAtSuggested <= DEFAULT_SETTINGS.lateTolerance + 1e-9,
      `    ${o.name}: 月时间 P50 ${r2(o.monthly.hoursP50)}h，¥${o.monthly.cost}，建议 ${fmtClock(
        o.suggestedDeparture,
      )} 出门，迟到 ${(o.lateProbAtSuggested * 100).toFixed(2)}%，稳定性 ${r2(o.daily.spread)} 分钟`,
    );
    return {
      name: o.name,
      input: { min: input.min, mode: input.mode, max: input.max, cost: input.cost },
      dailyMean: r2(o.daily.mean),
      dailyP10: r2(o.daily.p10),
      dailyP50: r2(o.daily.p50),
      dailyP90: r2(o.daily.p90),
      spreadMinutes: r2(o.daily.spread),
      monthlyHoursP10: r2(o.monthly.hoursP10),
      monthlyHoursP50: r2(o.monthly.hoursP50),
      monthlyHoursP90: r2(o.monthly.hoursP90),
      monthlyCost: o.monthly.cost,
      suggestedDeparture: fmtClock(o.suggestedDeparture),
      lateProbAtSuggestedPct: r2(o.lateProbAtSuggested * 100),
      isFastest: champions.fastest === o.id,
      isSteadiest: champions.steadiest === o.id,
      isCheapest: champions.cheapest === o.id,
    };
  });
  presetsSummary.presets.push({
    id: preset.id,
    city: preset.city,
    route: preset.route,
    champions: {
      fastest: nameOf(champions.fastest),
      steadiest: nameOf(champions.steadiest),
      cheapest: nameOf(champions.cheapest),
    },
    championSummary: championSummary(res),
    departureInsight: departureInsight(res),
    options: rows,
  });
}
writeFileSync(resolve(OUT, "presets-summary.json"), JSON.stringify(presetsSummary, null, 2) + "\n");

console.log("");
if (failures) {
  console.error(`校验失败：${failures} 项`);
  process.exit(1);
}
console.log(`全部通过。已写入 results/distribution-check.json 与 results/presets-summary.json`);
