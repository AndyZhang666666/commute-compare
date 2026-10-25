import assert from "node:assert/strict";
import fs from "node:fs";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const url = process.env.TEST_URL || "http://127.0.0.1:8804/commute-compare/";
const out = process.env.EVIDENCE_DIR || "/tmp/commute-browser";
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ headless: true, channel: "chrome" });
const ctx = await b.newContext({
  viewport: { width: 1440, height: 1000 },
  acceptDownloads: true,
});
const p = await ctx.newPage(),
  errors = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("dialog", (d) => d.accept());
const downloadButton = () =>
  p.getByRole("button", { name: "导出这次决策与依据", exact: true });
async function ready() {
  await p.waitForFunction(() => {
    const button = [...document.querySelectorAll("button")].find(
      (b) => b.textContent === "导出这次决策与依据",
    );
    return button && !button.disabled;
  });
}
async function report(file = "decision.json") {
  await ready();
  const pending = p.waitForEvent("download");
  await downloadButton().click();
  const d = await pending;
  await d.saveAs(out + "/" + file);
  return JSON.parse(fs.readFileSync(out + "/" + file, "utf8"));
}
async function tab(name) {
  await p.locator(".tabbar").getByRole("button", { name, exact: true }).click();
}
try {
  await p.goto(url);
  await ready();
  let r = await report("initial.json");
  assert.equal(r.inputs.length, 2);
  assert.match(r.result.modelVersion, /stable-route/);
  const field = p.getByLabel("地铁 1 号线常见耗时", { exact: true });
  await field.fill("");
  await field.blur();
  assert.equal(await field.getAttribute("aria-invalid"), "true");
  r = await report("blank-not-zero.json");
  assert.equal(r.inputs[0].mode, 48);
  await field.focus();
  await field.press("Escape");
  assert.equal(await field.inputValue(), "48");
  await field.fill("60");
  assert.equal(
    JSON.parse(await p.evaluate(() => localStorage.getItem("commute-draft-v2")))
      .options[0].mode,
    48,
  );
  await field.press("Enter");
  r = await report("committed.json");
  assert.equal(r.inputs[0].mode, 60);
  assert.equal(r.inputs[0].max, 108);
  await p.getByRole("button", { name: "记录校准", exact: true }).click();
  const records = p.getByLabel("地铁 1 号线实际耗时记录", { exact: true });
  await records.fill("30,40");
  await p
    .getByRole("button", { name: "应用这些记录", exact: true })
    .first()
    .click();
  assert.match(
    await p.locator("main,body").first().innerText(),
    /至少需要3|至少需要 3/,
  );
  await records.fill("30,40,50");
  await p
    .getByRole("button", { name: "应用这些记录", exact: true })
    .first()
    .click();
  r = await report("observations.json");
  assert.deepEqual(r.inputs[0].observations, [30, 40, 50]);
  assert.equal(r.result.options[0].daily.quantiles[0], 30);
  assert.equal(r.result.options[0].daily.quantiles[1000], 50);
  assert.match(await p.locator("body").innerText(), /Wilson/);
  const peer = r.result.options[1];
  await p.getByRole("button", { name: "添加一个方案", exact: true }).click();
  r = await report();
  assert.equal(r.inputs.length, 3);
  await p.getByRole("button", { name: "删除地铁 1 号线", exact: true }).click();
  r = await report("peer-after-delete.json");
  assert.deepEqual(
    r.result.options.find((x) => x.id === peer.id),
    peer,
  );
  await tab("出门时间");
  const tol = p.getByLabel("出门页目标阈值", { exact: true });
  await tol.fill("10");
  await tol.press("Enter");
  await p.waitForTimeout(350);
  const canvas = p.locator("canvas");
  const line = await canvas.evaluate((c) => {
    const ctx = c.getContext("2d"),
      d = ctx.getImageData(0, 0, c.width, c.height).data;
    let best = { y: 0, n: 0 };
    for (let y = 10; y < c.height - 10; y++) {
      let n = 0;
      for (let x = Math.floor(c.width * 0.25); x < c.width * 0.9; x++) {
        const i = (y * c.width + x) * 4;
        if (d[i] > 130 && d[i + 1] < 115 && d[i + 2] < 115) n++;
      }
      if (n > best.n) best = { y, n };
    }
    return { y: best.y / c.height, n: best.n };
  });
  assert.ok(line.n > 20);
  const box = await canvas.boundingBox();
  await p.mouse.move(box.x + box.width * 0.55, box.y + box.height * line.y);
  await p.mouse.down();
  await p.mouse.move(
    box.x + box.width * 0.55,
    box.y + box.height * line.y - 130,
    { steps: 8 },
  );
  assert.equal(await tol.inputValue(), "10");
  await p.mouse.up();
  await p.waitForFunction(
    () =>
      document.querySelector('[aria-label="出门页目标阈值"]').value === "20",
  );
  await tab("方案对比");
  r = await report("drag-20pct.json");
  assert.equal(r.settings.lateTolerance, 0.2);
  assert.deepEqual(r.settings, r.result.settings);
  await p.reload();
  await ready();
  r = await report("restored.json");
  assert.equal(r.settings.lateTolerance, 0.2);
  assert.equal(r.inputs.length, 2);
  // Advanced invalid cross-field values block export and never overwrite a valid saved draft.
  await p.getByRole("button", { name: "高级参数", exact: true }).click();
  const fastest = p.getByLabel("最快（分钟）", { exact: true }).first();
  await fastest.fill("200");
  await fastest.press("Enter");
  assert.ok(await downloadButton().isDisabled());
  assert.match(await p.locator("body").innerText(), /参数无效/);
  await fastest.fill("20");
  await fastest.press("Enter");
  await ready();
  for (const city of ["杭州", "北京", "上海", "深圳"]) {
    await tab("预设与说明");
    const card = p
      .getByRole("heading", { name: new RegExp("^" + city + " ·") })
      .locator("..");
    await card.getByRole("button").click();
    await tab("方案对比");
    r = await report("preset-" + city + ".json");
    assert.ok(r.inputs.length >= 3);
    assert.ok(
      r.result.options.every(
        (o) => o.lateProbAtSuggested <= r.settings.lateTolerance + 1e-9,
      ),
    );
  }
  for (const route of ["方案对比", "出门时间", "预设与说明"]) {
    await tab(route);
    for (const width of [1440, 768, 390, 360]) {
      await p.setViewportSize({ width, height: 1000 });
      await p.emulateMedia({ reducedMotion: "reduce" });
      await p.waitForFunction(
        () => document.documentElement.scrollWidth <= innerWidth,
      );
    }
  }
  await tab("方案对比");
  await p.setViewportSize({ width: 390, height: 1000 });
  await p.screenshot({ path: out + "/mobile.png", fullPage: true });
  await p.setViewportSize({ width: 1440, height: 1000 });
  await p.screenshot({ path: out + "/desktop.png", fullPage: true });
  const valid = JSON.parse(
    await p.evaluate(() => localStorage.getItem("commute-draft-v2")),
  );
  const corrupt = {
    ...valid,
    options: valid.options.map((o, i) =>
      i ? o : { ...o, departureOverride: 99999 },
    ),
  };
  const raw = JSON.stringify(corrupt);
  await p.evaluate((raw) => localStorage.setItem("commute-draft-v2", raw), raw);
  await p.reload();
  await ready();
  assert.match(await p.locator("body").innerText(), /不会自动覆盖旧记录/);
  assert.equal(
    await p.evaluate(() => localStorage.getItem("commute-draft-v2")),
    raw,
  );
  await p
    .getByRole("button", { name: "用当前方案替换旧草稿", exact: true })
    .click();
  await p.waitForFunction(
    () => !document.body.textContent.includes("用当前方案替换旧草稿"),
  );
  assert.notEqual(
    await p.evaluate(() => localStorage.getItem("commute-draft-v2")),
    raw,
  );
  const blocked = await b.newContext();
  await blocked.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw Error("blocked");
      },
    }),
  );
  const q = await blocked.newPage();
  q.on("pageerror", (e) => errors.push(e.message));
  await q.goto(url);
  await q
    .getByRole("button", { name: "用当前方案替换旧草稿", exact: true })
    .waitFor();
  assert.ok(
    await q
      .getByRole("button", { name: "导出这次决策与依据", exact: true })
      .isEnabled(),
  );
  await blocked.close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: draft editing/commit/Escape/blank, empirical records, stable peer after deletion, actual pointer preview/commit, bounded threshold refresh, stale/invalid export gate, four presets, three tabs × four widths, damaged/blocked storage; no page errors.",
  );
} finally {
  await b.close();
}
