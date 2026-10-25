# My Lodestar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only "My Lodestar" home tab (today, next 7 days, status cards, what changed, month summary) matched to the signed-in person, and remove the "My schedule" tab.

**Architecture:** All code goes in `.dashboard_source.html` in one new section `// ---------- My Lodestar`, built from pure helper functions (`lode*`) that read the already-open books and return plain data, plus one render function. It reuses existing calculations (`opsDay`, `computeRest`, `computeCurrency`, `computeChit`, `sylPath`, `monthStats`, `logRead`). It never calls `put()`. Tests are Node + Playwright scripts that load the built dashboard and call the `lode*` functions in the page.

**Tech Stack:** Vanilla JS in the single-file dashboard, Playwright (preinstalled), Python 3 builder (`python3 .lodestar_build.py dashboard`).

**Spec:** `docs/superpowers/specs/2026-10-25-my-lodestar-design.md` (mock-up: `previews/My_Lodestar_mockup.png`)

## Global Constraints

- Offline single file; no CDN, no network except SharePoint REST on the same site. Screen budget 1280x720, no page scroll for a normal week.
- Dev mode stays on; new dev-only code (if any) inside `/*DEV*/ ... /*/DEV*/` markers.
- Read-only: no `put()`, no dirty cells, no undo steps. Only browser memory (`spRemember` / `spRecall`) may be written.
- Nothing from Personnel Info appears on the page. No passport card. No Outlook / .ics button.
- 121 SQN is one squadron: never write "Air Force vs Navy" or similar. Plain English, full sentences.
- No Excel files change, so no layout stamp bump. Do not touch the live `.xlsx` files.
- Bump the dashboard version string (`2026-10-25 z89` becomes `z90`) in both places in `.dashboard_source.html`.
- Syllabus card is SUP 2 only (rule 5); the rest works for any open department file.
- Tests fake today with `window.OPS_TODAY = "2026-10-26"` before the page loads and fake the sign-in with `SP.user = { Title: "..." }`.

## Review Focus

- Two people whose names have the same words: show the "Who are you?" list, never pick one silently.
- A sign-in name with no roster match (an email, a nickname, an empty Title): show the list; the page must not throw.
- A day outside the file's year, or December in a file without Jan (next year): say "Not in this file yet" instead of crashing or showing a blank day as "Free".
- Master Planner, Duty Roster or Ops Room not open: show the parts that exist and name what is missing.
- A person with an empty plan, a night flight whose ETA is after midnight, and a person from a different department than the one open first (viewing via View as).

## File Structure

- Modify `.dashboard_source.html`: nav buttons (~line 793), the `#v-me` section (~836) replaced by `#v-lode`, CSS block, the new JS section, `renderAll` (~2610), help text (`HELP` object, ~4620), version strings.
- Delete from `.dashboard_source.html`: `#v-me`, `renderMe`, `mePerson` / `meMonth` / `meToday` handlers (the "My schedule" view). Keep `mePeople()`; it is reused.
- Create `tests/lode_lib.js` (boot helper) and `tests/my_lodestar.test.js` (all tests, grouped per task).
- Rebuild `Flight_Ops_Planner_Dashboard.html` with the driver. Update `HANDOFF.md`, `PROJECT_CHECKLIST.md`.

Shared types (defined in Task 2, used by all later tasks):
- `LodeWho = { bi: number, i: number, p: { id, name, cat, role, status }, dept: string }` (an entry of `mePeople()`).
- `LodeItem = { s: 0|1|2|-1, kind: "flight"|"standby"|"ground"|"duty"|"away"|"other", code: string, text: string, time: string, cancelled: string, note: string }` (`s` is the shift, -1 = all day).

---

### Task 1: Test harness, new tab, My schedule removed

**Files:**
- Create: `tests/lode_lib.js`, `tests/my_lodestar.test.js`
- Modify: `.dashboard_source.html` (nav, view section, `renderAll`, delete My schedule code)

