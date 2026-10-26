# ATOM Currency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Read ATOM Excel exports in Lodestar: a squadron currency grid with "Names to fix", then planning warnings (red corner, name badge, Ops Room seat mark).

**Architecture:** A new section `// ---------- ATOM currency` in `.dashboard_source.html`. ATOM exports are NOT books: `loadWorkbook` hands them to `atomLoad` before it touches the `WB` global, and they live in a separate `ATOMS` list, read-only, never saved. Pure functions (`atomParse`, `atomMatch`, `atomState`, `atomIssues`, `atomWarn`) feed the Currency tab, the Planner, My Lodestar and the Ops Room. Matching is an exact lookup of ATOM name against roster Initials. The flight-needs table lives in a dashboard-created sheet `ATOM Needs` in the Ops Room file.

**Tech Stack:** Vanilla JS in the single-file dashboard, fflate (already inlined), Playwright tests in `tests/`, a Python (openpyxl) fixture generator for synthetic ATOM exports.

**Spec:** `docs/superpowers/specs/2026-10-26-atom-currency-design.md` (mock-ups: `previews/ATOM_currency_mockup_*.png`)

## Global Constraints

- Offline single file; no CDN, no network except SharePoint REST on the same site. Screen budget 1280x720, no page scroll.
- Dev mode stays on; any dev-only code inside `/*DEV*/ ... /*/DEV*/` markers.
- The view is read-only: never writes to the ATOM file, never saves it, keeps no copy. Only currency columns are read: groups `Flight Currencies`, `SIM Currencies`, `LSS Currencies`, `Mission Currencies`. SATR, hours, FDT, SIM Package and Instrument Flying are ignored.
- Columns are found by header name (group row 1, column row 2), never by position. People start on the row after the status bands; a band row has an empty Name (e.g. ` -> Active`).
- A cell: a date (text like `16 Nov 26`, or an Excel date number) is an **expiry**; `-` = not held (hidden); `N/A` = not applicable (hidden); blank or a space = not recorded.
- Status against the day being looked at: before it = **Lapsed**; within the due window after it = **Due** (default 14 days, remembered in the browser); else **OK**.
- Sheet to department: `PILOT` = Pilot, `ACS` = Loadmaster, `TACCO` = TACCO, `SUP1` = SUP 1, `SUP2` = SUP 2.
- Matching: ATOM `Name` equals the roster `Initials` (`p.ini`), ignoring capitals and extra spaces. Nothing else is tried; nothing is stored.
- "As of" = the export's `docProps/core.xml` created time (local), changeable per file and remembered in the browser. Stale: amber banner after 7 days, red after 30. Never pick a file by name.
- No Excel layout change and no layout stamp bump. The only new sheet is `ATOM Needs`, created in the Ops Room file on first edit (as `Change Log` is).
- Rule 5: the status view covers all five departments; planner warnings (red corner, name badge) apply to SUP 2 only. 121 SQN is one squadron; plain wording.
- Tests use synthetic exports only. Never copy Brandon's exports into the repo (it is public).
- Bump the version `2026-10-25 z90` to `z91` in both places in `.dashboard_source.html`.

## Review Focus

- Initials with different capitals, extra spaces or a blank cell: match case-insensitively; blank Initials never match anything (Task 3).
- Two roster people with the same Initials: neither is silently chosen; both are listed in Names to fix (Task 3).
- A currency column that ATOM adds, moves or removes, and a sheet that is missing: the grid follows the headers; no crash (Task 2).
- A date cell in an unexpected format: shown as not recorded with the raw text in the tooltip, never as Lapsed (Task 2).
- An export that has only some departments, or a department whose file is not open: that department says "Open the X file to match" instead of every name being "wrong" (Task 3).

## File Structure

- Modify `.dashboard_source.html`: `loadWorkbook` (intercept), new ATOM section (parser, matcher, status, grid, Names to fix, Needs table), `renderCur`, Planner name badge and cell warnings (`renderPlanner`, near `CC` and `CN`), `opsCrewCell`, `readOps`, `lodeCards`, `HELP`, version strings, CSS.
- Create `tests/make_atom_fixture.py` (synthetic export builder), `tests/atom.test.js` (all ATOM tests).
- Modify `tests/lode_lib.js`: `boot` option `atom` (list of fixture paths added through `#fileInputMore`).
- Rebuild `Flight_Ops_Planner_Dashboard.html`; update `HANDOFF.md`, `PROJECT_CHECKLIST.md`, `CLAUDE.md`.

