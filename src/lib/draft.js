export function decodeDraft(raw) {
  const d = JSON.parse(raw);
  if (
    !d ||
    !Array.isArray(d.options) ||
    d.options.length < 2 ||
    d.options.length > 6
  )
    throw Error("方案数量无效");
  const ids = new Set();
  const options = d.options.map((o) => {
    if (
      !o ||
      typeof o.id !== "string" ||
      !o.id.trim() ||
      o.id.length > 100 ||
      ids.has(o.id) ||
      typeof o.name !== "string" ||
      !o.name.trim() ||
      o.name.length > 36
    )
      throw Error("方案标识无效");
    ids.add(o.id);
    if (
      ![o.min, o.mode, o.max, o.cost].every(Number.isFinite) ||
      o.min < 1 ||
      o.min > o.mode ||
      o.mode > o.max ||
      o.max > 360 ||
      o.cost < 0 ||
      o.cost > 2000
    )
      throw Error("方案参数无效");
    if (
      o.departureOverride != null &&
      (!Number.isInteger(o.departureOverride) ||
        o.departureOverride < 0 ||
        o.departureOverride > 1439)
    )
      throw Error("手动出门时间无效");
    if (
      o.observations !== undefined &&
      (!Array.isArray(o.observations) ||
        o.observations.length < 3 ||
        o.observations.length > 300 ||
        !o.observations.every((v) => Number.isFinite(v) && v >= 1 && v <= 360))
    )
      throw Error("记录无效");
    return {
      id: o.id,
      name: o.name,
      min: o.min,
      mode: o.mode,
      max: o.max,
      cost: o.cost,
      departureOverride: o.departureOverride ?? null,
      ...(o.observations ? { observations: o.observations } : {}),
      source: o.observations
        ? "observed"
        : ["preset", "quick", "estimate"].includes(o.source)
          ? o.source
          : "estimate",
    };
  });
  const s = d.settings;
  if (
    !s ||
    !Number.isInteger(s.workStart) ||
    s.workStart < 0 ||
    s.workStart > 1439 ||
    !Number.isInteger(s.daysPerMonth) ||
    s.daysPerMonth < 1 ||
    s.daysPerMonth > 31 ||
    !Number.isFinite(s.lateTolerance) ||
    s.lateTolerance < 0.01 ||
    s.lateTolerance > 0.2
  )
    throw Error("全局参数无效");
  return {
    options,
    settings: {
      workStart: s.workStart,
      daysPerMonth: s.daysPerMonth,
      lateTolerance: s.lateTolerance,
    },
  };
}
