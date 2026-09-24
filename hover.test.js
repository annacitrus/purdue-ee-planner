import test from 'node:test';
import assert from 'node:assert/strict';
import { courses } from './courses.js';
import { courseHover } from './hover.js';

test('lecture preview includes prerequisites of its direct concurrent course', () => {
  const hover = courseHover('ECE20002', courses);
  assert.deepEqual(new Set(hover.prereq), new Set(['Intro-1','Calculus-1','Calculus-2','Physics','ECE20001','MA261']));
  assert.deepEqual(hover.immediate, ['ECE20001']);
  assert.deepEqual(hover.coreq, ['MA266']);
  assert.deepEqual(new Set(hover.postreq), new Set(['ECE20008','ECE301','ECE302','ECE49022']));
});

test('lab preview follows concurrent prerequisites without following concurrent courses recursively', () => {
  const hover = courseHover('ECE20008', courses);
  assert.deepEqual(new Set(hover.prereq), new Set(['Intro-1','Calculus-1','Calculus-2','Physics','ECE20001','ECE20007']));
  assert.deepEqual(hover.immediate, ['ECE20007']);
  assert.deepEqual(hover.coreq, ['ECE20002']);
  assert.deepEqual(hover.postreq, ['ECE49022']);
});

test('electives highlight their full downstream chain while retaining overlapping Physics classes', () => {
  assert.deepEqual(new Set(courseHover('Calculus-1', courses).postreq), new Set([
    'Chemistry','Calculus-2','Physics','ECE20001','ECE20007','PHYS272','MA261',
    'ECE20002','ECE20008','ECE270','MA266','ECE301','ECE302','ECE30411','MA265','ECE49022'
  ]));
  const hover = courseHover('Physics', courses);
  for (const cls of ['prereq','immediate','coreq']) assert.deepEqual(hover[cls], ['Calculus-1']);
  assert.deepEqual(new Set(hover.postreq), new Set(['ECE20001','ECE20007','PHYS272','ECE20002','ECE20008','ECE270','ECE301','ECE302','ECE30411','ECE49022']));
  assert.deepEqual(new Set(courseHover('ENGR/Selective', courses).postreq), new Set(['ECE20875','ECE264']));
});

test('reverse traversal includes concurrent edges and all downstream courses', () => {
  assert.deepEqual(new Set(courseHover('MA261', courses).postreq), new Set(['ECE20001','ECE20007','ECE20002','ECE20008','ECE270','MA266','ECE301','ECE302','ECE30411','ECE49022']));
  assert.deepEqual(courseHover('GE', courses), {prereq:[], immediate:[], coreq:[], postreq:[]});
});
