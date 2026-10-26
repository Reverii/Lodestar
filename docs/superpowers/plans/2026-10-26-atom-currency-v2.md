# ATOM Currency v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Ops Room publishes an ATOM export once a day into a sheet in `Ops_Room.xlsx`; every dashboard reads five currencies and the month's clocked hours from it and shows them in the Planner (expiry-day marker, then alert), the Ops Room seats, the Currency tab and My Lodestar.

**Architecture:** Builds on v1 (z92, section `// ---------- ATOM currency` in `.dashboard_source.html`). The parser keeps only five currencies plus the hours. A publish writes the `AtomFile` shape into a dashboard-created sheet `ATOM Currency` in the Ops Room book (dirty cells through `put`, sheet created at save time by `sheetEnsure`); every dashboard rebuilds the same `AtomFile` from that sheet, so grid, matching, Names to fix, Planner, Ops Room and My Lodestar keep one code path. The v1 flight-needs table, its sheet and the name badges are removed.

**Tech Stack:** Vanilla JS in the single-file dashboard, fflate (inlined), Playwright tests in `tests/` (`atom.test.js`, `my_lodestar.test.js`), Python/openpyxl fixture `tests/make_atom_fixture.py`.

**Spec:** `docs/superpowers/specs/2026-10-26-atom-currency-v2-design.md` (v1 spec `2026-10-26-atom-currency-design.md` for the unchanged parts). Mock-up: `previews/Planner_pilot_1920_v3.png`.

## Global Constraints

