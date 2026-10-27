# Ops Room redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Ops Room page calmer and more readable on the room TV: side cards moved to a bottom row, Cat colours and a SANS / NSMEN box on every callsign, standby crew rows at flight size, Codes on the Day Board, Area only when filled, Ground programme by AM / PM / NIGHT, Leave and MC by department, a clock, a light / dark theme, no Timeline, and a page that fits the screen height.

**Architecture:** All changes are in `.dashboard_source.html` (render functions `renderOps`, `renderOpsBoard`, `opsAreaCard`, `opsGround`, `opsMovement`, `opsCrewCell`, `opsFit` and their CSS) plus one new test file. No Excel layout change, nothing written to `Ops_Room.xlsx` changes, no builder changes, no layout stamp change. The existing IDs (`opsWrap`, `opsLeft`, `opsBoard`, `opsMain`, `opsSide`, `opsStats`, `opsDayRem`) and all click handlers on them stay.

**Tech Stack:** Single-file HTML/CSS/JS, Node + Playwright tests (`tests/lode_lib.js` `boot`), Python build driver.

**Spec:** `docs/superpowers/specs/2026-10-27-ops-room-redesign-design.md` (target look: `docs/superpowers/mockups/ops-room-v5/*.png`)

## Global Constraints
- Offline, no CDN, no network; macro-free; single file; **dev build only** (this is product code, not inside `/*DEV*/` markers).
- 121 SQN is one squadron: no Air Force / Navy wording anywhere. Plain English text.
- Do not touch any `.xlsx`, builder, or layout stamp. Never copy real ATOM exports into the repo.
- Version string `Dashboard version 2026-10-26 z96` (two places: `#wDiag` and `spDiag`) becomes `Dashboard version 2026-10-27 z97` at the end (Task 7 only).
- Build before every test run: `python3 .lodestar_build.py dashboard`. Tests: `node tests/ops_room.test.js [name-filter]`.
- Commit messages end with these two lines (blank line before):
  `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_0179L8Cq8YGMLsc2egW2kCy2`.
- Screen budget 1280x720 usable; checked at 1920x1080 as well.
- Whole-dashboard scaling is **on hold**: do not build a scale control; the Ops Room keeps its own A− / A+.

## Review Focus
1. A day with no flights and no standby crew, and a dashboard with no Ops Room file open (department view): the page renders, the bottom cards still show, no page error.
2. A person with a blank Cat or blank roster Status: no class, no box, no crash (seat, ground, leave, down-chit, Day Board).
3. A very long Ground programme or Leave and MC list: the card scrolls inside itself; the bottom row never takes more than 45% of the window height.
4. A multi-day ground item that runs to the end of the month shows "until <last day of that month>"; a one-day item shows no "until".
5. Existing editing still works after the move: seat picker opens, remarks save, 1 Set / 2 Set switches, `+ Down-chit` opens, `+ Ops Add` opens.
6. Dark theme: table cells, inputs and cards are dark and readable; switching back restores light; the choice survives a reload (localStorage, in try/catch, page renders if storage throws).

## File Structure
- Modify: `.dashboard_source.html` (all product code), `CLAUDE.md` (tests table, version line), `HANDOFF.md`, `PROJECT_CHECKLIST.md`, `docs/superpowers/specs/2026-10-27-ops-room-redesign-design.md` (one correction in Task 6).
- Create: `tests/ops_room.test.js` (new, Task 1 builds the harness; each task adds tests).
- Generated (not hand-edited): `Flight_Ops_Planner_Dashboard.html` by the build driver.

---

### Task 1: Test harness, chips, Timeline removal

**Files:**
- Create: `tests/ops_room.test.js`
- Modify: `.dashboard_source.html` (`renderOps` stats block ~line 3832, `#opsView` span ~897, `opsTimeline`, `opsVw`, the `$("opsView")` handler ~4231, the Timeline CSS `.tl*`, the `f === "down"` branch of the `#opsStats` click handler ~4229)

**Interfaces:**
- Produces (for later tasks): in the test file, helpers `const RO = { mine: "Flight_Ops_Planner_SUP2" }` (read-only view), `const ED = { mine: "Ops_Room" }` (editable Ops Room view), `goOps(page, iso)`, and the runner copied from `tests/planner_filter.test.js` (the `(async () => {...})()` block, boots with `Object.assign({ others: true }, t.opts)`).

