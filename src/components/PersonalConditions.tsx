"use client";
import {useContext,useEffect,useState} from 'react';
import type {PersonalConstraints} from '@/lib/types';
import {InputValidityContext} from '@/lib/input-validity';
import {fmtClock,parseClock} from '@/lib/simulate.js';
export default function PersonalConditions({value,onChange}:{value:PersonalConstraints;onChange:(v:PersonalConstraints)=>void}){
 const report=useContext(InputValidityContext),[budget,setBudget]=useState(value.monthlyBudget===null?'':String(value.monthlyBudget)),[earliest,setEarliest]=useState(value.earliestDeparture===null?'':fmtClock(value.earliestDeparture)),[errors,setErrors]=useState({budget:'',earliest:''});
 useEffect(()=>{setBudget(value.monthlyBudget===null?'':String(value.monthlyBudget));setErrors(old=>({...old,budget:''}));report('personal-budget',false);},[value.monthlyBudget,report]);
 useEffect(()=>{setEarliest(value.earliestDeparture===null?'':fmtClock(value.earliestDeparture));setErrors(old=>({...old,earliest:''}));report('personal-earliest',false);},[value.earliestDeparture,report]);
 useEffect(()=>()=>{report('personal-budget',false);report('personal-earliest',false);},[report]);
 function commit(field:'budget'|'earliest'){
  const raw=(field==='budget'?budget:earliest).trim(),n=raw===''?null:field==='budget'?Number(raw):parseClock(raw);
  const invalid=n!==null&&(!Number.isFinite(n)||(field==='budget'&&(n<0||n>10000000)));
  setErrors(old=>({...old,[field]:invalid?(field==='budget'?'填0–10000000元，或留空':'请填HH:MM，或留空'):''}));
  report('personal-'+field,invalid);
  if(!invalid){onChange({...value,[field==='budget'?'monthlyBudget':'earliestDeparture']:n});report(field==='budget'?'personal-budget':'personal-earliest',false);}
 }
 return <section className="personal-conditions" aria-labelledby="conditions-title"><div className="conditions-title"><h3 id="conditions-title">什么对你更重要？</h3><span>可选 · 留空表示不限</span></div><div className="condition-fields"><label>每月最多愿意花 / 元<input aria-label="每月预算上限" type="text" inputMode="decimal" value={budget} placeholder="例如 600" aria-invalid={!!errors.budget} onChange={e=>{setBudget(e.target.value);report('personal-budget',true);}} onBlur={()=>commit('budget')} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape'){setBudget(value.monthlyBudget===null?'':String(value.monthlyBudget));setErrors(v=>({...v,budget:''}));report('personal-budget',false);}}}/>{errors.budget&&<small role="alert">{errors.budget}</small>}</label><label>最早愿意几点出门<input aria-label="最早愿意出门时间" type="text" inputMode="numeric" value={earliest} placeholder="例如 08:30" aria-invalid={!!errors.earliest} onChange={e=>{setEarliest(e.target.value);report('personal-earliest',true);}} onBlur={()=>commit('earliest')} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape'){setEarliest(value.earliestDeparture===null?'':fmtClock(value.earliestDeparture));setErrors(v=>({...v,earliest:''}));report('personal-earliest',false);}}}/>{errors.earliest&&<small role="alert">{errors.earliest}</small>}</label></div><p className="source-note">逐项对照预算和模型建议出门时间，不替你给舒适度打分。按 Enter 或离开输入框应用。</p></section>;
}
