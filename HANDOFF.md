# LODESTAR handoff (updated 2026-11-01)

Written when the project moved from claude.ai project threads to Claude Code. Rules and build commands are in
`CLAUDE.md`; this file is the state of play.

## z114 (1 Nov, Brandon): flight card and MASTER lock
**Left click on a flight cell (AM / PM / NIGHT, not WD) opens a read-only card** (`#cellCard`, `openCard`, `cardCrew`): code, date, shift, description, the cell's tooltip text (MASTER programme, comment, syllabus, cancelled, crew rest), then **Crew on this flight** laid out like the Ops Room board (columns AC, Pilot, LM, TACCO, SUP 1, SUP 2, names in Cat colours, extra crew stacked, the clicked person highlighted, PAX badge). Crew comes from `opsCrewOn` (every open department file) filtered by code and shift, so it also works in view-only files. Esc, an outside click, right-click or a key press close it. **MASTER rows are locked in the Planner:** no picker, Delete, Backspace, Enter, typing or paste on a MASTER cell (toast "MASTER rows come from the Master Planner..."); selecting, arrows, Ctrl+C, fold and the `+` slot button still work; the "Copy flights and squadron events from the Master Planner" button (`#mpSync`) and Ops Add write through their own paths, so they still fill MASTER. Padlock in the MASTER label. Dashboard only (the lock is not in plain Excel); upload the DEV dashboard only. Tests: new `node tests/flight_card.test.js` (11, needs a layout-3 set via `LODE_FILES`), `wd_row` 19, `my_lodestar` 60. Mock-up and real screenshot are in `previews/` (git-ignored). Awaiting Brandon's test.

## z113 (1 Nov, Brandon): Planner cell picker is on right-click
**Right-click a Planner cell opens the picker** (`contextmenu` listener on `#plan`, next to the click handler). **Left click only selects** the cell (and closes an open picker). Enter and typing to search still open it; arrows, Delete, Ctrl+C / Ctrl+V unchanged. View-only files select but do not open the picker. The ground programme row still prompts on a normal click. The Ops Room seat pickers are unchanged. Keys tooltip and the Planner / Syllabus help texts now say "right-click". Dashboard only, no Excel change; upload the DEV dashboard only. Tests: `my_lodestar` 60 (one line right-clicks, version check z113), `wd_row` 19 (picker test sends `contextmenu`). **Open:** no on-screen hint for right-click yet (offer: a small hint next to the Keys label); a touch screen has no right-click (offer: long-press) if anyone uses one. Awaiting Brandon's test.

## z112 (31 Oct, Brandon): Ops Room ground programme is filled by hand
Brandon was not happy with the z111 auto-merge. **Now the board shows only squadron events (Master Planner) and the Ops Room's own rows.** The planners' ground items (Meeting, Outstation, WD items) no longer appear by themselves. **+ Ops row** opens the dialog with a read-only "From the department plans" list grouped by department (`opsDeptRef`, with planner cell comments), then Time (quick buttons AM / PM / NIGHT / WD and a TILL date picker), Activity, Location (all typed) and the crew tick boxes (nothing pre-ticked). A manual row with time `TILL 25 OCT` shows every day from the day it was added to that date (hide / pencil on a later day saves a per-day hide / edit). `1500H` now parses as a clock time. Old z111 edits on department rows (`dept|` ids) are ignored. **My Lodestar** keeps reading the planners' cells (Brandon, 31 Oct: that is fine); Ops Room rows do not show there, by design. Tests: `ops_room` 42, `wd_row` 19, `my_lodestar` 60, `ground_rows` 13. The z111 notes below describe the old merge; `opsGround` no longer does it.

## Next session: start here (handoff of 31 Oct 2026, after z111)

