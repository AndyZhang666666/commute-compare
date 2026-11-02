function validRecords(values, minimum = 1) {
  return Array.isArray(values) && values.length >= minimum && values.length <= 300 && values.every(v => Number.isFinite(v) && v >= 1 && v <= 360);
}
export function parseNewRecords(text) {
  const raw = String(text).trim();
  if (!raw) throw Error('先填本次门到门耗时，只填分钟数');
  const values = raw.split(/[\s,，;；]+/).filter(Boolean).map(Number);
  if (!validRecords(values)) throw Error('每条须为1–360分钟；最多300条，用逗号或换行分隔');
  return values;
}
export function recordUpdate(option, text, replace = false) {
  const added = parseNewRecords(text), previous = replace ? [] : (option.observations || option.trialRecords || []);
  const records = [...previous, ...added];
  if (!validRecords(records)) throw Error('合计超过300条；请在记录编辑中整理后替换，不会自动丢弃旧记录');
  const next = { ...option, recordRevision: (option.recordRevision || 0) + 1 };
  if (replace && option.observations?.length >= 3) next.archivedObservations = [...option.observations];
  if (records.length >= 3) {
    next.observations = records;
    delete next.trialRecords;
    next.source = 'observed';
  } else {
    next.trialRecords = records;
    if (option.observations?.length >= 3) next.archivedObservations = [...option.observations];
    delete next.observations;
    next.source = option.source === 'observed' ? 'estimate' : (option.source || 'estimate');
  }
  return { next, records, added: added.length, calibrated: records.length >= 3 };
}
export function switchToEstimate(option, patch = {}) {
  const next = { ...option, ...patch, source: patch.source || 'estimate', recordRevision: (option.recordRevision || 0) + 1 };
  if (validRecords(option.observations, 3)) next.archivedObservations = [...option.observations];
  delete next.observations;
  return next;
}
export function restoreRecords(option) {
  if (!validRecords(option.archivedObservations, 3)) throw Error('没有可恢复的个人记录');
  return { ...option, observations: [...option.archivedObservations], trialRecords: undefined, source: 'observed', recordRevision: (option.recordRevision || 0) + 1 };
}
