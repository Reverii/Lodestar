# LODESTAR handoff (updated 2026-11-02, after z128)

Written when the project moved from claude.ai project threads to Claude Code. Rules and build commands are in
`CLAUDE.md`; this file is the state of play.

## z126 to z128 (2 Nov, Brandon): planned hours from the time range, sorties per flight (layout: dept 4, master 3)
Spec `docs/superpowers/specs/2026-11-02-hours-from-times-design.md`, plan `docs/superpowers/plans/2026-11-02-hours-from-times.md` (all 8 tasks done, built inline).
- **Hours** are planned hours only (ATOM stays the truth for actual hours): a flight's hours = its time range on the Master Planner (`mpFlHrs(P, f) -> { h, bad }`; end before start = next day; 0 or over 12 h = "Check time"; no end time = 0 with "No end time"; no code fallback). Shown as `2.0 H`.
- **Sorties** are typed on the flight (Master Planner `Flights` column G, blank = 1; the Master Planner day panel has a Sorties box). A running change = one flight with a time range covering all of it and Sorties 2 or 3; the Ops Room makes one row per sortie from `flSort(f)`. Combined codes such as 2xFLT-1.5 are gone (demo data too).
- **Master Planner file (layout 3):** Flight Codes = A Code, B Description, C Crew, D Mission Type, E Syllabus tag (G day statuses and I ground list unchanged); `Flights` G typed Sorties, L Hrs formula reading the Time column (hidden helpers M start min, N end min, O effective sorties = `FlSorties`, P cleaned text; Excel reads the `-` separator only). The dashboard still reads the old layout (it finds the columns by the header text).
- **Department file (layout 4), no cells moved:** Activities D and E are hidden `(unused)` columns (no Flight Hrs, no Sorties, names `ActHrs` / `ActSort` gone); each person's Flights = one per Flight-category cell; the per-person Fly Hrs column, the Summary "Fly hrs" row and the Dashboard hours cells stay but are blank ("(dashboard)" in the labels; hours chart dropped). A department's planned sorties = filled MASTER slots (a Sorties 2 flight does not raise a department's crew need; crews on a running change count once each). Per-person hours come from `cellHrs(M, s, d, code)` (the first MASTER slot of that shift with the same code and a usable range).
- **Not done / to know:** `input/LODESTAR_Data_Input.xlsx` is not in this clone; `.realdata.py` finds the Flight Codes columns by header and ignores Sorties and Flight Hrs, so Brandon's old sheet still loads. **The repo's own `.xlsx` files and the built-in sample are still the old layout** (dept 3 / master 2) until Brandon agrees to replace them: build a fresh set with `python3 .lodestar_build.py excel <folder outside the repo> --data input/LODESTAR_Data_Input.xlsx`, then replace all eight files (and rebuild the dashboard) together. Mixed versions warn on opening.
- Tests: new `tests/hours_from_times.test.js` (14, needs `LODE_FILES=<fresh set>`) and `tests/hours_builder.test.py` (18); updated `master_calendar`, `mp_export`, `mp_card`, `ops_room` (45), `wd_row`, `wd_builder`, `my_lodestar` (same 3 old failures). LibreOffice recalculated the Master Planner file (2200-0100 = 3, 0830H-1030H = 2, 0830-0730 = 0) and the department file without new errors (one old Err:539 on Daily View in both old and new files).

## z125 (2 Nov, Brandon): Master Planner flight card shows planned hours
- Day panel in the Master Planner: a summary under Day status (`5 flights · 9.0 H planned`) and, on each flight, the planned hours as a green chip (`2.0 H`, capital H), the code's description, mission type, `N sorties` when the code has more than one, and `ends next day`. The view-only card is plain text (no boxes that look editable); the time is shown once (header). Editable card keeps its inputs and adds the same chips under them.
- **Hours come from the time range** (`mpFlHrs`): end earlier than start means the next day (2200-0100 = 3.0 H, Brandon: no flight lasts 24 h); 0 or over 12 hours = red "Check time"; no end time = falls back to the code's Flight Hrs, shown grey as `1.5 H (code)` with a red "No end time" chip. **Only the card and the day summary use this for now.** The calendar chips, week and month hours, KPIs, export and department planners still use the code's Flight Hrs, so numbers can differ until the planned streamlining.
- **Planned next (Brandon, 2 Nov, not built; needs a short spec first):** remove Flight Hrs and Sorties from the Activities page and take hours from the Master Planner time range everywhere (every flight will have a full range); sorties = number of flights (so 2xFLT-... would be entered as two flights); this changes Excel totals in all five department files (layout stamp), to be done together with the layout-3 file replacement. Dashboard to show hours as `2.0 H`.
- Tests: new `node tests/mp_card.test.js` (6). Others as before (`my_lodestar` has the same 3 old failures).

## z124 (2 Nov, Brandon): Flying Restriction banner
- **Ops Room:** a slim red banner (one line per restriction, stacked) above the stat chips, only on days from From to To. **+ Restriction** button next to + Ops Add opens a dialog (remark text, From, To, quick buttons Today only / Until tomorrow / Next 7 days); pencil and x on each banner (editors only; a view-only Ops Room shows the banner with no buttons). Brandon chose the top of the page, compact (mock-ups `previews/flying_restriction_mockup_*.png`, real `previews/flying_restriction_real.png`).
- **Master Planner:** the day panel has a "Flying restriction" section (list, pencil, x, + Add) and calendar days inside a restriction get a red tint and a RESTRICTION tag. Adding or changing there works only when the Ops Room file is open **for editing** (dev mode / Ops Room mode). A normal Master Planner user opens the Ops Room file read-only, so they see the list and the note "use the Ops Room". Brandon said the Ops Room people cannot edit the Master Planner file, so the data lives in the Ops Room file. **Open:** if the Master Planner owners must add them, the Ops Room file needs edit rights for them, or the sheet moves to the Master Planner file.
- **Saved:** new `Flying Restrictions` sheet in `Ops_Room.xlsx` made by the dashboard on the first save (A From, B To, C Remark, D Added by, E Saved; rows 2..301). No layout change, no stamp bump. Expired rows stay in the sheet (the banner just no longer shows them); year rollover does not clear them. Code: `frFor`, `frSave`, `frClear`, `frOpen`, `frBannerHtml`, `frRefresh`, `st.fr` parsed with the Ops Room file.
- Upload the DEV dashboard only. Tests: new `node tests/flying_restriction.test.js` (11); `ops_room` 43, `changelog` 8, `master_calendar` 8; `my_lodestar` still has the same 3 failures as before z123.

## z123 (1 Nov, Brandon): Change Log is less spammy and stays small
- Brandon found the Changelog too spammy and worried the Excel would grow. Decisions: group and skip; keep the last 90 days.
- **Grouping** (`logGroup`, `logLines`): plan cells in one row that change to the same value in one save become ONE line, e.g. `VIPER, 3-14 Oct AM (12 days)` (gaps: `1, 3, 5 Oct PM (3 days)`, over five: `8 days in Oct`); the Cell column shows `Oct!G27:P27`; Before reads `various` when the old values differed. A single cell keeps the old wording. My Lodestar's "Your ... is now ..." still works (it matches on the person's callsign at the start).
- **Skipped:** MASTER-row cells in department files (copies of the Master Planner or Ops Add; the source is logged in its own file).
- **Merged** (`logApply`): the same person editing the same single cell again within 10 minutes updates that row; if the cell goes back to what it was, the row is removed.
- **Trimmed:** on each save rows older than 90 days (`LOG_KEEP_DAYS`) are dropped; SharePoint version history keeps older copies. No Excel layout change; upload the DEV dashboard only.
- Tests: new `node tests/changelog.test.js` (8). `my_lodestar` has 3 failures that were already there before z123 (`changes_include_cancelled_flight`, `changes_include_master_move_and_duty`, `badge_count_matches_and_seen_is_remembered`); not looked into. `wd_row` `log_names_wd` and `atom` publish line not re-run (need a layout-3 set / minutes).

