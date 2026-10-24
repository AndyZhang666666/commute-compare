// 记录由用户手动提供，只保存在其浏览器；不是地图采集数据。
export function parseObservations(text) {
  const tokens = String(text).trim().split(/[\s,，;；]+/).filter(Boolean);
  if (!tokens.length) return { values: [], error: "请填入至少 3 次门到门耗时，单位分钟。" };
  if (tokens.length > 300) return { values: [], error: "一次最多保留 300 条记录。" };
  const values = tokens.map(Number);
  if (values.some(v => !Number.isFinite(v) || v < 1 || v > 360))
    return { values: [], error: "每条耗时必须是 1–360 分钟的数字；不要填写日期或单位。" };
  if (values.length < 3) return { values: [], error: "至少需要 3 次记录才能开始比较；尾部风险仍需更多记录。" };
  return { values, error: "" };
}

export function quickEstimate(typical, variability = "variable") {
  const ratio = variability === "stable" ? [0.9, 1.25] : [0.8, 1.8];
  return { min: Math.max(1, Math.floor(typical * ratio[0])), mode: typical, max: Math.ceil(typical * ratio[1]) };
}

// Wilson 区间只描述给定独立同分布假设下的观测比例，不是未来风险保证。
export function observedRisk(values, budget) {
  const n = values.length;
  if (!n) return null;
  const late = values.filter(v => v > budget).length;
  const p = late / n, z = 1.96, d = 1 + z * z / n;
  const center = (p + z * z / (2 * n)) / d;
  const margin = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
  return { n, late, proportion: p, lower: Math.max(0, center - margin), upper: Math.min(1, center + margin) };
}

export function recordNotice(n, tolerance) {
  const needed = Math.ceil(1 / tolerance);
  return n < needed
    ? `${n} 次记录：一条就占 ${(100 / n).toFixed(1)}%，不足以细分 ${(tolerance * 100).toFixed(0)}% 的尾部；建议时间仅供试行。`
    : `${n} 次记录：已覆盖的日期和天气仍有限；样本分位数不是未来准点率保证。`;
}
