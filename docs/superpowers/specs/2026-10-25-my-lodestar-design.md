# My Lodestar: design (2026-10-25)

Status: design agreed in chat with Brandon; mock-up and "build it" still to come. Nothing is built.

## Purpose
A read-only personal page. Opened by a crew member, it shows **their next 7 days as an Outlook-style agenda**, plus their
currency status and (SUP 2) syllabus progress. It replaces picking yourself in My schedule for day-to-day use. My schedule
stays as the "look up anyone, any month" view.

## Decisions (Brandon, 2026-10-25)
- Main view: the next 7 days starting today, as an agenda list (one row per day, items in time order, like Outlook's Agenda view).
  Not a time-axis week grid, not a fixed Monday-Sunday week.
- Identity: match the SharePoint sign-in name to the roster. Brandon says the sign-in name uses the same words as the roster name.
- Page contents: schedule plus status (currency, syllabus progress). Read-only; no requests or other actions in this version.
- Scope: SUP 2 layout only for the syllabus part (rule 5 in CLAUDE.md). The agenda itself works for any open department file.
- Never show Personnel Info (NRIC, passport, address and so on).

## Who am I
1. `SP.user.Title` (already read by `logWhoAmI`) is compared with the roster names of every open department file.
   Normalise: lower-case, drop rank tokens (MAJ, CPT, LTA, ME2, ME3 and so on), ignore word order and punctuation.
   Accept only exactly one match across all open files.
2. Zero or several matches, or no sign-in name (offline, own PC): show a "Who are you?" list built like `mePeople()`.
3. A pick is remembered in the browser with the existing `spRemember` / `spRecall` helpers. A small "Not me" link clears it.
4. No Excel file changes, so no layout stamp bump and no migration.

## Page
- Header: name, callsign, role, Cat status, department.
- **Next 7 days:** a row per day, starting today (today highlighted), crossing month ends and into the Jan (next year) tab when the file has it.
  Each day lists, in time order where times exist:
  - flights with the planned time from the Master rows (brief / ETD), marked cancelled when the Ops Room says so;
  - duties (BDO, SDO) and squadron duties;
  - ground programme for the day (department and squadron lines);
  - leave, MC and other away codes; a DOWN-CHIT warning;
  - the cell comment.
  An empty day says "Free".
- **Currency:** this person's row from the Currency calculation (OK / due / lapsed per rule) plus the crew-rest warning.
- **Syllabus (SUP 2):** stage, progress ("5 of 14"), next planned item.
- At 1280x720 the agenda and the two side cards fit without page scroll for a normal week.

## How it is built
- New "My Lodestar" tab in the main nav, before My schedule.
- Reuse, do not duplicate: `mePeople`, the per-day logic inside `renderMe` (move it into a function that takes a person and a date range),
  `plannedFlights`, `cxlOf`, `deptGround`, `computeChit`, and the existing currency and syllabus calculations.
- Read-only: it never calls `put()`, so no saves and no undo steps.
- Dashboard version bump only. Dev mode first. Any dev-only code inside the DEV markers.

## Edge cases
- Window runs past the last day the file knows (December in a file without Jan next year): the missing days say "Not in this file yet".
- Master Planner or Duty Roster not open: show what the department file has; say which parts are missing.
- Person on the roster in more than one file: the match is ambiguous, so use the list.
- Inactive crew: still matched (they may still need to look).

## Testing
- Chromium with the demo files; fake today with `window.OPS_TODAY` / `CUR_TODAY`.
- Fake `SP.user.Title`: exact match with rank, without rank, reordered words, no match, two people with the same words.
- Windows across a month end, across 31 Dec with and without Jan (next year), and an empty week.
- Check no `put()` call and no dirty cells after opening the page.

## Next steps
1. Brandon reviews this spec.
2. 1280x720 mock-up in `previews/` (HTML + PNG) for "build it".
3. Implementation plan, then build, in dev mode.