- [ ] **Step 1: Create `tests/ops_room.test.js`** with the header comment, `assert`, `{ boot }`, the `tests` array, `test(name, fn, opts)`, the runner block (copied from `planner_filter.test.js`, but `others` stays true), and
  `const goOps = (page, iso) => page.evaluate(iso => { cur.opsDay = iso; document.querySelector("nav.tabs button[data-v='ops']").click(); renderOps(); }, iso);` with `const DAY = "2026-10-14"` (a demo day with flights).
- [ ] **Step 2: Write failing tests** `chips_no_seats_or_downchit` and `no_timeline`:
  - `chips_no_seats_or_downchit` (ED, DAY): the texts of `#opsStats .opsk small` include `"Flights"` and `"Sorties"` and `"Flown"` and `"Cancelled"`; do not include `"Seats filled"` or `"Down-chit"`.
  - `no_timeline` (RO, DAY): `document.getElementById("opsView")` is null; `typeof opsTimeline === "undefined"`; `document.querySelector("#v-ops button[data-vw]")` is null.
- [ ] **Step 3: Run** `python3 .lodestar_build.py dashboard && node tests/ops_room.test.js` — expect both FAIL.
- [ ] **Step 4: Implement.** In `renderOps` delete the `chip("seats", …)` and `chip("down", …)` calls and the `nDown` variable (keep `MC not set`, `Flown`, `Cancelled`, `Not closed`). Delete the `f === "down"` branch in the `#opsStats` click handler. Remove the `#opsView` span, the `opsVw` declaration and its localStorage key `opsView`, `opsTimeline(...)`, the `opsVw === "tl"` branch (the table is always drawn), the `$("opsView")` click handler, and every `.tl*` CSS rule and the Timeline legend CSS. `grep -n "opsVw\|opsTimeline\|\.tl[a-z]*{" .dashboard_source.html` must return nothing afterwards.
- [ ] **Step 5: Run** `python3 .lodestar_build.py dashboard && node tests/ops_room.test.js` — expect PASS; then `node tests/my_lodestar.test.js` — expect 60/60 (the existing Ops Room checks there must still pass; if one reads a removed chip, update it in this task).
- [ ] **Step 6: Commit** `tests/ops_room.test.js .dashboard_source.html Flight_Ops_Planner_Dashboard.html` — "Ops Room: remove Seats filled and Down-chit chips and the Timeline view".

### Task 2: Bottom row, Codes card, Area only when filled

**Files:**
- Modify: `.dashboard_source.html` (CSS `#opsWrap`, `#opsSide` ~718-724; `renderOps` side assembly ~3854; `renderOpsBoard` after the DOB card ~3586; `opsAreaCard` ~3590; `opsGo` ~4232; `#opsSide` click handler ~4196)
- Test: `tests/ops_room.test.js`

**Interfaces:**
- Consumes: `OPS_DB_CELLS` entries `{ lab, sub, col, stack }` (Area lines are the cells with `stack >= 0`, their `sub` is Oscar / Echo / Nov; Codes is `lab === "CODES"`), `books[opsIdx()].S.db[ref]`, `opsDbA`, `opsEditable()`.
- Produces: `opsAreaCard(D, ed): string` — now returns `""` when no Area line has text and `!cur.opsAreaOpen`; otherwise a `div.card.opsac` listing only filled lines (all three editable lines when `cur.opsAreaOpen && ed`); the Codes row is gone from it. A `+ Area` button `#opsAreaAdd` is added to the Down-chit card header by `opsDownCard` only when `ed && !document.body.classList.contains("opsfs")`; clicking it sets `cur.opsAreaOpen = true` and calls `renderOps()`; `opsGo` sets `cur.opsAreaOpen = false`. `#opsBoard` gets a Codes card `div.odi.codes` right after the DOB card.

- [ ] **Step 1: Write failing tests** (ED, DAY unless noted):
  - `side_cards_below_table`: `#opsSide` `getBoundingClientRect().top >= #opsMain bottom - 1`, and `#opsMain` width is at least 90% of `#opsWrap` width; `#opsSide` contains the headings `Ground programme`, `Leave and MC`, `Down-chit`, `Remarks` (use `innerText`).
  - `codes_card_next_to_dob`: `#opsBoard .odi.codes` exists, its left edge is greater than that of `#opsBoard .odi.dob`; `#opsSide` text does not contain `Codes`.
  - `area_hidden_when_empty`: with every Area ref cleared in `S.db`, `document.querySelector("#opsSide .opsac")` is null; with `S.db[ref of Echo] = "VIPER"` and `renderOps()` it exists and its text contains `Echo` and `VIPER` and does not contain `Oscar`.
  - `area_add_button`: in ED the button `#opsAreaAdd` exists; clicking it shows `.opsac` with three `.v.oe` elements; after `goOps` to another day it is closed; with `document.body.classList.add("opsfs"); renderOps()` the button is absent; in RO view (no Ops Room edit) it is absent.
