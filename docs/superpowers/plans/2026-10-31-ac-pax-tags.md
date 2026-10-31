# AC and Pax tags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A planner can tag a flight cell AC or Pax on the planner grid; the Ops Room starts from those tags and its own choices still win.

**Architecture:** Tags live in a dashboard-created `Role Tags` sheet in each department file (like `Change Log`), read into `S.roleTags` and written through `put()` so save, undo and the Change Log work unchanged. The Ops Room seat builder (`opsDay`) and the dashboard-only totals read one helper, `roleOf`.

**Tech Stack:** `.dashboard_source.html` (single-file JS app), Node + Playwright tests in `tests/`, `python3 .lodestar_build.py dashboard`.

**Spec:** `docs/superpowers/specs/2026-10-31-ac-pax-tags-design.md`

## Global Constraints

- Offline, macro-free `.xlsx`; no builder change, no layout stamp bump, no migration (spec: "Storage").
- Dev mode: ship the dev build; bump `Dashboard version 2026-10-30 z101` to `z102` in both places (`#wDiag`, `spDiag`).
- Never overwrite a live `.xlsx` in the repo folder. Tests read the demo files and do not save into them.
- Wording: 121 SQN is one squadron; plain English, full sentences.
- Tags: `AC` (Pilot department only) and `PAX` (any department). No co-pilot tag. Excel monthly totals are not changed.
- Saving a Pax "decided, nobody" in the Ops Room Pax column uses the single character `-`.

## Review Focus

- A tagged person is later removed from the cell or the cell becomes a non-flight: the tag must be ignored (no ghost AC or PAX chip, no ghost seat).
- Two AC tags on a single-aircraft flight: both pilots stay seated or additional; nobody is dropped.
- AC tag on a pilot who is also the only pilot: that pilot is Captain and the Pilot seat is empty, not duplicated.
- Pax tag on someone the Ops Room has already seated: the Ops Room's saved seat wins; they are not unseated.
- The tag sheet is full (more than 1500 rows): a clear message, not silent loss.

---

## File Structure

- `.dashboard_source.html`: all code (existing single-file pattern). New code sits in one block headed `// ---------- role tags (AC / Pax)` placed after the Cell Notes constants (`NOTE_ROW0`, ~line 1543).
- `tests/role_tags.test.js`: new.
- `PROJECT_CHECKLIST.md`, `HANDOFF.md`, `CLAUDE.md` (test list line): updated at the end.
- `Flight_Ops_Planner_Dashboard.html`: rebuilt by the driver.

### Task 1: Role Tags data layer

**Files:**
- Modify: `.dashboard_source.html` (new block; `readBook`-style loader next to the Cell Notes read at ~1503; `buildXlsx` at ~2139)
- Test: `tests/role_tags.test.js` (create)

**Interfaces:**
- Produces: `const ROLE_SHEET = "Role Tags", ROLE_ROW0 = 2, ROLE_N = 1500`
- Produces: `roleOf(st, mi, r, d) -> "AC" | "PAX" | ""` where `r` is the crew-grid row (`i*3+s`), `d` day index; reads `st.roleTags` (Map key `mi + ":" + r + ":" + d` -> tag) and returns "" unless the cell's activity is a flight (`CAT_FLIGHT`).
- Produces: `roleSet(mi, r, d, tag)` (current book via `S`): `tag` is `"AC"`, `"PAX"` or `""`; writes the row through `put()`; returns false and toasts "The Role Tags sheet is full." when no free row.
- Consumes: `put`, `sheetEnsure`, `readCells`, `serialToISO`, `dateSerial`, `ymd`, `SHIFTS`, `same`, `actIndex` (all existing).

