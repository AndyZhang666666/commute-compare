// 四个城市预设。所有数字都是经验估计，不是实测 —— 页面和 README 都要标注。
// 时间：分钟；花费：元/单程。

export const PRESETS = [
  {
    id: "hangzhou",
    city: "杭州",
    route: "金沙湖 → 西湖区",
    note: "地铁 1 号线贯穿东西，早高峰基本不堵；打车要过钱塘江隧道 / 高架，堵起来能翻倍。",
    options: [
      { name: "地铁 1 号线", min: 42, mode: 48, max: 65, cost: 6 },
      { name: "地铁 + 共享单车", min: 38, mode: 45, max: 60, cost: 7.5 },
      { name: "打车", min: 28, mode: 35, max: 70, cost: 45 },
      { name: "自驾（含停车）", min: 30, mode: 40, max: 80, cost: 38 },
    ],
  },
  {
    id: "beijing",
    city: "北京",
    route: "回龙观 → 中关村",
    note: "13 号线早高峰限流排队是常态；京藏高速出京方向还好，进城方向 G6 常年拥堵。",
    options: [
      { name: "地铁 13 号线", min: 40, mode: 50, max: 75, cost: 5 },
      { name: "公交", min: 45, mode: 60, max: 100, cost: 2 },
      { name: "打车", min: 30, mode: 45, max: 95, cost: 55 },
      { name: "自驾（含停车）", min: 30, mode: 45, max: 100, cost: 50 },
    ],
  },
  {
    id: "shanghai",
    city: "上海",
    route: "张江 → 陆家嘴",
    note: "2 号线一线直达，但早高峰车厢挤到可能上不去要等下一班；内环高架早高峰限行外牌。",
    options: [
      { name: "地铁 2 号线", min: 30, mode: 38, max: 55, cost: 5 },
      { name: "打车", min: 25, mode: 35, max: 70, cost: 50 },
      { name: "自驾（含停车）", min: 25, mode: 38, max: 75, cost: 60 },
    ],
  },
  {
    id: "shenzhen",
    city: "深圳",
    route: "龙华 → 南山科技园",
    note: "4 号线到会展中心换 1 号线，换乘站早高峰人流大；北环 / 南坪快速堵点多。",
    options: [
      { name: "地铁 4 + 1 号线", min: 50, mode: 58, max: 80, cost: 7 },
      { name: "打车", min: 35, mode: 45, max: 90, cost: 60 },
      { name: "自驾（含停车）", min: 35, mode: 48, max: 95, cost: 45 },
    ],
  },
];

export const DEFAULT_PRESET_ID = "hangzhou";

export function getPreset(id) {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}

let counter = 0;
export function newOptionId() {
  counter += 1;
  return `opt-${Date.now().toString(36)}-${counter}`;
}

/** 把预设展开成带 id 的方案列表。 */
export function presetToOptions(preset) {
  return preset.options.map((o, i) => ({
    id: `${preset.id}-${i}`,
    ...o,
    departureOverride: null,
  }));
}
