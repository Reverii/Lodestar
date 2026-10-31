# Ops Room Ground Programme Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Ops Room ground programme table fills itself from the Master Planner and the five department plans, treats an empty crew as an input mistake, and lets the Ops Room edit, hide and add rows.

**Architecture:** All changes are in `.dashboard_source.html` (one file; the dashboard is rebuilt by `python3 .lodestar_build.py dashboard`). Row building (`opsGround`) is split into a pure model step (rows with structured people) and the existing table renderer in `renderOps`. Ops Room edits live in a dashboard-created `Ground Rows` sheet in `Ops_Room.xlsx` (same pattern as `Role Tags` / `Ops Add`), so no Excel layout change.

**Tech Stack:** Vanilla JS in the single-file dashboard, fflate for xlsx, Node + Playwright tests in `tests/` (helper `tests/lode_lib.js`).

**Spec:** `docs/superpowers/specs/2026-10-31-ground-programme-rework-design.md`

## Global Constraints

- Offline, macro-free `.xlsx`, no network beyond SharePoint REST; dev build only (keep any dev-only code inside `/*DEV*/ ... /*/DEV*/`).
- Never overwrite a live `.xlsx` in the repo folder. Excel files for tests are built into another folder (`python3 .lodestar_build.py excel ../lodestar_rebuild --data input/LODESTAR_Data_Input.xlsx`) and passed with `LODE_FILES=<folder>`.
- No cell moves in any Excel builder, so `LAYOUT` stamps stay as they are. If a task finds it must move a cell, stop and ask Brandon.
- Wording: 121 SQN is one squadron; plain English; the Master Planner sheet stays named `Ground Programme`, shown as "Squadron events"; the Ops Room card stays titled "Ground programme".
- Squadron events: crew tags `ALL` or `P L T S1 S2`; **blank is an error, never "everyone"**; new events start empty; an empty Personnel cell is never shown as TBC, blank or "ALL RELEVANT PERSONNEL" unless ALL was chosen.
- Dashboard version string `Dashboard version 2026-10-31 z111` in two places (`#wDiag` line ~1019 and `spDiag` line ~4733).
- Not required (do not build): double-booking check, PDF export, naming individual people on a Master Planner event, a migration of blank-crew events.

## Review Focus

- A flight code whose crew is blank: flights keep their present behaviour (only ground events change). Test: a flight with blank crew still reaches its department.
- Two departments with the same activity but different until-dates must stay separate rows.
- A squadron event and a department item with the same activity but on different days must not merge.
- An override whose source row disappeared (planner renamed the item) must survive as a visible manual row, not vanish.
- A hidden row must stay hidden after reload and after the 15-second live refresh.
- A read-only user (department view) sees the table and red marks but no pencil, hide or add controls.

## File Structure

- Modify `.dashboard_source.html`: crew helpers (~1622-1630), `deptGround` (~1868), Master Planner day panel (~2810) and click handler (~3033-3050), calendar chips (~2767), Ops Room reader (~3655), `opsGround` (~4065), `renderOps` ground card (~3982-3990), year rollover (~5082), version strings.
- Modify `.build_master_planner.py`: Ground Programme sheet header text (row 2) only. Do not rebuild or replace the live `Master_Planner.xlsx`.
- Modify `tests/ops_room.test.js`, `tests/master_calendar.test.js`; create `tests/ground_rows.test.js` for the new sheet and edit flow.
- Modify `HANDOFF.md`, `PROJECT_CHECKLIST.md`.

---

### Task 1: ALL tag and "blank crew is an error" (Master Planner side)

**Files:**
- Modify: `.dashboard_source.html` (`CREW_TAGS`/`crewTags` ~1622, `needsDept` ~1630, `deptGround` ~1868, day panel ~2810, `.gtag` handler ~3047, calendar chip ~2767)
- Modify: `.build_master_planner.py` (Ground Programme header row 2)
- Test: `tests/master_calendar.test.js`

**Interfaces:**
- Produces: `crewIsAll(v: string): boolean` (true when the cell holds the token ALL, any case); `crewMissing(v: string): boolean` (true when `crewTags(v)` is empty and not `crewIsAll(v)`); `needsDeptGr(v: string, dept: string): boolean` = `crewIsAll(v) || crewTags(v)` contains the department's tag (blank gives false).
- `needsDept` is left unchanged for flights.

