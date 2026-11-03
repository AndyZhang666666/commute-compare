import DemoUtilities from './DemoUtilities';

export default function CommuteHelp(){return <DemoUtilities project="commute" name="Commute Compare" steps={[
 {title:'先看耗时与波动',description:'同一尺度比较两条路线。估算和个人记录分别标来源与条数，先看时间，再看月费用。',target:'#personal-decision h2'},
 {title:'作一次自己的选择',description:'接受取舍或未知后选择路线，写下理由。选择只属于当前条件，不自动变成长期推荐。',target:'.route-decisions button'},
 {title:'改一个条件，再确认',description:'修改到达时间或预算后，查看旧值→新值；确认维持或更换路线，才导出新卡片。',target:'#workStart'},
]} about={{
 problem:'换住处、工作或路线时，只看地图上的常见分钟数很难同时权衡月费用、波动和出门习惯。这里帮助你做一次阶段性的通勤选择。',
 choices:'两条路线先比较，不做舒适度综合评分。条件冲突逐项说明；个人试行记录先预演再应用，新条件使旧选择过期，理由和旧快照仍保留。',
 boundary:'不接地图或实时路况。估算用 PERT，记录用经验重采样；月度按往返且返程同分布。记录范围不是未来风险。尾部显示门槛只保证分辨率，不认证可靠性。',
 validation:'需要陌生用户独立完成路线选择，并用后续工作日记录复查；天气相关性、返程差异和样本代表性尚未建模。这里没有真实准点率或留存提升的验证。',
}}/>;}
