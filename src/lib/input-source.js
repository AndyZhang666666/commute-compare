// Describe the same source used by sampleOption: observations take precedence.
// Archived PERT estimates remain recoverable, but are never current records.
export function effectiveInputSource(option) {
  const records = option.observations;
  if (records?.length) {
    const sorted = [...records].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    const median = sorted.length % 2
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2;
    return {
      kind: 'observed', count: records.length,
      median, min: sorted[0], max: sorted[sorted.length - 1],
      archivedEstimate: { min: option.min, mode: option.mode, max: option.max, active: false },
    };
  }
  return { kind: 'estimate', count: 0, min: option.min, mode: option.mode, max: option.max };
}

export function inputSourceDescription(option) {
  const source = effectiveInputSource(option);
  if (source.kind === 'observed') {
    return `个人记录 ${source.count} 次 · 记录中位 ${source.median} 分钟 · 已记录范围 ${source.min}–${source.max} 分钟；旧三点估算 ${option.min} / ${option.mode} / ${option.max} 分钟已停用，仅供恢复`;
  }
  return `${option.source === 'quick' ? '快速估算' : '三点估算'} ${option.min} / ${option.mode} / ${option.max} 分钟（最快 / 常见 / 最慢，非实测）`;
}
