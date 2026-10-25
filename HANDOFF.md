# LODESTAR handoff (2026-10-25)

Written when the project moved from claude.ai project threads to Claude Code. Rules and build commands are in
`CLAUDE.md`; this file is the state of play.

## Where things stand

- **Dashboard z89** (dev build) in this folder, paired with layout stamps dept 2 / master 2 / roster 2 / ops 2.
- **Real data loaded** (z84, 2026-10-25) from `input/LODESTAR_Data_Input.xlsx` into all 8 Excel files, with empty plans.
  The demo set is in `_archive/Demo files (before real data 2026-10-25)/`.
- Files are year-less (`Flight_Ops_Planner_SUP2.xlsx`, not `_2026`); the year lives in `Dashboard!A5`.
- Scope: SUP 2 only for new changes. SUP 1 / TACCO / Loadmaster / Pilot are on the older layout (no Jan next year, no
  syllabus) until Brandon says scale up.
- Dev mode stays on (red DEV badge, "Open every file (dev)", Master Planner editable in dev). No release build for Brandon.
- Brandon still has to upload the current set to SharePoint "Program" (dashboard + 8 xlsx) and test there.

## What was built (short history)

Full detail per feature is in `PROJECT_CHECKLIST.md`. Version tags `zNN` are dashboard builds.

- Department planners: AM/PM/NIGHT grid, MASTER rows (folded chips), ground programme row, coverage warnings, cell notes,
  totals, crew rest warning (5 flying days in a row, z16), Block of days (z18), Find, Today, undo/redo, My schedule.
- Roster: callsign, name, initials, Cat Status, role, status; SANS / NSmen section; Personnel Info sheet (not shown).
- Down-chit / up-chit from MC cells and Medical Chits sheet (z19, z22).
- Master Planner: Flights list, Day Status, Flight Codes (mission type, crew tags, syllabus tag), Ground Programme,
  Master Planning tab, Requests inbox (z37), copy flights into dept files.
- Duty Planner: BDO + SDO calendars in Duty_Roster, copy duty days into dept files.
- Ops Room (z54 redesign): table + timeline, duty strip, seats (6), tails 710-718 + standby tail (z27), MC/CRMO, brief
  time, ATD/ATA, Flown / Cancelled with reason (z17), Ops Add (z23), standby P1/P2/BU block and sets (z63, z65),
  planned extra crew (z78), syllabus tag only (z77, privacy rule: no results in the Ops Room).
- Currency rules and badges (built, whole section ON HOLD).
- Syllabus Tracking (SUP 2 only, inside the dept file): tree, cell-picker link (Planned/Pass/Fail), forecasting, tags,
  real SUP 2 syllabus 47 items (z72-z80; compact picker was reverted to list style in z80).
- Autosave 2.5 s, SharePoint merge on save, live refresh 15 s, self-heal, Change Log sheet + Changes tab (z68, z69, z82).
- Year rollover "Start new year…" (z67) and Jan (next year) look-ahead tab (z83).
- Version check banner (z18), dev mode + release build (z70), real data load (z84), dev mode edits Master Planner and
  Duty Roster properly (z85), z86 latest fixes, z87 Redo button now enabled after an Undo (the buttons were not refreshed by `undo()`), z88 author mark "Built by MARTELL", z89 Block of days with "Replace cells" now drops the replaced flight's Planned syllabus entry (it used to leave it behind).

## Open items (from PROJECT_CHECKLIST.md)

Waiting on Brandon:
- Upload current set to SharePoint and test there (SharePoint running is only tested against a mock).
- Excel Online test results for the `SharePoint tests/` variants (now in `_archive/Cleanup 2026-10-25/`).
- Compact layout check at 1920x1200 / 150%.
- Syllabus tracker: his test; Pilot and Loadmaster syllabus lists to send.
- My Lodestar (individual dashboard) mock-up `_archive/Cleanup 2026-10-25/previews/My_Lodestar_mockup.png`: awaiting
  feedback, nothing built. First question there is identity (SharePoint current user -> roster callsign).
- Ops Room P1/P2 alert windows mock-up: awaiting "build it".
- Scale-up go-ahead (brings the other 4 departments to the SUP 2 layout incl. Jan next year and syllabus).

Not started:
- Data migration from an old-layout file into a new template (needed before any layout change once real planning starts).
- Backups: confirm SharePoint version history is on.
- Handover note for whoever maintains the files after Brandon (this file is a start).
- Trial run: SUP 2 uses it for one month, then feedback.
- Nice-to-haves: birthday/ORD/posting reminders, passport expiry vs overseas exercise, readiness score.
- Add 2028 to `SG_HOLS` (dashboard) and the builder's holiday list before the 2027 -> 2028 rollover.

On hold (Brandon parked them, don't start): qualifications per person, ground qualification expiries, who may see
Personnel Info, the Currency section, squadron dashboard page, user guides, what-changed-before-save list, keyboard
shortcuts in the Planner, hours/sorties chart.

## Presentation material

- CO reveal deck master: `deck/LODESTAR.pptx` (Brandon's edited copy; it's a product reveal, not a trial request).
- claude.ai artifacts (Brandon can open them; Claude Code can't edit them): proposal doc
  https://claude.ai/artifact/J3MQrRZ7xS28vaXU4KHPAa, CO deck https://claude.ai/artifact/35fbi1UGkRErxGPoziNrnf,
  senior staff / management deck https://claude.ai/artifact/9aoQAK3XRc6hXL3sPhovfb, presentation prep checklist
  https://claude.ai/artifact/Nbw9N4zuZHFWNX8dPUcrSb. Management deck placeholders for Brandon: timings and missed
  changes (slide 10), second maintainer (12), go-live dates (13, 15).
- Slogan "One unified plan. One true north."; Compass Rose logo in `logo/final/`; 8 s intro in `logo/animated/`.

## Things that did not come across

- The Node/Playwright test suite and SharePoint mock (`web/` in an old cloud scratchpad) are gone. Rebuild what you need.
- `build8` / `build8_v17` named in old notes are `.build_planner.py` / `.build_planner_other_depts.py` here.
- The claude.ai project memory (decision history) is summarised in `CLAUDE.md`, this file and `PROJECT_CHECKLIST.md`.

## Data notes

- Callsign NIL = no callsign (known by name). "LM" crew tag maps to L.
- Mission types are TRG / OPS, so only the general flying currency rule is kept.
- Codes can contain spaces (e.g. `AWAY S (3H)`); the dashboard handles them in "+N more".
- Syllabus tags are whole-word, comma or slash separated.
- To reload changed input data: rerun the builders with `--data` into another folder. That wipes plans, so only do it
  before real planning starts or with a migration.