- [ ] **Step 2: Run** — expect FAIL.
- [ ] **Step 3: CSS.** `#opsWrap` becomes `grid-template-columns:minmax(0,1fr)` with rows `minmax(0,1fr) auto`; `#opsSide` becomes a four-column grid `minmax(0,2.2fr) minmax(0,1.1fr) minmax(0,1fr) minmax(0,1.5fr)` with `gap:10px`, `align-items:stretch`, `max-height:45vh`, cards `overflow:auto`. The Down-chit and Area cards sit in one wrapper `div.stack` (flex column, gap 10px). Remarks card (`.rmk`) fills its cell; keep `#opsDayRem` styling.
- [ ] **Step 4: Implement** the render order in `renderOps`: Ground programme card, Leave and MC card (still `mv` for now, content is Task 3), `<div class='stack'>` + `opsDownCard(D)` + `opsAreaCard(D, ed)` + `</div>`, then Remarks. Codes: build with the same `val(ref, v)` helper as DOB inside `renderOpsBoard`, `odi codes` class.
- [ ] **Step 5: Run** — expect PASS. Also run `node tests/my_lodestar.test.js` and `node tests/atom.test.js "ops"` style filters if present; any test that read `#opsSide` first-child order is updated here.
- [ ] **Step 6: Commit** — "Ops Room: side cards in a bottom row, Codes on the Day Board, Area only when filled".

### Task 3: Ground programme by AM / PM / NIGHT with "until", Leave and MC by department

**Files:**
- Modify: `.dashboard_source.html` (`opsGround` ~3954, `opsMovement` ~3999, their callers in `renderOps` ~3842-3849, `.olist` CSS)
- Test: `tests/ops_room.test.js`

**Interfaces:**
- Produces: `opsGround(D): Array<{ sh: 0|1|2, act: string, when: string, until: string, who: string, note: string }>` — `sh` is the shift column (a Master Planner item with a start time: 06:00–11:59 AM, 12:00–17:59 PM, otherwise NIGHT; no time: AM; a crew Admin item: its own shift), `until` is `""` or `"until D Mon"` (e.g. `until 30 Oct`) for an Admin activity that continues on the next days in the same month grid with the same code on the same person and shift (stops at month end), people with the same code, shift and end day are grouped into one item; `who` and `note` are HTML as today.
- Produces: `opsMovement(D): Array<{ dept: string, who: string }>` — one entry per department in seat order `[...new Set(OPS_SEATS.map(z => z[1]))]`, `who` is HTML `<b class='cat…'>ID</b><small>LL</small>` per person (with `<small>` shifts when not the whole day, as today) or `""` for nobody; callers show `–` for empty.

- [ ] **Step 1: Write failing tests** (ED, DAY):
  - `ground_columns_am_pm_night`: `#opsSide .gp3` has three `.gcol` children with headings `AM`, `PM`, `NIGHT`; with `D = opsDay(DAY)` forced via adding a Master Planner ground item is not required: assert on a crew Admin item set up in the test: `useBook(i)` for the Pilot dept, find `A = S.acts.find(a => a.ci === CAT_ADMIN)`, write `A.code` into `S.m[mi].grid[row*3+1][d]` for `d`, `d+1`, `d+2` (shift PM), `renderOps()`; the PM column text contains the code and `until` followed by the 3rd day formatted `D Mon`; the AM and NIGHT columns do not contain that code.
  - `ground_one_day_no_until`: the same on a single day: PM column contains the code and not `until`.
  - `ground_until_stops_at_month_end`: put the item on the last two days of the month (`daysIn(y, mi)`), navigate `goOps` to the second to last day: the text says `until 31 Oct`.
  - `leave_and_mc_by_department`: write a Leave activity (`S.acts.find(a => a.ci === CAT_LEAVE)`) for one Pilot person on DAY; `#opsSide .olv` has one row per department in order Pilot, Loadmaster, TACCO, SUP 1, SUP 2; the Pilot row contains that person's id and the activity code; a department with nobody contains `–`.
  - `empty_day_still_renders`: `goOps` to a day with no flights and no leave (use `2026-12-27` or any day where `opsDay(iso).rows.length === 0`): `#opsSide` still contains all four headings and `errs` is empty.
