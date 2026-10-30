# Other departments open by themselves Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On SharePoint, open the other department planners read-only in the background, hide the "Add other departments" button there, and show "View only" (no Save) for files the person cannot edit.

**Architecture:** All changes in `.dashboard_source.html` (SharePoint section `spOpenDept` ~4720, the editing tests `bi === 0 || OPS`, the save button and book bar). SharePoint is stubbed in tests as in `tests/dept_select.test.js`.

**Spec:** `docs/superpowers/specs/2026-10-30-other-departments-design.md`

## Global Constraints
- Offline; SharePoint REST same site only; macro-free; dev build only. No Excel or layout change. Version `Dashboard version 2026-10-28 z100` becomes `... 2026-10-30 z101` in Task 3 only (two places, `CLAUDE.md`, and the version tests `version_is_z100` in `tests/atom.test.js` and `tests/my_lodestar.test.js`).
- Plain English wording; 121 SQN is one squadron. Build before tests: `python3 .lodestar_build.py dashboard`. Tests: `node tests/other_depts.test.js [name]`.
- Commit messages end with a blank line then `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_0179L8Cq8YGMLsc2egW2kCy2`.

## Review Focus
1. The permission request fails, returns an odd shape or string numbers: the file is treated as editable, nothing throws.
2. A department file fails to open in the background (404, locked, corrupt): skipped, named once, the others still open, the person's own planner is untouched.
3. The person clicks a department twice, or presses Cancel or opens another screen while the others are loading: no double opening, no errors.
4. Loading does not move the person's month, selected cell or scroll.
5. A `noEdit` file: every way of editing (cell dropdown, typing, block of days, undo, Ops Room seat picker, down-chit, requests) is refused, not only the Save button.
6. Off SharePoint (local files) nothing changes: the button is shown and works.

---

### Task 1: One test of what is editable, and View only
**Files:** Modify `.dashboard_source.html` (the ~15 `bi === 0 || OPS` / `cur.b === 0 || OPS` tests, `readOnly()`, `save`, book bar); Create `tests/other_depts.test.js`.
**Interfaces:** Produces `mayEdit(bi: number): boolean` (`!books[bi].noEdit && (bi === 0 || OPS)`); `spCanEdit(url: string): Promise<boolean>` (asks `EffectiveBasePermissions`; any error or odd shape resolves `true`; edit when `(Number(Low) & 4) !== 0`); book field `noEdit: boolean`; chip `#viewOnly` (text `View only`) beside `#fileinfo`; save refusal text `You only have view access to this file.`.
- [ ] **Step 1: Failing tests** in `tests/other_depts.test.js` (runner copied from `tests/dept_select.test.js`, blank boot, stubs for `spJson`/`spFetch`): `can_edit_reads_the_low_bit` (Low `"4"`, `4`, `"7"` true; `"3"`, `0` false; rejection and `{}` true); `no_edit_book_is_read_only` (set `books[0].noEdit = true`: `mayEdit(0) === false`, `#btnSave` hidden, `#viewOnly` visible, `readOnly()` returns true and toasts, a planner cell edit via the pop-up code path changes nothing); `edit_book_unchanged` (no flag: `mayEdit(0)` true, `#viewOnly` hidden); `save_403_says_view_access` (stub the save request to reject with status 403: the toast/alert text is the plain sentence).
- [ ] **Step 2: Run** `python3 .lodestar_build.py dashboard && node tests/other_depts.test.js` — Expected: FAIL (`mayEdit` not defined).
- [ ] **Step 3: Implement** `mayEdit`, `spCanEdit`, the `noEdit` flag set in `spOpenDept` (own file) and in `spOpenOps` (each file), the chip, hiding Save/undo/redo, and replace every `bi === 0 || OPS` style test found by `grep -n "=== 0 || OPS\|oi === 0 ||\|bi === 0" .dashboard_source.html` with `mayEdit(...)`; map 403 in `spErr`.
- [ ] **Step 4: Run** the new tests, then `node tests/my_lodestar.test.js` (60/60), `node tests/ops_room.test.js` (38/38) — Expected: PASS.
- [ ] **Step 5: Commit** — "View only for files the person cannot edit; one test of what is editable".

### Task 2: Other departments open in the background; the button goes on SharePoint
**Files:** Modify `.dashboard_source.html` (`spOpenDept`, `spDeptExtras`, `btnAdd` visibility at ~1850 and `onclick` ~5547, book bar); Test `tests/other_depts.test.js`.
**Interfaces:** `spOpenOthers(own: object): Promise<void>` opens `SP_DEPTS` departments other than the own file's, skipping open files, one at a time, each wrapped in try/catch; shows `#openingOthers` ("Opening other departments… n of 4") in the book bar and removes it at the end; one toast naming failures.
- [ ] **Step 1: Failing tests:** `others_open_after_the_own_file` (stubbed `spFetch` returning the demo files by name: after `spOpenDept("SUP 2")` all five department books are open, and `opsDay` seats are filled from other departments with no button press); `own_file_shows_first` (record `books.length` when the first `renderAll` runs: 1 or the small set, before the departments finish); `a_failed_department_is_skipped` (one `spFetch` rejects: the other three open, one toast names the failure, `books[0]` unchanged); `no_double_opening` (call `spOpenOthers` twice at once: each file opens once); `button_hidden_on_sharepoint_shown_otherwise` (`SP.on = true`: `#btnAdd` hidden; `SP.on = false`: visible and its click opens the file input); `position_not_moved` (set `cur.m`, a selected cell and scroll; after loading they are unchanged).
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** `spOpenOthers`, call it at the end of `spOpenDept` (not for Ops Room mode), hide `#btnAdd` when `SP.on`, add the status line.
- [ ] **Step 4: Run** `node tests/other_depts.test.js`, `node tests/dept_select.test.js` (24/24) — Expected: PASS.
- [ ] **Step 5: Commit** — "Other departments open in the background on SharePoint; Add other departments hidden there".

### Task 3: Regression, docs, version, final review
- [ ] **Step 1:** Version to z101 (two places, `CLAUDE.md`, both version tests); `CLAUDE.md` tests row gains `node tests/other_depts.test.js`; `HANDOFF.md` section "Other departments and View only (z101)" with the two open items; tick item 3 in `PROJECT_CHECKLIST.md`.
- [ ] **Step 2:** Full run: build, then `other_depts`, `dept_select`, `ops_room`, `my_lodestar` (60/60), `planner_filter`, `mp_export`, `master_calendar`, and `atom` (about 90, background) — all pass.
- [ ] **Step 3:** Commit "Other departments and View only: tests, docs, z101"; push the branch.
- [ ] **Step 4:** Final review: one fresh most-capable-model review of the diff against the spec and Review Focus; fix Critical and Important in one test-first pass; list Minors; re-run all; push; report to Brandon (upload the dev dashboard only; what to test on SharePoint: the other departments appearing, the View only chip with a member's account, the permission check).
