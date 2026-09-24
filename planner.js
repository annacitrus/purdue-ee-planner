export function initialPlan(courses) { return Array.from({length:8}, (_, i) => courses.filter(c => c.semester === i).map(c => c.key)); }
export function validPlan(plan, courses) { return Array.isArray(plan) && plan.length === 8 && plan.every(Array.isArray) && plan.flat().length === courses.length && new Set(plan.flat()).size === courses.length && plan.flat().every(k => courses.some(c => c.key === k)); }
export function moveCourse(plan, key, semester, before = null) {
  if (!Number.isInteger(semester) || semester < 0 || semester >= plan.length || !plan.flat().includes(key) || before === key) return plan;
  const next = plan.map(s => s.filter(k => k !== key));
  const index = before ? next[semester].indexOf(before) : -1;
  next[semester].splice(index < 0 ? next[semester].length : index, 0, key);
  return next;
}
export function conflicts(course, plan, courses) {
  const position = id => { const c = courses.find(c => c.id === id); return c ? plan.findIndex(s => s.includes(c.key)) : -1; };
  const sem = plan.findIndex(s => s.includes(course.key));
  if (sem < 0) return [];
  const original = id => courses.find(c => c.id === id)?.semester;
  return [...course.pre.filter(id => position(id) < 0 || (original(id) === course.semester ? position(id) > sem : position(id) >= sem)).map(id => `${id}: check prerequisite order`), ...course.co.filter(id => position(id) < 0 || (original(id) < course.semester ? position(id) > sem : position(id) !== sem)).map(id => `${id}: check concurrent registration`)];
}
export const terms = ['Fall', 'Winter', 'Spring', 'Summer'];
export function initialState(courses) {
  return {plan:initialPlan(courses), semesters:Array.from({length:8}, (_,i)=>({year:Math.floor(i/2), term:i%2?'Spring':'Fall'})), notes:{}};
}
export function validState(state, courses) {
  if (!state || !Array.isArray(state.plan) || !Array.isArray(state.semesters) || !state.semesters.length || state.plan.length !== state.semesters.length || !state.plan.every(Array.isArray)) return false;
  const keys = state.plan.flat();
  if (new Set(keys).size !== keys.length || !keys.every(k=>courses.some(c=>c.key===k))) return false;
  const rank = s=>s.year*4+terms.indexOf(s.term);
  if (!state.semesters.every((s,i)=>s && Number.isInteger(s.year) && s.year>=0 && terms.includes(s.term) && (!i || rank(s)>rank(state.semesters[i-1])))) return false;
  return !!state.notes && typeof state.notes==='object' && !Array.isArray(state.notes) && Object.entries(state.notes).every(([k,v])=>keys.includes(k) && typeof v==='string');
}
export function addSemester(state, year, term) {
  if (!Number.isInteger(year) || year<0 || !terms.includes(term) || state.semesters.some(s=>s.year===year && s.term===term)) return state;
  const next=structuredClone(state), rank=year*4+terms.indexOf(term);
  let index=next.semesters.findIndex(s=>s.year*4+terms.indexOf(s.term)>rank);
  if(index<0) index=next.semesters.length;
  next.semesters.splice(index,0,{year,term}); next.plan.splice(index,0,[]);
  return next;
}
export function deleteCourse(state, key) {
  if(!state.plan.flat().includes(key)) return state;
  const next=structuredClone(state);
  next.plan=next.plan.map(keys=>keys.filter(k=>k!==key)); delete next.notes[key];
  return next;
}
export function setCourseNote(state, key, note) {
  if(!state.plan.flat().includes(key) || typeof note!=='string') return state;
  const next=structuredClone(state);
  if(note.trim()) next.notes[key]=note.trim(); else delete next.notes[key];
  return next;
}

// Expand the former combined requirement in saved plans without moving it.
export function splitAdvancedEEPlan(plan) {
  if (!Array.isArray(plan) || !plan.every(Array.isArray)) return plan;
  const replacements = ['course-38-selective-1', 'course-38-selective-2', 'course-38-lab-1', 'course-38-lab-2'];
  return plan.map(keys => keys.flatMap(key => key === 'course-38' ? replacements : [key]));
}
export function migrateAdvancedEEState(state) {
  if (!state || !Array.isArray(state.plan) || !state.plan.every(Array.isArray) || !state.plan.flat().includes('course-38')) return state;
  const next = structuredClone(state);
  next.plan = splitAdvancedEEPlan(next.plan);
  if (next.notes && Object.hasOwn(next.notes, 'course-38')) {
    next.notes['course-38-selective-1'] = next.notes['course-38'];
    delete next.notes['course-38'];
  }
  return next;
}
