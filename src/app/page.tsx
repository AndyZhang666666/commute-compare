"use client";

import { useEffect, useMemo, useState } from "react";
import type { CommuteOption, GlobalSettings } from "@/lib/types";
import { DEFAULT_SETTINGS, simulate } from "@/lib/simulate.js";
import {
  DEFAULT_PRESET_ID,
  getPreset,
  presetToOptions,
} from "@/lib/presets.js";
import { useComputed, useTabs } from "@/lib/hooks";
import ComparePanel from "@/components/ComparePanel";
import DeparturePanel from "@/components/DeparturePanel";
import PresetsPanel from "@/components/PresetsPanel";
import { decodeDraft } from "@/lib/draft.js";

const TABS = [
  { id: "compare", label: "方案对比" },
  { id: "departure", label: "出门时间" },
  { id: "presets", label: "预设与说明" },
];

export default function Page() {
  const { tab, go } = useTabs(
    "compare",
    TABS.map((t) => t.id),
  );
  const [presetId, setPresetId] = useState(DEFAULT_PRESET_ID);
  const [options, setOptions] = useState<CommuteOption[]>(() =>
    presetToOptions(getPreset(DEFAULT_PRESET_ID)).filter(
      (_, i) => i === 0 || i === 2,
    ),
  );
  const [settings, setSettings] = useState<GlobalSettings>({
    ...DEFAULT_SETTINGS,
  });
  const [storageReady, setStorageReady] = useState(false);
  const [storageNote, setStorageNote] = useState("");
  const [canSave, setCanSave] = useState(true);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("commute-draft-v2");
      if (raw) {
        const d = decodeDraft(raw);
        setOptions(d.options);
        setSettings(d.settings);
        setPresetId("custom");
      }
    } catch {
      setCanSave(false);
      setStorageNote(
        "旧草稿未通过校验，本页先用初始方案；不会自动覆盖旧记录，可继续计算和导出。",
      );
    }
    setStorageReady(true);
  }, []);
  useEffect(() => {
    if (!storageReady || !canSave) return;
    const raw = JSON.stringify({ options, settings });
    try {
      decodeDraft(raw);
    } catch {
      setStorageNote("参数未完成校验，暂不覆盖本机草稿；修正后自动恢复保存。");
      return;
    }
    try {
      localStorage.setItem("commute-draft-v2", raw);
      setStorageNote("");
    } catch {
      setStorageNote("浏览器不允许保存草稿；关闭页面前可导出决策卡。");
    }
  }, [options, settings, storageReady, canSave]);
  const invalid = options.filter(
    (o) =>
      ![o.min, o.mode, o.max, o.cost].every(Number.isFinite) ||
      o.min < 1 ||
      o.mode < o.min ||
      o.max < o.mode ||
      o.max > 360 ||
      o.cost < 0,
  );
  const validOptions = useMemo(
    () => options.filter((o) => !invalid.some((v) => v.id === o.id)),
    [options],
  );

  // 输入立刻生效，模拟延迟 150ms —— 改一个数字不会卡住输入框
  const { value: result, pending } = useComputed(
    () => simulate(validOptions, settings, { months: 2000 }),
    [validOptions, settings],
  );

  const loadPreset = (id: string) => {
    if (!window.confirm("载入预设将替换当前方案和实际耗时记录。继续吗？"))
      return;
    setPresetId(id);
    setOptions(presetToOptions(getPreset(id)));
    go("compare");
  };

  const current = result;

  return (
    <div className="wrap">
      <header className="top">
        <h1>
          通勤方案比较器<span className="product-en">Commute Compare</span>
        </h1>
        <p className="sub">比较省下的时间、付出的费用，以及每天几点出门。</p>
        <p className="meta">
          先用常见耗时快速估算，再用自己的通勤记录校准。当前默认两条路线为杭州演示估计，不是实时交通数据。
        </p>
      </header>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => go(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <p className="source-note" role="status">
        {storageNote || "草稿与耗时记录仅存于本机浏览器，不上传。"}
      </p>
      {!canSave && (
        <button
          className="btn"
          onClick={() => {
            setCanSave(true);
            setStorageNote("已选择用当前方案重新保存草稿；记录仅存本机。");
          }}
        >
          用当前方案替换旧草稿
        </button>
      )}
      {invalid.length > 0 && (
        <p className="input-error" role="alert">
          {invalid.map((o) => o.name || "未命名方案").join("、")}{" "}
          的参数无效，已暂停这些方案的计算。请确保 1 ≤ 最快 ≤ 常见 ≤ 最慢 ≤
          360，费用 ≥ 0。修正后自动恢复。
        </p>
      )}

      {tab === "compare" && (
        <ComparePanel
          options={options}
          setOptions={(next) => {
            setOptions(next);
            setPresetId("custom");
          }}
          settings={settings}
          setSettings={setSettings}
          result={current}
          pending={!storageReady || pending || invalid.length > 0}
        />
      )}
      {tab === "departure" && (
        <DeparturePanel
          result={current}
          settings={settings}
          setSettings={setSettings}
          pending={!storageReady || pending || invalid.length > 0}
        />
      )}
      {tab === "presets" && (
        <PresetsPanel
          activePresetId={presetId}
          onLoad={loadPreset}
          currentOptions={options}
        />
      )}

      <footer style={{ marginTop: 26, fontSize: 12, color: "var(--muted)" }}>
        估算使用 PERT
        分布，记录模式使用经验重采样。月度时间与费用均按往返、返程同分布估计；不建模雨天等相关性，不保证未来准点率，不接地图或实时路况。
      </footer>
    </div>
  );
}
