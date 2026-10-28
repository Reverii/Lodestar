# Department selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the early "Which department are you from?" SharePoint screen with the revamped one: hero with the logo, a status line, a wide Ops Room card, one grid of department cards showing when each file changed and who changed it, a last-used highlight, a missing-file card, and a 15-second refresh.

**Architecture:** All changes are in `.dashboard_source.html` around `spList`, `spShowDepts`, `spOpenDept`, `spOpenOps`, `spShowPicker` and the `#spPick` CSS. No Excel change, no change to what a card opens. SharePoint is not available to tests: they stub `SP.files`, `spList` and `spJson` in the page and use a fake clock `window.SP_NOW`.

**Tech Stack:** Single-file HTML/CSS/JS, Node + Playwright tests (`tests/lode_lib.js` `boot({ blank: true })`), Python build driver.

**Spec:** `docs/superpowers/specs/2026-10-28-department-selector-design.md` (target look: `docs/superpowers/mockups/dept-select-v2/*.png`)

## Global Constraints
- Offline, no CDN; SharePoint REST on the same site only; macro-free; single file; **dev build only** (not inside DEV markers).
- 121 SQN is one squadron; plain English.
- No `.xlsx`, builder or layout-stamp change; clicking a card must open exactly what it opens today (`spOpenDept(label)`, `spOpenOps()`, `spShowPicker(false)`).
- Version `Dashboard version 2026-10-28 z99` (two places: `#wDiag`, `spDiag`) becomes `Dashboard version 2026-10-28 z100` in Task 4 only; update `CLAUDE.md` and the two version tests (`tests/my_lodestar.test.js`, `tests/atom.test.js`, names `version_is_z99` to `version_is_z100`).
- Build before every test run: `python3 .lodestar_build.py dashboard`. Tests: `node tests/dept_select.test.js [name-filter]`.
- Commit messages end with a blank line then `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_0179L8Cq8YGMLsc2egW2kCy2`.
- Screen budget 1280x720: the whole screen fits without scrolling.

## Review Focus
1. SharePoint refuses the `ModifiedBy` expand: the screen still renders (no "by" line), the fallback list is used, and the expand is not retried on every refresh.
2. A hostile or odd file name or editor name (`<img onerror>`, quotes, very long): shown as text, never executed, cut with an ellipsis.
3. Missing, invalid or future `TimeLastModified`: no crash; grey "Changed: unknown" or "Today"; no NaN or "Invalid Date" on screen.
4. Refresh fails (network, 403, 5xx): the cards stay, the status line goes amber and says when it was last checked; the timer keeps trying; closing the screen stops it.
5. The last-used department has no file any more: its card shows as missing, nothing breaks, nothing is highlighted wrongly.
6. A user who opens the file picker ("Show all files…") or a department: the refresh timer is stopped and does not redraw a hidden box.

## File Structure
- Modify: `.dashboard_source.html` (SharePoint section ~4551-4720 and the `#spPick` CSS ~345-364), `CLAUDE.md`, `HANDOFF.md`, `PROJECT_CHECKLIST.md`, `tests/my_lodestar.test.js`, `tests/atom.test.js` (version only).
- Create: `tests/dept_select.test.js`.

---

### Task 1: Last-changed data and wording

**Files:**
- Create: `tests/dept_select.test.js`
- Modify: `.dashboard_source.html` (`spList` ~4596, new helpers beside it)

