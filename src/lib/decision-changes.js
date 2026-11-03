import {normalizeConstraints} from './conditions.js';
import {inputSourceDescription} from './input-source.js';
import {routeEvidence,EVIDENCE_POLICY} from './evidence-view.js';

const clock = n => n == null ? '未设置' : `${String(Math.floor(n / 60)).padStart(2,'0')}:${String(n % 60).padStart(2,'0')}`;
const money = n => n == null ? '未设置' : `¥${n}`;

/** Human-readable changes to the saved decision; never changes that snapshot.
 * @param {import('./types').SimulationResult | null} result
 */
export function decisionChanges(saved, options, settings, constraints = {}, result = null) {
  if (!saved) return [];
  const changes = [];
  const add = (label, before, after) => { if (before !== after) changes.push({label, before:String(before), after:String(after)}); };
  const old = saved.settings;
  add('上班时间', clock(old.workStart), clock(settings.workStart));
  add('每月通勤天数', `${old.daysPerMonth}天`, `${settings.daysPerMonth}天`);
  add('模型尾部阈值', `${old.lateTolerance*100}%`, `${settings.lateTolerance*100}%`);
  const a = normalizeConstraints(saved.constraints), b = normalizeConstraints(constraints);
  add('月预算上限', money(a.monthlyBudget), money(b.monthlyBudget));
  add('最早愿意出门', clock(a.earliestDeparture), clock(b.earliestDeparture));
  if(result&&b.earliestDeparture!==null&&saved.evidencePolicy!==EVIDENCE_POLICY&&options.some(o=>{const m=result.options.find(v=>v.id===o.id);return m&&o.observations?.length&&!routeEvidence(o,m,settings).timingKnown;})) {
    add('出门条件的依据', '旧版未单独确认少样本未知', '当前记录不足以验证尾部阈值，请确认是否先试行');
  }
  for (const input of options) {
    const previous = saved.options.find(o => o.id === input.id);
    if (!previous) { add('新增路线', '未参与原比较', input.name); continue; }
    add('路线名称', previous.name, input.name);
    add(`${input.name}单程费用`, money(previous.cost), money(input.cost));
    add(`${input.name}有效耗时来源`, inputSourceDescription(previous), inputSourceDescription(input));
    const recordFields = o => JSON.stringify([o.observations || [],o.trialRecords || [],o.archivedObservations || [],o.recordRevision || 0]);
    if (recordFields(previous) !== recordFields(input) && inputSourceDescription(previous) === inputSourceDescription(input)) {
      add(`${input.name}记录`, `原记录 / 修订${previous.recordRevision || 0}`, `内容、顺序或修订已变化 / 修订${input.recordRevision || 0}`);
    }
    add(`${input.name}手动出门`, clock(previous.departureOverride), clock(input.departureOverride));
    const was = saved.result.options.find(o => o.id === input.id), now = result?.options.find(o => o.id === input.id);
    if (was && now) add(`${input.name}月往返中位`, `${was.monthly.hoursP50.toFixed(1)}小时`, `${now.monthly.hoursP50.toFixed(1)}小时`);
  }
  for (const previous of saved.options) if (!options.some(o => o.id === previous.id)) add('移除路线', previous.name, '不再参与本次比较');
  if (saved.modelVersion !== result?.modelVersion && result) add('模型版本', saved.modelVersion, result.modelVersion);
  return changes;
}
