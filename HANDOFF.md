# LODESTAR handoff (2026-10-25)

Written when the project moved from claude.ai project threads to Claude Code. Rules and build commands are in
`CLAUDE.md`; this file is the state of play.

## Next session: start here (handoff of 30 Oct 2026)

**State:** everything is merged on `main` (repo Reverii/Lodestar, still public; GitHub Pro is now on, deciding about making it private is an open item). Dashboard **z100** (dev build). Pages publishes the dashboard at `/` and the briefing at `/briefing/` (the briefing has no ATOM screenshot; the workflow refuses to publish if `atom.webp` returns). Live SharePoint files hold dummy data.
Built and merged since the last handoff: Ops Room redesign (z97), built-in sample fix (z98), Master Planner time ranges (z99), department selector revamp (z100).

**Do next, in this order** (full notes in `PROJECT_CHECKLIST.md` section 9):
1. **Other departments open by themselves + View only.** Spec `docs/superpowers/specs/2026-10-30-other-departments-design.md`, plan `docs/superpowers/plans/2026-10-30-other-departments.md` are written and reviewed by Brandon's plan; Brandon said go. Use native execution. Brandon's SharePoint: only planners and the Master Planner can edit; everyone can read every file.
2. **AC and Pax tags in the planner** (item 5; all questions settled: AC tag only, every other pilot is a co-pilot, two ACs allowed on a formation, Pax counts nowhere). Needs its own spec and plan first.
3. **Fourth row per member** (item 1; dummy data, so rebuild the files fresh, no migration).

**Not to do:** the request function is **omitted** (SharePoint lists do not work on the squadron site). The **full PDF guide** (Planners, Master Planner, Ops Room; audience the users) is **not to be generated until Brandon says so**.

**Brandon's pending tests on the real SharePoint:** the department selector (does the "by <name>" line show, does the 15-second refresh work, is a week the right red-dot threshold), the Ops Room redesign on the projector, the Master Planner time ranges.

**How to work with Brandon right now:** he is near his weekly usage cap, so keep sessions short: one feature per session, text answers, screenshots only when words will not do, no full ATOM test run unless ATOM code changes (`node tests/atom.test.js` takes minutes). He says "build it" after a mock-up, "go, native" for execution, and "merge to main and push" when he wants a merge. Never overwrite live `.xlsx` files.

**Starting prompt for a new session:** "Read `/home/user/Lodestar/CLAUDE.md`, then `HANDOFF.md` (the section 'Next session: start here') and `PROJECT_CHECKLIST.md` section 9. Start a new branch from main and build the other-departments change from the spec and plan listed there, native execution."

## Where things stand

- **Dashboard z100** (dev build) in this folder, paired with layout stamps dept 2 / master 2 / roster 2 / ops 2.
- **Real data loaded** (z84, 2026-10-25) from `input/LODESTAR_Data_Input.xlsx` into all 8 Excel files, with empty plans.
  The demo set is in `_archive/Demo files (before real data 2026-10-25)/`.
- Files are year-less (`Flight_Ops_Planner_SUP2.xlsx`, not `_2026`); the year lives in `Dashboard!A5`.
- Scope: scaled up 2026-10-26 (z91). All five department files use the SUP 2 template (Jan next year, Syllabus sheets with placeholder
  items for SUP 1 / TACCO / Loadmaster / Pilot). Demo files rebuilt; no real plans existed to migrate.
- Dev mode stays on (red DEV badge, "Open every file (dev)", Master Planner editable in dev). No release build for Brandon.
- Brandon still has to upload the current set to SharePoint "Program" (dashboard + 8 xlsx) and test there.

## ATOM currency (v2, z94, built 2026-10-26; spec `docs/superpowers/specs/2026-10-26-atom-currency-v2-design.md`, plan `docs/superpowers/plans/2026-10-26-atom-currency-v2.md`)

- ATOM is the truth. The Ops Room adds the ATOM export once a day (Currency tab, "Add ATOM export", then "Publish to everyone" in the Ops Room view);
  that writes a dashboard-created sheet **`ATOM Currency`** in `Ops_Room.xlsx` (Initials, department, CAT, Day Capt, Day Curr, IRT, Night Capt, Night Curr,
  clocked hours for the month, plus as-of / source / published-by lines), replacing yesterday's. Department dashboards open the Ops Room file read-only in the
  background and read it. A file added by hand still works (session only, labelled "File added by you"). Only the five currencies and the hours are read; nothing else
  from the export is stored; no names.