## z122 (1 Nov, Brandon): Ops Room flight table fills a tall window
- `opsFill()` (end of `opsFit`): when the day is quiet the whole flight table is enlarged (CSS `zoom`, up to 1.6) to use the free height; width and height are measured and corrected so it matches its box. Test: `tall_window_enlarges_the_flight_table` in `tests/ops_room.test.js`. Cap 1.6 is a choice; Brandon can ask for more.

## z121 (1 Nov, Brandon): Open my Excel and Add other departments hidden
- Both buttons are hidden (kept in the page so the code still finds them), since every file opens by itself. The LODESTAR logo (top left) goes back to the department screen on SharePoint, so a department can still be switched; z120 remembers the department across a reload, so the logo is the only way back.

## z120 (1 Nov, Brandon): Refresh instead of reload
- Brandon: the browser's refresh sent everyone back to the login (department) screen.
- Header button **⟳ Refresh** (SharePoint only): `softRefresh()` re-reads the changed files through `liveCheck(true)` without reloading the page; a file with unsaved changes is never overwritten. On the department screen it redraws the cards.
- **F5** and **Ctrl+R** run it too. **Ctrl+Shift+R** and **Ctrl+F5** stay the real reload, needed after a new dashboard version is uploaded. The browser's toolbar reload button cannot be intercepted.
- Safety net for a real reload: `fop_sess` in `sessionStorage` holds the department and the open tab (`sessSave` / `sessResume`, called at the end of `spInit`). Closing the tab forgets it; the department screen (Open another file) clears it. Month and Ops Room day are not restored.
- Tests: `node tests/refresh.test.js` (13 checks, SharePoint stubbed). `spInit` itself needs https, so the resume on a real reload is only checked through `sessResume`; Brandon to test on SharePoint.