- Offline single file, no CDN, no network except SharePoint REST on the same site; dev mode (new dev-only code inside `/*DEV*/ ... /*/DEV*/`); 1280x720 must still work.
- No builder or Excel layout change, no layout-stamp bump. The only new sheet is `ATOM Currency`, created by the dashboard in the Ops Room file.
- Read only these ATOM fields: Flight Currencies `Day Capt`, `Day Curr`, `IRT`, `Night Capt`, `Night Curr` and Flying Hours Clocked `Current Month`. Everything else is ignored and never stored (no SIM, LSS, Mission, Instructor Check, PAFI, SATR, I-SATR, FDT, sorties, remarks).
- Store only: Initials (the ATOM `Name`), department, CAT, the five values, the hours, and the as-of / source / month / published-by lines. Never full names. The export file itself is never kept or saved.
- Cell values: a date is an expiry (ISO text `YYYY-MM-DD` in the sheet); `-` not held; `N/A` not applicable; blank not recorded; other text kept and treated as not recorded.
- Status against the day looked at: expiry before the day = lapsed; within the due window (default 14 days) = due; else OK. The expiry day itself is still valid.
- Matching is by exact roster Initials within the department (case and spaces ignored); blank never matches (v1, unchanged).
- Day versus night follows the shift row of the flight: AM and PM = Day, NIGHT = Night. Capt currencies are only checked on the Aircraft Captain seat in the Ops Room; the Planner never alerts on them.
- No tint after the expiry day. Wording is "expires" / "expired" (never "ends" / "ended" / "lapsed" in new text).
- IRT is read and shown on the Currency tab and My Lodestar only; no Planner mark or alert (open item, Brandon will decide later).
- Only Ops Room view (`OPS` true with the Ops Room book open) may publish; everyone else is read-only.
- 121 SQN is one squadron; plain English.
- Tests use synthetic exports only (never Brandon's real exports in the repo).
- Bump version `2026-10-26 z93` to `z94` in both places in `.dashboard_source.html`.

## Review Focus

- Hours month: the export is from another month than the Planner month shown (including the first days of a new month, and a 31 Dec export): ATOM hours must not appear against the wrong month.
- A publish of fewer people than yesterday must leave no stale rows; a publish from an export that lacks a department writes only the departments it has (the Currency tab says which are missing).
- A department dashboard where the Ops Room file cannot be opened (missing, older layout without the sheet): no crash, no false "Names to fix"; the Currency tab says the data is not shared yet.
- Both a shared export and a file added by hand exist: the one in use is clear and the other cannot silently override.
- A flight planned on the expiry day itself (valid) next to the marker; a person with `-` / `N/A` for a currency (no mark, no alert); a person with blank Initials.

## File Structure

- Modify `.dashboard_source.html`: `atomParse` / `atomCell` / `ATOM_GROUPS` (reader), `atomGridRows` / `renderAtom` (Currency tab), v1 needs code (`ATOM_NEEDS*`, `atomNeeds*`, `atomBadge`, `atomWarn`, `atomWarnCount`, `atomSeatWarn`), `readOps`, `buildXlsx`, `spOpenDept`, `openOps`, Planner render (`renderPlanner` cell loop, legend), `opsCrewCell`, Planner totals (`FLN`), `lodeCards`, `lodeMonth`, `HELP.cur`, version strings.
- Modify `tests/make_atom_fixture.py` (hours column, an IRT column), `tests/atom.test.js` (rewrite what v1 tests assume), `tests/lode_lib.js` only if a boot option is needed.
- Docs: `HANDOFF.md`, `PROJECT_CHECKLIST.md`, `CLAUDE.md`.

Shared types (v2):
- `AtomCell = { k: "date"|"none"|"na"|"blank"|"text", iso: string|null, raw: string }` (unchanged)
- `AtomRow = { name, status, cat, instCat, cells: { [col in ATOM_CUR]?: AtomCell }, hours: number|null }`
- `AtomFile = { name, created, groups: [{ group: "Flight Currencies", cols: ATOM_CUR present }], sheets: { [dept]: AtomRow[] }, missing: string[], hoursMonth: "YYYY-MM"|"", source: "export"|"shared" }`
- `ATOM_CUR = ["Day Capt", "Day Curr", "IRT", "Night Capt", "Night Curr"]`

---

### Task 1: Reader keeps five currencies and the hours

**Files:** Modify `.dashboard_source.html` (`ATOM_GROUPS`, `atomParse`, `atomCell` unchanged), `tests/make_atom_fixture.py`, `tests/atom.test.js`

**Interfaces:**
- Produces: `ATOM_CUR`, `atomParse(files, name) -> AtomFile` where `groups` has only `Flight Currencies` limited to `ATOM_CUR` that exist, each row has `hours` (number or null) from header `Current Month` under group `Flying Hours Clocked`, and `hoursMonth = created.slice(0,7)` of the as-of date; `source = "export"`.
- Produces: fixture `--hours` default on: `Flying Hours Clocked / Current Month` numbers per person; Pilot sheet has all five currencies incl. `IRT` with values; other sheets only `Day Curr`, `Night Curr` (as in the real export).

- [ ] **Step 1: Write the failing tests** (replace the v1 parser tests that name SIM / ACE / APT / SVT / MAS / SAL): `parse_reads_only_the_five` (every group in `f.groups` is `Flight Currencies`, `cols` ⊆ `ATOM_CUR`; no `SIM`, `ACE`, `MAS`, `Instructor Check`, `Level`, `Remarks` anywhere in `JSON.stringify(f)`; the string `FAKE personal remark` absent), `parse_value_kinds` (A NGO: `Day Curr` date `2026-11-16`, `IRT` kind none, `Night Capt` kind blank, a text cell `soon` kind text, an Excel serial kind date), `parse_hours` (A NGO `hours === 3.9`; a person with `-` hours has `null`), `parse_hours_month` (`hoursMonth === "2026-10"` for the default fixture), `parse_moved_columns` (the `moved` variant with an extra and reordered column still yields the five by header name).
- [ ] **Step 2: Run** `node tests/atom.test.js parse_` — Expected: the new tests FAIL.
- [ ] **Step 3: Implement** in `atomParse`: keep the generic header scan, but only collect columns whose group is `Flight Currencies` and whose header is in `ATOM_CUR`, plus the one `Current Month` column under `Flying Hours Clocked` (store its letter as `hoursL`); fill `row.hours`; set `hoursMonth` and `source`. Update the fixture generator accordingly (keep the ignored groups in the fixture so the tests prove they are ignored).
- [ ] **Step 4: Rebuild** (`python3 .lodestar_build.py dashboard`) **and run** `node tests/atom.test.js parse_` — Expected: PASS.
- [ ] **Step 5: Commit** `ATOM v2: reader keeps five currencies and the hours`.

### Task 2: Remove the v1 needs table, name badges and mission / LSS logic

**Files:** Modify `.dashboard_source.html`, `tests/atom.test.js`

**Interfaces:**
- Removes: `ATOM_NEEDS*`, `atomNeedsRows/For/Set/Del/Html/Wire`, `opsBook` only if unused elsewhere (it is used by `allChits`: keep), the `readOps` `atomNeeds` read, the `ATOM Needs` creation in `buildXlsx`, `atomBadge`, `atomWarnCount`, the planner name badges, and v1 `atomWarn` / `atomSeatWarn` (rebuilt in Tasks 7 and 8). `sheetEnsure` stays (used by Change Log and Task 4).

- [ ] **Step 1: Write the failing tests:** `needs_table_is_gone` (`typeof atomNeedsFor === "undefined"` and no `#atomNeeds` on the Currency tab), `no_atom_name_badge` (match a pilot with lapsed currencies, open the Planner: `#plan i.curb[data-atom]` count is 0 and `#plan i.atomw` count is 0).
- [ ] **Step 2: Run** them — Expected: FAIL.
- [ ] **Step 3: Delete** the code listed above and delete the v1 tests that exercised it (`needs_*`, `planner_badge_*`, `warn_*`, `corner_and_tooltip_render`, `name_badge_counts_warned_flights`, `seat_mark_*`, `no_mark_when_current_or_unmatched`); keep `ops_room_still_renders_without_atom` and `closing_a_tab_keeps_matches_and_does_not_crash`, `atom_file_picked_first_with_ops_room_still_opens_the_app`; re-point `needs_sheet_is_added_at_save_time_after_a_merge` to Task 4.
- [ ] **Step 4: Rebuild; run** `node tests/atom.test.js` and `node tests/my_lodestar.test.js` — Expected: all PASS, no page errors.
- [ ] **Step 5: Commit.**

### Task 3: Currency tab and My Lodestar card show the five currencies and hours

**Files:** Modify `.dashboard_source.html` (`atomGridRows`, `renderAtom`, `atomCells`, `lodeCards`), `tests/atom.test.js`

**Interfaces:**
- Consumes: Task 1 `AtomFile`.
- Produces: `renderAtom` grid columns = the five (those present on the selected department) + a final "Hours (month)" column showing `row.hours` (one decimal) or a dash; `atomCells(row, day)` keeps its signature and returns `{ col, group, state, iso, days }` for the five; `atomIssues(bi, i, day)` unchanged shape; My Lodestar currency card text uses "expires" / "expired": `"Night Curr expired 5 Nov"` (lapsed) or `"Night Curr expires 5 Nov"` (due), `sub` "from ATOM, data as of <date>".

- [ ] **Step 1: Write the failing tests:** `grid_has_five_columns_and_hours` (Pilot: headers are `Day Capt, Day Curr, IRT, Night Capt, Night Curr, Hours (month)`; another department shows `Day Curr, Night Curr, Hours (month)`), `grid_hours_cell` (A NGO shows `3.9`, no hours shows `–`), `my_lodestar_card_wording` (a lapsed currency reads `... expired 16 Oct`, a due one `... expires 27 Oct`), keep the v1 grid tests that still apply (sorted worst first, only-problems filter, counts match cells, stale banner, empty state, fits 1280x720, no put calls).
- [ ] **Step 2: Run** `node tests/atom.test.js grid_` and `my_lodestar_` — Expected: FAIL.
- [ ] **Step 3: Implement** the column set from `f.groups` (already only the five), the hours column, and the wording; keep the legend ("Lapsed" becomes "Expired (expiry before today)").
- [ ] **Step 4: Rebuild and run** the filtered tests — Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 4: Publish into the `ATOM Currency` sheet

**Files:** Modify `.dashboard_source.html` (new `atomPublish`, `buildXlsx`, Currency tab button), `tests/atom.test.js`

**Interfaces:**
- Produces: `ATOM_SHEET = "ATOM Currency"`, `ATOM_SHEET_ROW0 = 8`, `ATOM_SHEET_N = 500`.
- Produces: `atomPublish(f: AtomFile) -> boolean` (false unless `OPS` and the Ops Room book is open). Writes with `withBook(opsIndex, () => put(ATOM_SHEET, ref, value))`: `A1` title, `A2/B2` "As of" + `atomAsOf(f)`, `A3/B3` "Source file" + `f.name`, `A4/B4` "Hours month" + `f.hoursMonth`, `A5/B5` "Published by" + `SP.user.Title || ""`, row 7 headers `Initials | Department | CAT | Day Capt | Day Curr | IRT | Night Capt | Night Curr | Clocked hours (month)`, people from row 8 (department order Pilot, Loadmaster, TACCO, SUP 1, SUP 2; date cells as ISO text, `-` / `N/A` / blank / other text as is, hours as a number); every row from the new last row to `ATOM_SHEET_ROW0 + ATOM_SHEET_N - 1` that held data is set to blank (read the existing cells from the book to know which). Adds one Change Log line `ATOM published: <file name>, as of <date>` through the normal log mechanism.
- Produces: `buildXlsx` adds the sheet with `sheetEnsure(WB, ATOM_SHEET, ["A"], ATOM_COLS)` when the dirty cells touch it (guard from the z92 review fix stays: skip any sheet path that does not exist).
- Produces: the Currency tab shows "Publish to everyone" (button `#atomPublish`, enabled only in the Ops Room view with the Ops Room book open) after a file is added; adding a file shows a confirm first: "Publish this ATOM export to everyone?"

- [ ] **Step 1: Write the failing tests:** `publish_writes_sheet_and_reads_back` (in Ops Room mode publish the fixture, `buildXlsx` for the Ops Room book, unzip, `readCellsOf` the sheet: `A8` = first Pilot Initials, `B2` as-of text, `E8` an ISO date, `I8` the hours number, no cell contains `FAKE personal remark`, no column beyond `I`), `publish_replaces_and_leaves_no_stale_rows` (publish the full file, then the `partial` variant: only Pilot and SUP 2 rows remain, row count equals the partial's people, rows below are blank), `publish_only_in_ops_room_view` (`atomPublish` returns false and writes nothing when `OPS` is false; button disabled), `publish_sheet_created_after_a_merge` (the z92 merge scenario: replace the book's files with a pristine copy lacking the sheet, `buildXlsx` still outputs the sheet and no `undefined` entry), `publish_logs_a_line` (a Change Log line exists with the file name), `publish_stores_only_allowed_fields` (header row equals the nine headers; no name column).
- [ ] **Step 2: Run** `node tests/atom.test.js publish_` — Expected: FAIL (`atomPublish` not defined).
- [ ] **Step 3: Implement** `atomPublish`, the `buildXlsx` hook, and the button with its confirm.
- [ ] **Step 4: Rebuild and run** `node tests/atom.test.js publish_` — Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 5: Read the shared sheet into the same `AtomFile`

**Files:** Modify `.dashboard_source.html` (`readOps`, new `atomFromShared`, `atomCurrent`, `renderAtom`), `tests/atom.test.js`

**Interfaces:**
- Consumes: Task 4 layout.
- Produces: `readOps` fills `st.atomShared` (`null` when the sheet is absent) via `atomFromShared(cells, bookName) -> AtomFile` with `name = "Shared from the Ops Room"`, `source = "shared"`, `created` from `B2`, `hoursMonth` from `B4`, rows grouped by `Department`.
- Produces: `atomCurrent() -> AtomFile | null`: the file added by hand if any (the one selected in the Currency tab drop-down), otherwise the shared one; all v1 callers that used `ATOMS[cur.atom || 0]` call `atomCurrent()` instead. `ATOMS` stays the list of hand-added files; the shared one is never in `ATOMS`.
- Produces: the Currency tab says "Shared from the Ops Room, published <as-of> by <name>" or "File added by you (not shared)"; when no Ops Room book is open and nothing was added it says "The Ops Room has not shared ATOM data here yet".
- Live refresh: after the Ops Room book is re-read (existing merge / live refresh) the shared file is rebuilt; `atomMatch` memo key includes the shared sheet's as-of text.

- [ ] **Step 1: Write the failing tests:** `shared_sheet_read_into_same_shape` (publish, rebuild the book from `buildXlsx` bytes into a second page state via `readOps`, `atomFromShared` rows equal the published ones for names, five cells and hours), `shared_used_when_nothing_added` (no hand-added file, shared sheet present: grid shows rows and the label says Shared), `hand_added_wins_and_is_labelled` (add a file by hand: label says "File added by you", closing it returns to shared), `shared_missing_message` (no sheet: message shown, no error, no false Names to fix), `shared_older_ops_file_without_sheet` (an Ops Room book with no `ATOM Currency` sheet: same message), `shared_refresh` (replace the sheet content, trigger the existing reparse path, grid updates).
- [ ] **Step 2: Run** `node tests/atom.test.js shared_` — Expected: FAIL.
- [ ] **Step 3: Implement** the reader, `atomCurrent`, the label, and switch the v1 callers.
- [ ] **Step 4: Rebuild; run** `node tests/atom.test.js shared_` and the earlier grid tests — Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 6: Department dashboards open the Ops Room file read-only

**Files:** Modify `.dashboard_source.html` (`spOpenDept`, `openOps` callers for the folder picker, the single-file flow `load`), `tests/atom.test.js`

**Interfaces:**
- Produces: in SharePoint mode `spOpenDept` also loads the Ops Room file (`spFileFor` for the Ops Room file key, as `spOpenOps` finds it) as an "other" book; in the dev folder and `Add other departments` flows nothing new is forced. A failure to load it adds to the error list and never blocks the planner. Department users stay read-only for it (`put` already refuses when `cur.b !== 0 && !OPS`).

- [ ] **Step 1: Write the failing tests** (with the SharePoint mock if one exists in `tests/`; otherwise assert the function builds the file list): `dept_open_includes_ops_room` (the list of files `spOpenDept` loads contains the Ops Room file name), `dept_cannot_publish` (a department book in non-Ops mode: `atomPublish` false), `dept_without_ops_room_still_works` (Ops Room load throws: the planner opens, an error line is listed, no crash).
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement**; check what `spOpenOps` uses to find the Ops Room file and reuse it.
- [ ] **Step 4: Rebuild and run** `node tests/atom.test.js dept_` plus `node tests/my_lodestar.test.js` — Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 7: Planner layer 1 (expiry-day marker) and layer 2 (alert)

**Files:** Modify `.dashboard_source.html` (`renderPlanner` cell loop, legend, CSS), `tests/atom.test.js`

**Interfaces:**
- Consumes: `atomFor(bi, i)`, `atomState`, `atomCurrent()`.
- Produces: `atomDayMarks(bi, i, iso, s) -> { marks: [{ col, kind: "curr"|"capt", label }], alert: { lines: string[] } | null }` where `s` is the shift row 0 AM, 1 PM, 2 NIGHT and `flight` is decided by the caller. `marks`: for a Day shift row, `Day Curr` (kind curr) and `Day Capt` (kind capt) whose expiry `iso` equals the day; for the NIGHT row, `Night Curr` / `Night Capt`; label `"<col> expires"`. `alert` (only when the cell holds a Flight activity and not cancelled): the `Curr` currency for that shift (`Day Curr` for AM/PM, `Night Curr` for NIGHT) whose expiry is before `iso`: lines `"<col> expired <d Mon>"`. `-`, `N/A`, blank, text give nothing. Capt and IRT never alert.
- Produces: render: expiry-day cell gets classes `l1end curr|capt` and the short label div, tooltip line `"Night Curr expires 5 Nov"`; an alert gets the existing red corner class and `⚠ NOT CURRENT`, tooltip lines plus `From ATOM, data as of <as-of>`. Legend chips: expiry day (orange edge), Capt (outline), not current. No tint after the expiry day; no name badge.

- [ ] **Step 1: Write the failing tests:** `marker_on_expiry_day_only` (V TAN Night Curr `2026-10-27`: the NIGHT-row cell on 27 Oct has `l1end` and label `Night Curr expires`; 26 and 28 Oct have no `l1end`; AM and PM rows on 27 Oct have none), `marker_day_rows` (a Day Curr expiry marks AM and PM, not NIGHT), `capt_marker_is_outline_and_never_alerts` (`Night Capt` marker has class `capt`; a night flight after its expiry has no alert), `alert_on_and_after_expiry` (night flight on the expiry day: no alert; on the next day: alert with `Night Curr expired 27 Oct`), `alert_uses_the_shift_row` (a Day Curr expired person with a NIGHT flight and valid Night Curr: no alert; same person with an AM flight: alert), `no_marks_for_not_held` (`-`, `N/A`, blank: no marker, no alert), `irt_has_no_planner_mark` (IRT expiring on a day: no `l1end`, no alert), `cancelled_flight_not_alerted`, `no_tint_after_expiry` (cells after the expiry day have no `l1*` classes), `legend_has_new_chips`, `names_have_no_badges` (kept from Task 2).
- [ ] **Step 2: Run** `node tests/atom.test.js "marker_"` and others — Expected: FAIL.
- [ ] **Step 3: Implement** `atomDayMarks` and the render hook next to the existing cell warnings (`W`); reuse the corner CSS from z92 (`.atomw`); add `.l1end` / `.l1lab` styles from the mock-up (`previews` generator in the scratchpad is a visual reference; labels wrap to two lines inside the cell).
- [ ] **Step 4: Rebuild; run** the filtered tests and screenshot at 1920x1200 and 1280x720 against `previews/Planner_pilot_1920_v3.png` — Expected: PASS and close to the mock-up.
- [ ] **Step 5: Commit.**

### Task 8: Ops Room seat check

**Files:** Modify `.dashboard_source.html` (`opsCrewCell`, new `atomSeatWarn`), `tests/atom.test.js`

**Interfaces:**
- Produces: `atomSeatWarn(r, c, k) -> { lines } | null`: day or night from the flight's shift (`r.x.shift`: AM, PM = Day; NIGHT = Night); checks `<Day|Night> Curr`; for seat `k === 0` (Aircraft Captain) also `<Day|Night> Capt`; a currency expired before the flight's day gives `"<col> expired <d Mon>"`. Mark `<i class='opsb atomx'>CURR</i>` with the tooltip as in z92.

- [ ] **Step 1: Write the failing tests** (flight 2026-10-26 FLT-2.0 AM from the demo plan: captain ADDER, pilot SIDEWINDER): `seat_captain_checks_capt` (ADDER mapped to an ATOM person with `Day Capt` expired: marked; the pilot seat person with the same data: not marked), `seat_uses_shift` (a night flight checks Night, not Day), `seat_no_mark_when_valid_or_unmatched`, `ops_room_renders_without_atom`.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** (the shift of an Ops Room flight row: read from the row key the same way `opsKey` builds it; keep the z92 `atomSeatWarn` lookup of the person's book and roster index).
- [ ] **Step 4: Rebuild and run** `node tests/atom.test.js seat_` — Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 9: Clocked hours in the Planner totals and My Lodestar

**Files:** Modify `.dashboard_source.html` (`renderPlanner` totals `FLN`, `lodeMonth`, `lodeMonthHtml`), `tests/atom.test.js`

**Interfaces:**
- Produces: `atomHours(bi, i, mi) -> { h: number, asOf: string } | null`: the matched person's `hours` when `atomCurrent().hoursMonth` equals `YYYY-MM` of the month `mi` of that book's plan year and `hours` is a number; else null.
- Produces: in the Planner totals the "Flown Hrs" cell shows `atomHours` (title `from ATOM, as of <as-of>`), falling back to the Ops Room figure (`opsFlown`), then a dash. In `lodeMonth`, `hrsFlown` uses `atomHours` first and `lodeMonthHtml` labels it `from ATOM, as of <date>` when it did.

- [ ] **Step 1: Write the failing tests:** `hours_show_for_the_export_month` (export month 2026-10, Planner on October: the matched person's Flown Hrs cell reads `3.9` with the ATOM tooltip), `hours_not_shown_for_another_month` (Planner on November: no ATOM figure; falls back to the Ops Room value or a dash), `hours_year_boundary` (an export created 2026-12-31 is October-like: month is `2026-12`; January of the next year does not match), `hours_my_lodestar` (`lodeMonth` returns the ATOM hours and the label), `hours_without_atom_unchanged` (no ATOM: the z92 behaviour).
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Rebuild and run** `node tests/atom.test.js hours_` and `node tests/my_lodestar.test.js` — Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 10: Help, version, docs, full regression

**Files:** Modify `.dashboard_source.html` (`HELP.cur`, version strings), `HANDOFF.md`, `PROJECT_CHECKLIST.md`, `CLAUDE.md`, `tests/*`

**Interfaces:** Produces help text for the Currency tab (publish, shared, hand-added file, Names to fix, hours, IRT note), version `z94`.

- [ ] **Step 1: Write the failing tests:** `help_mentions_publish` (the help body contains `Publish`, `Ops Room`, `Initials`, `Names to fix`, `expires`), `version_is_z94` (both places, in `atom.test.js` and `my_lodestar.test.js`).
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** the help text and the version bump; update `HANDOFF.md` (v2 built, the shared sheet, what was removed, IRT open), `PROJECT_CHECKLIST.md` (tick the ATOM v2 lines, change the "actual flying hours tracking" line to the ATOM hours decision), `CLAUDE.md` (version line, Ops Room file now carries the `ATOM Currency` sheet).
- [ ] **Step 4: Rebuild with `python3 .lodestar_build.py dashboard`; run** `node tests/atom.test.js` and `node tests/my_lodestar.test.js` — Expected: both all PASS, no page errors.
- [ ] **Step 5: Commit and push** to `claude/elegant-clarke-dxb91d`.
