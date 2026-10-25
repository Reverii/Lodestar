# My Lodestar: design (2026-10-25, revised after Brandon's mock-up picture)

Status: design agreed in chat; revised mock-up awaiting "build it". Nothing is built.

## Purpose
A personal home page. A crew member opens the dashboard and sees, for themselves: how today looks, what the next week
holds, whether they are fit and current, what changed since they last looked, and how the month is going.
It is the first tab. It replaces the **My schedule** tab, which is removed because My Lodestar does the same job.

## Decisions (Brandon, 2026-10-25)
- Layout follows his picture: greeting, four status cards, Today panel, Next 7 days table, What changed, month summary.
- **No "Add my week to Outlook" button** (.ics stays "not required").
- **No Passport card.** Nothing from Personnel Info appears on this page (access to Personnel Info is still on hold).
- **My schedule tab is removed.** Looking up another person is done with **View as** on My Lodestar.
- Identity: match the SharePoint sign-in name to the roster; the name uses the same words as the roster name.
- Read-only. SUP 2 layout only for the syllabus card (rule 5); the rest works for any open department file.

## Who am I, and View as
1. Compare `SP.user.Title` (read by `logWhoAmI`) with roster names in every open department file: lower-case, drop rank
   tokens, ignore word order and punctuation. Accept exactly one match.
2. No match, several matches, or no sign-in name (offline): show a "Who are you?" list (built like `mePeople()`).
3. The pick is remembered in the browser (`spRemember` / `spRecall`).
4. The chip at top right shows the person and where it came from ("signed in via SharePoint" or "picked"). Clicking it opens
   **View as**: pick anyone and the whole page shows that person, with a banner "Viewing HAWK, not you" and a "Back to me" link.
5. No Excel changes, so no layout stamp bump and no migration.

## Page (1280x720, no page scroll for a normal week)
- **Greeting:** "Good morning, <callsign>" with the focus date; Prev day / Next day move the focus day (default today).
- **Four cards:**
  - Medical: Fit to fly, or Down-chit since <date> (from the down-chit logic, `computeChit`).
  - Crew rest: flying days in a row with the existing crew-rest rule (5 in a row is flagged).
  - Currency: the soonest due or lapsed rule, and "x of y rules current" (existing Currency calculation).
  - Syllabus (SUP 2): the next syllabus item, planned or recorded, and "n of m passed".
- **Today (the focus day):** the flight (shift, status Planned / Flown / Cancelled, code and description, tail and sortie,
  brief, ETD, ETA, area, who is flying with you by seat) taken from the Master Planner and the Ops Room; standby (P1 / P2 / BU);
  ground programme and other items; duty (BDO / SDO) and the next duty day.
- **Next 7 days:** the 7 days after the focus day, one row per day, columns AM / PM / NIGHT, flights with planned times,
  duties, ground items and leave; days off greyed; a month label where the month changes.
- **What changed:** items since this person last opened My Lodestar (remembered in the browser). Count badge for new ones.
  Sources are the Change Log sheets of the open files, filtered to what touches this person:
  their own cells, a flight they are planned on being cancelled / moved / added, and duty days given to their department.
  First visit shows the last 7 days.
- **Month so far:** flights (and cancelled), hours flown against hours planned (Ops Room ATD to ATA), ground duty days,
  SDO / BDO days, leave days, syllabus passed this month. Same numbers as the existing month statistics.

## How it is built
- New "My Lodestar" tab, first in the nav; "My schedule" tab and its view code removed (`renderMe`, `#v-me`); the useful
  per-day logic is moved into shared functions that take a person and a date.
- Reuse: `mePeople`, `plannedFlights`, `cxlOf`, `deptGround`, `computeChit`, the currency and crew-rest functions,
  `monthStats`, the syllabus progress code, and the Ops Room day data used by the Ops Room tab.
- Read-only: never calls `put()`, so no saves and no undo steps. The only thing stored is the browser memory
  (who I am, last visit time).
- Dashboard version bump. Dev mode first. Dev-only code inside the DEV markers.

## Open risks
- **What changed** is the least certain part: the Change Logs record cell edits per file, so "a flight I am on was moved"
  has to be worked out from Master Planner and Ops Room log entries plus the plan. First build covers own-cell edits,
  cancellations, and Master Planner changes on flights the person is planned on; anything else is a follow-up.
- Header and tab strip in the picture differ from today's dashboard (logo tagline, a shorter tab list). This design only
  adds My Lodestar and removes My schedule; it does not trim the other tabs.

## Edge cases
- Focus day or window beyond what the file knows (December without Jan next year): "Not in this file yet".
- Master Planner, Duty Roster or Ops Room not open: show what is available and name what is missing.
- Person on more than one roster: ambiguous, so show the list.
- Inactive crew can still be matched.
- Day with no flight: the Today panel shows the ground, standby and duty items, or "Nothing planned".

## Testing
- Chromium with the demo files; fake today with `window.OPS_TODAY` / `CUR_TODAY`; fake `SP.user.Title`.
- Matching: with rank, without rank, reordered words, no match, two people with the same words.
- Windows across a month end and across 31 Dec with and without Jan (next year); a flying day, a duty day, a leave day,
  a down-chit, a cancelled flight.
- What changed: saves in a test copy, then reopen and check the entries and the badge.
- My schedule tab is gone and nothing else references it; no `put()` and no dirty cells after opening the page.

## Next steps
1. Brandon confirms the revised mock-up and says "build it".
2. Implementation plan, then build in dev mode.