## z119 (1 Nov, Brandon): crew matrix (warn only)
Brandon's crew matching matrix (CAT needed per seat on MAS TRG / MAS OPS / MAS TACT day and night) is built in. **Warn only, never blocks.** A flight is checked when its flight code's **Mission Type** (Flight Codes) equals a mission in the matrix (case and spaces ignored); other codes are not checked. A crew passes when it fits any one row; each cell is the lowest CAT allowed (A best); Sup 1 and Sup 2 are two minimums for the pair in either order; a seat nobody is planned in yet is not counted; a trainee or blank CAT is below the last CAT; the AC-tagged pilot is the Captain (no tag: the best CAT among the pilots), every other pilot is a co-pilot; Pax are ignored. The co-pilot "C, D" in his sheet means C or D is fine (entered as D). **Where it shows:** the flight card (green or red line, CAT letter under each name; also in My Lodestar's month card), a "CREW MATRIX" warning chip on the Planner flight cell (tooltip has the reason), a red CREW MATRIX mark on the Ops Room flight row. **Future-proof:** the matrix is the **Crew Matrix** sheet of the Master Planner file (A Mission, B Shift Day / Night / blank, C AC, D Co-pilot, E LM, F TACCO, G Sup 1, H Sup 2, I Notes; CAT order in K2), made by the dashboard (no layout stamp; same pattern as Role Tags). Until the sheet exists the built-in `CM_DEFAULT` is used. New page **Master Planner > Crew Matrix** shows the rules in use, lists rows it had to leave out (bad letter, bad shift, no seat) and has a button to make the sheet in the Master Planner file (then Save). Editing the sheet in Excel changes the rules without a new dashboard. A new seat type would still need code. Code: `CM_DEFAULT`, `cmCheck`, `cmFlight`, `cmRow`, `cmParse`, `cmCreate`, `renderCmx`. Tests: new `node tests/crew_matrix.test.js` (24); `my_lodestar` 65; `role_tags` 15 (the picker tests were stale since z113 and now use right-click). Mock-up `previews/crew_matrix_mockup.png`, real `previews/crew_matrix_real.png`. **To do on his side:** type the Mission Type (MAS TRG / MAS OPS / MAS TACT) on the real MAS flight codes in the Master Planner Flight Codes; upload the DEV dashboard only (the sheet is optional). Awaiting his look.

## z118 (1 Nov, Brandon): My month calendar in My Lodestar
**New full-width "My month" card under Today / Next 7 days** (`lodeMonthCalHtml`): Monday to Sunday grid of one month, the same pills as Next 7 days (`lodePill`, now shared), ‹ › month arrows and a Today button (`cur.lodeMon`, follows the selected day until an arrow is used). **Click a flight or any pill** opens the Planner's flight card read-only (`lodeCardOpen`: Planned time and comment, cancelled reason, syllabus, cell comment, and the crew in seat columns with the person highlighted; works in View as). The crew block was pulled out of `openCard` into the shared `cardSeatsHtml`. **Click the day** moves the Today card to it. `lodeDay(who, iso, true)` is a light version (no Ops Room rows, no next duty) used for the grid. The Next 7 days pills open the card too. The old "November so far" tiles stay in the right column (the mock-up's totals strip was not built). The page now scrolls (the calendar is below the first screen); the `fits_1280x720` test measures the page without the calendar. Dashboard only, no Excel change; upload the DEV dashboard only. Tests: `my_lodestar` 65. Mock-up `previews/my_month_mockup.png`, real `previews/my_month_real.png`. Awaiting Brandon's look.

