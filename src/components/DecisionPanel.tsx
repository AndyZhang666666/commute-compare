"use client";
import {useEffect,useRef,useState} from 'react';
import type {CommuteOption,GlobalSettings,SimulationResult,PersonalConstraints} from '@/lib/types';
import {DECISION_KEY,compareTradeoff,makeDecision,decodeDecision,decisionIsCurrent,decisionSummary} from '@/lib/decision.js';
import {routeEvidence,evidenceClock} from '@/lib/evidence-view.js';
import {useTabDraft} from '@/lib/use-tab-draft';
import {formatTimeDifference,isTinyDifference} from '@/lib/time-difference.js';
import TimeRanges from './TimeRanges';
import RecordTrial from './RecordTrial';
import {constraintAssessment} from '@/lib/conditions.js';
import {effectiveInputSource,inputSourceDescription} from '@/lib/input-source.js';
import {decisionChanges} from '@/lib/decision-changes.js';
const EMPTY_REASON_DRAFT={reason:'',savedAt:''};
type Snapshot=ReturnType<typeof makeDecision>;
export default function DecisionPanel({options,settings,constraints,result,pending,onCalibrate,onUpdateRoute}:{options:CommuteOption[];settings:GlobalSettings;constraints:PersonalConstraints;result:SimulationResult;pending:boolean;onCalibrate:(id:string)=>void;onUpdateRoute:(v:CommuteOption)=>void}){
 const exportUrl=useRef<string|null>(null);
 const [file,setFile]=useState<{url:string;savedAt:string}|null>(null);
 useEffect(()=>()=>{if(exportUrl.current)URL.revokeObjectURL(exportUrl.current);},[]);
 const [decision,setDecision]=useState<Snapshot|null>(null),[notice,setNotice]=useState(''),[ready,setReady]=useState(false),[pair,setPair]=useState('');
 useEffect(()=>{try{const saved=decodeDecision(localStorage.getItem(DECISION_KEY));if(saved){setDecision(saved);}}catch{setNotice('保存的决策卡无法读取；旧内容未被覆盖，仍可重新选择和导出。');}setReady(true);},[]);
 const [reasonDraft,setReasonDraft,reasonDraftStatus]=useTabDraft('decision-reason',EMPTY_REASON_DRAFT);
 const reason=reasonDraft.savedAt===(decision?.savedAt||'')?reasonDraft.reason:decision?.reason||'';
 const setReason=(reason:string)=>setReasonDraft({reason,savedAt:decision?.savedAt||''});
 const reasonPending=!!decision&&reason.trim()!==decision.reason;
 const current=decisionIsCurrent(decision,options,settings,result.modelVersion,constraints),cheap=[...result.options].sort((a,b)=>a.monthly.cost-b.monthly.cost)[0];
 const changes=decision&&!current?decisionChanges(decision,options,settings,constraints,pending?null:result):[];
 const assessments=result.options.map(o=>constraintAssessment(o,constraints,options.find(v=>v.id===o.id),settings)),hasConditions=assessments.some(a=>a.hasConstraints),feasible=assessments.filter(a=>a.meets).length,unknown=assessments.filter(a=>a.departureUnknown).length;
 const other=result.options.find(o=>o.id===pair&&o.id!==cheap?.id)||result.options.find(o=>o.id!==cheap?.id),trade=cheap&&other?compareTradeoff(cheap,other):null;
 const nearTime=!!trade&&(trade.kind==='same-time'||isTinyDifference(trade.savedHours));
 function choose(id:string){if(pending)return;try{const d=makeDecision(options,settings,result,id,reason.trim(),constraints);setDecision(d);setReasonDraft({reason:d.reason,savedAt:d.savedAt});try{localStorage.setItem(DECISION_KEY,JSON.stringify(d));setNotice('已保存本次选择与个人条件；输入或记录改变后会要求重新确认。');}catch{setNotice('本机保存不可用，选择暂留本页，可立即复制摘要或导出 JSON。');}}catch(e){setNotice((e as Error).message);}}
 function download(){if(!decision||!current||pending||reasonPending||!reasonDraftStatus.ready)return;const url=URL.createObjectURL(new Blob([JSON.stringify({...decision,inputSources:decision.options.map((o:CommuteOption)=>({id:o.id,...effectiveInputSource(o),description:inputSourceDescription(o),evidence:routeEvidence(o,decision.result.options.find((v:{id:string})=>v.id===o.id),decision.settings)})),summary:decisionSummary(decision)},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='commute-decision.json';a.click();if(exportUrl.current)URL.revokeObjectURL(exportUrl.current);exportUrl.current=url;setFile({url,savedAt:decision.savedAt});}
 return <section className="panel personal-decision" id="personal-decision" aria-busy={pending}>
 <div className="decision-head"><div><h2>每月多付多少，换回多少时间？</h2></div><span className="source-chip">模型内比较</span></div>
 <TimeRanges options={result.options} inputs={options} settings={settings} pending={pending}/>
 {trade&&other&&cheap&&<><p className="note">以月费用最低的「{cheap.name}」为比较基准{result.options.filter(o=>o.monthly.cost===cheap.monthly.cost).length>1?'（最低费用并列，其他路线仍可选择）':''}；对照「{other.name}」。月度按往返计算，时间使用模拟中位数。</p>{result.options.length>2&&<label>选择对照路线<select value={other.id} onChange={e=>setPair(e.target.value)}>{result.options.filter(o=>o.id!==cheap.id).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>}<div className={'trade-grid'+(pending?' pending':'')}><div><span>每月多花</span><strong>¥{trade.extraCost.toFixed(0)}</strong></div><div><span>{trade.savedHours<0?'每月多用':'每月节省'}</span><strong>{formatTimeDifference(trade.savedHours).value}<small>{formatTimeDifference(trade.savedHours).unit}</small></strong></div><div><span>每省一小时多付</span><strong className={nearTime?'trade-ratio-near':undefined}>{nearTime?'耗时相近':trade.pricePerHour==null?'不适用':`¥${trade.pricePerHour.toFixed(1)}`}</strong><small>{trade.kind==='same-time'?'时间相同，不产生价值比':trade.kind==='slower'?'更慢，不能用费用除以“省时”':trade.kind==='no-premium'?'省时且没有额外费用':'只比较时间与费用，未计舒适度。'}</small>{nearTime&&<><small>{trade.kind==='same-time'?'耗时相同，不计算折算比。':'月差异约5分钟以内，折算比易被小分母放大；请先核对耗时假设。'}</small>{trade.pricePerHour!==null&&<small className="trade-ratio-value">原始折算 ¥{trade.pricePerHour.toFixed(1)} / 小时，仅供核对。</small>}</>}</div></div></>}
 <p className="source-note" role="status">{pending?'输入尚未确认或正在重算；旧结果不可选择、复制或导出。':decision&&!current?'条件或记录已经变化；旧选择保留，确认新结果后再导出。':notice||'比较已更新。还可以考虑舒适、换乘和天气；选择由你决定。'}</p>
 {decision&&!current&&<details open className="decision-changes"><summary>原选择待确认 · {changes.length}项已提交条件变化</summary>{changes.length?<dl>{changes.map((change,i)=><div key={i}><dt>{change.label}</dt><dd><span>{change.before}</span><span aria-label="变为"> → </span><strong>{change.after}</strong></dd></div>)}</dl>:<p>有输入尚未提交或刚完成恢复，等待本次结果；原选择与理由保持。</p>}<p>下面重新选择原路线表示维持选择，也可以换一条路线；确认前不能把旧快照作为当前结果导出。</p></details>}
 <div className="condition-verdict" aria-live="polite"><strong>{pending?'等待当前条件确认':!hasConditions?'先看代价，再按自己的条件选择':feasible?`${feasible}条路线满足当前模型内可核对的条件`:unknown?'还不能判断是否有路线满足全部条件':'目前没有路线同时满足你的条件'}</strong><p>{!hasConditions?'左侧可设置月预算和最早愿意出门时间。':unknown?`${unknown}条路线的出门条件缺少尾部依据，预算仍可核对；可以接受未知先试行，再补记录。`:feasible?'每条路线逐项说明预算与模型建议出门时间；满足条件不代表未来准点保证。':'下方分别列出每条路线需要增加的预算和提前的分钟数，你可以修改条件或明确接受取舍。'}</p></div>

 <div className="route-decisions">{result.options.map(o=>{
   const input=options.find(v=>v.id===o.id);if(!input)return null;
   const a=constraintAssessment(o,constraints,input,settings),e=routeEvidence(input,o,settings);
   return <article key={o.id} className="route-decision" data-selected={current&&decision?.selectedId===o.id}>
     <div className="decision-head"><h3>{o.name}</h3><span className="source-chip">{e.sourceLabel}</span></div>
     <p><strong>{e.median.toFixed(0)} 分钟</strong> / {e.observed?'记录中位':'模型单程中位'} · ¥{o.monthly.cost.toFixed(0)} / 月</p>
     <p className="source-note">{inputSourceDescription(input)}</p>
     <p className="note">{e.rangeLabel} {e.low.toFixed(0)}–{e.high.toFixed(0)} 分钟。{e.timingKnown?`模型内参考 ${evidenceClock(o.suggestedDeparture)} 出门。`:e.referenceDeparture!==null?`按已记录最慢一次预留：${evidenceClock(e.referenceDeparture)}，仅供试行。`:'出门时刻暂无。'}</p>
     <p className="source-note">{e.timingNote}</p>
     {a.hasConstraints&&<ul className="constraint-checks">
       <li data-meets={a.extraBudget===0}>{a.budgetSet?(a.extraBudget>0?`月预算需增加 ¥${a.extraBudget.toFixed(0)}`:'月费用在预算内'):'月预算未限制'}</li>
       <li data-meets={!a.departureUnknown&&a.earlierMinutes===0}>{a.departureUnknown?'出门条件暂无法验证：记录不足':a.departureSet?(a.earlierMinutes>0?`需比你的最早时间再提前 ${a.earlierMinutes}分钟`:'模型内参考时间符合你的习惯'):'最早出门时间未限制'}</li>
     </ul>}
     <div className="decision-actions"><button className="btn primary" disabled={pending||!ready||!reasonDraftStatus.ready} onClick={()=>choose(o.id)}>{current&&decision?.selectedId===o.id?'已选择 · 再次确认':a.departureUnknown?'接受未知，先试这条路线':a.hasConstraints&&!a.meets?'接受取舍并选择':'选择这个方案'}</button><button className="btn" disabled={pending} onClick={()=>onCalibrate(o.id)}>整理已有记录</button></div>
     <RecordTrial option={input} settings={settings} metric={o} onApply={onUpdateRoute} disabled={pending}/>
   </article>;
 })}</div>
 <label className="decision-reason">选择理由（可选，保存到决策卡）<textarea rows={2} maxLength={600} disabled={!reasonDraftStatus.ready} value={reason} onChange={e=>setReason(e.target.value)} placeholder="例如：多花一点，换来不必连续换乘的早晨。"/></label>
 <p className="source-note">{reasonDraftStatus.notice} 修改理由后仍需明确确认，才进入决策卡。</p>
 {decision&&reason.trim()!==decision.reason&&<p className="source-note">理由尚未保存，点击路线的“选择 / 再次确认”更新决策卡。</p>}
 <div className="decision-footer"><p><strong>{decision?(current?`当前选择：${decision.result.options.find((o:{id:string})=>o.id===decision.selectedId)?.name}`:'待重新确认：保留了旧输入下的选择快照'):'尚未选择'}</strong>{decision&&!current&&<span className="source-note">旧选择：{decision.result.options.find((o:{id:string})=>o.id===decision.selectedId)?.name} · {decision.savedAt.slice(0,10)}。旧快照不作为当前结果导出。</span>}</p><div className="decision-actions"><button className="btn" disabled={!decision||!current||pending||reasonPending||!reasonDraftStatus.ready} onClick={async()=>{try{await navigator.clipboard.writeText(decisionSummary(decision));setNotice('当前决策卡摘要已复制。');}catch{setNotice('复制不可用，请导出 JSON。');}}}>复制选择摘要</button><button className="btn" disabled={!decision||!current||pending||reasonPending||!reasonDraftStatus.ready} onClick={download}>导出决策 JSON</button></div></div>
 {file&&decision&&file.savedAt===decision.savedAt&&current&&!pending&&!reasonPending&&reasonDraftStatus.ready&&<p className="decision-export-receipt" role="status">文件已生成，浏览器未自动保存时可再次下载。<a href={file.url} download="commute-decision.json">保存 commute-decision.json</a><span>对应本次已确认快照；条件变化后须重新确认并生成。</span></p>}
 </section>;
}
