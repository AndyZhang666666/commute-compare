"use client";

import { useMemo, useState } from "react";
import type { CommuteOption, GlobalSettings } from "@/lib/types";
import { DEFAULT_SETTINGS, simulate } from "@/lib/simulate.js";
import { DEFAULT_PRESET_ID, getPreset, presetToOptions } from "@/lib/presets.js";
import { useComputed, useTabs } from "@/lib/hooks";
import ComparePanel from "@/components/ComparePanel";
import DeparturePanel from "@/components/DeparturePanel";
import PresetsPanel from "@/components/PresetsPanel";

const TABS = [
  { id: "compare", label: "方案对比" },
  { id: "departure", label: "出门时间" },
  { id: "presets", label: "预设与说明" },
];

export default function Page() {
  const { tab, go } = useTabs("compare", TABS.map((t) => t.id));
  const [presetId, setPresetId] = useState(DEFAULT_PRESET_ID);
  const [options, setOptions] = useState<CommuteOption[]>(() =>
    presetToOptions(getPreset(DEFAULT_PRESET_ID)),
  );
  const [settings, setSettings] = useState<GlobalSettings>({ ...DEFAULT_SETTINGS });

  // 输入立刻生效，模拟延迟 150ms —— 改一个数字不会卡住输入框
  const { value: result, pending } = useComputed(
    () => simulate(options, settings, { months: 2000 }),
    [options, settings],
  );

  const loadPreset = (id: string) => {
    setPresetId(id);
    setOptions(presetToOptions(getPreset(id)));
  };

  const current = useMemo(
    () => result ?? simulate(options, settings, { months: 2000 }),
    [result, options, settings],
  );

  return (
    <div className="wrap">
      <header className="top">
        <h1>Commute Compare · 通勤方案比较器</h1>
        <p className="sub">
          地图只告诉你「预计 42 分钟」，不告诉你迟到的概率是多少。
        </p>
        <p className="meta">
          给每种方案填「快 / 常见 / 慢」三个时间，蒙特卡洛跑 2000 个月 —— 月总时间、月花费、迟到概率，
          以及几点出门才能把迟到概率压到你能接受的水平。全部计算在浏览器本地完成。
        </p>
      </header>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => go(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "compare" && (
        <ComparePanel
          options={options}
          setOptions={setOptions}
          settings={settings}
          setSettings={setSettings}
          result={current}
          pending={pending}
        />
      )}
      {tab === "departure" && (
        <DeparturePanel result={current} settings={settings} setSettings={setSettings} pending={pending} />
      )}
      {tab === "presets" && (
        <PresetsPanel activePresetId={presetId} onLoad={loadPreset} currentOptions={options} />
      )}

      <footer style={{ marginTop: 26, fontSize: 12, color: "var(--muted)" }}>
        预设数值为经验估计，非实测。本工具不接地图 API，不查真实路况 —— 时间分布由你输入的三点估计生成。
      </footer>
    </div>
  );
}