Shared types (defined in Task 2):
- `AtomCell = { k: "date"|"none"|"na"|"blank"|"text", iso: string|null, raw: string }`
- `AtomRow = { name: string, status: string, cat: string, instCat: string, cells: { [col: string]: AtomCell } }`
- `AtomFile = { name: string, created: string, groups: { group: string, cols: string[] }[], sheets: { [dept: string]: AtomRow[] }, missing: string[] }` (`created` = local `YYYY-MM-DD HH:MM`, `missing` = department sheets not in the file)

---

### Task 1: Synthetic fixture, harness and tab skeleton

**Files:**
- Create: `tests/make_atom_fixture.py`, `tests/atom.test.js`
- Modify: `tests/lode_lib.js`, `.dashboard_source.html` (section header, `ATOMS`/`cur.atom` state, `#atomBox` container at the top of `#v-cur`)

**Interfaces:**
- Produces: `python3 tests/make_atom_fixture.py OUT.xlsx [--created "2026-10-25 12:41:33"] [--variant NAME]` writes a synthetic export: sheets PILOT, ACS, TACCO, SUP1, SUP2 with the real structure (row 1 merged group titles, row 2 names, row 3 a ` -> Active` band, people from row 4 with one `NSmen` band), people named like `A NGO`, `HO KM`, `SAMY`, `S LIM JH`, every cell kind (dates as text `16 Nov 26`, one Excel-date number, `-`, `N/A`, blank, a bad text `soon`), a SATR block with fake remarks, and `created` in `docProps/core.xml`. Variants: `moved` (extra and reordered columns), `partial` (only PILOT and SUP2 sheets).
- Produces: `boot({ ..., atom: [paths] })` in `tests/lode_lib.js` loads each path through `#fileInputMore` after the planner files.
- Produces: `window.ATOMS` (array, empty) and `renderAtom()` stub, called from `renderCur`.

- [ ] **Step 1: Write the failing tests** in `tests/atom.test.js` (same tiny runner as `tests/my_lodestar.test.js`): `fixture_builds` (the script runs and the file has 5 sheets), `atom_state_exists` (`Array.isArray(ATOMS) && typeof renderAtom === "function"`), `currency_tab_has_atom_box` (`#atomBox` exists inside `#v-cur`).
- [ ] **Step 2: Run** `node tests/atom.test.js`. Expected: 3 FAIL.
- [ ] **Step 3: Implement** the fixture script, the `boot` option and the stubs.
- [ ] **Step 4: Rebuild** (`python3 .lodestar_build.py dashboard`) **and run.** Expected: 3/3 PASS.
- [ ] **Step 5: Commit** `git add tests .dashboard_source.html Flight_Ops_Planner_Dashboard.html && git commit -m "ATOM: fixture, harness, tab skeleton"`.

### Task 2: Parser and intake

**Files:**
- Modify: `.dashboard_source.html` (ATOM section, `loadWorkbook` at the top, Currency tab button and file input)
- Test: `tests/atom.test.js`

