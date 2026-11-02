"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { CommuteOption, GlobalSettings, PersonalConstraints } from "@/lib/types";
import { DEFAULT_SETTINGS, simulate } from "@/lib/simulate.js";
import {
  DEFAULT_PRESET_ID,
  getPreset,
  presetToOptions,
} from "@/lib/presets.js";
import { useComputed } from "@/lib/hooks";
import ComparePanel from "@/components/ComparePanel";
import PresetsPanel from "@/components/PresetsPanel";
import { decodeDraft } from "@/lib/draft.js";
import { normalizeConstraints } from "@/lib/conditions.js";

import {InputValidityContext} from "@/lib/input-validity";

export default function Page() {
  const [inputDrafts,setInputDrafts]=useState<Record<string,boolean>>({});
  const reportInput=useCallback((id:string,dirty:boolean)=>setInputDrafts(old=>old[id]===dirty?old:{...old,[id]:dirty}),[]);
  const inputPending=Object.values(inputDrafts).some(Boolean);
  const [presetId, setPresetId] = useState(DEFAULT_PRESET_ID);
  const [options, setOptions] = useState<CommuteOption[]>(() =>
    presetToOptions(getPreset(DEFAULT_PRESET_ID)).filter(
      (_, i) => i === 0 || i === 2,
    ),
  );
  const [settings, setSettings] = useState<GlobalSettings>({
    ...DEFAULT_SETTINGS,
  });
  const [constraints,setConstraints]=useState<PersonalConstraints>(()=>normalizeConstraints());
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
        setConstraints(normalizeConstraints(d.constraints));
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
    const raw = JSON.stringify({ options, settings, constraints });
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
  }, [options, settings, constraints, storageReady, canSave]);
  const invalid = options.filter(
    (o) =>
      !o.name.trim() ||
      ![o.min, o.mode, o.max, o.cost].every(Number.isFinite) ||
      o.min < 1 ||
      o.mode < o.min ||
      o.max < o.mode ||
      o.max > 360 ||
      o.cost < 0 || o.cost > 2000,
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
    document.getElementById('route-settings')?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  };

  useEffect(()=>{const id=location.hash.slice(1);if(['departure','presets'].includes(id)){const el=document.getElementById(id) as HTMLDetailsElement|null;if(el){el.open=true;el.scrollIntoView({block:'start'});}}},[]);

  const current = result;

  return (
    <InputValidityContext.Provider value={reportInput}><div className="wrap">
      <header className="top">
        <h1>
          <svg className="commute-mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M7 5v9c0 6 18-2 18 5v8M7 5c0 8 18 4 18 12v10" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="7" cy="5" r="3" fill="var(--bg)" stroke="currentColor" strokeWidth="1.8"/><circle cx="25" cy="27" r="3" fill="var(--bg)" stroke="currentColor" strokeWidth="1.8"/></svg>通勤方案比较器<span className="product-en">Commute Compare</span>
        </h1>
        <p className="sub">比较省下的时间、付出的费用，以及每天几点出门。</p>
        <p className="meta">先比较两条路线，再把预算、出门习惯和真实记录放进同一次选择。默认数据为杭州演示估计。</p>
        <div className="task-entry" aria-label="开始比较"><a className="btn primary" href="#personal-decision">先看演示比较</a><button className="btn" onClick={()=>{document.getElementById('route-settings')?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});document.querySelector<HTMLInputElement>('[aria-label="方案 1 名称"]')?.focus({preventScroll:true});}}>填写我的路线</button><a href="#presets">换一个城市案例</a></div>
      </header>
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

        <ComparePanel
          options={options}
          setOptions={(next) => {
            setOptions(next);
            setPresetId("custom");
          }}
          settings={settings}
          setSettings={setSettings}
          constraints={constraints}
          setConstraints={setConstraints}
          result={current}
          pending={!storageReady || inputPending || pending || invalid.length > 0}
        />
      <details className="support-details" id="presets"><summary>城市预设与模型说明</summary>
        <PresetsPanel
          activePresetId={presetId}
          onLoad={loadPreset}
          currentOptions={options}
        />
      </details>

      <footer style={{ marginTop: 26, fontSize: 12, color: "var(--muted)" }}>
        估算使用 PERT
        分布，记录模式使用经验重采样。月度时间与费用均按往返、返程同分布估计；不建模雨天等相关性，不保证未来准点率，不接地图或实时路况。
      </footer>
    </div></InputValidityContext.Provider>
  );
}
