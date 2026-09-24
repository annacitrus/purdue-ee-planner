const fs = require('node:fs');
const source = fs.readFileSync('source-page.html', 'utf8');
const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const courses = [];
for (const sem of source.matchAll(/<td id="sem(\d)"[^>]*>([\s\S]*?)<\/td>/g)) {
  for (const match of sem[2].matchAll(/<div class="(course|elective)"([^>]+)>/g)) {
    const a = Object.fromEntries([...match[2].matchAll(/data-([\w-]+)="([^"]*)"/g)].map(m => [m[1], decode(m[2])]));
    courses.push({ key: `course-${courses.length}`, id: a.id.trim(), name: a.name, label: a.label, min: +a['credits-min'], max: +a['credits-max'], pre: a.pre.split(' ').filter(Boolean), co: a.co.split(' ').filter(Boolean), description: a.content, url: a.url || '', semester: +sem[1]-1, elective: match[1] === 'elective' });
  }
}
fs.writeFileSync('courses.js', `// Course data from Purdue's 2025–26 Electrical Engineering curriculum map.\nexport const courses = ${JSON.stringify(courses, null, 2)};\n`);
console.log(`Extracted ${courses.length} courses across 8 semesters.`);