- [ ] **Step 2: Run** — expect FAIL.
- [ ] **Step 3: Implement** `opsGround` / `opsMovement` per the signatures. The "until" scan walks `M.grid[i*3+s][d+1…]` while the cell's activity code equals the starting code; format the end day with `toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })` from `isoOf`. Render in `renderOps`: `div.card.gp` with `div.gp3` of three `div.gcol` (each with `span.opssh sN` heading and its items, an empty column shows nothing but its heading), and `div.card.olv` for Leave and MC with one `div.dep` per department (`b` = department name, then `who` or `–`). Keep the Down-chit card unchanged.
- [ ] **Step 4: Run** — expect PASS; run `node tests/my_lodestar.test.js` (60/60).
- [ ] **Step 5: Commit** — "Ops Room: Ground programme by shift with until, Leave and MC by department".

### Task 4: Cat colours, SANS / NSMEN box, standby rows at flight size

**Files:**
- Modify: `.dashboard_source.html` (`opsCrewOn` ~3628, `opsPerson` ~3641, `opsCrewCell` ~3756, `opsXtraHtml` ~3748, `opsGround`, `opsMovement`, `opsDownCard` ~3991, `opsDutyPerson` ~3537 and its use in `renderOpsBoard`, CSS `table.opst tr.sb td` ~479, `.catT`, new key line)
- Test: `tests/ops_room.test.js`

**Interfaces:**
- Produces: `opsCatCls(p): string` — `"sansbox"` when `isSans(p)` (roster Status SANS or NSMEN), else `catCls(p.cat)` (`""` when blank). Seat crew objects returned by `opsCrewOn` and `opsPerson` now carry `status: p.status`. `opsDutyPerson(iso, code, deps)` segments (`{ n, from, to }`) gain `h` (HTML of the names, each `<b class='…'>` via `opsCatCls`); `renderOpsBoard` uses `s.h` for the duty boxes (typed values stay plain text).
- CSS: `.sansbox{background:#16a34a;color:#fff!important;border-radius:5px;padding:0 6px}`; inside `#v-ops` `.catT{color:#ec4899!important}` (pink); key line `div#opsKey` under `#opsWrap` reading `Cat: A B C D OCU SANS / NSMEN` with the same classes.

- [ ] **Step 1: Write failing tests** (ED, DAY):
  - `seat_names_use_cat_classes`: pick the first `#opsMain tr.f td.oc b` on the page; its class matches `/^cat[ABCDT]$/` or `sansbox`; computed colour of a `catA` name is black (`rgb(0, 0, 0)`).
  - `sans_person_gets_green_box`: set the Status of one roster person who is seated that day to `SANS` (find a seated `c` in `opsDay(DAY).rows[0].seats`, `books[…].S.roster[…].status = "SANS"` through `opsRosterOf`-style lookup by dept and id), clear the memo if any, `renderOps()`: that person's seat `b` has class `sansbox` and computed background `rgb(22, 163, 74)`.
  - `blank_cat_and_status_ok`: set one seated person's cat and status to `""`; `renderOps()` renders their name with no class, `errs` empty.
  - `standby_rows_flight_size`: `getComputedStyle(tr.sb td.oc b).fontSize` equals that of `tr.f td.oc b`; the height of a `tr.sb` row is at least 85% of a `tr.f` row's height; the label font weight of `tr.sb td.sbc b` is at least 700.
  - `ground_and_leave_names_coloured`: after the Admin and Leave setup from Task 3, names in `#opsSide .gp3` and `.olv` carry a `cat…` or `sansbox` class.
  - `day_board_duty_names_coloured`: loop days 1 to 31 of the month with `goOps`; on the first day where `#opsBoard .dc b` exists, it has a `cat…` or `sansbox` class (skip with a logged note if no day has a duty person in the demo data, do not fail).
  - `key_line`: `#opsKey` exists and its text contains `SANS / NSMEN` and `OCU`.