- Matching is by exact roster Initials (case and spaces ignored); the Names to fix panel lists what does not match.
- Planner: layer 1 marks the day a Day / Night currency expires (Capt as a lighter outline), layer 2 gives a red corner "NOT CURRENT" on a flight on or after it.
  No tint after the expiry day, no name badges. The (Ops Room seat "CURR" marks were removed on 27 Oct: the Ops Room shows no currency.) Warnings only.
- Hours: Planner "Flown Hrs" and My Lodestar show ATOM's clocked hours for the export's month.
- IRT (Brandon, 27 Oct): in the Planner the day it expires is only highlighted in all three rows; it never alerts.
- **Open:** the general flying rules (45 / 90 / 180) are still the
  three sample rules; real unsanitised exports from another generator have not been tried; roster Initials must be filled to match ATOM.
- Removed from v1: the "What each flight needs" table and its `ATOM Needs` sheet, mission / LSS handling, the name badges.
- Tests: `node tests/atom.test.js` (synthetic exports only; several minutes), `node tests/my_lodestar.test.js`. Dummy-name test set from real Initials:
  `tests/make_atom_demo_input.py` (output goes to the git-ignored `atom_test/`).

## Briefing page (added 2026-10-28)

- `briefing/index.html` (scroll-snap web briefing, 19 slides, assets in `briefing/assets/`). Brandon supplied it as a zip; the ATOM screenshot (real currency dates from the sanitised export) was left out and slide 15 now shows the three cards only. The Pages workflow publishes it at `/briefing/` beside the dashboard and refuses to publish if `atom.webp` comes back.

## Department selector (z100, 2026-10-28; spec `docs/superpowers/specs/2026-10-28-department-selector-design.md`, plan `docs/superpowers/plans/2026-10-28-department-selector.md`, mock-up `docs/superpowers/mockups/dept-select-v2/`)

- The SharePoint start screen "Which department are you from?" is rebuilt: the Compass Rose hero, a status line ("Connected to Program · 8 files · checked 14:32, refreshes every 15 seconds"), a wide light-blue Ops Room card, and one grid of cards
  (SUP 1, SUP 2, TACCO, Loadmaster, Pilot, Duty Planner, Master Planner, then "Show all files in the folder"). Each card shows when its file last changed (green today, amber 1 to 6 days, red a week or more), who changed it and the file name;
  the department opened last is highlighted ("You opened this last"); a missing file is a grey card that cannot be clicked. The screen checks the folder every 15 seconds while it is open.
- Clicking a card opens exactly what it opened before. The file picker ("Show all files…") keeps its narrow box. No Excel change.
- "Who changed it" asks SharePoint for `ModifiedBy`; if the site refuses, the plain list is used and the "by" line is left off. **To test on the real SharePoint:** whether the name appears, the 15-second refresh, the last-used highlight.
  Tests without SharePoint: `node tests/dept_select.test.js` (stubs the file list; fake clock `window.SP_NOW`).
- Open items: the 7-day red threshold is a guess; the editor name is shown as SharePoint gives it.

## Ops Room redesign (z97, 2026-10-27; spec `docs/superpowers/specs/2026-10-27-ops-room-redesign-design.md`, plan `docs/superpowers/plans/2026-10-27-ops-room-redesign.md`, mock-up `docs/superpowers/mockups/ops-room-v5/`)

- The Ops Room page keeps today's screen and is calmer: the side cards moved to a bottom row (Ground programme by AM / PM / NIGHT with "until <date>" for multi-day items,
  Leave and MC by department, Down-chit, Remarks); Codes is a Day Board card next to DOB; Area (Oscar / Echo / Nov) shows only when filled (`+ Area` in the Ops Room view to type one);
  chips "Seats filled" and "Down-chit" and the Timeline view are gone.
- Names: Cat colour on every callsign (A black, B green, C yellow, D red, OCU pink), SANS / NSMEN in a green box; the standby rows (P1, P2, BU) are as big as a flight row.
- Clock and a light / dark switch in the bar (remembered on this computer). Default size 100% (steps 70 to 200%); the page shrinks to fit the screen width and height, smallest 50%.
- **On hold:** a scale control for the whole dashboard (Brandon, 2026-10-27).
- **Closed 2026-10-28 (Brandon):** the Ops Room item is done as shipped. The Timeline view, the empty-seats filter, the Down-chit chip jump and the leave comments on the old Movement card are not being restored.
- z99: Master Planner calendar chips show the full time range (0830H-1000H): the end is the start plus the flight code's hours (or the typed end); only a start shows 0830H. Test: `node tests/master_calendar.test.js`.
- z98: "Try with the built-in sample" now also embeds `Ops_Room.xlsx` and opens everything editable, so seats can be picked in the Ops Room view of the sample (it was read-only before: the sample never had an Ops Room file). The assembler gets it through `.lodestar_build.py` (`others`).
- No Excel change: upload the dev dashboard only. Tests: `node tests/ops_room.test.js`. To tune on the real projector: default size, dark theme, the bottom cards.

