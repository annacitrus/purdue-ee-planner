# Electrical Engineering Curriculum Planner

A responsive, Purdue-styled planner using the 41 course and elective blocks from the [2025–26 Purdue EE curriculum map](https://engineering.purdue.edu/Engr/Academics/Undergraduate/majors/2025-26/majors/EE_curriculum_map).

## Run

Open `index.html` directly, or run `npm start` (or `npm.cmd start` in Windows PowerShell), then open http://localhost:3000. No dependencies or installation are required. Run `npm test` for the planning logic checks. After editing JavaScript source files, run `npm run build` to regenerate the browser bundle; starting the server through npm does this automatically.

Drag cards between semesters or onto another card to reorder them. Click a card for details, prerequisites, and a keyboard/touch-accessible semester selector. Open course details to delete a course or save a note identifying an intended selective/elective. Notes appear on cards and in CSV exports. Add semesters to an academic year (including extra years); terms sort Fall, Winter, Spring, Summer. Course counts and credits reflect the current plan. Plans save in browser local storage, including added semesters and notes, and older saved plans migrate automatically. Undo, reset, and CSV export are included.

The source map supplies credit ranges rather than fixed values for some requirements. The planner retains those ranges. Scheduling checks use only the prerequisite/concurrent relationships listed in that map; they do not validate course availability, substitutions, or all graduation requirements. The source's earlier-semester concurrent relationships are preserved. This is an independent, unofficial planning tool.

`source-page.html` is the downloaded source snapshot; `node scripts/extract.cjs` regenerates `courses.js` from it. Fonts use Google Fonts with local fallbacks; all functionality works without external libraries.