**Interfaces:**
- Produces: `boot({ today, title, files }) -> { page, errs, close }` in `tests/lode_lib.js`. It builds nothing; it opens `Flight_Ops_Planner_Dashboard.html`, sets `OPS_TODAY` via `addInitScript`, loads all 8 demo Excel files from a folder given by env `LODE_FILES` (default: repo root) through `#fileInputOps`, and collects page errors. `errs` is an array of strings.
- Produces: `#v-lode` view, nav button `data-v="lode"` first in the nav, and `renderLode()` (empty body for now), called from `renderAll` when `#v-lode` is `.on`.

- [ ] **Step 1: Write the failing tests** in `tests/my_lodestar.test.js`: `tab_order` (first nav button text is "My Lodestar"), `my_schedule_gone` (no `button[data-v='me']`, no `#v-me`, `typeof renderMe === "undefined"`), `opens_without_errors` (click the tab, `errs` empty).
- [ ] **Step 2: Run** `python3 .lodestar_build.py dashboard && node tests/my_lodestar.test.js`. Expected: the three tests FAIL.
- [ ] **Step 3: Implement** the nav button, `<section class="view" id="v-lode">`, `renderLode()` stub and the removal of the My schedule view and handlers. Make My Lodestar the view that is `.on` at start when a department planner is open and the Ops Room mode is off.
- [ ] **Step 4: Rebuild and run the tests.** Expected: PASS, plus the existing flows still load (open SUP 2, click Planner, no errors).
- [ ] **Step 5: Commit** `git add tests .dashboard_source.html Flight_Ops_Planner_Dashboard.html && git commit -m "My Lodestar: tab skeleton, remove My schedule"`.

### Task 2: Who am I and View as

**Files:**
- Modify: `.dashboard_source.html` (My Lodestar section)
- Test: `tests/my_lodestar.test.js`

**Interfaces:**
- Produces: `lodeKey(name: string) -> string[]` (sorted lower-case words, rank words and punctuation removed; rank words: `maj cpt lta ltc col me1 me2 me3 me4 me5 2lt 3sg 2sg 1sg ms1 ms2 ms3 ns`).
- Produces: `lodeMatch(title: string) -> LodeWho | null` (null unless exactly one roster entry across all open department books has the same key; an empty key matches nothing).
- Produces: `lodeWho() -> LodeWho | null` (View-as target if set, else remembered pick `spRecall("lode_me")` if it still exists, else `lodeMatch(SP.user && SP.user.Title)`, else null) and `lodeSetWho(who | null)`.
- Produces: the top-right chip (`#lodeChip`) showing name, department, Cat status and the source ("signed in via SharePoint" / "picked"), a View as list (`#lodeList`), a "Who are you?" panel when `lodeWho()` is null, and a "Viewing HAWK, not you. Back to me" banner when View as is on.

- [ ] **Step 1: Write the failing tests:** `key_ignores_rank_order_case` (`lodeKey("CPT Tan Wei Ming")` equals `lodeKey("tan wei ming cpt")`), `match_unique` (title "Sarah Lim" returns HAWK), `match_none_for_email` (title "sarah.lim@x.mil" returns null), `match_ambiguous_returns_null` (rename a second demo person to the same words in memory, expect null), `empty_title_matches_nothing`, `pick_is_remembered` (after `lodeSetWho`, reload the page, `lodeWho()` is the same person), `view_as_banner` (View as HAWK shows the banner text and "Back to me" restores).
- [ ] **Step 2: Run the tests.** Expected: FAIL (functions not defined).
- [ ] **Step 3: Implement** the functions above in the new section; roster names come from `mePeople()`. The chip and panels render inside `renderLode()`.
- [ ] **Step 4: Rebuild and run.** Expected: PASS.
- [ ] **Step 5: Commit** `git commit -am "My Lodestar: who am I and View as"` (include tests and the rebuilt dashboard).

### Task 3: One person's day and the next 7 days

**Files:**
- Modify: `.dashboard_source.html`
- Test: `tests/my_lodestar.test.js`

