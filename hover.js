// Use the map's requirements, extending downstream highlighting to electives.
export function courseHover(courseId, courses) {
  const byId = new Map(courses.map(course => [course.id.trim(), course]));
  const selected = byId.get(courseId);
  const hover = { prereq: [], immediate: [], coreq: [], postreq: [] };
  if (!selected) return hover;
  const ancestors = new Set();
  function prerequisites(id) {
    for (const pre of byId.get(id)?.pre || []) {
      if (ancestors.has(pre)) continue;
      ancestors.add(pre);
      prerequisites(pre);
    }
  }
  prerequisites(courseId);
  for (const id of selected.co) prerequisites(id);
  hover.prereq = [...ancestors];
  hover.immediate = [...selected.pre];
  hover.coreq = [...selected.co];
  const descendants = new Set();
  function postrequisites(id) {
    for (const next of byId.values()) {
      if (next.id === courseId || !(next.pre.includes(id) || next.co.includes(id)) || descendants.has(next.id)) continue;
      descendants.add(next.id);
      postrequisites(next.id);
    }
  }
  postrequisites(courseId);
  hover.postreq = [...descendants];
  return hover;
}
