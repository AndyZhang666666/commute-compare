// 随机数与分布采样。页面（浏览器）和 scripts/verify.mjs（Node）共用这一份，
// 所以写成纯 JS + 独立 .d.ts，不带任何 DOM / React 依赖。

/** mulberry32：32 位种子的确定性 PRNG。校验脚本固定种子，重跑数字一致。 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller 标准正态，Gamma 采样要用。 */
function sampleNormal(rng) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Gamma(shape, 1)：Marsaglia–Tsang 方法。
 * shape < 1 时用 Gamma(shape+1) * U^(1/shape) 的 boost 技巧。
 */
export function sampleGamma(shape, rng) {
  if (shape < 1) {
    const u = rng();
    return sampleGamma(shape + 1, rng) * Math.pow(u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x;
    let v;
    do {
      x = sampleNormal(rng);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/** Beta(a, b)：两个 Gamma 的比值。 */
export function sampleBeta(a, b, rng) {
  const x = sampleGamma(a, rng);
  const y = sampleGamma(b, rng);
  return x / (x + y);
}

/**
 * PERT 分布：由「最快 / 常见 / 最慢」三点确定的 Beta 分布。
 * mean = (min + 4·mode + max) / 6。lambda = 4 是项目管理里的标准取值。
 * 通勤时间天然右偏（堵一次能多 30 分钟，但再顺也快不过物理极限），
 * PERT 比三角分布更贴近这个形状，也比正态分布更不会给出负时间。
 */
export function pertParams(min, mode, max, lambda = 4) {
  const range = max - min;
  if (range <= 0) return { alpha: 1, beta: 1, range: 0 };
  const alpha = 1 + (lambda * (mode - min)) / range;
  const beta = 1 + (lambda * (max - mode)) / range;
  return { alpha, beta, range };
}

export function samplePERT(min, mode, max, rng, lambda = 4) {
  const { alpha, beta, range } = pertParams(min, mode, max, lambda);
  if (range <= 0) return min;
  return min + range * sampleBeta(alpha, beta, rng);
}

export function pertMean(min, mode, max, lambda = 4) {
  return (min + lambda * mode + max) / (lambda + 2);
}

/**
 * 分位数：线性插值，输入数组会被原地排序，调用方注意。
 * p ∈ [0, 1]。
 */
export function quantileSorted(sorted, p) {
  const n = sorted.length;
  if (n === 0) return NaN;
  if (p <= 0) return sorted[0];
  if (p >= 1) return sorted[n - 1];
  const pos = (n - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function quantile(values, p) {
  const sorted = values.slice().sort((a, b) => a - b);
  return quantileSorted(sorted, p);
}

export function mean(values) {
  let s = 0;
  for (let i = 0; i < values.length; i++) s += values[i];
  return values.length ? s / values.length : NaN;
}