**Interfaces:**
- Consumes: `LodeWho` (Task 2); existing `plannedFlights(M, d, s)`, `cxlOf(st, id, mi, d, s)`, `deptGround(P, mi, d, dept)`, `opsDuty(iso)`, `opsDay(iso)`, `ymd(iso, year)`, `withBook(bi, fn)`.
- Produces: `lodeDay(who: LodeWho, iso: string) -> { iso, known: boolean, items: LodeItem[], ops: LodeFlightRow[], duty: string, nextDuty: string }`. `known` is false when the date is outside the file's year (and Jan next year when `S.nx`). `items` is time-ordered, all-day items first. `LodeFlightRow = { code, desc, status: "Planned"|"Flown"|"Cancelled"|"Not closed", tail, sortie, brief, etd, eta, area, seats: { role: string, id: string }[] }` taken from `opsDay(iso).rows` where this person sits, else from the person's own flight code.
- Produces: `lodeWeek(who, iso) -> LodeDay[]` (the 7 days after `iso`).

- [ ] **Step 1: Write the failing tests** (today 2026-10-26, demo files): `day_flight_has_time_and_comment` (a person with a flight that day gets a `flight` item with `time` from the Master row), `day_cancelled_flag` (cancel a flight in the test copy of the Ops Room data, `cancelled` holds the reason), `day_ground_and_duty` (ground programme and BDO/SDO items appear), `day_leave_is_away`, `day_empty_plan_is_free` (a person with nothing: `items` empty, `known` true), `day_outside_year_unknown` (`lodeDay(who, "2028-01-05").known === false`), `week_has_seven_days_across_month_end` (from 2026-10-28: 29, 30, 31, 1, 2, 3, 4 with correct months), `night_flight_eta_after_midnight` (eta earlier than etd stays attached to the start day), `missing_master_names_parts` (without the Master Planner open, `lodeDay` still returns the department items and `ops` is empty).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** `lodeDay` and `lodeWeek`, wrapping reads in `withBook(who.bi, ...)` so the correct department's `S` is used.
- [ ] **Step 4: Rebuild and run.** Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 4: The four status cards

**Files:**
- Modify: `.dashboard_source.html`
- Test: `tests/my_lodestar.test.js`

**Interfaces:**
- Consumes: `LodeWho`; `computeChit`, `computeRest`, `restIfFly`, `computeCurrency`, `sylPath`.
- Produces: `lodeCards(who, iso) -> { medical: { ok: boolean, text: string, sub: string }, rest: { run: number, text: string, sub: string, flagged: boolean }, cur: { text: string, sub: string, level: "ok"|"due"|"bad"|"na" }, syl: { text: string, sub: string } | null }`. `syl` is null when the file has no syllabus (older layout). The Currency card shows the soonest due or lapsed rule and "x of y rules current"; "No currency rules" with level `na` when the file has none.

- [ ] **Step 1: Write the failing tests:** `medical_down_chit` (a person with the demo down-chit shows `ok: false` and the since-date), `medical_fit_default`, `rest_counts_run_to_day` (run for a person flying 4 days in a row), `rest_flags_at_five`, `currency_soonest_rule` (demo "Mission currency DUE" is chosen over an OK rule), `currency_none_when_no_rules`, `syl_progress_and_next` (stage, "n of m passed", next planned item), `syl_null_for_older_layout` (open SUP 1: `syl === null`).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** `lodeCards` from the existing calculations; no new rules.
- [ ] **Step 4: Rebuild and run.** Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 5: Render Today, Next 7 days and the cards

**Files:**
- Modify: `.dashboard_source.html` (`renderLode()`, CSS)
- Test: `tests/my_lodestar.test.js`

**Interfaces:**
- Consumes: Tasks 2 to 4 (`lodeWho`, `lodeDay`, `lodeWeek`, `lodeCards`).
- Produces: `renderLode()` builds the greeting ("Good morning|afternoon|evening, CALLSIGN" and the focus date), Prev day / Next day buttons (`#lodePrev`, `#lodeNext`, focus date in `cur.lodeIso`, default today from `opsToday()`), the four cards, the Today panel (flight, standby, ground items, duty), and the Next 7 days table with AM / PM / NIGHT columns, days off greyed, a month label where the month changes. Layout follows `previews/My_Lodestar_mockup.png`.