## z114 to z117 (1 Nov, Brandon): flight card and MASTER lock (z115: the card shows only this flight, not day-level lines; z116: the card is also the place for the cell comment)
**Left click on a flight cell (AM / PM / NIGHT, not WD) opens a read-only card** (`#cellCard`, `openCard`, `cardCrew`): code, date, shift, description, the cell's tooltip text (MASTER programme, comment, syllabus, cancelled, crew rest), then **Crew on this flight** laid out like the Ops Room board (columns AC, Pilot, LM, TACCO, SUP 1, SUP 2, names in Cat colours, extra crew stacked, the clicked person highlighted, PAX badge). Crew comes from `opsCrewOn` (every open department file) filtered by code and shift, so it also works in view-only files. Esc, an outside click, right-click or a key press close it. **MASTER rows are locked in the Planner:** no picker, Delete, Backspace, Enter, typing or paste on a MASTER cell (toast "MASTER rows come from the Master Planner..."); selecting, arrows, Ctrl+C, fold and the `+` slot button still work; the "Copy flights and squadron events from the Master Planner" button (`#mpSync`) and Ops Add write through their own paths, so they still fill MASTER. Padlock in the MASTER label. Dashboard only (the lock is not in plain Excel); upload the DEV dashboard only. Tests: new `node tests/flight_card.test.js` (11, needs a layout-3 set via `LODE_FILES`), `wd_row` 19, `my_lodestar` 60. Mock-up and real screenshot are in `previews/` (git-ignored). **z116:** a left click on any crew cell that has an activity or a comment (and on every cell when the planner can edit) opens the card; non-flight cells show the activity and the comment only. **The cell comment moved from the right-click picker to the card** (`#ccIn`: Enter or click away saves, Esc cancels; read-only text in view-only files; the picker's `popCN` box is gone). The comment is not repeated in the details block. Tests: `flight_card` 16, `ops_room` 42, `wd_row` 19, `my_lodestar` 60. **z117:** a left click on a MASTER cell with a flight shows a read-only card: code, date, shift, description, Time and Comment (no toast on a left click; the lock message stays for right-click and keys). Empty MASTER cells just select. `flight_card` 17. Awaiting Brandon's test.

## z113 (1 Nov, Brandon): Planner cell picker is on right-click
**Right-click a Planner cell opens the picker** (`contextmenu` listener on `#plan`, next to the click handler). **Left click only selects** the cell (and closes an open picker). Enter and typing to search still open it; arrows, Delete, Ctrl+C / Ctrl+V unchanged. View-only files select but do not open the picker. The ground programme row still prompts on a normal click. The Ops Room seat pickers are unchanged. Keys tooltip and the Planner / Syllabus help texts now say "right-click". Dashboard only, no Excel change; upload the DEV dashboard only. Tests: `my_lodestar` 60 (one line right-clicks, version check z113), `wd_row` 19 (picker test sends `contextmenu`). **Open:** no on-screen hint for right-click yet (offer: a small hint next to the Keys label); a touch screen has no right-click (offer: long-press) if anyone uses one. Awaiting Brandon's test.

## z112 (31 Oct, Brandon): Ops Room ground programme is filled by hand
Brandon was not happy with the z111 auto-merge. **Now the board shows only squadron events (Master Planner) and the Ops Room's own rows.** The planners' ground items (Meeting, Outstation, WD items) no longer appear by themselves. **+ Ops row** opens the dialog with a read-only "From the department plans" list grouped by department (`opsDeptRef`, with planner cell comments), then Time (quick buttons AM / PM / NIGHT / WD and a TILL date picker), Activity, Location (all typed) and the crew tick boxes (nothing pre-ticked). A manual row with time `TILL 25 OCT` shows every day from the day it was added to that date (hide / pencil on a later day saves a per-day hide / edit). `1500H` now parses as a clock time. Old z111 edits on department rows (`dept|` ids) are ignored. **My Lodestar** keeps reading the planners' cells (Brandon, 31 Oct: that is fine); Ops Room rows do not show there, by design. Tests: `ops_room` 42, `wd_row` 19, `my_lodestar` 60, `ground_rows` 13. The z111 notes below describe the old merge; `opsGround` no longer does it.

