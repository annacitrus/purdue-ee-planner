import { courses } from './courses.js';
import { courseHover } from './hover.js';
import { splitAdvancedEEPlan, migrateAdvancedEEState, initialPlan, validPlan, moveCourse, conflicts, initialState, validState, addSemester, deleteCourse, setCourseNote } from './planner.js';
const $ = s => document.querySelector(s);
const source = 'https://engineering.purdue.edu/Engr/Academics/Undergraduate/majors/2025-26/majors/EE_curriculum_map';
const years = ['Freshman','Sophomore','Junior','Senior'];
const yearName = y => years[y] || `Year ${y+1}`;
const semesterName = i => `${yearName(state.semesters[i].year)} - ${state.semesters[i].term}`;
const byKey = new Map(courses.map(c => [c.key,c]));
const hoverById = new Map(courses.map(c => [c.id.trim(), courseHover(c.id.trim(), courses)]));
const hoverClasses = ['prereq', 'immediate', 'coreq', 'postreq'];
const credits = list => { const min = list.reduce((a,c)=>a+c.min,0), max=list.reduce((a,c)=>a+c.max,0); return min === max ? `${min}` : `${min}–${max}`; };
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=initialState(courses), plan=state.plan, history=[], dragging=null, selected=null, toastTimer;
try { const saved=migrateAdvancedEEState(JSON.parse(localStorage.getItem('purdue-ee-plan-v2'))); if(validState(saved,courses)) state=saved; else { const legacy=splitAdvancedEEPlan(JSON.parse(localStorage.getItem('purdue-ee-plan-v1'))); if(validPlan(legacy,courses)) state.plan=legacy; } plan=state.plan; } catch {}
function category(c) { if (/Calculus|Chemistry|Physics|^MA|^PHYS/.test(c.id)) return 'foundation'; return c.elective ? 'elective' : 'core'; }
function notify(message) { $('#toast').textContent=message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500); }
function save() { try { localStorage.setItem('purdue-ee-plan-v2',JSON.stringify(state)); $('#save-status').textContent='● Saved on this device'; } catch { $('#save-status').textContent='Session only · storage unavailable'; } }
function commit(next,message) { if(Array.isArray(next)) next={...state,plan:next}; if(JSON.stringify(next)===JSON.stringify(state)) return; history.push(structuredClone(state)); state=next; plan=state.plan; save(); render(); notify(message); }
function render() {
  const activeCourses=plan.flat().map(k=>byKey.get(k));
  $('#total-credits').textContent=credits(activeCourses); $('#course-count').textContent=activeCourses.length; $('#semester-count').textContent=plan.length;
  $('#undo').disabled=!history.length;
  $('#board').innerHTML=[...new Set(state.semesters.map(s=>s.year))].map(y=>`<section class="year"><div class="year-heading">${yearName(y)}<span>YEAR ${String(y+1).padStart(2,'0')}</span></div><div class="semesters">${state.semesters.map((s,i)=>s.year===y?i:null).filter(i=>i!==null).map(i=>`<section class="semester"><div class="semester-heading"><h3>${state.semesters[i].term}</h3><span>${plan[i].length} courses</span></div><div class="course-list" data-semester="${i}" aria-label="${semesterName(i)} courses">${plan[i].map(key=>{const c=byKey.get(key), warnings=conflicts(c,plan,courses);return `<button class="course-card ${category(c)} ${warnings.length?'warning':''}" draggable="true" data-key="${key}" data-course-id="${esc(c.id.trim())}" aria-label="${esc(c.label)}, ${esc(c.name)}, ${credits([c])} credits. Open details to move course."><span class="grip" aria-hidden="true">⠿</span><span class="course-code">${esc(c.label)}</span>${c.name!==c.label?`<span class="course-name">${esc(c.name)}</span>`:''}${state.notes[key]?`<span class="course-note">${esc(state.notes[key])}</span>`:''}<span class="course-meta"><span>${credits([c])} ${c.max===1?'credit':'credits'}</span>${warnings.length?'<span title="Check prerequisites">⚠</span>':''}</span></button>`;}).join('')}</div><div class="semester-total"><span>Semester total</span><strong>${credits(plan[i].map(k=>byKey.get(k)))} cr.</strong></div></section>`).join('')}</div></section>`).join('');
  const warningCount=activeCourses.filter(c=>conflicts(c,plan,courses).length).length;
  $('#plan-status').textContent=warningCount?`${warningCount} ${warningCount===1?'course needs':'courses need'} a prerequisite review`:'Your plan is ready to explore';
}
function highlightRelations(key) {
  const course=byKey.get(key);
  const hover=hoverById.get(course?.id.trim());
  document.querySelectorAll('.course-card').forEach(card=>{
    for(const cls of hoverClasses) card.classList.toggle(cls,!!hover?.[cls].includes(card.dataset.courseId));
    card.classList.toggle('hover-selected',card.dataset.key===key);
  });
}
function previewCourse(card) {
  if(dragging || $('#details').open) return;
  highlightRelations(card?.dataset.key);
}
function openCourse(key) {
  const c=byKey.get(key); selected=key;
  const warnings=conflicts(c,plan,courses);
  const pre=c.pre.map(id=>courses.find(c=>c.id===id)).filter(Boolean);
  const co=c.co.map(id=>courses.find(c=>c.id===id)).filter(Boolean);
  const post=courses.filter(next=>next.pre.includes(c.id));
  highlightRelations(key);
  const chips = list => list.map(c=>`<span class="relation-chip">${esc(c.label)}</span>`).join('');
  $('#detail-content').innerHTML=`<div class="eyebrow">${esc(c.label)}</div><h2>${esc(c.name)}</h2><span class="detail-badge">${credits([c])} credits</span><p>${esc(c.description)}</p>${warnings.length?`<p class="detail-warning">${warnings.map(esc).join('<br>')}</p>`:''}<h3>Prerequisites</h3>${pre.length?chips(pre):'<p>No prerequisites listed in this map.</p>'}${co.length?`<h3>Concurrent registration</h3>${chips(co)}`:''}${post.length?`<h3>Leads to</h3>${chips(post)}`:''}<h3><label for="move-semester">Move to semester</label></h3><div class="move-row"><select id="move-semester">${plan.map((s,i)=>`<option value="${i}" ${s.includes(key)?'selected':''}>${semesterName(i)}</option>`).join('')}</select><button class="primary" id="move-course">Move course →</button></div><h3><label for="course-note">Course note</label></h3><textarea id="course-note" rows="3" placeholder="Intended elective or selective, e.g. ECE 404">${esc(state.notes[key]||'')}</textarea><div class="dialog-actions"><button id="delete-course" class="danger">Delete course</button><button id="save-note" class="primary">Save note</button></div><p><a href="${esc(c.url||source)}" target="_blank" rel="noreferrer">View academic reference ↗</a></p>`;
  $('#move-course').onclick=()=>{const target=+$('#move-semester').value;commit(moveCourse(plan,key,target),`${c.label} moved to ${semesterName(target)}`);$('#details').close();};
  $('#save-note').onclick=()=>{commit(setCourseNote(state,key,$('#course-note').value),'Course note saved');$('#details').close();};
  $('#delete-course').onclick=()=>{commit(deleteCourse(state,key),`${c.label} deleted. Use Undo to restore it.`);$('#details').close();};
  $('#details').showModal();
}
$('#board').addEventListener('pointerover',e=>{
  if(e.pointerType==='touch') return;
  previewCourse(e.target.closest('.course-card'));
});
$('#board').addEventListener('pointerleave',()=>previewCourse(document.activeElement.closest('.course-card')));
$('#board').addEventListener('focusin',e=>previewCourse(e.target.closest('.course-card')));
$('#board').addEventListener('focusout',e=>previewCourse(e.relatedTarget?.closest?.('.course-card')));
$('#board').addEventListener('click',e=>{const card=e.target.closest('[data-key]');if(card&&!dragging)openCourse(card.dataset.key);});
$('#board').addEventListener('dragstart',e=>{const card=e.target.closest('[data-key]');if(!card)return;highlightRelations(null);dragging=card.dataset.key;e.dataTransfer.setData('text/plain',dragging);e.dataTransfer.effectAllowed='move';card.classList.add('dragging');});
function clearTargets(){document.querySelectorAll('.drag-over,.before').forEach(el=>el.classList.remove('drag-over','before'));}
$('#board').addEventListener('dragover',e=>{const list=e.target.closest('[data-semester]');if(!list||!dragging)return;e.preventDefault();e.dataTransfer.dropEffect='move';clearTargets();list.classList.add('drag-over');const card=e.target.closest('[data-key]');if(card&&card.dataset.key!==dragging)card.classList.add('before');const scroller=$('.board-scroll'),r=scroller.getBoundingClientRect();if(e.clientX>r.right-65)scroller.scrollLeft+=20;if(e.clientX<r.left+65)scroller.scrollLeft-=20;});
$('#board').addEventListener('drop',e=>{e.preventDefault();const list=e.target.closest('[data-semester]');if(!list||!dragging)return;const c=byKey.get(dragging),i=+list.dataset.semester,before=e.target.closest('[data-key]')?.dataset.key;commit(moveCourse(plan,dragging,i,before),`${c.label} moved to ${semesterName(i)}`);dragging=null;clearTargets();});
$('#board').addEventListener('dragend',()=>{dragging=null;clearTargets();document.querySelectorAll('.dragging').forEach(el=>el.classList.remove('dragging'));});
$('#undo').onclick=()=>{if(history.length){state=history.pop();plan=state.plan;save();render();notify('Last change undone');}};
$('#reset').onclick=()=>$('#reset-dialog').showModal();
$('#cancel-reset').onclick=()=>$('#reset-dialog').close();
$('#confirm-reset').onclick=()=>{commit(initialState(courses),'Original curriculum restored');$('#reset-dialog').close();};
$('#add-semester').onclick=()=>{
  const maxYear=Math.max(...state.semesters.map(s=>s.year));
  $('#semester-year').innerHTML=Array.from({length:maxYear+2},(_,y)=>`<option value="${y}">${yearName(y)}</option>`).join('');
  $('#semester-error').textContent=''; $('#semester-dialog').showModal();
};
$('#semester-form').onsubmit=e=>{
  e.preventDefault(); const next=addSemester(state,+$('#semester-year').value,$('#semester-term').value);
  if(next===state){$('#semester-error').textContent='That semester already exists. Choose another term or year.';return;}
  commit(next,'Semester added');$('#semester-dialog').close();
};
$('#help').onclick=()=>$('#help-dialog').showModal();
document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('#details').addEventListener('close',()=>{selected=null;highlightRelations(null);});
$('#export').onclick=()=>{const rows=[['Year','Semester','Course','Title','Minimum credits','Maximum credits','Scheduling notes','Course note'],...plan.flatMap((keys,i)=>keys.map(k=>{const c=byKey.get(k);return[yearName(state.semesters[i].year),state.semesters[i].term,c.label,c.name,c.min,c.max,conflicts(c,plan,courses).join('; '),state.notes[k]||''];}))];const csv=rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='purdue-ee-plan-2025-26.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Your curriculum plan has been exported');};
render();