**State:** everything is merged on `main` (repo Reverii/Lodestar, still public; GitHub Pro is on, deciding about making it private is an open item). Dashboard **z114** (dev build; z112 ground programme by hand, z113 right-click picker and z114 flight card + MASTER lock are awaiting his test). Pages publishes the dashboard at `/` and the briefing at `/briefing/` (the briefing has no ATOM screenshot; the workflow refuses to publish if `atom.webp` returns). Live SharePoint files hold dummy data.
**z111 (merged to main, `e023072`): Ops Room ground programme rework.** Spec `docs/superpowers/specs/2026-10-31-ground-programme-rework-design.md`, plan `docs/superpowers/plans/2026-10-31-ground-programme-rework.md`, details in the z111 bullet below. In short: squadron events take crew `ALL` or tags and a blank crew is an error (red NO CREW in the Master Planner, red NO PERSONNEL in the Ops Room); the Ops Room ground table merges department items across departments and borrows time and location from a matching squadron event; the Ops Room can change, hide and add rows (`Ground Rows` sheet in the Ops Room file, no Excel layout change). Upload the DEV dashboard only. Tests: `ground_rows` 13, `ops_room` 48, `master_calendar` 8, `my_lodestar` 60 (all pass; `atom` not run, untouched).
Built since the 30 Oct handoff, all merged: other departments open by themselves + View only (z101), AC and Pax tags (z102), WD fourth row with zoom and crew divider (z103), Ops Room ground programme table (z104), Ops Room bottom strip fix (z105), Master Planner export reformat (z106, z107), tab changes (z108). Notes for each below.

**Next, in this order:**
1. Nothing is queued by Brandon. Wait for his SharePoint test results (list below, plus the ground programme rework: blank crews going red, the pencil, hide and + Ops row) and fix what he finds.
2. When he agrees: replace the repo's own `.xlsx` files and the built-in sample with layout-3 files (rebuild fresh, no migration; dummy data only), then rebuild the dashboard.
3. The full PDF guide only when Brandon says so.

**Known small gaps (deferred minors, only fix if Brandon hits them):** two squadron events with the same activity and shift share one Ops Room edit id; moving a squadron event's time into another shift orphans an Ops Room edit on it (shown as "was linked"). Editing a department-item row's location replaces its cell-comment notes. The Ops Room `Ground Rows` edit of a department row is keyed by shift + code + last day.

**Process notes from the z111 build:** the tests for the Ops Room buttons were written after the code (never seen red); `tests/ops_room.test.js` and `tests/ground_rows.test.js` read the activity cell without the hover buttons (`.gbt`). With the Ops Room as the first file only SUP 1, TACCO, Loadmaster and Pilot open (not SUP 2), and the demo plan already has an admin code in the AM on 14 Oct, so tests read the PM row.

**Not to do:** the request function is **omitted** (SharePoint lists do not work on the squadron site). The **full PDF guide** (Planners, Master Planner, Ops Room; audience the users) is **not to be generated until Brandon says so**.

**Brandon's pending tests on the real SharePoint:** the ground programme rework (old squadron events with a blank crew now show red until filled; pencil, hide, hidden link, + Ops row; ALL tag), the department selector (does the "by <name>" line show, does the 15-second refresh work, is a week the right red-dot threshold), View only (permission check with a member's account, and the extra seconds to open four more files), AC and Pax tags, the WD row and zoom, the Ops Room on the projector, the Master Planner time ranges and the new export file in desktop Excel, the Changelog filter.

**How to work with Brandon right now:** he is near his weekly usage cap, so keep sessions short: one feature per session, text answers, screenshots only when words will not do, no full ATOM test run unless ATOM code changes (`node tests/atom.test.js` takes minutes). He says "build it" after a mock-up, "go, native" for execution, and "merge to main and push" when he wants a merge. Never overwrite live `.xlsx` files.

**Starting prompt for a new session:** "Read `/home/user/Lodestar/CLAUDE.md`, then `HANDOFF.md` (the section 'Next session: start here') and `PROJECT_CHECKLIST.md`. Start a new branch from main."

## Tabs, Changelog, export, bottom strip (z105 to z108, 31 Oct)

