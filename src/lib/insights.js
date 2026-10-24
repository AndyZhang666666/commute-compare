// 自动生成的结论句。全部由模拟结果推出来，不手写数字。
import { fmtClock } from "./simulate.js";

const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;
const h1 = (x) => `${x.toFixed(1)} 小时`;
const yuan = (x) => `¥${Math.round(x).toLocaleString("zh-CN")}`;

/** 找 metrics */
const byId = (result, id) => result.options.find((o) => o.id === id);

/**
 * 主页面顶部的一句话结论：三个冠军是不是同一个方案。
 */
export function championSummary(result) {
  const { fastest, steadiest, cheapest } = result.champions;
  const f = byId(result, fastest);
  const s = byId(result, steadiest);
  const c = byId(result, cheapest);
  if (!f || !s || !c) return "";
  if (fastest === steadiest && steadiest === cheapest) {
    return `在当前输入下，「${f.name}」同时占优于时间、波动和费用。仍需考虑舒适度、天气和样本未覆盖的异常。`;
  }
  const parts = [];
  parts.push(`最省时间是「${f.name}」（月中位 ${h1(f.monthly.hoursP50)}）`);
  parts.push(`最稳是「${s.name}」（P10–P90 只差 ${s.daily.spread.toFixed(0)} 分钟）`);
  parts.push(`最便宜是「${c.name}」（月 ${yuan(c.monthly.cost)}）`);
  return parts.join("；") + "。这些结论只在当前输入与模型假设下成立。";
}

/**
 * Tab 2 的结论句：把「最省时间」和「最稳」两个方案放一起比。
 * 如果只有一个方案就只说它自己。
 */
export function departureInsight(result) {
  const tol = result.settings.lateTolerance;
  const opts = result.options;
  if (opts.length === 0) return "";
  if (opts.length === 1) {
    const o = opts[0];
    return `要把迟到概率压到 ${pct(tol, 0)} 以下，「${o.name}」需 ${fmtClock(o.suggestedDeparture)} 出门。`;
  }

  // 基准：最稳的方案；对照：均值最快的方案。两者相同时改用第二快的。
  const steady = byId(result, result.champions.steadiest);
  let fast = opts.reduce((b, o) => (o.daily.mean < b.daily.mean ? o : b), opts[0]);
  if (fast.id === steady.id) {
    const others = opts.filter((o) => o.id !== steady.id);
    fast = others.reduce((b, o) => (o.daily.mean < b.daily.mean ? o : b), others[0]);
  }

  const meanGap = steady.daily.mean - fast.daily.mean; // >0 表示 fast 均值更快
  const depGap = steady.suggestedDeparture - fast.suggestedDeparture; // >0 表示 fast 要更早出门
  const costGap = fast.monthly.cost - steady.monthly.cost;

  const head = `要把迟到概率压到 ${pct(tol, 0)} 以下，「${steady.name}」需 ${fmtClock(
    steady.suggestedDeparture,
  )} 出门，「${fast.name}」需 ${fmtClock(fast.suggestedDeparture)} 出门`;

  let tail;
  if (meanGap >= 0.5 && depGap > 0) {
    tail = `——「${fast.name}」均值快 ${meanGap.toFixed(0)} 分钟，但为了同样的准点率要早出门 ${depGap.toFixed(
      0,
    )} 分钟`;
    if (costGap > 0) tail += `，每月还多花 ${yuan(costGap)}`;
    tail += "。均值上占的便宜，被长尾吃掉了。";
  } else if (meanGap >= 0.5 && depGap <= 0) {
    tail = `——「${fast.name}」均值快 ${meanGap.toFixed(0)} 分钟，出门时间也能晚 ${(-depGap).toFixed(
      0,
    )} 分钟`;
    tail += costGap > 0 ? `，代价是每月多花 ${yuan(costGap)}。` : "，而且不更贵。";
  } else if (depGap > 0) {
    tail = `——两者均值几乎一样，但「${fast.name}」尾巴更长，要早出门 ${depGap.toFixed(0)} 分钟`;
    tail += costGap > 0 ? `，每月还多花 ${yuan(costGap)}。` : "。";
  } else {
    tail = `——两者均值接近，出门时间相差 ${Math.abs(depGap).toFixed(0)} 分钟。`;
  }
  return head + tail;
}

/**
 * 「多花的钱买了多少时间」：任意两方案之间 Δ花费 / Δ时间。
 * 返回每分钟多少钱；如果贵的那个反而更慢，返回 null。
 */
export function pricePerMinute(a, b) {
  const dCost = a.monthly.cost - b.monthly.cost;
  const dMin = (b.monthly.hoursP50 - a.monthly.hoursP50) * 60;
  if (dMin <= 0 || dCost <= 0) return null;
  return dCost / dMin;
}

/**
 * 主页面「花钱买时间」的句子：拿最便宜的方案做基准，看其他方案每省一分钟花多少钱。
 */
export function priceInsights(result) {
  const cheap = byId(result, result.champions.cheapest);
  if (!cheap) return [];
  return result.options
    .filter((o) => o.id !== cheap.id)
    .map((o) => {
      const ppm = pricePerMinute(o, cheap);
      const savedMin = (cheap.monthly.hoursP50 - o.monthly.hoursP50) * 60;
      if (ppm == null) {
        if (savedMin <= 0)
          return `「${o.name}」比「${cheap.name}」贵，月时间却不更少 —— 不划算。`;
        return `「${o.name}」比「${cheap.name}」每月省 ${savedMin.toFixed(0)} 分钟，而且不更贵。`;
      }
      return `「${o.name}」比「${cheap.name}」每月多花 ${yuan(
        o.monthly.cost - cheap.monthly.cost,
      )}，省 ${savedMin.toFixed(0)} 分钟 —— 折合 ${ppm.toFixed(2)} 元/分钟。`;
    });
}
