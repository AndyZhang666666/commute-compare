// 逐条比对 README 里引用的数字和 results/ 里的产物。
// README 是手写的，results/ 是脚本生成的；两者对不上就是 README 在撒谎。
// 用法：node scripts/verify-readme.mjs（CI 里在 build 前跑）
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readme = readFileSync(resolve(ROOT, "README.md"), "utf8");
const dist = JSON.parse(readFileSync(resolve(ROOT, "results/distribution-check.json"), "utf8"));
const presets = JSON.parse(readFileSync(resolve(ROOT, "results/presets-summary.json"), "utf8"));

let failures = 0;
function expect(cond, msg) {
  if (cond) console.log(`  ✓ ${msg}`);
  else {
    failures++;
    console.log(`  ✗ ${msg}`);
  }
}
const has = (s) => readme.includes(s);

// ---- 分布校验数字 ----
console.log("分布校验");
const p = dist.primary;
expect(has(`样本均值 ${p.sampleMean}`), `样本均值 ${p.sampleMean}`);
expect(has(`理论值 ${p.theoreticalMean}`), `理论值 ${p.theoreticalMean}`);
expect(has(`误差 ${p.meanError}`), `误差 ${p.meanError}`);
expect(has(`P50 = ${p.p50}`), `P50 = ${p.p50}`);
expect(has(`[${p.sampleMin}, ${p.sampleMax}]`), `样本范围 [${p.sampleMin}, ${p.sampleMax}]`);
expect(has(`${dist.samples.toLocaleString("en-US")} 次`), `采样次数 ${dist.samples}`);
expect(has(`固定种子 \`${dist.seed}\``), `种子 ${dist.seed}`);
for (const e of dist.extra) {
  expect(has(`PERT(${e.min},${e.mode},${e.max})`), `extra PERT(${e.min},${e.mode},${e.max}) 出现`);
  expect(has(`${e.meanError}`), `extra 均值误差 ${e.meanError}`);
}

// ---- 预设表格：每个方案一行，逐列比对 ----
console.log("预设案例表格");
const rows = readme
  .split("\n")
  .filter((l) => l.startsWith("|") && /\d+\/\d+\/\d+/.test(l))
  .map((l) => l.split("|").map((c) => c.trim()));
expect(
  rows.length === presets.presets.reduce((n, pr) => n + pr.options.length, 0),
  `表格行数 ${rows.length} = 预设方案总数`,
);
let i = 0;
for (const pr of presets.presets) {
  for (const o of pr.options) {
    const r = rows[i++];
    if (!r) break;
    const label = `${pr.city} · ${o.name}`;
    const nameCell = r[2];
    expect(nameCell.startsWith(o.name), `${label} 名称`);
    const tags = (o.isFastest ? "⏱" : "") + (o.isSteadiest ? "⚡" : "") + (o.isCheapest ? "💰" : "");
    const cellTags = nameCell.replace(o.name, "").replace(/\s/g, "");
    expect(cellTags === tags, `${label} 冠军标记 "${cellTags}" = "${tags}"`);
    expect(r[3] === `${o.input.min}/${o.input.mode}/${o.input.max}`, `${label} 三点 ${r[3]}`);
    expect(r[4] === `${o.monthlyHoursP50}h`, `${label} 月时间 ${r[4]} = ${o.monthlyHoursP50}h`);
    expect(r[5] === `¥${o.monthlyCost}`, `${label} 月花费 ${r[5]} = ¥${o.monthlyCost}`);
    expect(r[6] === o.suggestedDeparture, `${label} 建议出门 ${r[6]} = ${o.suggestedDeparture}`);
    expect(r[7] === `${o.lateProbAtSuggestedPct}%`, `${label} 迟到 ${r[7]} = ${o.lateProbAtSuggestedPct}%`);
    expect(r[8] === `${o.spreadMinutes} 分钟`, `${label} 稳定性 ${r[8]} = ${o.spreadMinutes} 分钟`);
  }
}

// ---- 正文里引用的均值 / 出门时间 / 差值 ----
console.log("正文数字");
const find = (city, name) => presets.presets.find((x) => x.city === city).options.find((o) => o.name === name);
const bjTaxi = find("北京", "打车");
const bjMetro = find("北京", "地铁 13 号线");
expect(has(`打车单程均值 ${bjTaxi.dailyMean} 分钟`), `北京打车均值 ${bjTaxi.dailyMean}`);
expect(has(`地铁 13 号线的 ${bjMetro.dailyMean} 分钟`), `北京地铁均值 ${bjMetro.dailyMean}`);
expect(has(`打车要 ${bjTaxi.suggestedDeparture} 出门，地铁 ${bjMetro.suggestedDeparture}`), `北京出门时间`);
const bjDep = toMin(bjMetro.suggestedDeparture) - toMin(bjTaxi.suggestedDeparture);
expect(has(`出门反而要早 ${bjDep} 分钟`), `北京出门差 ${bjDep} 分钟`);
expect(has(`每月还多花 ¥${bjTaxi.monthlyCost - bjMetro.monthlyCost}`), `北京花费差`);
const shTaxi = find("上海", "打车");
const shMetro = find("上海", "地铁 2 号线");
expect(has(`（${shTaxi.dailyMean} vs ${shMetro.dailyMean}）`), `上海均值对比`);
expect(has(`打车的 P90−P10 是 ${shTaxi.spreadMinutes} 分钟，地铁只有 ${shMetro.spreadMinutes}`), `上海稳定性对比`);
const shDep = toMin(shMetro.suggestedDeparture) - toMin(shTaxi.suggestedDeparture);
expect(has(`打车要早 ${shDep} 分钟出门`), `上海出门差 ${shDep} 分钟`);
// 已知局限里的例子：杭州 地铁 vs 打车
const hzMetro = find("杭州", "地铁 1 号线");
const hzTaxi = find("杭州", "打车");
const savedH = Math.round(hzMetro.monthlyHoursP50 - hzTaxi.monthlyHoursP50);
expect(has(`省下的 ${savedH} 小时要不要用 ¥${hzTaxi.monthlyCost - hzMetro.monthlyCost} 换`), `杭州省时/花费差`);
// 「最省时间」和「最稳」没有一次重合
const overlap = presets.presets.some((pr) => pr.champions.fastest === pr.champions.steadiest);
expect(!overlap && has("没有一次落在同一个方案上"), "四城最省时间 ≠ 最稳");

function toMin(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

console.log("");
if (failures) {
  console.error(`README 有 ${failures} 处与 results/ 不一致`);
  process.exit(1);
}
console.log("README 数字全部与 results/ 一致");
