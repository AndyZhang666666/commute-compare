import test from "node:test";
import assert from "node:assert/strict";
import { decodeDraft } from "../src/lib/draft.js";
import {
  simulate,
  DEFAULT_SETTINGS,
  MODEL_VERSION,
} from "../src/lib/simulate.js";
import {
  championGroups,
  championSummary,
  priceInsights,
} from "../src/lib/insights.js";
import { PRESETS, presetToOptions } from "../src/lib/presets.js";
const a = { id: "route-a", name: "方案A", min: 20, mode: 30, max: 60, cost: 6 },
  b = { ...a, id: "route-b", name: "方案B", cost: 10 };
const draft = { options: [a, b], settings: DEFAULT_SETTINGS };
test("完整草稿按白名单恢复，0元合法", () => {
  const d = decodeDraft(
    JSON.stringify({ ...draft, options: [{ ...a, cost: 0, unknown: 1 }, b] }),
  );
  assert.equal(d.options[0].cost, 0);
  assert.ok(!("unknown" in d.options[0]));
});
test("重复ID、空名称、非法出门、损坏记录与不匹配阈值均拒绝", () => {
  for (const options of [
    [a, a],
    [{ ...a, name: "" }, b],
    [{ ...a, departureOverride: "09:00" }, b],
    [{ ...a, departureOverride: 1500 }, b],
    [{ ...a, observations: [30, "40", 50] }, b],
    [{ ...a, cost: 2001 }, b],
  ])
    assert.throws(() => decodeDraft(JSON.stringify({ ...draft, options })));
  for (const lateTolerance of [0.005, 0.3, NaN])
    assert.throws(() =>
      decodeDraft(
        JSON.stringify({
          ...draft,
          settings: { ...DEFAULT_SETTINGS, lateTolerance },
        }),
      ),
    );
});
test("自定义方案增删/换序不改变其他路线采样", () => {
  const full = simulate([a, b], DEFAULT_SETTINGS, { months: 60 }),
    reverse = simulate([b, a], DEFAULT_SETTINGS, { months: 60 }),
    single = simulate([b], DEFAULT_SETTINGS, { months: 60 });
  assert.deepEqual(full.options[1], reverse.options[0]);
  assert.deepEqual(full.options[1], single.options[0]);
  assert.equal(full.modelVersion, MODEL_VERSION);
});
test("四城预设按ID固定采样，删前一条与插入方案均不影响保留路线", () => {
  for (const preset of PRESETS) {
    const options = presetToOptions(preset),
      all = simulate(options, DEFAULT_SETTINGS, { months: 20 });
    const kept = simulate([b, ...options.slice(1)], DEFAULT_SETTINGS, {
      months: 20,
    });
    assert.deepEqual(all.options[1], kept.options[1]);
  }
});
test("相同费用不会被误称更贵，零费用相同记录并列", () => {
  const same = {
    ...a,
    min: 42,
    mode: 42,
    max: 42,
    cost: 0,
    observations: [42, 42, 42],
  };
  const r = simulate(
    [same, { ...same, id: "other", name: "方案B" }],
    DEFAULT_SETTINGS,
    { months: 20 },
  );
  assert.equal(championGroups(r).fastest.length, 2);
  assert.match(championSummary(r), /并列/);
  assert.ok(priceInsights(r).every((x) => !x.includes("贵，")));
  assert.match(priceInsights(r).join(" "), /相同/);
});
test("短记录只按经验分布抽样，手动出门比例与模型账本一致", () => {
  const r = simulate(
    [{ ...a, observations: [40, 45, 50], departureOverride: 530 }],
    DEFAULT_SETTINGS,
    { months: 30 },
  );
  assert.ok(Math.abs(r.options[0].lateProb - 2 / 3) < 0.05);
  assert.equal(r.options[0].monthly.cost, 264);
  assert.ok(r.options[0].lateProbAtSuggested <= 0.05);
});
