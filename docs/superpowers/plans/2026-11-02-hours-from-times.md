# Planned hours from the Master Planner time range: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flight Hrs and Sorties leave the Activities page and the Flight Codes sheet; a flight's planned hours come from its time range, and its sortie count is typed on the flight.

**Architecture:** The Master Planner `Flights` sheet gets a typed Sorties column and a formula Hrs column that reads the time range. The dashboard has one hours helper (`mpFlHrs`, built in z125, loses its code fallback) used by every screen. Department files lose their Fly Hrs formulas; the dashboard computes per-person hours from the matching MASTER row's time range. Files are rebuilt fresh (dummy data only, no migration) together with the layout-3 replacement.

**Tech Stack:** Python 3 + openpyxl builders (`.build_master_planner.py`, `.build_planner.py`, `.realdata.py`, `.seedplan.py`); the single-file dashboard `.dashboard_source.html`; Node + Playwright tests in `tests/`.

**Spec:** `docs/superpowers/specs/2026-11-02-hours-from-times-design.md`

## Global Constraints

- Offline, macro-free `.xlsx`, no CDN; plain desktop Excel must open and calculate the files (no `LET`, no dynamic arrays).
- Dev mode stays on: new dev-only code goes inside `/*DEV*/ ... /*/DEV*/` markers; do not build `release/`.
- Hours are **planned only**; ATOM clocked hours are untouched.
- Hours rule (`mpFlHrs`): end earlier than start means the next day; 0 h or over 12 h is "Check time"; no end time is "No end time"; none of these fall back to code hours any more (the fallback is removed with Flight Hrs). Hours show as `2.0 H` (capital H).
- Layout stamps: dept 3 to 4, master 2 to 3 (`LAYOUT` constant in the dashboard and the stamp cell `Dashboard!Z2` in the builders, together).
- Bump the dashboard version string (`#wDiag` and `spDiag`) to the next `zNN`.
- Never write into a live `.xlsx` in the repo folder: build into `../lodestar_rebuild`; replacing the repo files needs Brandon's go-ahead (Task 8).
- Wording: plain English; 121 SQN is one squadron.

## Review Focus