## Next session: start here (handoff of 1 Nov 2026, after z117)

**State:** everything through **z117** is merged on `main` (repo Reverii/Lodestar, still public; deciding about making it private is an open item). Dashboard **z117** (dev build). Pages publishes the dashboard at `/` and the briefing at `/briefing/`. Live SharePoint files hold dummy data.
**Built on 1 Nov (all merged):** z113 right-click opens the Planner picker (left click only selects); z114 flight card on left click (details and crew from every department in seat columns) and locked MASTER rows; z115 the card shows only that cell's flight; z116 the cell comment moved from the picker to the card (non-flight cells show it, planners can type it there); z117 a left click on a MASTER cell shows its time and comment. Brandon confirmed z113 and z117 work on his side; z114 to z116 were tested along the way. Details in the z113 to z117 sections below.
**Earlier, awaiting his SharePoint test:** z112 Ops Room ground programme filled by hand, z111 squadron events with ALL / blank-crew errors, z101 to z108 (other departments View only, AC / Pax tags, WD row and zoom, tabs, Master Planner export, Changelog filter).

**Later (Brandon, 1 Nov): admin mode** at the end of the dev stage, after DEV is stripped. Design is in the last line of `PROJECT_CHECKLIST.md`. Do not start before he says so.

**Next, in this order:**
1. Brandon said "next fix" at the end of 1 Nov but had not named it: ask what he found. Otherwise wait for his SharePoint test results (list below) and fix what he finds. Open small ideas he has not picked: an on-screen "right-click" hint, long-press for touch screens, a menu key / Shift+F10 to open the picker, a right-click mini menu (copy, paste, clear, block of days, role, down-chit).
2. When he agrees: replace the repo's own `.xlsx` files and the built-in sample with layout-3 files (rebuild fresh, no migration; dummy data only), then rebuild the dashboard.
3. The full PDF guide only when Brandon says so.

**Known small gaps (deferred minors, only fix if Brandon hits them):** two squadron events with the same activity and shift share one Ops Room edit id; moving a squadron event's time into another shift orphans an Ops Room edit on it (shown as "was linked"). Editing a department-item row's location replaces its cell-comment notes. The Ops Room `Ground Rows` edit of a department row is keyed by shift + code + last day.

**Process notes from the z111 build:** the tests for the Ops Room buttons were written after the code (never seen red); `tests/ops_room.test.js` and `tests/ground_rows.test.js` read the activity cell without the hover buttons (`.gbt`). With the Ops Room as the first file only SUP 1, TACCO, Loadmaster and Pilot open (not SUP 2), and the demo plan already has an admin code in the AM on 14 Oct, so tests read the PM row.

**Not to do:** the request function is **omitted** (SharePoint lists do not work on the squadron site). The **full PDF guide** (Planners, Master Planner, Ops Room; audience the users) is **not to be generated until Brandon says so**.

**Brandon's pending tests on the real SharePoint:** the ground programme rework (old squadron events with a blank crew now show red until filled; pencil, hide, hidden link, + Ops row; ALL tag), the department selector (does the "by <name>" line show, does the 15-second refresh work, is a week the right red-dot threshold), View only (permission check with a member's account, and the extra seconds to open four more files), AC and Pax tags, the WD row and zoom, the Ops Room on the projector, the Master Planner time ranges and the new export file in desktop Excel, the Changelog filter.

**How to work with Brandon right now:** he is near his weekly usage cap, so keep sessions short: one feature per session, text answers, screenshots only when words will not do, no full ATOM test run unless ATOM code changes (`node tests/atom.test.js` takes minutes). He says "build it" after a mock-up, "go, native" for execution, and "merge to main and push" when he wants a merge. Never overwrite live `.xlsx` files.

**Tests added 1 Nov:** `LODE_FILES=<layout-3 set> node tests/flight_card.test.js` (17). Build a layout-3 set with `python3 .lodestar_build.py excel <folder outside the repo>` (about two minutes; `wd_row` and `flight_card` need it). Working style this session: bounded changes got a short chat design, a mock-up for the card, then "build it"; merge only when he says "merge to main and push".

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
