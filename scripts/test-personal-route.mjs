import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeConstraints,constraintAssessment} from '../src/lib/conditions.js';
import {recordUpdate,switchToEstimate,restoreRecords} from '../src/lib/record-trial.js';
import {decodeDraft} from '../src/lib/draft.js';
import {simulate,DEFAULT_SETTINGS} from '../src/lib/simulate.js';
import {makeDecision,decodeDecision,decisionIsCurrent,decisionSummary} from '../src/lib/decision.js';
const routes=()=>[{id:'a',name:'地铁',min:30,mode:40,max:60,cost:5,source:'estimate'},{id:'b',name:'打车',min:20,mode:30,max:50,cost:30,source:'estimate'}];
test('constraints explain each conflict and do not invent a combined winner',()=>{
 const metric={id:'a',monthly:{cost:264},suggestedDeparture:510};
 assert.equal(constraintAssessment(metric).hasConstraints,false);
 assert.deepEqual(normalizeConstraints(),{monthlyBudget:null,earliestDeparture:null});
 const a=constraintAssessment(metric,{monthlyBudget:200,earliestDeparture:520});
 assert.equal(a.meets,false);assert.equal(a.extraBudget,64);assert.equal(a.earlierMinutes,10);
 assert.equal(constraintAssessment(metric,{monthlyBudget:264,earliestDeparture:510}).meets,true);
 for(const value of [{monthlyBudget:-1},{monthlyBudget:Infinity},{earliestDeparture:1440},{earliestDeparture:510.5}])assert.throws(()=>normalizeConstraints(value));
});
test('one or two records remain estimates; third record explicitly calibrates only that route',()=>{
 const original=routes(),one=recordUpdate(original[0],'41'),two=recordUpdate(one.next,'50'),three=recordUpdate(two.next,'46');
 assert.equal(one.calibrated,false);assert.equal(one.next.observations,undefined);assert.deepEqual(two.next.trialRecords,[41,50]);assert.equal(three.calibrated,true);assert.deepEqual(three.next.observations,[41,50,46]);assert.equal(three.next.trialRecords,undefined);
 const before=simulate(original,DEFAULT_SETTINGS,{months:50}),after=simulate([three.next,original[1]],DEFAULT_SETTINGS,{months:50});assert.deepEqual(after.options[1],before.options[1]);
 assert.deepEqual(original[0],routes()[0]);
});
test('switching to estimates and replacement preserve recoverable records',()=>{
 const option={...routes()[0],observations:[40,45,50],source:'observed'};
 const estimate=switchToEstimate(option,{mode:42});assert.equal(estimate.observations,undefined);assert.deepEqual(estimate.archivedObservations,[40,45,50]);assert.deepEqual(restoreRecords(estimate).observations,[40,45,50]);
 const replacement=recordUpdate(option,'22,24,25',true);assert.deepEqual(replacement.next.archivedObservations,option.observations);assert.deepEqual(replacement.next.observations,[22,24,25]);
 assert.throws(()=>recordUpdate(option,'0'));assert.throws(()=>recordUpdate(option,'361'));assert.throws(()=>recordUpdate({...option,observations:Array(300).fill(40)},'44'));assert.equal(option.observations.length,3);
});
test('drafts keep archived and accumulating records; old drafts mean no constraints',()=>{
 const old=decodeDraft(JSON.stringify({options:routes(),settings:DEFAULT_SETTINGS}));assert.equal(old.constraints,undefined);
 const next=recordUpdate(routes()[0],'40').next;
 const d=decodeDraft(JSON.stringify({options:[next,routes()[1]],settings:DEFAULT_SETTINGS,constraints:{monthlyBudget:600,earliestDeparture:510}}));assert.equal(d.constraints.monthlyBudget,600);assert.deepEqual(d.options[0].trialRecords,[40]);assert.throws(()=>decodeDraft(JSON.stringify({...d,options:[{...d.options[0],archivedObservations:[1,2]},d.options[1]]})));
});
test('personal constraints and record revisions invalidate decisions without changing the model',()=>{
 const options=routes(),r=simulate(options,DEFAULT_SETTINGS,{months:50}),c={monthlyBudget:300,earliestDeparture:510};
 const d=makeDecision(options,DEFAULT_SETTINGS,r,'a','预算更合适',c);assert.equal(decisionIsCurrent(d,options,DEFAULT_SETTINGS,r.modelVersion,c),true);assert.equal(decisionIsCurrent(d,options,DEFAULT_SETTINGS,r.modelVersion,{...c,monthlyBudget:250}),false);
 assert.match(decisionSummary(d),/月预算¥300.00/);assert.deepEqual(decodeDecision(JSON.stringify(d)),d);const updated=[recordUpdate(options[0],'45').next,options[1]];assert.equal(decisionIsCurrent(d,updated,DEFAULT_SETTINGS,r.modelVersion,c),false);
 const legacy={...makeDecision(options,DEFAULT_SETTINGS,r,'a'),version:1};delete legacy.constraints;assert.equal(decisionIsCurrent(decodeDecision(JSON.stringify(legacy)),options,DEFAULT_SETTINGS,r.modelVersion),true);
});
