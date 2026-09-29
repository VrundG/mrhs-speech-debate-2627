'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, GripVertical, LockKeyhole, Save, ShieldCheck, UsersRound, X } from 'lucide-react';
import type { Tournament } from './data/tournaments';
import type { IntentSubmission } from '../db/intents';
import type { ChaperoneSubmission } from '../db/chaperones';
import type { Member } from '../db/members';
import type { JudgePool, StudentStatus, TournamentPlan } from '../db/tournament-plans';
import { resolveTournamentName } from './lib/tournament-matcher';

type StudentCard = { key:string; name:string; memberId:string|null; entries:IntentSubmission[]; judgeKeys:string[] };
type JudgeCard = { key:string; name:string; linkedStudentKeys:string[]; approved:'yes'|'no'|'unknown'; source:Set<'Intent form'|'Chaperone form'>; preferred:string|null };
type EventFilter = 'all'|'pf'|'ld'|'speech'|'congress';
const poolLabels:Record<JudgePool,string>={available:'Available',debate:'Debate',speech:'Speech',congress:'Congress'};
const eventFilters:{value:EventFilter;label:string}[]=[{value:'all',label:'All'},{value:'pf',label:'PF'},{value:'ld',label:'LD'},{value:'speech',label:'Speech'},{value:'congress',label:'Congress'}];
function cleanKey(value:string){return value.trim().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function studentKey(intent:IntentSubmission){return intent.memberId??`intent:${cleanKey(intent.matchedStudentName??intent.studentNameRaw)}`;}
function judgeKey(name:string,email:string|null,phone:string|null){return `judge:${cleanKey(email||phone||name)}`;}
function entryMatchesFilter(entry:IntentSubmission,filter:EventFilter){return filter==='all'||entry.eventCategory===filter;}
function studentMatchesFilter(student:StudentCard,filter:EventFilter){return student.entries.some(entry=>entryMatchesFilter(entry,filter));}
function detailsMentionStudent(details:string|null,name:string){const detailKey=cleanKey(details??'');const nameKey=cleanKey(name);return nameKey.length>3&&` ${detailKey} `.includes(` ${nameKey} `);}
function judgeIdentityKeys(name:string,email:string|null,phone:string|null){
  const normalizedEmail=email?.trim().toLowerCase();
  const normalizedPhone=phone?.replace(/\D/g,'');
  return [
    normalizedEmail?`email:${normalizedEmail}`:null,
    normalizedPhone?`phone:${normalizedPhone}`:null,
    cleanKey(name)?`name:${cleanKey(name)}`:null,
  ].filter((value):value is string=>Boolean(value));
}
function isTournamentSubmission(submission:ChaperoneSubmission,tournament:Tournament,tournaments:Tournament[]){return submission.tournamentNames.some(name=>{const match=resolveTournamentName(name,tournaments);return match.status==='matched'&&match.tournament.id===tournament.id;});}

export function TournamentPlanner({ tournament, tournaments, intents, chaperones, members, initialPlan, onClose }:{tournament:Tournament;tournaments:Tournament[];intents:IntentSubmission[];chaperones:ChaperoneSubmission[];members:Member[];initialPlan:TournamentPlan|null;onClose:()=>void}){
  const relevantIntents=useMemo(()=>intents.filter(item=>item.tournamentId===tournament.id),[intents,tournament.id]);
  const students=useMemo(()=>{
    const grouped=new Map<string,StudentCard>();
    for(const intent of relevantIntents){const key=studentKey(intent);const card=grouped.get(key)??{key,name:intent.matchedStudentName??intent.studentNameRaw,memberId:intent.memberId,entries:[],judgeKeys:[]};card.entries.push(intent);grouped.set(key,card);}
    return Array.from(grouped.values()).sort((a,b)=>a.name.localeCompare(b.name));
  },[relevantIntents]);
  const membersById=useMemo(()=>new Map(members.map(member=>[member.id,member])),[members]);
  const judges=useMemo(()=>{
    const map=new Map<string,JudgeCard>();
    const identityIndex=new Map<string,string>();
    const add=(name:string,email:string|null,phone:string|null,linkedStudentKey:string|null,approved:JudgeCard['approved'],source:'Intent form'|'Chaperone form',preferred:string|null)=>{
      if(!name.trim())return;
      const identities=judgeIdentityKeys(name,email,phone);
      const key=identities.map(identity=>identityIndex.get(identity)).find((match):match is string=>Boolean(match))??judgeKey(name,email,phone);
      const item=map.get(key)??{key,name,linkedStudentKeys:[],approved,source:new Set(),preferred};
      if(linkedStudentKey&&!item.linkedStudentKeys.includes(linkedStudentKey))item.linkedStudentKeys.push(linkedStudentKey);if(approved==='yes'||item.approved==='unknown')item.approved=approved;item.source.add(source);if(!item.preferred&&preferred)item.preferred=preferred;map.set(key,item);
      identities.forEach(identity=>identityIndex.set(identity,key));
    };
    for(const intent of relevantIntents){const linked=studentKey(intent);if(intent.parent1Judging&&intent.parent1Name)add(intent.parent1Name,intent.parent1Email,intent.parent1Phone,linked,'unknown','Intent form',intent.eventCategory);if(intent.parent2Judging&&intent.parent2Name)add(intent.parent2Name,intent.parent2Email,intent.parent2Phone,linked,'unknown','Intent form',intent.eventCategory);}
    for(const submission of chaperones){if(!isTournamentSubmission(submission,tournament,tournaments))continue;const linked=submission.memberId?students.find(student=>student.memberId===submission.memberId)?.key??null:students.find(student=>cleanKey(student.name)===cleanKey(submission.matchedStudentName??submission.studentNameRaw))?.key??null;add(submission.parentName,submission.parentEmail,submission.parentPhone,linked,submission.approvedVolunteer,'Chaperone form',submission.desiredEvent);}
    return Array.from(map.values()).sort((a,b)=>a.name.localeCompare(b.name));
  },[chaperones,relevantIntents,students,tournament,tournaments]);

  const [judgeAssignments,setJudgeAssignments]=useState<Record<string,JudgePool>>({});
  const [studentStatuses,setStudentStatuses]=useState<Record<string,StudentStatus>>({});
  const [intentFilter,setIntentFilter]=useState<EventFilter>('all');
  const [finalizedFilter,setFinalizedFilter]=useState<EventFilter>('all');
  const [confirmed,setConfirmed]=useState(false);
  const [saveState,setSaveState]=useState<'idle'|'saving'|'saved'|'error'>('idle');
  useEffect(()=>{const assignments:Record<string,JudgePool>={};judges.forEach(judge=>assignments[judge.key]=initialPlan?.judgeAssignments[judge.key]??'available');const statuses:Record<string,StudentStatus>={};students.forEach(student=>statuses[student.key]=initialPlan?.studentStatuses[student.key]??'waitlist');setJudgeAssignments(assignments);setStudentStatuses(statuses);setIntentFilter('all');setFinalizedFilter('all');setConfirmed(initialPlan?.confirmed??false);setSaveState('idle');},[initialPlan,judges,students,tournament.id]);

  const pfPartnerKeys=useMemo(()=>{const pairs=new Map<string,string>();const pfStudents=students.filter(student=>student.entries.some(entry=>entry.eventCategory==='pf'));for(const student of pfStudents){const ownDetails=student.entries.filter(entry=>entry.eventCategory==='pf').map(entry=>entry.eventDetails);const matches=pfStudents.filter(candidate=>candidate.key!==student.key&&(ownDetails.some(details=>detailsMentionStudent(details,candidate.name))||candidate.entries.some(entry=>entry.eventCategory==='pf'&&detailsMentionStudent(entry.eventDetails,student.name))));if(matches.length===1&&!pairs.has(student.key)&&!pairs.has(matches[0].key)){pairs.set(student.key,matches[0].key);pairs.set(matches[0].key,student.key);}}return pairs;},[students]);
  const directlyLockedStudents=useMemo(()=>new Set(judges.filter(judge=>(judgeAssignments[judge.key]??'available')!=='available').flatMap(judge=>judge.linkedStudentKeys)),[judgeAssignments,judges]);
  const partnerLockedBy=useMemo(()=>{const result=new Map<string,string>();for(const key of directlyLockedStudents){const student=students.find(item=>item.key===key);if(!student?.entries.some(entry=>entry.eventCategory==='pf'))continue;const partnerKey=pfPartnerKeys.get(key);if(partnerKey)result.set(partnerKey,key);}return result;},[directlyLockedStudents,pfPartnerKeys,students]);
  const lockedStudents=useMemo(()=>new Set([...directlyLockedStudents,...partnerLockedBy.keys()]),[directlyLockedStudents,partnerLockedBy]);
  useEffect(()=>{if(!lockedStudents.size)return;setStudentStatuses(current=>{let changed=false;const next={...current};for(const key of lockedStudents){if(next[key]!=='going'){next[key]='going';changed=true;}}return changed?next:current;});},[lockedStudents]);
  const goingStudents=students.filter(student=>(studentStatuses[student.key]??'waitlist')==='going'||lockedStudents.has(student.key));
  const waitlistStudents=students.filter(student=>!lockedStudents.has(student.key)&&(studentStatuses[student.key]??'waitlist')==='waitlist');
  const visibleGoingStudents=goingStudents.filter(student=>studentMatchesFilter(student,finalizedFilter));
  const visibleWaitlistStudents=waitlistStudents.filter(student=>studentMatchesFilter(student,intentFilter));
  const intentFilterCounts=Object.fromEntries(eventFilters.map(filter=>[filter.value,waitlistStudents.filter(student=>studentMatchesFilter(student,filter.value)).length])) as Record<EventFilter,number>;
  const finalizedFilterCounts=Object.fromEntries(eventFilters.map(filter=>[filter.value,goingStudents.filter(student=>studentMatchesFilter(student,filter.value)).length])) as Record<EventFilter,number>;
  const assignedCount=(pool:JudgePool)=>judges.filter(judge=>(judgeAssignments[judge.key]??'available')===pool).length;
  const goingKeys=new Set(goingStudents.map(student=>student.key));
  const entries=relevantIntents.filter(intent=>goingKeys.has(studentKey(intent)));
  const ldEntries=entries.filter(item=>item.eventCategory==='ld').length;
  const pfStudents=entries.filter(item=>item.eventCategory==='pf').length;
  const debateUnits=ldEntries+Math.ceil(pfStudents/2);
  const speechEntries=entries.filter(item=>item.eventCategory==='speech').length;
  const congressEntries=entries.filter(item=>item.eventCategory==='congress').length;
  const capacity=[
    {label:'Debate',used:debateUnits,capacity:assignedCount('debate')*2,detail:`${ldEntries} LD + ${pfStudents} PF student${pfStudents===1?'':'s'}`},
    {label:'Speech',used:speechEntries,capacity:assignedCount('speech')*5,detail:'5 entries per judge'},
    {label:'Congress',used:congressEntries,capacity:assignedCount('congress')*5,detail:'5 entries per judge'},
  ];
  const moveJudge=(key:string,pool:JudgePool)=>{setJudgeAssignments(value=>({...value,[key]:pool}));if(pool!=='available'){const judge=judges.find(item=>item.key===key);const forcedKeys=(judge?.linkedStudentKeys??[]).flatMap(studentKey=>[studentKey,pfPartnerKeys.get(studentKey)].filter((value):value is string=>Boolean(value)));if(forcedKeys.length)setStudentStatuses(value=>{const next={...value};forcedKeys.forEach(studentKey=>next[studentKey]='going');return next;});}setSaveState('idle');};
  const moveStudent=(key:string,status:StudentStatus)=>{if(status==='waitlist'&&lockedStudents.has(key))return;setStudentStatuses(value=>({...value,[key]:status}));setSaveState('idle');};
  const startDrag=(event:React.DragEvent,type:'judge'|'student',key:string)=>{event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('application/x-mrhs-card',JSON.stringify({type,key}));};
  const drop=(event:React.DragEvent,target:JudgePool|StudentStatus)=>{event.preventDefault();try{const item=JSON.parse(event.dataTransfer.getData('application/x-mrhs-card')) as {type:string;key:string};if(item.type==='judge'&&['available','debate','speech','congress'].includes(target))moveJudge(item.key,target as JudgePool);if(item.type==='student'&&['going','waitlist'].includes(target))moveStudent(item.key,target as StudentStatus);}catch{/* Ignore unrelated drags. */}};
  const save=async(nextConfirmed=confirmed)=>{setSaveState('saving');try{const response=await fetch('/api/tournament-plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tournamentId:tournament.id,judgeAssignments,studentStatuses,confirmed:nextConfirmed})});if(!response.ok)throw new Error('Save failed');setConfirmed(nextConfirmed);setSaveState('saved');}catch{setSaveState('error');}};
  const renderJudge=(judge:JudgeCard)=><article className="judge-card" draggable onDragStart={event=>startDrag(event,'judge',judge.key)} key={judge.key}><GripVertical size={15}/><div><strong>{judge.name}</strong><small>{judge.linkedStudentKeys.length?`Linked: ${judge.linkedStudentKeys.map(key=>students.find(student=>student.key===key)?.name).filter(Boolean).join(', ')}`:'No student link'} · {Array.from(judge.source).join(' + ')}</small></div><span className={`approval-dot ${judge.approved}`}>{judge.approved==='yes'?'UCPS approved':judge.approved==='no'?'Approval needed':'Approval unknown'}</span><select aria-label={`Assign ${judge.name}`} value={judgeAssignments[judge.key]??'available'} onChange={event=>moveJudge(judge.key,event.target.value as JudgePool)}>{Object.entries(poolLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></article>;
  const renderStudent=(student:StudentCard,filter:EventFilter)=>{const locked=lockedStudents.has(student.key);const status=studentStatuses[student.key]??'waitlist';const visibleEntries=student.entries.filter(entry=>entryMatchesFilter(entry,filter));const partnerKey=pfPartnerKeys.get(student.key);const partnerName=partnerKey?students.find(item=>item.key===partnerKey)?.name:null;const judgeLinked=directlyLockedStudents.has(student.key);const pairedWithKey=partnerLockedBy.get(student.key);const pairedWithName=pairedWithKey?students.find(item=>item.key===pairedWithKey)?.name:null;const lockLabel=judgeLinked?(partnerName?`Judge lock · ${partnerName} included`:'Locked by linked judge'):`Locked with ${pairedWithName??'PF partner'}`;return <article className={`student-card ${locked?'locked':''}`} draggable={!locked} onDragStart={event=>startDrag(event,'student',student.key)} key={student.key}><div className="student-card-top">{locked?<LockKeyhole size={15}/>:<GripVertical size={15}/>}<strong>{student.name}</strong>{student.memberId&&membersById.get(student.memberId)?.membershipStatus==='Paid'?<span className="dues-mini">Dues paid</span>:null}</div><div className="student-events">{visibleEntries.map(entry=><span key={entry.id}>{entry.eventRaw}{entry.eventDetails?` · ${entry.eventDetails}`:''}</span>)}</div><footer>{locked?<b>{lockLabel}</b>:<button type="button" onClick={()=>moveStudent(student.key,status==='going'?'waitlist':'going')}>{status==='going'?'Return to intent pool':'Add to finalized roster'}</button>}</footer></article>;};

  return <div className="planner-backdrop" role="dialog" aria-modal="true" aria-label={`${tournament.name} staffing planner`}>
    <section className="planner-shell">
      <header className="planner-header"><div><p className="eyebrow">Tournament operations board</p><h2>{tournament.name}</h2><span>{tournament.dateLabel} · {tournament.location}</span></div><div className="planner-actions"><span className={`save-state ${saveState}`}>{saveState==='saving'?'Saving…':saveState==='saved'?'Saved':saveState==='error'?'Save failed':''}</span><button className="outline-button" onClick={()=>void save()} type="button"><Save size={15}/>Save draft</button><button className={`confirm-button ${confirmed?'confirmed':''}`} onClick={()=>void save(!confirmed)} type="button"><Check size={16}/>{confirmed?'Roster confirmed':'Confirm roster'}</button><button className="planner-close" onClick={onClose} aria-label="Close planner" type="button"><X size={21}/></button></div></header>
      <section className="capacity-ribbon">{capacity.map(item=><article className={item.used>item.capacity?'over':''} key={item.label}><span>{item.label}</span><strong>{item.used} / {item.capacity}</strong><small>{item.used>item.capacity?`${item.used-item.capacity} over capacity`:item.detail}</small></article>)}<article><span>Finalized roster</span><strong>{goingStudents.length}</strong><small>{waitlistStudents.length} in intent pool · {lockedStudents.size} locked</small></article></section>
      {!relevantIntents.length?<div className="planner-empty"><UsersRound size={30}/><h3>No intent submissions matched yet.</h3><p>Once a student submits the tournament intent form, their card will appear here automatically.</p></div>:<>
        <section className="judge-board"><div className="board-title"><div><p className="eyebrow">Adult coverage</p><h3>Drag judges between pools</h3></div><p>Assigning a parent locks their linked student into the attending roster. You can still move that parent to any judging pool.</p></div><div className="judge-columns">{(['available','debate','speech','congress'] as JudgePool[]).map(pool=><section className="drop-column" key={pool} onDragOver={event=>event.preventDefault()} onDrop={event=>drop(event,pool)}><header><span>{poolLabels[pool]}</span><b>{assignedCount(pool)}</b></header><div>{judges.filter(judge=>(judgeAssignments[judge.key]??'available')===pool).map(renderJudge)}{!judges.some(judge=>(judgeAssignments[judge.key]??'available')===pool)?<p className="drop-hint">Drop judge here</p>:null}</div></section>)}</div></section>
        <section className="student-board"><div className="board-title"><div><p className="eyebrow">Intent roster</p><h3>Build the finalized roster</h3></div><p>Each side has its own event filter. Judge-linked students move into the finalized roster; a matched PF partner moves and locks with them.</p></div><div className="student-columns"><section className="student-drop intent-pool" onDragOver={event=>event.preventDefault()} onDrop={event=>drop(event,'waitlist')}><header><span>Intent pool</span><b>{visibleWaitlistStudents.length}</b></header><div className="event-filter-bar" role="group" aria-label="Filter the intent pool by event">{eventFilters.map(filter=><button type="button" className={intentFilter===filter.value?'active':''} aria-pressed={intentFilter===filter.value} onClick={()=>setIntentFilter(filter.value)} key={filter.value}><span>{filter.label}</span><b>{intentFilterCounts[filter.value]}</b></button>)}</div><div className="student-card-grid">{visibleWaitlistStudents.map(student=>renderStudent(student,intentFilter))}{!visibleWaitlistStudents.length?<p className="drop-hint">No students in the intent pool match this event.</p>:null}</div></section><section className="student-drop finalized-roster" onDragOver={event=>event.preventDefault()} onDrop={event=>drop(event,'going')}><header><span>Finalized roster</span><b>{visibleGoingStudents.length}</b></header><div className="event-filter-bar" role="group" aria-label="Filter the finalized roster by event">{eventFilters.map(filter=><button type="button" className={finalizedFilter===filter.value?'active':''} aria-pressed={finalizedFilter===filter.value} onClick={()=>setFinalizedFilter(filter.value)} key={filter.value}><span>{filter.label}</span><b>{finalizedFilterCounts[filter.value]}</b></button>)}</div><div className="student-card-grid">{visibleGoingStudents.map(student=>renderStudent(student,finalizedFilter))}{!visibleGoingStudents.length?<p className="drop-hint">No finalized students match this event.</p>:null}</div></section></div></section>
      </>}
      <footer className="planner-footnote"><ShieldCheck size={16}/><span>Shared management plan · saved to the private dashboard database. Parent contact details and student submissions never appear on the public login screen.</span></footer>
    </section>
  </div>;
}