- [ ] **Step 1: Write the failing test** `data_layer_round_trip` in `tests/role_tags.test.js` (copy the harness header from `tests/other_depts.test.js`, using `boot({})` for the SUP 2 demo set). Assertions: after `roleSet(9, 3*0+0, 13, "PAX")` on a flight cell, `roleOf(S, 9, 0, 13) === "PAX"`; `dirty` contains entries on sheet `"Role Tags"`; `S.roleTags.size === 1`; after `roleSet(..., "")` the Map is empty and the row's four cells are written `""`; `roleOf` on a cell holding a non-flight code returns `""` even with a Map entry.
- [ ] **Step 2: Run** `node tests/role_tags.test.js` — expect FAIL (`roleSet is not defined`).
- [ ] **Step 3: Implement.** Loader: if `WB.paths[ROLE_SHEET]`, read rows `ROLE_ROW0..ROLE_ROW0+ROLE_N-1` (A date serial, B shift, C callsign or name, D tag), resolve person by callsign then name exactly as the Cell Notes loader does (lines 1508-1514), fill `st.roleTags` and `st.roleRow` (key -> row) and `st.roleUsed` (Set of used rows). `roleSet` calls `sheetEnsure(WB, ROLE_SHEET, ["Date","Shift","Callsign","Tag"], ROLE_COLS)` first, reuses the key's row or the lowest unused row, and `put`s A..D. `buildXlsx` gets the same `sheetEnsure` line the ATOM sheet has (line 2139) for `bySheet[ROLE_SHEET]`, because it silently skips sheets that do not exist.
- [ ] **Step 4: Run** the test — expect PASS.
- [ ] **Step 5: Add Review Focus tests** `stale_tag_ignored` (cell changed to a non-flight code, tag not reported) and `sheet_full_message` (fill `roleUsed` to `ROLE_N`; `roleSet` returns false and the toast says the sheet is full).
- [ ] **Step 6: Commit** `git add .dashboard_source.html tests/role_tags.test.js && git commit -m "Role Tags sheet: read, write, roleOf"`

### Task 2: Planner grid popup and chips

**Files:**
- Modify: `.dashboard_source.html`: `#pop` markup (line 974), `openPop` (4328), the planner cell renderer (where `td[data-k]` cells are drawn in `renderPlanner`), CSS.
- Test: `tests/role_tags.test.js`

**Interfaces:**
- Consumes: `roleOf`, `roleSet` (Task 1), `mayEdit(cur.b)`.
- Produces: popup element `#popRole` with buttons `button[data-role="" | "AC" | "PAX"]`; cell chip `<i class="rtag ac|pax">AC|PAX</i>` inside the crew cell.

- [ ] **Step 1: Write failing tests** `popup_shows_role_row` (click a flight cell in the Pilot file: `#popRole` visible, has None / AC / Pax buttons; in the SUP 2 file it has None / Pax only; on a non-flight cell it is hidden), `click_sets_tag_and_chip` (click Pax: cell contains `i.rtag.pax`; click AC then None clears), `view_only_cannot_tag` (`books[cur.b].noEdit = true`: `#popRole` hidden and `roleSet` writes nothing).
- [ ] **Step 2: Run** — expect FAIL.
- [ ] **Step 3: Implement.** `#popRole` sits under `#popCN` and is shown by `openPop` when `!isMaster && cell is a flight && mayEdit(cur.b)`; the AC button only when `S.dept` is the Pilot department (`same(S.dept, "Pilot")`). The click handler calls `roleSet`, redraws, and keeps the popup open. The cell renderer appends the chip from `roleOf`. Chips show for everyone (read-only books included).
- [ ] **Step 4: Run** — expect PASS. Also run `node tests/planner_filter.test.js` — expect no regressions.
- [ ] **Step 5: Commit** `git commit -am "Planner grid: AC and Pax role row and chips"`

### Task 3: Dashboard numbers skip Pax

**Files:**
- Modify: `.dashboard_source.html`: My Lodestar month and plan code (`lodeMonth` 5242 and the code that counts flights and hours near 5127), `computeCurrency` (2510), `computeRest` (2468).
- Test: `tests/role_tags.test.js`

**Interfaces:**
- Produces: `isPaxCell(dept, id, iso, shift) -> boolean` over all open department books (uses `roleOf`); used by Task 4 too.

- [ ] **Step 1: Write failing tests** `pax_cell_not_counted` (tag one flight cell PAX: My Lodestar planned flights and hours for that person drop by that flight; `computeRest` flying-day run excludes the day; `computeCurrency` does not count the flight).
- [ ] **Step 2: Run** — expect FAIL.
- [ ] **Step 3: Implement** `isPaxCell` and make each of the three places skip a cell where `roleOf(...) === "PAX"`. Do not touch Excel formulas or the Excel totals columns.
- [ ] **Step 4: Run** `node tests/role_tags.test.js` and `node tests/my_lodestar.test.js` — expect PASS.
- [ ] **Step 5: Commit** `git commit -am "Pax cells do not count in dashboard numbers"`