**Interfaces:**
- Produces: `spNow(): Date` (`window.SP_NOW` ISO string if set, else `new Date()`); `spWhen(iso: string, now: Date): { text: string, level: "g" | "a" | "r" | "x" }` where `level` is `g` for the same calendar day (a future time counts as today), `a` for 1 to 6 calendar days earlier, `r` for 7 or more, `x` for a missing or unreadable time (`text` = `"Changed: unknown"`); `text` is `Today HH:MM`, `Yesterday HH:MM`, else `Ddd D Mon HH:MM` (en-GB weekday short, day, month short) with ` YYYY` inserted before the time when the year differs from `now`'s, using the browser's local time, 24-hour.
- Produces: `spList(): Promise<void>` sets `SP.files` (each `{ Name, ServerRelativeUrl, TimeLastModified, By }`, `By` the editor's `Title` or `""`) and `SP.listedAt = Date`; it first requests `.../Files?$expand=ModifiedBy&$select=Name,ServerRelativeUrl,TimeLastModified,ModifiedBy/Title`; if that throws, it requests the plain list, sets `SP.noWho = true`, and never tries the expand again in this session. `SP.noWho` starts `false` in the `SP` object.
- Consumes: `spJson(url)`, `spQ`, `SP.web`, `SP.folder` (existing).

- [ ] **Step 1: Create `tests/dept_select.test.js`** with the header comment, `assert`, `{ boot }`, the `test(name, fn, opts)` array and runner copied from `tests/ops_room.test.js` (boots with `{ blank: true }`), and helper `const set = (page, files, last) => page.evaluate(([files, last]) => { SP.folder = "/sites/121SQN/Program"; SP.files = files; window.spList = async () => { SP.listedAt = new Date(window.SP_NOW || Date.now()); }; if (last) spRemember("dept", last); }, [files, last])` and `const F = (name, mod, by) => ({ Name: name, ServerRelativeUrl: "/x/" + name, TimeLastModified: mod, By: by || "" })`.
- [ ] **Step 2: Write failing tests** (run in the page with `window.SP_NOW = "2026-10-28T14:32:00"` and local-time ISO strings without `Z`):
  - `when_wording`: `spWhen("2026-10-28T08:12:00", now)` is `{ text: "Today 08:12", level: "g" }`; `"2026-10-27T16:55:00"` is `Yesterday 16:55`, `a`; `"2026-10-26T11:20:00"` is `Mon 26 Oct 11:20`, `a`; `"2026-10-20T09:05:00"` is `Tue 20 Oct 09:05`, `r`; `"2025-12-30T09:05:00"` is `Tue 30 Dec 2025 09:05`, `r`.
  - `when_edge_cases`: a future time `"2026-10-29T10:00:00"` gives `Today 10:00`, `g`; `""`, `undefined` and `"not a date"` give `{ text: "Changed: unknown", level: "x" }`; the 6-day boundary `"2026-10-22T12:00:00"` is `a` and `"2026-10-21T12:00:00"` is `r`.
  - `list_asks_for_the_editor`: replace `spJson` with a function that records its URL and returns `{ d: { results: [{ Name: "A.xlsx", ServerRelativeUrl: "/x/A.xlsx", TimeLastModified: "2026-10-28T08:00:00", ModifiedBy: { Title: "R. Tan" } }] } }` and call the real `spList` (so in this test do not stub `spList`: keep a reference to the original in the page before the helper overwrites it, or boot fresh): the first URL contains `$expand=ModifiedBy`; `SP.files[0].By === "R. Tan"`.
  - `list_falls_back_without_the_editor`: `spJson` rejects any URL containing `$expand` and answers the plain list otherwise; after `spList()` `SP.noWho === true`, `SP.files[0].By === ""`, and a second `spList()` makes no request containing `$expand`.
- [ ] **Step 3: Run** `python3 .lodestar_build.py dashboard && node tests/dept_select.test.js` — Expected: all four FAIL (helpers not defined).
- [ ] **Step 4: Implement** `spNow`, `spWhen` and the new `spList` as the Interfaces say (calendar-day difference from local midnights; `$select` for the expand request uses `ModifiedBy/Title`).
- [ ] **Step 5: Run** the same command — Expected: 4/4 PASS. Then `node tests/my_lodestar.test.js` — Expected: 60/60.
- [ ] **Step 6: Commit** — "Department selector: last-changed wording and the editor from SharePoint".

### Task 2: The new screen

**Files:**
- Modify: `.dashboard_source.html` (`spShowDepts` ~4621, `#spPick` CSS, the click handler on `#spTable` ~4666)
- Test: `tests/dept_select.test.js`

**Interfaces:**
- Consumes: `spWhen`, `spNow`, `SP.files`, `SP_DEPTS`, `spFileFor(key)`, `spRecall("dept")`, `esc`, the welcome logo markup `document.querySelector("#welcome .lslogo")`.
- Produces: `spCardHtml(lab: string, f: object | null, last: boolean): string` (a department card; `f` is the file from `spFileFor` or `null` for a missing one); `spOpsHtml(f: object | null, last: boolean): string` (the wide Ops Room card); `spShowDepts(): Promise<void>` draws hero, status line (`#spStatus`), Ops Room card, grid (`#spGrid`) and footer into `#spPick .box` with class `wide`; `spShowPicker` removes class `wide`. Cards are `button.dcard[data-dept]`, the Ops Room card `button.opscard[data-ops]`, the show-all card `button.allcard#spAll`, missing cards `button.dcard.miss[disabled]`.

- [ ] **Step 1: Write failing tests** (blank boot, `set` helper, `window.SP_NOW = "2026-10-28T14:32:00"`, then `document.getElementById("welcome").style.display = "none"; spShowDepts()`):
  - `cards_in_order_with_texts`: the `#spGrid .dcard .n` texts are `SUP 1, SUP 2, TACCO, Loadmaster, Pilot, Duty Planner, Master Planner`; for SUP 2 with a file changed `2026-10-28T07:40:00` by `S. Lim` the card text contains `Today 07:40`, `by S. Lim` and `Flight_Ops_Planner_SUP2.xlsx`; the eighth grid item is `#spAll` with text containing `Show all files in the folder`.
  - `dots_follow_age`: the dot class of a today file is `g`, a 3-day-old `a`, an 8-day-old `r`; a file with a bad time has `x` and the text `Changed: unknown`.
  - `last_used_is_highlighted`: with `spRemember("dept", "SUP 2")` only the SUP 2 card has class `last` and contains `You opened this last`; with `"Ops Room"` the `.opscard` has class `last` and the tag and no department card does; with `"Some Old Name"` nothing is highlighted.
  - `missing_file_card`: with no Loadmaster file the Loadmaster card has classes `dcard miss`, is `disabled`, and reads `No file in this folder` and `Looking for Flight_Ops_Planner_Loadmaster.xlsx`; clicking it does nothing (no call to `spOpenDept`).
  - `no_by_line_without_an_editor`: a file with `By: ""` shows no text starting `by `.
  - `hostile_names_are_text`: a file named `Flight_Ops_Planner_SUP1.xlsx` whose `By` is `<img src=x onerror="window.__x=1">"` renders no `img` element inside `#spGrid` and `window.__x` is undefined; a 200-character file name stays inside the card (the `.f` element has `text-overflow: ellipsis` and its scrollWidth may exceed its clientWidth but the card's width does not change).
  - `ops_card_content`: contains `The day's flights and crew. Every department's file is editable.` and the Ops Room file's `Today 08:05` text and `by K. Ong`, and the button text `Open Ops Room`.
  - `hero_and_status`: `#spPick .hero svg.lslogo` exists and the box heading text is `Which department are you from?`; `#spStatus` contains `Connected to Program`, `8 files` and `refreshes every 15 seconds`.
  - `clicks_reach_the_openers`: stub `window.spOpenDept = l => (window.__d = l)`, `window.spOpenOps = () => (window.__o = 1)`, `window.spShowPicker = a => (window.__p = a)`: clicking SUP 1 sets `__d = "SUP 1"`, the Ops Room card sets `__o`, `#spAll` sets `__p === false`.
  - `fits_1280x720`: viewport 1280x720: `#spPick .box` bottom is at most 720 and the box has no vertical scroll (`scrollHeight <= clientHeight`).
  - `file_picker_keeps_the_narrow_box`: after `spShowPicker(false)` the box does not have class `wide`.
- [ ] **Step 2: Run** `node tests/dept_select.test.js` — Expected: the new tests FAIL.
- [ ] **Step 3: Implement** `spCardHtml`, `spOpsHtml` and the new `spShowDepts` per the spec's screen description and `docs/superpowers/mockups/dept-select-v2/gen_dept_v2.py` (CSS copied from its `CSS` string, scoped under `#spPick`; the hero logo is `document.querySelector("#welcome .lslogo").outerHTML`; the status line shows `SP.listedAt` as `HH:MM`). Delete the old `.depts` button CSS. Wire the `#spTable` click handler to the new classes (cards, `.opscard`, `#spAll`), keeping `spOpenDept`, `spOpenOps`, `spShowPicker(false)` as the targets. The old `$("spTable")` container may stay as the host of the new markup.
- [ ] **Step 4: Run** `node tests/dept_select.test.js` — Expected: PASS. Then take a screenshot of the screen with the stubbed data at 1280x720 into `previews/` and compare it with `DeptSelect_v2_normal.png` and `_edge.png`; fix visible differences.
- [ ] **Step 5: Commit** — "Department selector: hero, status line, Ops Room card and file-state cards".

### Task 3: Refresh while the screen is open

**Files:**
- Modify: `.dashboard_source.html` (new `spRefreshDepts`, timer start in `spShowDepts`, stop in `spCancel`, `spOpenDept`, `spOpenOps`, `spShowPicker`, `spGo`)
- Test: `tests/dept_select.test.js`

**Interfaces:**
- Produces: `spRefreshDepts(): Promise<void>` calls `spList()` and redraws the grid and status line if `#spPick` is visible and in the department view (box has class `wide`); on a thrown error it keeps the cards, sets the status dot amber (class `warn` on `#spStatus`) and the text `couldn't check at HH:MM, showing what was seen at HH:MM`; `spDeptT: number | null` is the 15-second `setInterval` handle, started by `spShowDepts` (replacing any earlier one) and cleared by `spStopDepts(): void`, which every path that hides or replaces the screen calls.

- [ ] **Step 1: Write failing tests**:
  - `refresh_redraws_a_changed_list`: show the screen, then change `SP.files` inside a replaced `spList` (a file gets a newer time) and `await spRefreshDepts()`: the card text shows the new time and the status line shows the new `checked` time.
  - `refresh_failure_is_quiet`: replace `spList` with one that throws; after `await spRefreshDepts()` the cards are unchanged, `#spStatus` has class `warn` and contains `couldn't check at`; a following successful refresh clears the class.
  - `timer_runs_only_while_open`: `spDeptT` is a number after `spShowDepts()`; after `document.getElementById("spCancel").click()` it is null; after `spShowDepts()` then `spShowPicker(false)` it is null; after `spShowDepts()` then a department click (stubbed `spFileFor`/`spFetch`/`loadWorkbook` not needed: call `spStopDepts` through `spOpenDept` guarded by a missing file case is not enough, so assert it for Cancel and the picker only) it stays consistent.
  - `refresh_ignored_when_hidden`: with the box closed, `await spRefreshDepts()` does not draw anything into `#spGrid` and does not throw.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** per the Interfaces; interval 15000 ms (use the existing `LIVE_MS` constant if it equals 15000).
- [ ] **Step 4: Run** `node tests/dept_select.test.js` — Expected: PASS.
- [ ] **Step 5: Commit** — "Department selector: refresh every 15 seconds while it is open".

### Task 4: Regression, docs, version, final review

**Files:**
- Modify: `.dashboard_source.html` (version strings), `CLAUDE.md`, `HANDOFF.md`, `PROJECT_CHECKLIST.md`, `tests/my_lodestar.test.js`, `tests/atom.test.js`

- [ ] **Step 1:** Set both version strings to `Dashboard version 2026-10-28 z100`; update the line in `CLAUDE.md`; rename and update the two version tests to z100; add `node tests/dept_select.test.js` to the tests row of `CLAUDE.md`.
- [ ] **Step 2:** `HANDOFF.md` gets a "Department selector (z100)" section (what changed, how it is tested without SharePoint, the open items: "by <name>" needs one real test, the 7-day red threshold); `PROJECT_CHECKLIST.md` ticks it with the same open items.
- [ ] **Step 3:** Full run: `python3 .lodestar_build.py dashboard`, then `node tests/dept_select.test.js`, `node tests/ops_room.test.js`, `node tests/my_lodestar.test.js` (60/60), `node tests/planner_filter.test.js` (6/6), `node tests/mp_export.test.js` (12/12), `node tests/master_calendar.test.js` (2/2) and `node tests/atom.test.js` (about 90, run in the background and wait) — all must pass; fix any failure at its root.
- [ ] **Step 4:** Commit "Department selector: tests, docs, z100" and push the branch (retry with backoff on a network error).
- [ ] **Step 5:** Final review: dispatch one fresh review on the most capable model over the diff from the commit before Task 1 to HEAD against the spec and Review Focus; re-grade the findings by effect on a person using the screen; fix Critical and Important ones in one pass, each with a failing test first; list Minors as deferred; re-run the full suite and push. Report to Brandon: what changed, upload the dev dashboard only, what to test on SharePoint (the by-name line, the refresh, the last-used highlight).