- [ ] **Step 2: Run** — expect FAIL.
- [ ] **Step 3: Implement** `opsCatCls` (next to `catCls`) and use it wherever `catCls(...)` appears in the Ops Room render functions listed above; add `status` to the crew objects; give `opsDownCard`'s `span.dcn` the class; change the standby CSS (`table.opst tr.sb td` loses the `.9em` size and its 2px padding, `td.sbc` gets the flight label size and weight 800) and add the key line.
- [ ] **Step 4: Run** — expect PASS; run `node tests/atom.test.js "seat"` filters that check the Ops Room seats have no currency mark, and `node tests/my_lodestar.test.js`.
- [ ] **Step 5: Commit** — "Ops Room: Cat colours and a SANS / NSMEN box on every callsign, standby rows at flight size".

### Task 5: Clock and light / dark theme

**Files:**
- Modify: `.dashboard_source.html` (`.opsbar` HTML ~893-900, `renderOps`, new `opsTick`, `opsThemeInit`, CSS block `body.opsdark #v-ops …`)
- Test: `tests/ops_room.test.js`

**Interfaces:**
- Produces: `opsTick(): void` sets `#opsClock` text to `HH:MM` from `opsNowMin()` (`fmtHM` has no colon: insert one); called from `renderOps` and every 10 s by `setInterval`. `opsThemeInit(): void` reads localStorage key `opsTheme` (`"dark"` or anything else = light) inside try/catch and toggles `document.body.classList` `opsdark`; button `#opsTheme` (text `Light` or `Dark`, title "Switch light / dark") toggles it, saves, and calls `opsThemeInit()`.
- CSS: all dark rules are scoped `body.opsdark #v-ops …` (and `body.opsdark #opsPop` for the seat picker) so other pages stay light. Palette from the mock-up: page `#0b1220`, cards and cells `#111a2e`, lines `#1f2d4a`, text `#e8eefc`, muted `#8da0c0`, table header `#060b16`; Cat colours brightened (`catA #f8fafc`, `catB #4ade80`, `catC #facc15`, `catD #f87171`, `catT #f472b6`); shift bands keep their hues; inputs and textareas dark.