### Task 4: Ops Room seating and the dash marker

**Files:**
- Modify: `.dashboard_source.html`: `opsCrewOn` (3659, add `role` to each crew entry from `roleOf`), `opsDay` (3690-3754), `paxList` (4080), the Pax toggle (4181), `isPax` (4081).
- Test: `tests/role_tags.test.js`; existing `tests/ops_room.test.js` must still pass.

**Interfaces:**
- Consumes: `roleOf`, `isPaxCell`.
- Produces: `paxList(o)` treats `-` as no one; `isPax(o, id, planned)`: when `o.pax` is non-empty (including `-`) the Ops Room's list wins, else a planner Pax tag (`planned`) counts.
- Produces: crew entries from `opsCrewOn` gain `role: "AC" | "PAX" | ""`.

- [ ] **Step 1: Write failing tests**: `ac_tag_makes_captain` (junior pilot tagged AC is in seat 0, senior is co-pilot in seat 1; untagged flight keeps the seniority swap); `two_ac_formation_pairs_in_roster_order` (flight with `ac: 2`, two AC pilots and two others: aircraft 1 gets the first AC and first other); `planner_pax_not_seated` (tagged Pax person is not in `seats`, appears in additional crew with the PAX badge, not credited in the hours map at 2494); `ops_removal_sticks` (Pax toggle off writes `-` to `o.pax`; `isPax` is false; after a reload of the saved fixture state it is still false); `ops_seat_beats_pax_tag` (a person already seated by the Ops Room and tagged PAX by the planner stays seated).
- [ ] **Step 2: Run** — expect FAIL.
- [ ] **Step 3: Implement.** In the pairing loop, remove Pax-tagged crew from the seat candidates and push them into `x.auto` additional crew. Replace the seniority swap with: if any pilot seated or auto-assigned on aircraft `a` has `role === "AC"`, that pilot takes seat 0 and the other takes seat 1; else the existing swap. When the toggle would leave `o.pax` empty, write `-`; `paxList` filters `-`.
- [ ] **Step 4: Run** `node tests/role_tags.test.js` and `node tests/ops_room.test.js` — expect PASS.
- [ ] **Step 5: Commit** `git commit -am "Ops Room starts from planner AC and Pax tags"`

### Task 5: Version, docs, full check

**Files:**
- Modify: `.dashboard_source.html` (both version strings to `2026-10-31 z102`), `PROJECT_CHECKLIST.md` (tick 9.5, note built and awaiting Brandon's test), `HANDOFF.md` (state and the new feature section), `CLAUDE.md` (add `node tests/role_tags.test.js` to the tests row).

- [ ] **Step 1:** Edit the two version strings and the docs.
- [ ] **Step 2:** `python3 .lodestar_build.py dashboard` — expect it to write `Flight_Ops_Planner_Dashboard.html` without touching any `.xlsx`.
- [ ] **Step 3:** Run `node tests/role_tags.test.js`, `node tests/my_lodestar.test.js`, `node tests/ops_room.test.js`, `node tests/other_depts.test.js`, `node tests/planner_filter.test.js`, `node tests/master_calendar.test.js` — expect all pass (skip `atom.test.js`: ATOM code is untouched, per the handoff).
- [ ] **Step 4:** `git status` shows no changed `.xlsx`.
- [ ] **Step 5: Commit and push** `git add -A && git commit -m "AC and Pax tags, dashboard z102" && git push -u origin claude/practical-lamport-j13scq`

---

## Self-review notes

- Spec coverage: storage (Task 1), planner grid (Task 2), Ops Room incl. dash marker and formation pairing (Task 4), numbers that skip Pax (Task 3), tests (each task), no-layout-change constraint (Global Constraints). The Excel-totals caveat is deliberately not built.
- Known execution risk: `buildXlsx` skips sheets missing from `WB.paths` (line 2142), handled in Task 1 Step 3. Line numbers are from today's source and will drift; search by the function names.