- [ ] **Step 1: Failing tests** in `tests/master_calendar.test.js` (use the same boot/helpers as the file's other tests):
  - `ground_blank_crew_is_flagged`: push a ground event with `crew: ""` into `masterBook().S.gr`, render the Master Planner day panel; assert the panel HTML contains `NO CREW` and does not contain `everyone`.
  - `ground_all_and_tags_clear_flag`: set `crew: "ALL"`, then `crew: "S1 S2"`; assert no `NO CREW` in either.
  - `ground_new_event_starts_empty`: click `[data-gadd]`; assert the new row's `crew === ""` and the panel shows `NO CREW`.
  - `ground_all_is_exclusive`: toggling the ALL chip clears other tags; toggling a role tag clears ALL.
  - `dept_copy_follows_tags`: `deptGround(P, mi, d, "SUP 2")` returns the event for `crew: "ALL"` and `"S2"`, returns "" for `""` and `"T"`.
  - `flight_blank_crew_unchanged`: `needsDept("", "SUP 2") === true`.
- [ ] **Step 2: Run** `python3 .lodestar_build.py dashboard && node tests/master_calendar.test.js` and confirm the new tests FAIL.
- [ ] **Step 3: Implement** the three helpers next to `crewTags`; add an `ALL` chip before P in the day panel's tag row and replace the "everyone" span with a red `NO CREW` mark (class `nocrew`, red text, one CSS rule near `.tag`); make the tag-toggle handler keep ALL exclusive; point `deptGround` at `needsDeptGr`; give a ground calendar chip a red dot class when `crewMissing`. Reword the sheet header in `.build_master_planner.py` to "Crew: ALL, or tags P L T S1 S2. Blank is an error."
- [ ] **Step 4: Run** the same command; all `master_calendar` tests PASS.
- [ ] **Step 5: Commit** `git add -A && git commit -m "Squadron events: ALL tag, blank crew is flagged"` (with the attribution lines).

---

### Task 2: Ops Room row model (merge, borrow, NO PERSONNEL)

**Files:**
- Modify: `.dashboard_source.html` (`opsGround` ~4065, ground card in `renderOps` ~3982-3990, CSS near `table.gtab`)
- Test: `tests/ops_room.test.js`

**Interfaces:**
- Consumes: `crewIsAll`, `crewMissing`, `crewTags` (Task 1); `deptChip(dept)`, `opsCatCls(p)` (existing).
- Produces: `opsGround(D)` rows with fields `{ key, src: "sq"|"dept"|"manual", sh, grp, act, desc, when, until, uk, note, people: [{dept, ini, cls}], label, all, empty }`. `key` is `src|activity(upper)|slot|until-iso` for automatic rows. `who` HTML is built from these in one function `opsWho(row): string` that renders: dept dot + `A / B / C` in Cat colours, then `label` (tag group such as "SUP 1, SUP 2"), or "ALL RELEVANT PERSONNEL" when `all`, or a red `NO PERSONNEL` mark when `empty`; more than 4 names show the first 4 and `+N` with the full list as the `title`.

- [ ] **Step 1: Failing tests** in `tests/ops_room.test.js` (extend the existing ground tests; set squadron rows with `mb.S.gr.push`, department cells with the helpers the file already uses). First change the existing fixtures at lines ~93 and ~107 to `crew: "ALL"` so they keep their meaning.
  - `ground_blank_crew_no_personnel`: squadron row `crew: ""`, nobody planned, assert the row's cell contains `NO PERSONNEL` and not `TBC`.
  - `ground_all_text`: `crew: "ALL"` shows `ALL RELEVANT PERSONNEL`.
  - `ground_tags_label`: `crew: "S1 S2"` shows `SUP 1, SUP 2`.
  - `ground_merge_departments`: two departments plan the same activity (one admin/ground code) in the same slot with the same until-date; assert one table row, both callsigns present, two department dots.
  - `ground_no_merge_other_until`: same but one run is longer; assert two rows.
  - `ground_borrow_from_squadron_event`: a squadron event `PSM`, `1400-1600`, note `121 CR`, `crew: "S2"`, plus a department item `PSM` on the same day; assert one row with time `1400H-1600H`, location `121 CR`, and the department person named; assert a department item on a different day does not merge.
  - `ground_long_list_plus_n`: six people on one item shows `+2` and a `title` containing all six.
- [ ] **Step 2: Run** `node tests/ops_room.test.js ground` and confirm the new tests FAIL.
- [ ] **Step 3: Implement.** Restructure `opsGround`: (a) squadron rows from `D.gr` (src `sq`); (b) department groups as today but collected into one `Map` across all books keyed `sh|act|until`, accumulating `people`; (c) a department group whose activity code or description matches (`same`) a squadron row of that day is folded into that row instead of emitted (its people are added; time and note come from the squadron row); (d) department `own` ground-row text keeps its department chip as personnel; (e) set `empty` when no people, no label, not `all`. Keep the existing sort (`grp`/`key`). Keep `grow`/the table markup but build the Personnel cell with `opsWho`.
- [ ] **Step 4: Run** `node tests/ops_room.test.js`; the whole file PASSES (about 40 checks plus the new ones).
- [ ] **Step 5: Commit** `git commit -am "Ops Room ground table: merge departments, borrow from squadron events, flag empty"`.

---

### Task 3: Ground Rows sheet (storage, edits, hide, manual rows)

**Files:**
- Modify: `.dashboard_source.html` (constants near `ROLE_SHEET` ~1590, Ops Room reader ~3655, template-replacement `sheetEnsure` list ~2195, `opsGround`, year rollover ~5082)
- Create: `tests/ground_rows.test.js`

**Interfaces:**
- Produces constants `GRR_SHEET = "Ground Rows"`, `GRR_ROW0 = 2`, `GRR_N = 600`; sheet columns `Date | Key | Kind | Time | Activity | Location | Personnel | Saved` (A..H). `Kind` is `edit`, `hide` or `manual`. Personnel text is plain callsigns separated by ` / ` or the word `ALL`.
- `grrSave(iso: string, key: string, kind: "edit"|"hide"|"manual", f: {time?, act?, note?, who?}): boolean` on the Ops Room book (returns false when the sheet is full or the user may not edit); `grrClear(iso, key): void` (removes the override or unhides); `grrNewKey(): string` (`m` + base36 timestamp).
- `opsGround(D)` applies overrides: an `edit` replaces only the non-empty fields it holds; `hide` drops the row (counted in `D.hiddenN`); `manual` adds a row with `src: "manual"`; an `edit` whose key matches no row becomes a manual row with `orphan: true`.

- [ ] **Step 1: Failing tests** in `tests/ground_rows.test.js` (boot as the Ops Room view like `ED` in `ops_room.test.js`; read the saved bytes with the same helper the role-tags test uses):
  - `edit_saves_only_changed_fields`: edit the location of a squadron row; assert the sheet row has Location set and Time/Activity/Personnel empty, the table shows the new location and still the original time and people.
  - `edit_survives_reload`: save, re-read the workbook bytes, reopen; assert the same table row.
  - `hide_and_unhide`: hide a row, assert it is gone and a `hidden (1)` link shows; unhide restores it.
  - `manual_row_requires_fields`: saving with no personnel (or no time or no activity) is rejected with a message and writes nothing; with `ALL` it saves.
  - `orphan_shows_as_manual`: save an edit, then rename the squadron row's activity; assert a row with a `was linked` mark exists and the override row is still in the sheet.
  - `read_only_has_no_controls`: as a department view assert no `.gedit`, `.ghide`, or `+ Ops row` button exist, but `NO PERSONNEL` still renders.
  - `change_log_entry`: after a save the Ops Room `Change Log` gained a row naming the sheet.
- [ ] **Step 2: Run** `node tests/ground_rows.test.js` and confirm FAIL (file does not exist yet apart from the tests).
- [ ] **Step 3: Implement** the constants, the loader in the Ops Room reader (fill `st.grr = Map(key|date -> {row, kind, f})` and `st.grrUsed`), `grrSave`/`grrClear`/`grrNewKey` modelled on `roleSet` (`sheetEnsure`, `put`, first free row, full-sheet toast), and the override pass at the end of `opsGround` before sorting. Add `GRR_SHEET` to the `sheetEnsure` template-replacement list. Use the existing change-log append path that `roleSet` callers use so the log entry happens on save.
- [ ] **Step 4: Run** `node tests/ground_rows.test.js` and `node tests/ops_room.test.js`; both PASS.
- [ ] **Step 5: Commit** `git add -A && git commit -m "Ops Room: Ground Rows sheet with edits, hidden rows and manual rows"`.

---

### Task 4: Ops Room controls (pencil, hide, hidden link, + Ops row)

**Files:**
- Modify: `.dashboard_source.html` (ground card in `renderOps` ~3990, click delegation for Ops Room, CSS, a small dialog modelled on the Ops Add dialog ~4276)
- Test: `tests/ground_rows.test.js`

**Interfaces:**
- Consumes: `grrSave`, `grrClear`, `grrNewKey` (Task 3); `opsEditable()` / `OPS` (existing); the roster lists of the open department books for the personnel picker.
- Produces: row buttons `.gedit` (pencil) and `.ghide` (x), a `+ Ops row` button in the card header, a `hidden (n)` link under the table, and `opsGroundDialog(row | null)` which opens the editor (Time, Activity, Location, Personnel as roster checkboxes grouped by department plus an ALL option) and calls `grrSave`.

- [ ] **Step 1: Failing tests** (`tests/ground_rows.test.js`, drive the real buttons with Playwright):
  - `pencil_edit_flow`: click `.gedit` on a row, change Location, Save; the table updates and the sheet has the override.
  - `hide_flow`: click `.ghide`, row disappears, `hidden (1)` appears, clicking it lists the row with an Unhide button.
  - `add_manual_flow`: click `+ Ops row`, fill Time `0900`, Activity `Fire drill`, pick two people, Save; row appears sorted by time; Save with nobody picked keeps the dialog open and shows a plain-English message.
  - `all_option_manual`: choosing ALL saves and shows `ALL RELEVANT PERSONNEL`.
- [ ] **Step 2: Run** `node tests/ground_rows.test.js` and confirm the new tests FAIL.
- [ ] **Step 3: Implement** the buttons (rendered only when `OPS || opsEditable()`), the dialog and the hidden list; keep the card scrolling behaviour (`opsGrowStrip`) working by re-measuring after render. Texts are plain English, full sentences for messages.
- [ ] **Step 4: Run** `node tests/ground_rows.test.js` and `node tests/ops_room.test.js`; both PASS.
- [ ] **Step 5: Commit** `git commit -am "Ops Room ground programme: edit, hide and add rows"`.

---

### Task 5: Rollover, regression sweep, version, docs

**Files:**
- Modify: `.dashboard_source.html` (year rollover ~5082; two version strings), `tests/my_lodestar.test.js` (version check only if it hard-codes zNN), `HANDOFF.md`, `PROJECT_CHECKLIST.md`

- [ ] **Step 1: Failing test** `rollover_clears_ground_rows` in `tests/ground_rows.test.js`: after "Start new year" logic runs on the Ops Room book (use the same path as the existing rollover test), overrides dated in the old year are gone and next-January ones remain, as for `Ops Add`.
- [ ] **Step 2: Run** and confirm FAIL, then add `Ground Rows` to the rollover edit list next to `edit("Ops Add", ...)` using `rollClear`/`keepRows` with the Date column; re-run to PASS.
- [ ] **Step 3: Bump** both version strings to `z111`.
- [ ] **Step 4: Regression sweep**, all must pass: `node tests/my_lodestar.test.js`, `node tests/master_calendar.test.js`, `node tests/ops_room.test.js`, `node tests/ground_rows.test.js`, `node tests/other_depts.test.js`, `node tests/role_tags.test.js`, `node tests/mp_export.test.js`. Also grep My Lodestar and the export for any place that reads ground crew as "blank = everyone" (`grep -n "\.crew" .dashboard_source.html`) and fix with `needsDeptGr` / `crewIsAll`. Skip `atom.test.js` (ATOM code is untouched).
- [ ] **Step 5: Docs.** In `HANDOFF.md` replace the OPEN ground-programme bullet with what was built (z111, behaviours, the `Ground Rows` sheet, orphans, blank crew now red); in `PROJECT_CHECKLIST.md` tick the ground programme rework under section 8 and add the ALL tag line under section 5. Tell Brandon which files to upload: the DEV dashboard only (no `.xlsx` change), and that old squadron events with a blank crew will show red until he fills them in.
- [ ] **Step 6: Commit** `git add -A && git commit -m "z111: ground programme rework, docs"`.