- [ ] **Step 1: Write the failing tests:** `renders_greeting_and_cards` (page text has the callsign, four card labels), `today_panel_shows_flight_details` (code, tail, brief, ETD, ETA and a seat), `next_days_table_rows` (7 rows, correct dates), `prev_next_day_moves_focus`, `fits_1280x720_without_scroll` (`document.documentElement.scrollHeight <= 720` with the tab open), `unknown_day_message` (focus on 2028-01-05 shows "Not in this file yet"), `no_put_calls` (wrap `put`, open the tab, click around, expect zero calls and `books.every(b => b.dirty.size === 0)`).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** `renderLode()` and the CSS; reuse existing colour variables and chip classes. Escape every inserted string with `esc`.
- [ ] **Step 4: Rebuild, run, then take a 1280x720 screenshot and compare it with the mock-up by eye.** Expected: tests PASS, layout close to the mock-up.
- [ ] **Step 5: Commit.**

### Task 6: What changed

**Files:**
- Modify: `.dashboard_source.html`
- Test: `tests/my_lodestar.test.js`

**Interfaces:**
- Consumes: `logRead() -> { t, who, file, what, a, z, cell }[]`, `lodeWeek`, `lodeDay`.
- Produces: `lodeChanges(who, sinceT: string | null) -> { kind: "cancelled"|"added"|"moved"|"duty"|"mine", text: string, sub: string, t: string }[]`, newest first, at most 8. A log row counts when `what` starts with the person's callsign (their own cell), or when `cell` falls on a day in the next 7 days and concerns a flight the person is planned on (Master Planner or Ops Room file), or a duty-roster change that gives the person's department a duty day in the window. `sinceT` null means the last 7 days. Last visit is remembered with `spRemember("lode_seen_" + id, nowString)` when the page is closed or another tab is opened, never while the page is being viewed, so the "n NEW" badge survives a reload.

- [ ] **Step 1: Write the failing tests:** `changes_include_own_cell_edit` (save an edit to the person's cell in a test copy, reload, the entry appears), `changes_include_cancelled_flight`, `changes_ignore_other_people`, `changes_since_last_visit_only`, `changes_first_visit_last_7_days`, `changes_capped_at_8_with_500_log_rows`, `badge_count_matches`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** `lodeChanges` and the card; unmatched or unparsable log rows are skipped, not shown.
- [ ] **Step 4: Rebuild and run.** Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 7: Month summary, help, version, docs

**Files:**
- Modify: `.dashboard_source.html` (summary card, `HELP` text, version strings), `HANDOFF.md`, `PROJECT_CHECKLIST.md`, `CLAUDE.md` (version string line)
- Test: `tests/my_lodestar.test.js`

**Interfaces:**
- Consumes: `monthStats(mi, A)` (per-crew totals `crew[i]`: flights, planned hours, ground duty days, SDO / BDO days, leave days), the Ops Room ATD to ATA hours, `sylPath`.
- Produces: `lodeMonth(who, mi) -> { flights: number, cancelled: number, hrsFlown: number, hrsPlanned: number, ground: number, duty: number, leave: number, sylPassed: number }` and the "<Month> so far" card; `HELP.lode` text; version `z90`.

- [ ] **Step 1: Write the failing tests:** `month_matches_planner_totals` (flights, hours, ground, duty and leave equal the Planner's totals for that person), `month_cancelled_and_flown_hours`, `help_text_present` (press the help button on the tab), `version_is_z90` (both places).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** `lodeMonth`, the card, the help text and the version bump; update `HANDOFF.md` (what was built, My schedule removed) and tick the My Lodestar lines in `PROJECT_CHECKLIST.md`.
- [ ] **Step 4: Rebuild with `python3 .lodestar_build.py dashboard`, run the whole test file, and run the earlier checks from this session** (open all files, click every tab, edit and save in a scratch copy, Undo/Redo). Expected: all PASS, no page errors, no `put()` from My Lodestar.
- [ ] **Step 5: Commit and push to `claude/elegant-clarke-dxb91d`.**