**Interfaces:**
- Consumes: `fflate.unzipSync`, `sheetPaths(files)`, `parseSST(files)`, `xmlText`, `serialToISO` (existing).
- Produces: `isAtomExport(paths: {[sheet:string]:string}) -> boolean` (true when sheet names include `PILOT` and at least one of `ACS TACCO SUP1 SUP2`, and no `Dashboard` sheet).
- Produces: `atomParse(files: object, name: string) -> AtomFile`; `ATOM_DEPT = { PILOT: "Pilot", ACS: "Loadmaster", TACCO: "TACCO", SUP1: "SUP 1", SUP2: "SUP 2" }`.
- Produces: `atomLoad(buf: ArrayBuffer, name: string) -> void` (parses, pushes to `ATOMS`, sets `cur.atom` to the new file's index, toasts "ATOM export loaded: <name>", calls `renderAll`). `loadWorkbook` calls it and returns before `WB = ...` when `isAtomExport`.
- Produces: `atomAsOf(f: AtomFile) -> string` (`YYYY-MM-DD HH:MM`, the remembered override from `spRecall("atom_asof_" + f.name)` if present else `f.created`) and `atomSetAsOf(f, s)`.

- [ ] **Step 1: Write the failing tests:** `parse_reads_headers_not_positions` (the `moved` variant parses to the same people and the extra column appears in `groups`), `parse_ignores_satr_and_hours` (no column named `Level`, `IF Hours`, `24H` in any group), `parse_value_kinds` (a text date, an Excel date number, `-`, `N/A`, blank and `soon` give `date`, `date`, `none`, `na`, `blank`, `text`), `parse_skips_band_rows` (no row has a name starting with `->` or empty), `parse_created_time` (`created` equals the fixture's created time in local `YYYY-MM-DD HH:MM`), `partial_file_lists_missing` (`missing` is `["Loadmaster","TACCO","SUP 1"]`), `loading_an_atom_file_does_not_touch_books` (open the planner files, then the ATOM file: `books.length` is unchanged, no dialog, `ATOMS.length === 1`), `atom_first_then_planner` (an ATOM file opened as the very first file does not throw; the welcome screen stays and a toast appears), `as_of_override_is_remembered` (`atomSetAsOf` then `atomAsOf` returns it after `spRecall`), `folder_picker_routes_atom_file` (an ATOM file among the files given to the dev folder picker lands in `ATOMS`, not in `books`; the SharePoint folder scan goes through the same `loadWorkbook` path, so it needs no separate code).
- [ ] **Step 2: Run.** Expected: FAIL (functions not defined).
- [ ] **Step 3: Implement** the parser (read cells with a local helper that takes `files` and `sst`, since `readCells` uses the `WB` global; dates `dd Mon yy` map to `20yy`), the intercept in `loadWorkbook`, `atomLoad`, `atomAsOf`, `atomSetAsOf`, and the "Add ATOM export" button (`#atomAdd`, opens a hidden `.xlsx` input and calls `atomLoad`).
- [ ] **Step 4: Rebuild and run.** Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 3: Matching by Initials and Names to fix data

**Files:**
- Modify: `.dashboard_source.html`
- Test: `tests/atom.test.js`

**Interfaces:**
- Consumes: `AtomFile` (Task 2); `books`, `isDept`, roster entries `{ id, name, ini, cat, role, status }`.
- Produces: `atomKey(s: string) -> string` (lower-case, trim, collapse spaces; `""` for blank).
- Produces: `atomMatch(f: AtomFile) -> { rows: Map<string, AtomRow> , fix: { atomOnly: {name,dept}[], rosterOnly: {dept,id,name}[], dupes: {dept,ini,ids:string[]}[], cat: {dept,id,atom:string,roster:string}[], closed: string[] } }`. `rows` is keyed `"<bookIndex>:<rosterIndex>"`. `closed` lists departments in the file whose planner is not open. People with a duplicate Initials are not in `rows`.
- Produces: `atomFor(bi: number, i: number) -> AtomRow | null` (uses the current file, `ATOMS[cur.atom]`).

- [ ] **Step 1: Write the failing tests** (set roster Initials in the page to ATOM-style names first): `match_exact_case_and_spaces` ("a  ngo" matches "A NGO"), `match_blank_initials_never_matches`, `match_duplicates_listed_not_chosen` (two roster rows with the same Initials: both in `dupes`, neither in `rows`), `match_atom_only_and_roster_only_listed`, `match_cat_difference_listed` (ATOM CAT `B` against roster `CAT A`), `closed_department_is_not_an_error` (SUP 1 file not open: `closed` contains "SUP 1" and its names are not in `atomOnly`), `match_within_department_only` (the same Initials on a different department's roster do not match this sheet).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** `atomKey`, `atomMatch`, `atomFor`. Cache the result per (`ATOMS` index, roster signature) so repeated calls are cheap.
- [ ] **Step 4: Rebuild and run.** Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 4: Status and per-person issues

**Files:**
- Modify: `.dashboard_source.html`
- Test: `tests/atom.test.js`

**Interfaces:**
- Consumes: `AtomRow`, `atomFor` (Task 3).
- Produces: `atomDue() -> number` (14 unless `spRecall("atom_due")`), `atomSetDue(n)`.
- Produces: `atomState(cell: AtomCell, day: string) -> "lap"|"due"|"ok"|"nr"|"nh"` (`nh` for `none` and `na`; `nr` for `blank` and `text`).
- Produces: `atomCells(row: AtomRow, day: string) -> { col: string, group: string, state: string, iso: string|null, days: number|null }[]` (not-held cells left out).
- Produces: `atomIssues(bi: number, i: number, day: string) -> { lap: {col,iso}[], due: {col,iso}[] }` (empty when the person does not match or no file is open).
- Produces: `atomStale(f: AtomFile, today: string) -> "" | "amber" | "red"` and `atomAge(f, today) -> number` (days).

- [ ] **Step 1: Write the failing tests:** `state_boundaries` (day D: expiry D-1 is lap; D is due; D+14 is due; D+15 is ok, with the window changed to 7 it is D+8 ok), `state_kinds` (`none` and `na` are `nh`; blank and text are `nr`, never `lap`), `issues_for_matched_person`, `issues_empty_for_unmatched`, `stale_thresholds` (6 days "", 8 days "amber", 31 days "red").
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the functions above; compare ISO day strings, not times.
- [ ] **Step 4: Rebuild and run.** Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 5: Currency tab grid

**Files:**
- Modify: `.dashboard_source.html` (`renderAtom`, CSS, `renderCur` calls it, `HELP.cur`)
- Test: `tests/atom.test.js`

**Interfaces:**
- Consumes: Tasks 2 to 4.
- Produces: `renderAtom()` fills `#atomBox` (layout as `previews/ATOM_currency_mockup_grid.png` and `_stale.png`): file line with a file chooser when more than one file is open, the as-of text and date box, the due-window setting, "Add ATOM export", the department switch (All, Pilot, Loadmaster, TACCO, SUP 1, SUP 2, remembered), "Only crew with a problem", count chips (lapsed, due, crew with a problem, N to fix), the grid (group header row, column row, one row per matched person, worst first, one-line dates, the year only when more than 12 months ahead), the legend, and the stale banner. With no file open the box says "Add an ATOM export to see everyone's currencies" and shows only the button.
- Produces: `atomGridRows(dept: string|"All", onlyProblems: boolean, day: string) -> { bi, i, row: AtomRow, lap: number, due: number }[]`.

- [ ] **Step 1: Write the failing tests:** `grid_rows_sorted_worst_first`, `grid_only_problems_filter`, `grid_columns_follow_file` (the `moved` variant shows its extra column), `grid_hides_not_held` (a `-` cell renders no date text), `grid_date_format` (within 12 months "17 Jan", beyond "12 Jun 31"), `grid_counts_match_cells` (the chips equal a count of `lap` and `due` cells), `stale_banner_amber_and_red` (as-of set 9 days and 40 days back), `empty_state_message`, `fits_1280x720` (`document.documentElement.scrollHeight <= 720` with 16 rows), `no_put_calls` (open the tab, switch department, toggle filters: zero `put` calls and no dirty cells).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** `renderAtom` and `atomGridRows`; escape every inserted string with `esc`; the date box uses `atomSetAsOf`.
- [ ] **Step 4: Rebuild, run, then screenshot at 1280x720 and compare with the mock-up by eye.** Expected: PASS; layout close to the mock-up.
- [ ] **Step 5: Commit.**

### Task 6: Names to fix panel

**Files:**
- Modify: `.dashboard_source.html`
- Test: `tests/atom.test.js`

**Interfaces:**
- Consumes: `atomMatch(...).fix` (Task 3).
- Produces: `atomFixOpen()` / `atomFixClose()`; the panel `#atomFix` (layout as `previews/ATOM_currency_mockup_match.png`): sections "In ATOM, but no roster Initials match", "Same Initials twice on a roster", "CAT differs from the roster", "On the roster, Initials not in ATOM", and a line for each department whose file is not open ("Open the TACCO file to match its names"). Each department row links to that department's Crew Roster: it switches to that book (`useBook(i)`, `cur.sel = null`, `renderAll()`) and clicks the `roster` tab. The chip in Task 5 shows the total.

- [ ] **Step 1: Write the failing tests:** `fix_panel_sections_and_counts` (the counts equal the lists), `fix_link_opens_crew_roster` (clicking the link makes `#v-roster` visible for that department), `fix_clears_when_initials_fixed` (set a roster Initials to the ATOM name, re-render: the entry is gone and the chip drops by one), `fix_panel_empty_state` ("Nothing to fix").
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the panel and links.
- [ ] **Step 4: Rebuild and run.** Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 7: Name badge and My Lodestar card

**Files:**
- Modify: `.dashboard_source.html` (`renderPlanner` name cell next to the `CC` badge; `lodeCards`)
- Test: `tests/atom.test.js`

**Interfaces:**
- Consumes: `atomIssues` (Task 4).
- Produces: in the Planner (SUP 2 only, `S.dept === "SUP 2"`) the name cell shows an extra `<i class='curb bad' data-cur='1'>` "ATOM ⚠ n" (lapsed) or `due` "ATOM ! n" (due) when ATOM has issues for that person today; the tooltip lists the currencies and dates; clicking opens the Currency tab (existing handler).
- Produces: `lodeCards(...).cur` uses ATOM when the person matches: `level` bad/due/ok from `atomIssues(bi, i, iso)`, `text` "<Currency> lapsed 16 Oct" or "<Currency> due 27 Oct" or "All current", `sub` "from ATOM, data as of <date>"; with no ATOM data the existing flight-based text stays.

- [ ] **Step 1: Write the failing tests:** `planner_badge_for_atom_lapse` (a matched SUP 2 person with a lapsed currency has the badge; another dept does not), `planner_badge_absent_without_atom`, `my_lodestar_uses_atom_when_matched`, `my_lodestar_falls_back_without_atom`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** both hooks.
- [ ] **Step 4: Rebuild and run, plus `node tests/my_lodestar.test.js`.** Expected: all PASS.
- [ ] **Step 5: Commit.**

### Task 8: The flight-needs table (ATOM Needs sheet)

**Files:**
- Modify: `.dashboard_source.html` (generalise `logEnsure` into `sheetEnsure(W, name, head, colWidths)`; `readOps` reads `st.atomNeeds`; Currency tab editor)
- Test: `tests/atom.test.js`

**Interfaces:**
- Produces: sheet `ATOM Needs` in the Ops Room file: row 1 headers `Flight code or mission type | Currencies needed | Seat`, data from row 2. Column A is a flight code with optional `*` (`NVG-*`) or a mission type (`TRG`); B is a comma-separated list of ATOM currency names (case-insensitive); C is `Any` (default) or `Captain`.
- Produces: `readOps` fills `st.atomNeeds = { rows: { match: string, needs: string[], seat: "Any"|"Captain", row: number }[], has: boolean }`.
- Produces: `atomNeedsFor(code: string, mtype: string, seat: "Any"|"Captain") -> string[]` (union of the currencies of every matching row; `seat` "Captain" also returns the `Any` rows; `Any` ignores `Captain` rows).
- Produces: an editor under the grid ("What each flight needs"): rows add / edit / delete through `put("ATOM Needs", ref, value)` on the Ops Room book after `sheetEnsure`; disabled with the note "Open the Ops Room file to save these rules" when no Ops Room book is open. Starts empty; nothing is pre-filled.

- [ ] **Step 1: Write the failing tests:** `needs_sheet_created_on_first_edit` (the Ops Room book gains `ATOM Needs` in `WB.paths`, and `Change Log` handling still works), `needs_roundtrip` (add two rules, save to a scratch copy with the existing save path, reload it: `st.atomNeeds.rows` equal what was typed), `needs_matching` (`NVG-2.0` matches `NVG-*`; a mission type matches by its text; `Captain` rows only for the captain seat), `needs_disabled_without_ops_room`, `needs_empty_means_no_warnings`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** `sheetEnsure` (keep `logEnsure(W)` as a one-line wrapper so `logApply` is unchanged), the reader and the editor.
- [ ] **Step 4: Rebuild and run, plus the regression test `edit_undo_redo_save_roundtrip` in `tests/my_lodestar.test.js`.** Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 9: Planner warnings

**Files:**
- Modify: `.dashboard_source.html` (`renderPlanner` cell loop near `CN`; name badge count)
- Test: `tests/atom.test.js`

**Interfaces:**
- Consumes: `atomNeedsFor` (Task 8), `atomFor`, `atomState`.
- Produces: `atomWarn(bi: number, i: number, code: string, mtype: string, iso: string) -> { lines: string[] } | null`. For a flight cell it returns the needed currencies (seat `Any`) that are `lap` on `iso`, each as "Night Curr ended 27 Oct", else `null`. Only SUP 2 and only when a matched ATOM row exists.
- Produces: in the Planner cell loop, `W.push(["⚠ NOT CURRENT (ATOM)", "bad"])`, a red corner class `atomw` on the cell, and a tooltip with the lines and "From ATOM, data as of <date>. A flight planned earlier does not extend it here." The name badge from Task 7 adds the count of warned flights this month ("▲ n").

- [ ] **Step 1: Write the failing tests:** `warn_when_expired_by_flight_day` (a person whose Night Curr ends 27 Oct, NVG-2.0 on 5 Nov: warned; on 25 Oct: not), `warn_lists_every_missing_currency`, `warn_only_for_flights`, `warn_only_sup2`, `warn_none_when_unmatched_or_no_needs`, `corner_and_tooltip_render`, `name_badge_counts_warned_flights`, `block_of_days_over_flights_is_not_warned_twice` (a Block of days that puts a non-flight code never warns).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** `atomWarn` and the render hooks; the corner uses a CSS `::after` triangle.
- [ ] **Step 4: Rebuild, run, and screenshot against `previews/ATOM_currency_mockup_planner.png`.** Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 10: Ops Room seat mark

**Files:**
- Modify: `.dashboard_source.html` (`opsCrewCell`)
- Test: `tests/atom.test.js`

**Interfaces:**
- Consumes: `atomNeedsFor`, `atomFor`, `atomState`; `OPS_SEATS` (seat 0 is the Aircraft Captain).
- Produces: a small `<i class='opsb atomx'>` "CURR" on a seat whose person lacks (is `lap` on the flight's day) a currency that flight needs: seat index 0 uses `seat = "Captain"`, other seats `"Any"`. Tooltip: "Day Capt ended 16 Oct (ATOM as of <date>)". Applies to all departments that match; never changes the seat or blocks anything.

- [ ] **Step 1: Write the failing tests:** `seat_mark_for_captain_currency` (needs `Captain` row `Day Capt`; the captain seat is marked, the pilot seat is not), `seat_mark_for_any_currency`, `no_mark_when_current_or_unmatched`, `ops_room_still_renders_without_atom`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the mark next to the existing DOWN / MC / CRMO badges.
- [ ] **Step 4: Rebuild and run.** Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 11: Help, version, docs and full regression

**Files:**
- Modify: `.dashboard_source.html` (`HELP.cur`, version strings), `HANDOFF.md`, `PROJECT_CHECKLIST.md`, `CLAUDE.md`
- Test: `tests/atom.test.js`

**Interfaces:**
- Produces: help text for the Currency tab covering the ATOM grid, as-of, Names to fix and the flight-needs table; version `z91`.

- [ ] **Step 1: Write the failing tests:** `help_mentions_atom` (press the help button on the Currency tab), `version_is_z91` (both places).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the help text and version bump; update `HANDOFF.md` (what was built, how it matches, what is not built: layer 3 projection, SATR, hours), `PROJECT_CHECKLIST.md` (take Currency off hold, tick the ATOM lines), and `CLAUDE.md` (version line, `tests/` note for `atom.test.js`).
- [ ] **Step 4: Rebuild with `python3 .lodestar_build.py dashboard`; run `node tests/atom.test.js` and `node tests/my_lodestar.test.js`.** Expected: both all PASS, no page errors.
- [ ] **Step 5: Commit and push to `claude/elegant-clarke-dxb91d`.**
