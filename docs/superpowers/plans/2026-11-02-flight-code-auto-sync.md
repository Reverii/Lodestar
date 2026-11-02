# Flight code auto sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A flight code created on the Master Planner reaches every department's Activities sheet by itself on Save, and the Planner treats it as a flight at once, so Brandon's `AWAY S` problem cannot happen.

**Architecture:** Two dashboard-only changes. (B) `actIndex()` and the cell picker also accept a code that is on the Master Planner's Flight Codes list or sits on a MASTER row of this file, so "is it a flight" no longer depends on a manual copy. (2) A quiet, additive `autoSyncCodes()` runs just before every build of a department file (manual Save and autosave) and writes missing codes, and changed descriptions / Mission Types / syllabus tags, into that file's Activities. It never deletes. The Copy button, the "differs" notice and the Master Planner note about it go.

**Tech Stack:** The single-file dashboard `.dashboard_source.html`; Node + Playwright tests in `tests/`. No Excel builder or layout change.

**Spec:** `docs/2026-11-02-flight-code-and-hours-sync.md` (options 2 and B), with the decisions made in the 2 Nov chat listed under Global Constraints.

## Global Constraints

- No layout change: do not touch the builders, the `LAYOUT` constant or any layout stamp. Upload the DEV dashboard only.
- Offline, no CDN; dev-only code (none expected) goes inside `/*DEV*/ ... /*/DEV*/`.
- Bump the dashboard version string from `2026-11-02 z130` to `2026-11-02 z131` in both places (`#wDiag` and `spDiag`).
- **Additive only (Brandon, 2 Nov):** the sync adds codes and updates description, Mission Type and syllabus tag of codes already in Activities. It never removes or renames an Activities row. No "inactive" flag (Brandon said not needed).
- A code that stays in Activities but is no longer on the Master Planner list is "retired": it keeps working on every cell that already uses it (counts, colours, hours), and is not offered in the picker except where a MASTER row carries it.
- Sync runs only for a department planner the user may edit (`mayEdit(bi)`), never for view-only or other departments' files, never for the Master Planner, Duty Roster or Ops Room.
- A save must never be blocked or delayed by the sync: no `alert`, no `confirm`; problems go to a toast.
- Wording: plain English, full sentences; 121 SQN is one squadron.

## Review Focus

- XBL case: a code removed from the Master Planner's list (or never copied) that earlier months' cells still use keeps counting as a flight with its hours, and Activities still lists it after a save.
- A code on the Master Planner list with a different upper/lower case or inner spaces from the one in Activities (`away s` vs `AWAY S`) is the same code, never added twice.
- A Master Planner code that already exists in Activities under a non-flight category (a ground code with the same name) is left alone and named in the toast; it is not added a second time.
- Activities completely full (`NA` rows): the save still goes through, with a toast naming the codes that did not fit.
- A department file whose Master Planner is open for a different plan year, or not open at all (Master Planner failed to load): no sync, no error, and the picker and flight test fall back to Activities plus MASTER rows.

## File structure

- `.dashboard_source.html`: `actIndex`, a new `masterCodeSet`, picker list in `openPop`/the picker builder (around `popItems`), `codeDiffs`, `syncCodes` (replaced by `autoSyncCodes`), `renderActs`, the Master Planner note (~line 3571), the Codes page help text (~line 3420), the Activities help (`acts:` help string), `saveOwn`, `autoSaveBook`, version strings.
- `tests/code_sync.test.js` (new): all checks below; needs a layout-4 set via `LODE_FILES` like the other tests.
- `HANDOFF.md`, `PROJECT_CHECKLIST.md`: record z131.

---

### Task 1: A Master Planner or MASTER-row code counts as a flight (B)

**Files:**
- Modify: `.dashboard_source.html` `actIndex` (~line 2878), the picker builder (~line 5059-5072), `isFlightCode` (line 1667)
- Test: `tests/code_sync.test.js` (create)