- A flight typed `2200-0100` counts 3.0 H everywhere (card, calendar, week and month totals, export, Excel `Flights!L`).
- A time typed `0830H-1030H`, `08:30-10:30` or `0830 - 1030` gives 2.0 H in the dashboard and in Excel.
- A flight with a blank, start-only, equal or over-12-hour time counts 0 H and shows a visible warning (never NaN, never a code's old hours).
- A flight with Sorties blank counts 1; Sorties 3 gives three Ops Room rows (aircraft 1/3 .. 3/3) and counts 3 in the Master Planner sortie totals.
- A person planned on a code with two MASTER slots in their shift (same code twice, different times) gets hours from the first slot with a valid range, never double.

## File structure

- `.build_master_planner.py`: Flight Codes columns, Flights columns, month tab and Dashboard formulas, stamp.
- `.build_planner.py`: Activities columns, removal of `ActHrs`/`ActSort`/Fly Hrs formulas, help text, stamp.
- `.seedplan.py`, `.realdata.py`, `input/LODESTAR_Data_Input.xlsx`: drop Hrs and Sorties from flight codes; seed flights carry sorties.
- `.dashboard_source.html`: parsing, `mpFlHrs`, per-person hours, Master Planner screens, Ops Room rows, Activities and Flight Codes pages, `LAYOUT`.
- `tests/`: `hours_from_times.test.js` (new), plus updates to `master_calendar`, `mp_export`, `mp_card`, `ops_room`, `my_lodestar`, `wd_row`, `flight_card`; `tests/wd_builder.test.py` and a new `tests/hours_builder.test.py`.

---

### Task 1: Master Planner builder (Flight Codes, Flights)

**Files:** Modify `.build_master_planner.py`; Test `tests/hours_builder.test.py` (new).

**Interfaces:**
- Produces (Master Planner file, layout 3): `Flight Codes`: A Code, B Description, C Crew, D Mission Type, E Syllabus tag (G day statuses and I ground list unchanged); `CodeTable` = `'Flight Codes'!$A$6:$E$..`. `Flights`: A Date, B Shift, C Flight code, D Time, E Crew override, F Comment, **G Sorties (typed, blank = 1)**, H Crew used, I Key, J Order, K Counts, **L Hrs (formula)**, hidden helpers **M start minutes, N end minutes, O effective sorties, P cleaned time text**. Names: `FlSorties` = `Flights!$O$6:$O$..`, `FlHrs` = `Flights!$L$6:$L$..` (unchanged name). `Dashboard!Z2` = `LODESTAR master layout 3`.

- [ ] **Step 1: Write the failing test** `tests/hours_builder.test.py`: build the Master Planner into a temp folder (`python3 .lodestar_build.py excel <tmp> --only master`), open with openpyxl, assert `Flight Codes` headers are exactly `["Code","Description","Crew","Mission Type"]` plus the Syllabus tag header in E5, no header contains "Hrs" or "Sorties"; `Flights!G5 == "Sorties"` and G6 holds no formula; `Flights!L6` is a formula containing `MOD(`; `Dashboard!Z2 == "LODESTAR master layout 3"`; every `CodeTable` VLOOKUP column index in `Flights!H6` is 3.
- [ ] **Step 2:** Run `python3 tests/hours_builder.test.py`. Expected: FAIL (old headers).
- [ ] **Step 3:** In `.build_master_planner.py` replace the Flight Codes header and `CATALOG` tuples (drop sorties and hrs; keep crew, mission type, syllabus tag) and read the new shape from `realdata.FLIGHT_CODES`; in `Flights` build G as a plain input cell (input fill and font, `DataValidation` whole number 1 to 9, blank allowed), H's VLOOKUP column 5 becomes 3, add hidden helpers: P `=IF(D{r}="","",SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(UPPER(D{r}),"H",""),":","")," ",""))`; M `=IFERROR(INT(VALUE(LEFT(P{r},FIND("-",P{r})-1))/100)*60+MOD(VALUE(LEFT(P{r},FIND("-",P{r})-1)),100),"")`; N the same on `MID(P{r},FIND("-",P{r})+1,9)`; O `=IF(C{r}="","",IF(G{r}="",1,G{r}))`; L `=IF(K{r}="","",K{r}*IF(OR(M{r}="",N{r}=""),0,IF(OR(MOD(N{r}-M{r},1440)=0,MOD(N{r}-M{r},1440)>720),0,MOD(N{r}-M{r},1440)/60)))`. Re-point the `FlSorties` name to column O. Month tabs and Dashboard keep reading `FlSorties`, `FlCount`, `FlHrs`. Bump the stamp to 3. Update the sheet banner and help text lines that mention sorties or hours per code.
- [ ] **Step 4:** Rerun the test; Expected: PASS. Also open the built file in LibreOffice headless (`soffice --headless --convert-to csv`) on a copy with a flight typed `2200-0100` and confirm `Flights!L` reads 3 (a one-off check, record the result in the commit message).
- [ ] **Step 5:** Commit `Master Planner builder: hours from the time range, sorties typed per flight (layout 3)`.

### Task 2: Seed and real data

**Files:** Modify `.seedplan.py`, `.realdata.py`, `.build_planner.py` (the `catalog` lines that read hrs and sorties); update `input/LODESTAR_Data_Input.xlsx` Flight Codes sheet.

**Interfaces:** Consumes Task 1's shape. Produces `realdata.FLIGHT_CODES` entries `{code, desc, crew, mtype, stag}` (no `hrs`, no `sorties`); `seedplan.FLIGHTS` tuples `(date, shift, code, time, comment, crew, sorties)` where the demo's `2xFLT-*` flights become `FLT-*` with sorties 2 and a time range covering both.

- [ ] **Step 1: Failing test** in `tests/hours_builder.test.py`: build the demo Master Planner; assert no flight code starts with `2x`; at least one flight row has G = 2; every flight row has a time of the form `HHMM-HHMM`.
- [ ] **Step 2:** Run it; Expected FAIL.
- [ ] **Step 3:** Change `.realdata.py` to read columns Code, Description, Crew, Mission Type, Syllabus tag (it must also accept the old 7-column sheet and ignore Sorties and Hrs, so Brandon's existing input file still loads); edit the input workbook accordingly (copy first, keep the old as `input/_old_`... no: keep it in git history only); update the seed flights.
- [ ] **Step 4:** Test PASS; `python3 .lodestar_build.py excel ../lodestar_rebuild` completes for all 8 files.
- [ ] **Step 5:** Commit.

### Task 3: Dashboard parsing and `mpFlHrs` (no code fallback)

**Files:** Modify `.dashboard_source.html` (`readMaster` around the Flight Codes and Flights parse, `mkCodes`, `mpFlHrs`, `LAYOUT`, the Flight Codes page `COL` map); Test `tests/hours_from_times.test.js` (new).

**Interfaces:**
- Produces: `st.codeAll[i] = { row, code, desc, crew, mtype, stag }` (Flight Codes now A, B, C crew, D mtype, E stag when `Dashboard!Z2` master layout is 3; keep reading the old columns for layout 2 files). `st.fl[i]` gains `sort` (typed Flights G, blank or invalid = 1). `mpFlHrs(P, f) -> { h: number, bad: "" | "No time" | "No end time" | "Check time" }` (no `src`, no fallback). `flSort(f) -> number` (= `f.sort || 1`). `LAYOUT = { dept: 4, master: 3, roster: 2, ops: 2 }`.

- [ ] **Step 1: Failing tests** in `tests/hours_from_times.test.js` (boot with `{mine:"Ops_Room"}` on a layout-3 rebuild via `LODE_FILES`): `mpFlHrs(P,{time:"0830-1030"})` is `{h:2,bad:""}`; `"2200-0100"` is 3; `"0830H-1030H"`, `"08:30-10:30"`, `"0830 - 1030"` are 2; `"0830"` is `{h:0,bad:"No end time"}`; `""` is `{h:0,bad:"No time"}`; `"0830-0830"` and `"0830-0730"` give `bad:"Check time"` with `h:0`; `flSort({sort:undefined})` is 1 and `flSort({sort:3})` is 3; parsing a flight row with G = 2 yields `sort: 2`.
- [ ] **Step 2:** Run `node tests/hours_from_times.test.js`; Expected FAIL.
- [ ] **Step 3:** Implement the parse changes (read by header text so layout 2 and 3 Master files both load: if Flight Codes `C5` reads "Sorties" it is the old layout), drop the code lookups from `mpFlHrs`, delete `mkCodes`'s `sort`/`hrs` defaults, bump `LAYOUT`.
- [ ] **Step 4:** Test PASS.
- [ ] **Step 5:** Commit.

### Task 4: Master Planner screens use flight hours and sorties

**Files:** Modify `.dashboard_source.html` (`renderMp` calendar chips, week and month totals, KPI cards, `daySort`/`sortOf`, `mpExportData` and `mpExportBytes`, the Flight Codes page table, the day panel flight card, `mpRange`/`opsTimes` chip end).

**Interfaces:** Consumes `mpFlHrs`, `flSort`. Produces: the day panel flight card has a **Sorties** number box (editable only; blank means 1) writing Flights column G; the card chips show `N sorties` when more than 1; the Flight Codes page table has columns Code, Description, Crew, Mission Type, Syllabus tag; the calendar chip end time is the typed end only (no start plus code hours).

- [ ] **Step 1: Failing tests** (update `tests/master_calendar.test.js`, `tests/mp_export.test.js`, `tests/mp_card.test.js`): a flight `0830-1030` with Sorties 2 on a day: the day cell shows `2 sorties` and the week total counts 2; the month hours card equals the sum of the flights' `mpFlHrs`; the export hours per day equal the same sum; the card shows `2.0 H` and `2 sorties`; a start-only chip shows the start only.
- [ ] **Step 2:** Run the three tests; Expected FAIL.
- [ ] **Step 3:** Replace every `hrsOf`, `ck.hrs`, `k.hrs`, `sortOf` use in the Master Planner screens with `mpFlHrs(P, f).h` and `flSort(f)`; add the Sorties box (`data-f='sort'`, numeric 1 to 9) to the editable card and its save handler (`put("Flights", "G" + row, v === "1" ? "" : v)`); remove the "(code)" chip variant from the card.
- [ ] **Step 4:** All three PASS, plus `tests/ops_room.test.js` untouched at this point.
- [ ] **Step 5:** Commit.

### Task 5: Ops Room rows from the flight's Sorties

**Files:** Modify `.dashboard_source.html` (`opsDay`: `ac` and `hrs`; Ops Add flights default Sorties 1); Test `tests/ops_room.test.js`.

**Interfaces:** `opsDay` flights get `ac = flSort(f)` (was `ck.sort`) and `hrs = mpFlHrs(P, f).h`.

- [ ] **Step 1: Failing test** `sorties_on_the_flight_make_the_rows`: a flight with `sort: 3` yields three rows labelled aircraft 1/3, 2/3, 3/3; one with no `sort` yields one row.
- [ ] **Step 2:** Run `node tests/ops_room.test.js sorties`; Expected FAIL.
- [ ] **Step 3:** Implement; planned hours on each row stay the flight's range (shown on the first row only if rows currently show hours per aircraft, otherwise unchanged).
- [ ] **Step 4:** Whole `ops_room` file PASS.
- [ ] **Step 5:** Commit.

### Task 6: Department builder (Activities, Fly Hrs removed)

**Files:** Modify `.build_planner.py`; Test `tests/hours_builder.test.py`.

**Interfaces:** Produces (dept layout 4): `Activities`: A Code, B Description, C Category, D Mission Type (and Syllabus tag in the next column as today, shifted two to the left), no Flight Hrs, no Sorties, no `ActHrs`, no `ActSort` names; the hidden calc columns keep their letters only if no other formula moves (otherwise shift and update every reference in the builder). Per-person Flights metric = count of Flight-category cells in the three shift rows (`COUNTIFS(ActCodesAll, range, ActCat, "Flight")`, one per cell). The per-person "Fly Hrs" metric, the Summary "Fly hrs" row, the Overview hours column, the Dashboard "Flying hours per month" chart and "Total Flying Hrs" card are removed. Master warnings: planned sorties per shift = number of filled MASTER slots (no sorties lookup). Help text lines about Sorties and Fly Hrs are rewritten. `Dashboard!Z2` = `LODESTAR dept layout 4`.

- [ ] **Step 1: Failing test:** build SUP 2; assert `Activities` header row has no "Flight Hrs" or "Sorties"; the defined names list has no `ActHrs` or `ActSort`; no cell formula anywhere in the month tabs contains `ActHrs` or `ActSort`; `Dashboard!Z2` ends `layout 4`; the file opens and recalculates in LibreOffice headless without `#NAME?` or `#REF!` anywhere (scan every sheet).
- [ ] **Step 2:** Run; Expected FAIL.
- [ ] **Step 3:** Implement; rebuild all five department files and rerun `tests/wd_builder.test.py` (fix its expectations that named the removed metrics).
- [ ] **Step 4:** PASS.
- [ ] **Step 5:** Commit.

### Task 7: Dashboard department side (per-person hours from MASTER times)

**Files:** Modify `.dashboard_source.html` (`monthStats`, the Activities page, the codes sync button `actSync`, the Overview and year table and chart, planner totals strip, My Lodestar hours, `readDept` Activities parse).

**Interfaces:** Produces `cellHrs(M, s, d, code) -> number`: for the department month `M`, shift `s`, day `d` and the code in a person's cell, the hours of the first MASTER slot `j` in `{2s, 2s+1}` whose `M.master[j][d]` equals the code (case and spaces ignored) and whose `M.mtime[j][d]` gives a valid range through `mpFlHrs`; else 0. `monthStats` uses it for planned hours; Pax cells still skip. The Activities page shows Code, Description, Category, Mission Type, Syllabus tag only. Planned sorties for the department Master warning = filled MASTER slots in the shift. The "Fly Hrs" displays in the dashboard stay, labelled `PLAN` hours (they now come from times).

- [ ] **Step 1: Failing tests** in `hours_from_times.test.js`: with a SUP 2 layout-4 file, MASTER slot 0 AM on 14 Oct = `FLT-2.0` `0830-1030`, a person's AM cell = `FLT-2.0`: `cellHrs` is 2 and the person's month total includes 2.0; MASTER slots 0 and 1 both `FLT-2.0` with ranges `0830-1030` and `1000-1130`: `cellHrs` is 2 (first valid), not 3.5; a person on `FLT-2.0` with no matching MASTER slot gets 0; a Pax-tagged cell adds 0; update `tests/my_lodestar.test.js` expectations that summed code hours.
- [ ] **Step 2:** Run; Expected FAIL.
- [ ] **Step 3:** Implement and remove the Flight Hrs and Sorties columns and inputs from the Activities page and `actSync` payload; the Activities parse reads by header text so a layout 3 department file still opens (it just shows the old columns' values ignored).
- [ ] **Step 4:** PASS; run `my_lodestar`, `wd_row`, `flight_card`, `planner_filter` and `role_tags` (known: three old `my_lodestar` failures).
- [ ] **Step 5:** Commit.

### Task 8: Rebuild, regression, docs, and the file replacement

**Files:** Modify `HANDOFF.md`, `PROJECT_CHECKLIST.md`, `CLAUDE.md` (layout stamps, Activities description), the dashboard version string; rebuild the dashboard; build a fresh set into `../lodestar_rebuild`.

- [ ] **Step 1:** `python3 .lodestar_build.py excel ../lodestar_rebuild --data input/LODESTAR_Data_Input.xlsx` then `LODE_FILES=../lodestar_rebuild` run every test file in `tests/` (skip `atom.test.js` unless ATOM code changed) and `python3 tests/wd_builder.test.py`, `python3 tests/hours_builder.test.py`.
- [ ] **Step 2:** Screenshot the Master Planner card, the Activities page and the Flight Codes page into `previews/` and check them by eye.
- [ ] **Step 3:** Update the docs; tick the checklist line "Streamline".
- [ ] **Step 4:** **Ask Brandon** before replacing the repo's own `.xlsx` files and the dashboard's built-in sample with the fresh layout 4 and 3 set; only then copy them in, rebuild the dashboard (`python3 .lodestar_build.py dashboard`) and commit.
- [ ] **Step 5:** Tell Brandon which files to upload: the DEV dashboard plus all eight `.xlsx` files (he must replace the old ones together; mixed versions warn on opening).

## Self-review notes

- Spec coverage: hours from range (T3, T4, T7), sorties on the flight (T1, T3, T4, T5), Activities and Flight Codes columns removed (T1, T4, T6, T7), Excel Fly Hrs dropped (T6), running change one flight (T4, T5), layout stamps and rebuild (T1, T6, T8), input workbook (T2).
- Known simplification to confirm with Brandon: a department's planned sorties are the number of MASTER slots, so a flight with Sorties 2 does not raise a department's required crew count; crews on a running change count once each (as agreed: they sit on the one flight).
- Excel parses only the `-` separator in the time; the dashboard also accepts `to` and an en dash. Brandon types `-`.