- [ ] **Step 1: Write failing tests** (ED, DAY):
  - `clock_shows_time`: set `window.OPS_NOW = "14:32"`, `renderOps()`: `#opsClock` text is `14:32`; set `OPS_NOW = "07:05"`, `opsTick()`: `07:05`.
  - `theme_toggle_dark_and_back`: click `#opsTheme`: `document.body.classList.contains("opsdark")` and `getComputedStyle(document.querySelector("#opsMain tr.f td.oc")).backgroundColor` has an RGB sum under 250; the Planner tab is not dark (`getComputedStyle(document.querySelector("#v-plan") …)` background sum above 600, or the body's header colour unchanged); click again: back to light (white cells).
  - `theme_persists`: after toggling to dark `localStorage.getItem("opsTheme") === "dark"`; remove the body class then call `opsThemeInit()`: class is back.
  - `theme_storage_throws`: `Storage.prototype.getItem = () => { throw new Error("x"); }` then `opsThemeInit()` does not throw and leaves light.
  - `dark_inputs_readable`: in dark, click a Remarks textarea / Day Board cell to edit: the input's computed background is not white.
- [ ] **Step 2: Run** — expect FAIL.
- [ ] **Step 3: Implement** the bar HTML (`span#opsClock` and `button#opsTheme` before the `+ Ops Add` button), `opsTick`, `opsThemeInit` (called once at load and in `renderOps`), the dark CSS block. Check the result against `docs/superpowers/mockups/ops-room-v5/OpsRoom_v5_normal_dark.png` with a Playwright screenshot at 1920x1080 and fix any light patch left (white table cells, `.opsk` chips, `.card`, `#opsLeft`, `#opsBoard`, `.odg`, `.sbh`, `.ofill`).
- [ ] **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** — "Ops Room: clock and a light / dark theme".

### Task 6: Smaller default size, shrink to fit the screen height

**Files:**
- Modify: `.dashboard_source.html` (`OPS_ZS`, `opsZi` default ~4198-4200, `opsFit` ~4203, `opsApplyZ`), `docs/superpowers/specs/2026-10-27-ops-room-redesign-design.md` (correct "second-largest step" to "third of six steps, 130%")
- Test: `tests/ops_room.test.js`

**Interfaces:**
- Produces: `OPS_ZS = [0.7, 0.85, 1, 1.15, 1.3, 1.5, 1.75, 2]`; the first-time default index is `2` (100%, one step smaller than today's 130%); a saved index from the old six-step list is ignored (the key is renamed `opsZoom2` so old values do not map to the wrong step). `opsFit(): void` keeps its current width fit, then loops (at most 14 passes) multiplying `opsZEff` by `0.95` (floor `0.6`) while `#opsMain` has `scrollHeight > clientHeight + 2` or `document.documentElement.scrollHeight > window.innerHeight + 1` in projector mode; it never raises the zoom above the chosen step.

- [ ] **Step 1: Write failing tests**:
  - `default_size_100`: fresh boot, `OPS_ZS[opsZi] === 1`; `localStorage.getItem("opsZoom2")` is null until the user clicks A+.
  - `size_buttons_remembered`: click `#opsSize button[data-z='1']` once: `OPS_ZS[opsZi] === 1.15` and `localStorage.opsZoom2 === "3"`.
  - `busy_day_fits_height` for viewports 1920x1080 and 1280x720 (two tests, ED, `viewport` option): replace `opsDay` with a wrapper that triples `D.rows` (`const od = opsDay; window.opsDay = iso => { const D = od(iso); D.rows = D.rows.concat(D.rows, D.rows, D.rows); return D; }`), click `#opsFull`, `renderOps()`, wait 200 ms: `#opsMain.scrollHeight <= #opsMain.clientHeight + 2`, `document.documentElement.scrollHeight <= innerHeight + 1`, `opsZEff >= 0.6`, and `opsZEff` is below the value on a normal day.
  - `quiet_day_not_stretched`: on a one-flight day `opsZEff` equals the chosen `OPS_ZS[opsZi]` (never above).
- [ ] **Step 2: Run** — expect FAIL.
- [ ] **Step 3: Implement** as above; keep the bar's own zoom compensation block unchanged.
- [ ] **Step 4: Run** — expect PASS, then take screenshots at 1920x1080 and 1280x720 of a normal and a tripled day and look at them (`previews/` is git-ignored: save there) against the v5 mock-up.
- [ ] **Step 5: Commit** — "Ops Room: smaller default size and shrink to fit the screen height".

### Task 7: Regression, docs, version, final review

**Files:**
- Modify: `.dashboard_source.html` (the two version strings), `CLAUDE.md`, `HANDOFF.md`, `PROJECT_CHECKLIST.md`

- [ ] **Step 1: Editing-paths test** in `tests/ops_room.test.js` `editing_paths_still_work` (ED, DAY): a click on a seat cell `td[data-oc]` opens `#opsPop` (display not none); the Remarks textarea `#opsDayRem` accepts a value and a `change` sets `S.db` for its ref; clicking `.sbset[data-sbset='1']` makes `opsSbSets(opsDay(DAY))` equal 1 and back to 2; clicking `#opsAddBtn` opens the Ops Add pop-up; clicking `#opsDownAdd` opens the down-chit dialog; none produce `errs`.
- [ ] **Step 2: Version:** replace both `Dashboard version 2026-10-26 z96` with `Dashboard version 2026-10-27 z97` (`#wDiag` and `spDiag`); update the version line in `CLAUDE.md`.
- [ ] **Step 3: Docs:** `CLAUDE.md` tests table gains `node tests/ops_room.test.js`; `HANDOFF.md` gets an "Ops Room redesign (z97)" section (what changed, the on-hold dashboard scaling, how the mock-up folder is used); `PROJECT_CHECKLIST.md` ticks the Ops Room redesign and lists "whole-dashboard scale control" as on hold; mention Brandon uploads the dev dashboard only (no Excel change).
- [ ] **Step 4: Full run:** `python3 .lodestar_build.py dashboard`, then `node tests/ops_room.test.js`, `node tests/my_lodestar.test.js` (60/60), `node tests/planner_filter.test.js` (6/6), `node tests/mp_export.test.js` (12/12), and `node tests/atom.test.js` (about 90 tests, several minutes; run in the background and wait) — all must pass. Fix any failure at its root.
- [ ] **Step 5: Commit** — "Ops Room redesign: tests, docs, z97" and push the branch.
- [ ] **Step 6: Final review:** dispatch one fresh review on the most capable model over `git diff main...HEAD` against the spec and Review Focus; fix real findings (commit each fix separately), re-run the full tests, push. Report to Brandon: what changed, upload the dev dashboard only, what to test on the real projector (default size, dark theme, the bottom cards).