**Interfaces:**
- Produces: `masterCodeSet(st: bookState) -> Set<string>`: upper-case codes that are on the Master Planner's Flight Codes list (`masterBook().S.codes`, only when its `year` equals `st.year`) or on any MASTER row cell of `st.m` (both slots, every shift, every month; also codes in the `+N more` note of slot 2, parsed with `MORE_RE` / `moreSplit` as `plannedFlights` does; a `2xFLT` style prefix is stripped as in `plannedFlights`).
- Produces: `actIndex()` returns, for each code in `masterCodeSet(S)` that Activities does not hold, an entry `{ code, desc: "", cat: flCatName(S), ci: CAT_FLIGHT, sorties: 1, hours: 0, virtual: true }`. A code Activities holds in any category keeps its own entry (never overridden).
- Produces: `isFlightCode(st, code)` true for the same virtual codes (uses `masterCodeSet(st)` when Activities has no row).

- [ ] **Step 1: Write the failing tests** in `tests/code_sync.test.js` (copy the harness header from `tests/flight_code_combo.test.js`; open SUP 2 with the others, then remove one flight code row from SUP 2's Activities in memory to simulate "never copied"):
  - `code_on_master_list_is_a_flight_without_copy`: take a code from `masterBook().S.codes`, delete its row from `S.acts`; assert `isFlightCode(S, code)` and `actIndex().get(code.toUpperCase()).ci === CAT_FLIGHT`.
  - `code_on_master_row_is_a_flight_when_not_on_any_list`: delete the code from both Activities and the Master Planner's `codes`, put it in `S.m[10].master[0][24]`; assert `isFlightCode` is true.
  - `picker_offers_planned_flight_with_missing_activity`: with the Activities row removed and the code on the day's MASTER row, open the picker on that person's AM cell (`popItems` after `openPop`/the builder call) and assert an item with that code and `grp` "AM flights" exists (the AWAY S case).
  - `ground_code_with_same_name_stays_ground`: add a ground-category Activities row `ZZG`, also add `ZZG` to the Master list; assert `actIndex().get("ZZG").ci` is the ground category index.
- [ ] **Step 2: Run** `python3 .lodestar_build.py dashboard && LODE_FILES=<fresh layout-4 set> node tests/code_sync.test.js`. Expected: the four tests FAIL.
- [ ] **Step 3: Implement** `masterCodeSet` next to `plannedFlights` and cache it per book by a cheap stamp: recompute only when `books` changed or any MASTER-row cell was written (clear the cache in `setVal`, in the Master copy path and in the reparse path; if that is too many places, skip caching and measure: it must stay under 5 ms for 13 months). Make `actIndex` add the virtual entries after the Activities loop.
- [ ] **Step 4: Picker.** In the picker builder, build the per-shift flight list from `S.acts` plus the virtual entries for codes in that shift's `plannedFlights` map (virtual item: `{ code, desc: "", cat: flCatName(S) }`). Keep `isFl` reading `A`. The `isMaster` branch (the MASTER row picker) lists only Activities flight rows that are also on the Master Planner list when it is open for the same year; with no Master Planner open it lists all Activities flight rows as today.
- [ ] **Step 5: Run** the new tests. Expected: 4 PASS. Also run `node tests/wd_row.test.js`, `node tests/flight_card.test.js`, `node tests/crew_matrix.test.js` and confirm no new failures (same `LODE_FILES`).
- [ ] **Step 6: Commit**

```bash
git add .dashboard_source.html tests/code_sync.test.js
git commit -m "Planner: a Master Planner code counts as a flight without the copy (z131)"
```

---

### Task 2: Additive auto sync on every save

**Files:**
- Modify: `.dashboard_source.html` `syncCodes` (~3460), `saveOwn` (~2713), `autoSaveBook` (~2580)
- Test: `tests/code_sync.test.js`

**Interfaces:**
- Consumes: `masterBook()`, `flCatName`, `isFlAct`, `same`, `codeKey` (line 3312, ignores case and spaces), `NA`, `ACT_ROW0`, `put`.
- Produces: `autoSyncCodes() -> { added: string[], changed: string[], skipped: string[], full: string[] }`. Runs against the current book `S`. Returns empty lists and writes nothing unless `!S.kind`, `mayEdit(cur.b)`, a Master Planner is open with `P.year === S.year`.
  - Missing code (`codeKey` not in Activities in any category): write to the first row with no code, columns A code, B desc, C cat = `flCatName(S)`, F mtype if `S.hasCur`, K stag if `S.hasStag` (the same cell writes `syncCodes` does today; D and E stay empty). If no empty row is left the code goes in `full`.
  - Existing flight row whose desc, mtype or stag differs: update those cells only; code and category untouched.
  - Code present in Activities with a non-flight category: not touched, goes in `skipped`.
  - Never clears or moves any other Activities cell.
- Produces: `syncQuiet()` wrapper that calls `autoSyncCodes()` with `undoPend = true` (not an undo step, same pattern as `curQuiet`) and, if anything changed, shows one toast: `Added flight codes from the Master Planner: AWAY S, ...` (plus ` Could not add ...: Activities is full.` / ` Left alone ...: already a ground code.` when those lists are not empty). Called immediately next to `curQuiet()` in `saveOwn` (before `const sent = new Map(dirty)`) and in `autoSaveBook` inside `withBook` (before `sent = new Map(dirty)`).

- [ ] **Step 1: Write the failing tests** (the SUP 2 book is `books[0]`, editable):
  - `save_adds_missing_code_to_activities`: remove one flight row from `S.acts` (and its dirty cells), call `syncQuiet()`; assert `S.acts` has the code again with the Master Planner's description and Mission Type, and `dirty` holds `Activities!A<row>`..`C<row>`.
  - `case_and_spaces_do_not_duplicate`: set Activities code to a lower-case, space-less version of a Master code; `syncQuiet()` adds nothing and `S.acts.filter(codeKey equal).length === 1`.
  - `changed_description_is_updated_not_the_code`: change one Master code's `desc`; sync updates only Activities column B of that row.
  - `retired_code_stays`: delete a code from the Master Planner's `codes` that Activities and a plan cell still use; sync; `S.acts` still has it, `isFlightCode` still true, `monthStats` flight count for that person is unchanged.
  - `ground_name_clash_left_alone`: Activities has ground row `ZZG`, Master has `ZZG`; sync adds no second `ZZG` and the toast text contains `ZZG`.
  - `full_activities_does_not_block_save`: fill every Activities row, sync with one missing Master code; `full` contains it, no exception, no `alert` (stub `window.alert` to throw).
  - `view_only_and_other_departments_do_not_sync`: after `useBook` of another department (and with `books[0].noEdit = true`), `autoSyncCodes()` returns empty lists and `dirty` is unchanged.
  - `master_other_year_does_not_sync`: set `masterBook().S.year` to `S.year + 1`; sync does nothing.
  - `save_path_runs_the_sync`: remove a code, call `await saveOwn()` with a stubbed `spSave`/file handle as `tests/refresh.test.js` does, assert the saved Activities has the code.
- [ ] **Step 2: Run** `node tests/code_sync.test.js`. Expected: the new tests FAIL (`syncQuiet` not defined).
- [ ] **Step 3: Implement** `autoSyncCodes` and `syncQuiet` per the Interfaces block; rewrite `syncCodes`'s row-write helper (`set(...)` closure) as a shared `actPut(i, a)` so both use the same cells, then delete `syncCodes`.
- [ ] **Step 4: Run** `node tests/code_sync.test.js`. Expected: all PASS. Run `node tests/refresh.test.js` and `node tests/changelog.test.js`: no new failures (the sync's cells must appear in the Change Log as Activities edits only if that sheet is logged today; do not add special handling).
- [ ] **Step 5: Commit**

```bash
git add .dashboard_source.html tests/code_sync.test.js
git commit -m "Departments: flight codes sync from the Master Planner on every save, add only (z131)"
```

---

### Task 3: Remove the Copy button and the "differs" notices, update wording

**Files:**
- Modify: `.dashboard_source.html` `renderActs` (~4838-4846), `codeDiffs`/`codeDiffN` (3449-3459), the Master Planner note (~3571), `renderCodes` note (~3420), the `acts:` help text (~6208), the version strings (1078, 5320), the click handler (6377)
- Modify: `HANDOFF.md`, `PROJECT_CHECKLIST.md`
- Test: `tests/code_sync.test.js`, `tests/my_lodestar.test.js` (its version check)

**Interfaces:**
- Consumes: `autoSyncCodes` (Task 2).
- Produces: `codeDiffs(st, P)` is deleted together with `codeDiffN`, the `#codeSync` button and the `$("actSync")` click handler (nothing else may reference them; grep to confirm). The `#actSync` line shows `Flight codes come from the Master Planner and are added here when you save.` (when the Master Planner is open: plus `Waiting to add: AWAY S` listing codes the sync would add, computed by a read-only dry run `pendingCodes() -> string[]`; when it is not open: `Open the Master Planner (Add other departments) to see them.`). Retired codes are not marked.

- [ ] **Step 1: Write the failing tests:**
  - `activities_page_has_no_copy_button`: `renderActs()`; `#codeSync` absent; `#actSync` text contains `come from the Master Planner`.
  - `waiting_list_names_codes_that_will_be_added`: remove an Activities row, `renderActs()`; `#actSync` text contains that code; after `syncQuiet()` and `renderActs()` it does not.
  - `no_differs_note_on_the_master_planning_page`: the `#mpNote` HTML after `renderMp()` does not contain `Flight codes differ`.
  - `no_dangling_references`: `typeof codeDiffs === "undefined"` and `typeof syncCodes === "undefined"`.
- [ ] **Step 2: Run** `node tests/code_sync.test.js`. Expected: the four FAIL.
- [ ] **Step 3: Implement** the removals and the new `#actSync` text; implement `pendingCodes()` as the read-only part of `autoSyncCodes` (factor the decision into one function used by both; the writer applies its result). Update the Codes page note to `Every flight code the squadron uses lives here. Each department gets new and changed codes by itself the next time it saves.` and the Activities help to say flight codes are filled in from the Master Planner while ground codes stay editable. Bump both version strings to `z131`.
- [ ] **Step 4: Run** `python3 .lodestar_build.py dashboard && node tests/code_sync.test.js && node tests/flight_code_combo.test.js && LODE_FILES=<set> node tests/my_lodestar.test.js` (update the version check in `my_lodestar.test.js` to `z131`; the 3 old failures `changes_include_cancelled_flight`, `changes_include_master_move_and_duty`, `badge_count_matches_and_seen_is_remembered` may remain). Also run `ops_room`, `master_calendar`, `wd_row`. Expected: no new failures.
- [ ] **Step 5: Update the docs.** `HANDOFF.md`: new "z131" section at the top (what changed, the additive rule, retired codes stay, what to test on SharePoint: create a code on the Master Planner, save a department, check Activities; upload the DEV dashboard only) and replace the "Open design decision" paragraph under "Next session" with a pointer to z131. `PROJECT_CHECKLIST.md`: tick the open "Flight codes missing from a department's Activities" line as `[?]` built z131, awaiting Brandon's test.
- [ ] **Step 6: Commit**

```bash
git add .dashboard_source.html Flight_Ops_Planner_Dashboard.html tests HANDOFF.md PROJECT_CHECKLIST.md
git commit -m "Remove the Copy flight codes button, add the pending-codes line, z131"
```

---

## Self-review

- **Spec coverage:** option 2 (auto sync on save, block leaves manual copy, retired codes stay, dashboard only, no layout bump) is Tasks 2 and 3; B (MASTER rows / Master list decide what is a flight) is Task 1; the XBL scenario is the `retired_code_stays` test and Review Focus line 1; "no inactive flag" and "additive only" are Global Constraints. Option A (Excel hours) is deliberately left out (Brandon has not asked for it).
- **Types:** `masterCodeSet`, `autoSyncCodes`, `syncQuiet`, `pendingCodes` are defined once each and used with the same names in later tasks; `codeKey` and `flCatName` are existing helpers.
- **One departure from the note:** the note says "on open the dashboard compares"; this plan compares at save (and in `pendingCodes` for display) because writing on open would make a file dirty before anyone edits it. B makes the Planner correct in between.
- **Known risk to watch:** `actIndex()` is called from 18 places; Task 1 Step 3 requires measuring `masterCodeSet` cost and caching only if needed.