- **z108 tabs.** The tab is now **Planning ▾** (always that text) with Planner, Overview and Syllabus Tracking inside it; Overview is no longer a top-level tab. **Changes is now Changelog** and shows only your own department's file (`books[0]`), the Master Planner and the Ops Room file; Ops Room mode (`OPS`) still shows every open file. Duty Roster and other departments are left out. My Lodestar's "What changed" still reads every log. Code: `logRead`, the `nav.tabs` block. `tests/my_lodestar.test.js` version check now matches the current zNN (it was stuck on z104).
- **z106, z107 Master Planner export.** Brandon found the export unprofessional and said the List is not required. Now **one Calendar sheet only**, no layout choice in the Export dialog. Title banner, month bands, weekend tint, amber no-flying days. Every day is two columns (flight with time | hours), one row per flight, the date strip shows day number and day total; week hours merged per week; month total row; landscape A4 fitted to one page wide, footer with the title. `mpExportBytes(P, o)`, styles registered by name in `XL` / `XS`, `xlsxBuild` supports freeze, filter, print titles, tab colour (unused by the calendar now). The "Hours by flight code" table went with the List; offer it back under the calendar if asked. Tests: `node tests/mp_export.test.js` (11).
- **z110 Master Planner "Ground Programme" is shown as "Squadron events"** (labels only; the Excel sheet is still named `Ground Programme`, no layout change). Department planners keep their own GROUND PROGRAMME row; the Ops Room card is still titled "Ground programme".
- **z111 Ground programme rework (built 31 Oct, awaiting Brandon's test).** Spec `docs/superpowers/specs/2026-10-31-ground-programme-rework-design.md`, plan `docs/superpowers/plans/2026-10-31-ground-programme-rework.md`. **Squadron events:** crew is `ALL` or tags (P L T S1 S2); **blank is an error** (red NO CREW in the Master Planner day panel and chip, red NO PERSONNEL in the Ops Room); new events start empty; flights keep "blank = the code's crew". `deptGround` and the department copy follow ALL / tags (`needsDeptGr`). **Ops Room table** (`opsGround`, `opsWho`): department items merge across departments by shift + activity + last day (department chip + callsigns in Cat colours, first four then `+N` with the full list on hover); a one-day department item joins a squadron event of the same activity and takes its time and location. **Edits** live in a dashboard-created `Ground Rows` sheet in the Ops Room file (A date, B id, C kind edit/hide/manual, D time, E activity, F location, G personnel, H saved): pencil (only changed fields saved), x hides (manual rows are deleted), `hidden (n)` link to unhide, `+ Ops row` (needs time, activity and people or ALL). An edit whose row disappeared shows as a row marked "was linked". Year rollover clears the sheet except next January. No Excel layout change; upload the DEV dashboard only. Old squadron events with a blank crew turn red until filled in. Code: `grrSave`, `grrClear`, `grrUnhide`, `grOpen`. Tests: `node tests/ground_rows.test.js` (13), `ops_room` (48), `master_calendar` (8).
- **z109 Ops Room bottom strip grows to the tallest card.** `opsGrowStrip` now starts at 160 px and grows to the tallest of the ground table (measured itself, the card scrolls inside), Leave and MC, Down-chit and Remarks, so no card scrolls while the page has room (Brandon: the cards looked cramped on a day with an empty flight table). Still capped at 40% and gives room back if the flight table needs it.
- **z105 Ops Room bottom strip.** With nothing on the ground programme there is no table to measure, so the strip fell back to 22% of the screen height and was huge on tall screens. Now it is 160 px (`opsGrowStrip`). The Leave and MC card scrolls when five department rows do not fit; Brandon has not asked for it to grow.

## Ops Room ground programme as a table (z104, 31 Oct)

Brandon showed the squadron's own ground programme sheet (Time | Activity | Location | Personnel) and asked for the Ops Room card to look like it, sorted automatically. Built: the card is a table. Order: clock times (by time, shown like `0800H`, `1400H-1600H`), then AM / PM / NIGHT, then WD, then runs of days as `TILL 30 OCT` (by last day). A divider line separates the groups. **Location is the Master Planner ground row's note** (no new column, so no layout change); items that come from the department plans have no location. The card is wider (3fr of the bottom strip). The strip grows with the list but never takes the room the flight table needs (so the zoom is not shrunk by long lists), capped at 40% of the page; past that the table scrolls, and on the projector it scrolls by itself. Code: `opsGround` (sort keys `grp`/`key`), the table in `renderOps`, `opsGrowStrip`. Mock-ups: `previews/ground_table_mockup.png`, real screenshots `previews/ground_table_real*.png`. Tests updated (`ops_room`, `wd_row`).

## WD fourth row, zoom and crew divider (z103, 31 Oct; spec `docs/superpowers/specs/2026-10-31-wd-row-design.md`, plan `docs/superpowers/plans/2026-10-31-wd-row.md`)

- Every department file gets four rows per person: AM, PM, NIGHT and **WD** (whole day). WD takes Ground Duty and Admin activities only (own dropdown list `WdCodes`, teal label). Flights, Sim, leave, duty and standby stay in the three shift rows, so currency, rest, down-chit and seats do not read WD. A WD item counts once in Gnd Duty for the day.
- Layout stamp `dept layout 3`. The dashboard reads both layouts: `S.rp` is 4 from layout 3, else 3 (`gridRow(i, s)`, `rowPerson`, `rowShift`, `isWdRow`). An older file opens with the "older layout" warning and no WD row.
- Ops Room: a Whole day column on the ground programme card when someone has a WD item. My Lodestar shows WD as "WHOLE DAY". Change Log names the slot WD.
- Zoom control (100 / 90 / 85 / 80 / 75 %) in the top bar; the planner opens at 85 %, other tabs at 100 % until a level is chosen (remembered in the browser); the Ops Room tab is always 100 % (it keeps its own size buttons). Heavy 3 px divider above each person's block.
- Fixed on the way: the builder's Daily View formula had a missing f-string prefix and wrote a literal `{chooser}`.
- **Files:** the repo's own `.xlsx` files and the dashboard's built-in sample are still layout 2 until Brandon agrees to replace them (rebuild fresh, no migration; dummy data only). Fresh sets are built with `python3 .lodestar_build.py excel <folder> [--data input/LODESTAR_Data_Input.xlsx]`.
- Tests: `node tests/wd_row.test.js` (19, needs `LODE_FILES` pointing at a layout-3 set), `python3 tests/wd_builder.test.py` (14).

## AC and Pax tags (z102, 31 Oct; spec `docs/superpowers/specs/2026-10-31-ac-pax-tags-design.md`, plan `docs/superpowers/plans/2026-10-31-ac-pax-tags.md`)

- Planner grid: click a flight cell, the popup has "Role on this flight" (None / AC / Pax; AC only in the Pilot file). Chip AC or PAX on the cell. Saved in a `Role Tags` sheet the dashboard creates on first save (no layout change, no stamp bump). Plain Excel does not show it and Excel's monthly totals still count a Pax cell; the dashboard's own numbers (planner totals, My Lodestar, currency, crew rest) skip Pax.
- Ops Room: the AC-tagged pilot is Captain (replaces the seniority guess for that aircraft); a planner's Pax rides as additional crew with the PAX badge. The Ops Room's saved Pax list wins once it exists; "-" in the Pax column means decided, nobody. Row field `pax` (list) and `rowPax(r, id)` replace `isPax(o, id)` on the board.
- Tests: `node tests/role_tags.test.js` (15).

## Other departments and View only (z101, 31 Oct; spec `docs/superpowers/specs/2026-10-30-other-departments-design.md`, plan `docs/superpowers/plans/2026-10-30-other-departments.md`)

- On SharePoint, after a department opens, the other four planners open read-only one by one in the background ("Opening other departments… n of 4" in the book bar). A failed file is skipped and named once. "Add other departments" is hidden on SharePoint (still there for local files).
- `mayEdit(bi)` is the one test of what can be edited. A file SharePoint says you cannot edit (`EffectiveBasePermissions`, Low bit 4) gets `noEdit`: no Save, undo or redo, a "View only" chip, edits refused. Any permission-check error counts as editable. A 403 on save says "You only have view access to this file."
- **Open:** the permission check must be tried on the real SharePoint with a member's account; the extra seconds to open four more files are for Brandon to judge.
- Tests: `node tests/other_depts.test.js` (10). Not covered: the SharePoint-only hiding of the button (set in `spInit`).

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
