import {decodeDraft} from './draft.js';
import {normalizeConstraints,constraintAssessment} from './conditions.js';
import {inputSourceDescription} from './input-source.js';
import {routeEvidence,EVIDENCE_POLICY,evidenceClock} from './evidence-view.js';
export const DECISION_KEY='commute:decision:v1';
export function inputSignature(options,settings,constraints={}){const c=normalizeConstraints(constraints),active=c.monthlyBudget!==null||c.earliestDeparture!==null;const d=decodeDraft(JSON.stringify({options,settings,...(active?{constraints:c}:{})}));return JSON.stringify(d);}
export {compareTradeoff} from "./tradeoff.js";
export function makeDecision(options,settings,result,selectedId,reason='',constraints={}){
 if(!result.options.some(o=>o.id===selectedId)||!options.some(o=>o.id===selectedId))throw Error('请选择本次比较中的路线');
 const inputKey=inputSignature(options,settings,constraints);
 if(result.options.length!==options.length||JSON.stringify(result.settings)!==JSON.stringify(settings))throw Error('结果尚未与输入同步');
 if(typeof reason!=='string'||reason.length>600)throw Error('选择理由最多600字');
 return {version:2,evidencePolicy:EVIDENCE_POLICY,inputKey,modelVersion:result.modelVersion,savedAt:new Date().toISOString(),selectedId,reason,constraints:normalizeConstraints(constraints),
   options:JSON.parse(JSON.stringify(options)),settings:{...settings},result:JSON.parse(JSON.stringify(result))};
}
export function decisionIsCurrent(snapshot,options,settings,modelVersion,constraints={}){try{return [1,2].includes(snapshot?.version)&&snapshot.inputKey===inputSignature(options,settings,constraints)&&snapshot.modelVersion===modelVersion&&!(normalizeConstraints(constraints).earliestDeparture!==null&&options.some(o=>{const m=snapshot.result.options.find(v=>v.id===o.id);return m&&o.observations?.length&&!routeEvidence(o,m,settings).timingKnown;})&&snapshot.evidencePolicy!==EVIDENCE_POLICY);}catch{return false;}}
export function decodeDecision(raw){
 if(!raw)return null;if(raw.length>1000000)throw Error('决策卡过大');const d=JSON.parse(raw);
 if(![1,2].includes(d.version)||typeof d.modelVersion!=='string'||!Number.isFinite(Date.parse(d.savedAt))||typeof d.reason!=='string'||d.reason.length>600)throw Error('决策卡格式无效');
 if(d.inputKey!==inputSignature(d.options,d.settings,d.constraints)||!d.options.some(o=>o.id===d.selectedId)||!d.result||!Array.isArray(d.result.options)||d.result.modelVersion!==d.modelVersion)throw Error('决策卡内容不完整');
 if(d.result.options.length!==d.options.length||d.result.options.some(o=>!d.options.some(x=>x.id===o.id)||![o.daily?.p10,o.daily?.p50,o.daily?.p90,o.daily?.spread,o.monthly?.cost,o.monthly?.hoursP50,o.suggestedDeparture].every(Number.isFinite)))throw Error('决策卡结果无效');
 return d;
}
export function decisionSummary(d){
 const selected=d.result.options.find(o=>o.id===d.selectedId),input=d.options.find(o=>o.id===d.selectedId);
 const constraints=normalizeConstraints(d.constraints),assessment=constraintAssessment(selected,constraints,input,d.settings),e=routeEvidence(input,selected,d.settings),clock=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
 return ['我的通勤决策卡',`保存时间：${d.savedAt}`,`选择：${selected.name}`,`理由：${d.reason||'未填写'}`,
  `来源：${inputSourceDescription(input)}`,
  `月度往返：${selected.monthly.hoursP50.toFixed(1)}小时（中位） / ¥${selected.monthly.cost.toFixed(2)}`,
  `单程${e.rangeLabel}：${e.low.toFixed(1)}–${e.high.toFixed(1)}分钟；${e.observed?"记录":"模型"}中位${e.median.toFixed(1)}分钟`,
  e.timingKnown?`模型内出门参考：${evidenceClock(selected.suggestedDeparture)}。${e.timingNote}`:`目标阈值出门时刻：暂无。${e.timingNote}`,
  `上班时间：${String(Math.floor(d.settings.workStart/60)).padStart(2,'0')}:${String(d.settings.workStart%60).padStart(2,'0')}；每月 ${d.settings.daysPerMonth} 天`,
  `个人条件：月预算${constraints.monthlyBudget===null?'未设置':`¥${constraints.monthlyBudget.toFixed(2)}`}；最早愿意出门${constraints.earliestDeparture===null?'未设置':clock(constraints.earliestDeparture)}`,
  assessment.hasConstraints?(assessment.departureUnknown?`所选路线出门条件暂无法验证；月预算需增加¥${assessment.extraBudget.toFixed(2)}。${d.evidencePolicy===EVIDENCE_POLICY?'本次选择接受未知，先试行。':'旧选择尚未确认此未知，需要重新确认。'}`:assessment.meets?'所选路线满足当前已设置的条件。':`所选路线的条件差：预算需增加¥${assessment.extraBudget.toFixed(2)}；出门需提前${assessment.earlierMinutes}分钟。为0的项目无需放宽。`):'未设置个人条件，由本人权衡。',
  '对比快照：',...d.result.options.map(o=>{const source=d.options.find(x=>x.id===o.id);return `- ${o.name}：月中位${o.monthly.hoursP50.toFixed(1)}小时，月费¥${o.monthly.cost.toFixed(2)}；输入：${inputSourceDescription(source)} / 单程¥${source.cost}`;}),
  `模型：${d.modelVersion}`,'估算或个人记录条件下的情景比较；月度按往返、返程同分布，不保证未来准点率。输入改变后须重新确认。'].join('\n');
}
