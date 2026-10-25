"use client";

import { useCallback, useEffect, useState } from "react";

// 改任一数字都要重跑 N×22×2 次 PERT 采样。参数立刻更新（输入要跟手），
// 模拟延迟 150ms 再跑；期间显示上一帧结果并半透明，视觉上连续。
export function useComputed<T>(compute: () => T, deps: unknown[], delay = 150) {
  const [state, setState] = useState(() => ({
    value: compute(),
    source: deps,
  }));
  const current =
    state.source.length === deps.length &&
    state.source.every((v, i) => Object.is(v, deps[i]));

  useEffect(() => {
    if (current) return;
    const id = setTimeout(
      () => setState({ value: compute(), source: deps }),
      delay,
    );
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { value: state.value, pending: !current };
}

export function useTabs(initial: string, valid: string[]) {
  const [tab, setTab] = useState(initial);
  useEffect(() => {
    const h = window.location.hash.replace("#", "");
    if (h && valid.includes(h)) setTab(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const go = useCallback((id: string) => {
    setTab(id);
    if (typeof window !== "undefined")
      window.history.replaceState(null, "", `#${id}`);
  }, []);
  return { tab, go };
}

/** 六个方案固定六色，与 globals.css 里的 --opt-N 一致。 */
export const OPTION_COLORS = [
  "#2b6cb0",
  "#596673",
  "#9a6437",
  "#333b42",
  "#77838d",
  "#89796b",
];
export const optionColor = (i: number) =>
  OPTION_COLORS[i % OPTION_COLORS.length];

export const fmtPct = (v: number, digits = 1) =>
  `${(v * 100).toFixed(digits)}%`;
export const fmtYuan = (v: number) =>
  `¥${Math.round(v).toLocaleString("zh-CN")}`;
export const fmtHours = (v: number) => `${v.toFixed(1)}h`;
