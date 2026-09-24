import { test } from 'node:test';
import assert from 'node:assert/strict';
import { courses } from './courses.js';
import { initialPlan, validPlan, moveCourse, conflicts } from './planner.js';
test('Purdue baseline contains all 44 unique course blocks and no scheduling conflicts',()=>{
 const plan=initialPlan(courses);assert.equal(courses.length,44);assert.ok(validPlan(plan,courses));assert.deepEqual(courses.flatMap(c=>conflicts(c,plan,courses)),[]);
});
test('moving and reordering retain each course exactly once without changing source',()=>{
 const plan=initialPlan(courses),key=plan[0][0],before=plan[3][1];
 const moved=moveCourse(plan,key,3,before);assert.ok(validPlan(moved,courses));assert.equal(moved[3][1],key);assert.ok(plan[0].includes(key));assert.ok(!moved[0].includes(key));
 const reordered=moveCourse(moved,key,3,moved[3][0]);assert.equal(reordered[3][0],key);assert.ok(validPlan(reordered,courses));
});
test('moving a prerequisite late flags affected downstream courses',()=>{
 const plan=initialPlan(courses),calc=courses.find(c=>c.id==='Calculus-1'),next=courses.find(c=>c.id==='Calculus-2');
 assert.ok(conflicts(next,moveCourse(plan,calc.key,7),courses).length);
 assert.ok(conflicts(next,moveCourse(plan,calc.key,1),courses).length);
});
test('separating a lab and its concurrent lecture flags the lab',()=>{
 const lecture=courses.find(c=>c.id==='ECE20001'),lab=courses.find(c=>c.id==='ECE20007');
 assert.ok(conflicts(lab,moveCourse(initialPlan(courses),lecture.key,4),courses).length);
});
test('corrupt stored plans and unknown keys are rejected',()=>{
 const plan=initialPlan(courses);assert.equal(validPlan([[]],courses),false);const bad=structuredClone(plan);bad[0][0]=bad[0][1];assert.equal(validPlan(bad,courses),false);assert.deepEqual(moveCourse(plan,'unknown',0),plan);
});
import { initialState, validState, addSemester, deleteCourse, setCourseNote } from './planner.js';

test('new terms sort within academic years without moving courses to a different term',()=>{
 const original=initialState(courses);
 let state=addSemester(original,0,'Summer');state=addSemester(state,0,'Winter');
 assert.deepEqual(state.semesters.slice(0,4).map(s=>s.term),['Fall','Winter','Spring','Summer']);
 assert.deepEqual(state.plan[2],original.plan[1]);assert.deepEqual(state.plan[1],[]);
 assert.equal(state.plan.length,10);assert.ok(validState(state,courses));
 assert.equal(addSemester(state,0,'Winter'),state);
 assert.equal(original.plan.length,8);
 state=addSemester(state,4,'Fall');
 const moved=moveCourse(state.plan,state.plan[0][0],10);
 assert.equal(moved[10].length,1);assert.ok(validState({...state,plan:moved},courses));
});
test('deleting a prerequisite updates warnings and removes its note without changing undo snapshot',()=>{
 const calc=courses.find(c=>c.id==='Calculus-1'), next=courses.find(c=>c.id==='Calculus-2');
 const original=setCourseNote(initialState(courses),calc.key,'Intended course');
 const deleted=deleteCourse(original,calc.key);
 assert.equal(deleted.plan.flat().length,43);assert.equal(deleted.notes[calc.key],undefined);
 assert.equal(original.notes[calc.key],'Intended course');assert.equal(original.plan.flat().length,44);
 assert.ok(conflicts(next,deleted.plan,courses).length);assert.deepEqual(conflicts(calc,deleted.plan,courses),[]);
 assert.ok(validState(deleted,courses));
});
test('notes persist through semester insertion, moves, and serialization and can be cleared',()=>{
 let state=initialState(courses);const key=state.plan[0][0];
 state=setCourseNote(state,key,'  ECE 404, "Security"\nBackup: <course>  ');
 state=addSemester(state,1,'Summer');state={...state,plan:moveCourse(state.plan,key,4)};
 const saved=JSON.parse(JSON.stringify(state));assert.ok(validState(saved,courses));
 assert.equal(saved.notes[key],'ECE 404, "Security"\nBackup: <course>');
 assert.equal(setCourseNote(saved,key,' ').notes[key],undefined);
});
test('state validation rejects invalid terms, duplicate semesters and corrupt notes',()=>{
 const state=initialState(courses);
 for(const mutate of [s=>s.semesters[0].term='Autumn',s=>s.semesters[1]={...s.semesters[0]},s=>s.notes.unknown='note',s=>s.notes[s.plan[0][0]]=42,s=>s.plan[0].push(s.plan[0][0])]){
  const bad=structuredClone(state);mutate(bad);assert.equal(validState(bad,courses),false);
 }
 const empty={...state,plan:state.plan.map(()=>[])};assert.ok(validState(empty,courses));
});

import { splitAdvancedEEPlan, migrateAdvancedEEState } from './planner.js';
test('combined advanced EE requirement migrates in place with its note and eight credits',()=>{
 const state=initialState(courses);
 const parts=courses.filter(c=>c.key.startsWith('course-38-'));
 assert.deepEqual(parts.map(c=>c.min),[3,3,1,1]);
 assert.equal(parts.reduce((sum,c)=>sum+c.max,0),8);
 state.plan=state.plan.map(keys=>keys.filter(k=>!parts.some(c=>c.key===k)));
 state.plan[2].splice(1,0,'course-38');state.notes['course-38']='My choices';
 const migrated=migrateAdvancedEEState(state);
 assert.ok(validState(migrated,courses));
 assert.deepEqual(migrated.plan[2].slice(1,5),parts.map(c=>c.key));
 assert.equal(migrated.notes[parts[0].key],'My choices');
 assert.equal(state.notes['course-38'],'My choices');
 assert.deepEqual(migrateAdvancedEEState(migrated),migrated);
 assert.deepEqual(splitAdvancedEEPlan(state.plan),migrated.plan);
 const deleted={...state,plan:state.plan.map(keys=>keys.filter(k=>k!=='course-38')),notes:{}};
 assert.deepEqual(migrateAdvancedEEState(deleted),deleted);
});