## Master Planner export and Planner crew filter (z95, 2026-10-27)

- **Export…** on the Master Planner view: a clean Excel copy for an outside office (Calendar sheet, List sheet, or both). Period, tick flight codes to
  include (unticked codes leave the rows and totals; remembered in the browser). Flights and planned hours only: no crew, names or comments. No-flying days show
  their reason in the calendar. Built in the browser (`xlsxBuild`, `mpExportData`, `mpExportBytes`). Tests: `node tests/mp_export.test.js`.
- Planner crew filter: status chips Active / SANS / NSMEN / Inactive beside the filter box (everyone shown by default, remembered per department).
  Tests: `node tests/planner_filter.test.js`.

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
- **My Lodestar (z90)**: the first tab, a read-only personal home page: greeting, four cards (medical, crew rest, currency,
  syllabus), Today (flight with tail, brief, ETD/ETA, area and crew from the Ops Room; standby; ground; duty), Next 7 days by
  AM / PM / NIGHT, What changed (own edits, cancelled flights, Master Planner moves, new duty days since the last visit) and the
  month so far. Who you are: SharePoint sign-in name matched to exactly one roster name (rank, case and word order ignored), else
  a remembered pick; View as shows anyone. The My schedule tab is gone. Spec `docs/superpowers/specs/2026-10-25-my-lodestar-design.md`,
  plan `docs/superpowers/plans/2026-10-25-my-lodestar.md`. Not built: Passport card and Outlook / .ics button (Brandon left both out).
- Version check banner (z18), dev mode + release build (z70), real data load (z84), dev mode edits Master Planner and
  Duty Roster properly (z85), z86 latest fixes, z87 Redo button now enabled after an Undo (the buttons were not refreshed by `undo()`), z88 author mark "Built by MARTELL", z89 Block of days with "Replace cells" now drops the replaced flight's Planned syllabus entry (it used to leave it behind).

## Open items (from PROJECT_CHECKLIST.md)

Waiting on Brandon:
- Upload current set to SharePoint and test there (SharePoint running is only tested against a mock).
- Excel Online test results for the `SharePoint tests/` variants (now in `_archive/Cleanup 2026-10-25/`).
- Compact layout check at 1920x1200 / 150%.
- Syllabus tracker: his test; Pilot and Loadmaster syllabus lists to send.
- Scale-up go-ahead (brings the other 4 departments to the SUP 2 layout incl. Jan next year and syllabus).

ATOM currency data (2026-10-26): spec `docs/superpowers/specs/2026-10-26-atom-currency-design.md` written (read ATOM Excel exports, status view then
planning check); waiting on Brandon to read it, then a mock-up and "build it". Takes the Currency work off hold.

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

- The old Node/Playwright test suite and SharePoint mock (`web/` in an old cloud scratchpad) are gone. A new `tests/` folder exists:
  `node tests/my_lodestar.test.js` (after `python3 .lodestar_build.py dashboard`) runs 56 checks for My Lodestar plus a regression
  pass (every tab opens, edit / undo / redo / save, Block of days). No SharePoint mock yet; rebuild one before touching save, merge or live refresh.
- `build8` / `build8_v17` named in old notes are `.build_planner.py` / `.build_planner_other_depts.py` here.
- The claude.ai project memory (decision history) is summarised in `CLAUDE.md`, this file and `PROJECT_CHECKLIST.md`.

## Data notes

- Start new year keeps the whole Syllabus Log, including old-year "Planned" entries (Brandon, 2026-10-25: kept). A flight planned late in December may still need its result recorded.

- Callsign NIL = no callsign (known by name). "LM" crew tag maps to L.
- Mission types are TRG / OPS, so only the general flying currency rule is kept.
- Codes can contain spaces (e.g. `AWAY S (3H)`); the dashboard handles them in "+N more".
- Syllabus tags are whole-word, comma or slash separated.
- To reload changed input data: rerun the builders with `--data` into another folder. That wipes plans, so only do it
  before real planning starts or with a migration.
