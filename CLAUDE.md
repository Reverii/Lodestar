# LODESTAR (Flight Ops Planner): instructions for Claude Code

Read this first, then `HANDOFF.md` (current state, open items, history) and `PROJECT_CHECKLIST.md` (Brandon's roadmap).

## What it is

LODESTAR ("One unified plan. One true north.") is the daily flying ops planner for 121 SQN, a maritime patrol squadron.
Owner and only user of this workspace: **Brandon**. It replaces hand transfer between five department Excels and the
existing macro-heavy ops tool (Oracle).

- One macro-free `.xlsx` per department (SUP 1, SUP 2, TACCO, Loadmaster, Pilot): AM / PM / NIGHT rows per person per
  day with activity dropdowns, monthly totals (flights, flying hours, ground duty, SDO, leave).
- `Master_Planner.xlsx` (squadron flight list, source of truth for flights), `Duty_Roster.xlsx` (BDO / SDO department
  per day), `Ops_Room.xlsx` (seats, MC/CRMO, tails, flown/cancelled, Ops Add, day board).
- `Flight_Ops_Planner_Dashboard.html`: one offline single-file HTML app that opens the Excels, edits them and saves by
  patching only the touched cells' XML (formulas, conditional formats and validation survive). Each department edits its
  own file and views the others read-only; the Ops Room mode opens and edits every file.

## Hard constraints (do not break)

1. **Offline intranet.** No internet at the squadron. Everything must run in desktop Excel and Edge/Chromium with no CDN,
   no network fetches except SharePoint REST on the same site. Libraries are inlined (fflate). Macro-free `.xlsx` only.
2. **SharePoint first.** Files are hosted in a SharePoint folder "Program"; design and test for the dashboard running from
   SharePoint (REST: list/open/save, TimeLastModified merge, live refresh every 15 s). Screen budget ~1280x720 usable.
3. **Dashboard and Excel files must be matched versions.** The dashboard reads and writes cells at exact row/column
   positions (constants near `// ---------- workbook layout (must match the Excel builder)` in `.dashboard_source.html`).
   If you move any cell in a builder, update the dashboard constants AND bump the layout stamp (see below).
4. **STAY IN DEV MODE** (Brandon, 2026-10-25): ship the dev build in this folder. Do not hand Brandon the `release/`
   copy or switch to a release build until he says so. Keep any new dev-only code inside `/*DEV*/ ... /*/DEV*/` or
   `<!--DEV--> ... <!--/DEV-->` markers so the release build can strip it later.
5. **Scaled up** (Brandon, 2026-10-26): all five department files are built from the same template (`.build_planner.py <out.xlsx> "<dept>"`).
   New features go into every department. `.build_planner_other_depts.py` is dead (older layout).
6. **Real data is loaded** (2026-10-25). The live files hold Brandon's real crew and codes. **Rebuilding an Excel file
   from a builder produces a fresh file with empty plans and wipes whatever was typed into it.** Never overwrite a live
   `.xlsx` in this folder without Brandon's explicit go-ahead; build into another folder and let him decide. If a layout
   change is needed after planning starts, write a migration (copy typed data from old file into the new layout), which is
   an open checklist item.
7. **Wording.** 121 SQN is one squadron. Never split it into "Air Force vs Navy" (or similar) in any text, UI or slide.
   Brandon prefers plain English, full sentences, no jargon from the code.
8. **Not required** (Brandon decided, don't build or suggest again): double-booking check, fair share view, print layouts,
   postings dates, aircraft availability, weekly CO summary, leave balance, actual flying hours tracking beyond the Ops
   Room, Aborted / Re-plan, duplicate-tail warning, pairing rules, SDO person assignment / swap / fairness, PDF export,
   phone view, .ics export, look-ahead panel, copy last week, notes for the day, Ops Room P1/P2 alert windows (resolved by the 1 Set / 2 Set button, 2026-10-25).
9. Ask before anything irreversible or outward-facing. Brandon uploads to SharePoint himself.

## Files in this folder

| File | What |
|---|---|
| `Flight_Ops_Planner_SUP2.xlsx` | SUP 2 planner, the master template (newest layout, Syllabus sheets, Jan (next year) tab) |
| `Flight_Ops_Planner_{SUP1,TACCO,Loadmaster,Pilot}.xlsx` | other departments, older layout |
| `Master_Planner.xlsx`, `Duty_Roster.xlsx`, `Ops_Room.xlsx` | shared files |
| `Flight_Ops_Planner_Dashboard.html` | **the dev build Brandon uses** (~6 MB; embeds SUP 2 as template + the other files as samples) |
| `release/Flight_Ops_Planner_Dashboard.html` | release build (dev code stripped). Not for Brandon yet |
| `input/LODESTAR_Data_Input.xlsx` | Brandon's filled real-data workbook (Crew, Flight Codes, Activities, Lists, Public Holidays) |
| `tests/` | Node + Playwright checks (`node tests/my_lodestar.test.js`, `node tests/atom.test.js` (ATOM currency, synthetic exports from `tests/make_atom_fixture.py`), needs the dashboard built first; the ATOM file takes several minutes); `LODE_FILES=<folder>` points them at another set of xlsx files |
| `docs/superpowers/` | design specs and implementation plans (My Lodestar) |
| `specs/SUP2_syllabus_items.csv` | real SUP 2 syllabus (47 items); embedded in `.build_planner.py` as `SYL_REAL` |
| `deck/LODESTAR.pptx` | CO reveal deck, Brandon's edited master copy |
| `logo/final/`, `logo/animated/` | Compass Rose logo (chosen), 8 s intro video |
| `previews/` | deck screenshots and mock-ups |
| `_archive/` | superseded files (old demo set, year-named files, cleanup of 2026-10-25). Don't use |
| `PROJECT_CHECKLIST.md` | roadmap with Brandon's decisions; tick lines when you build or he decides something |

Hidden (dotted) source files, so they don't clutter SharePoint:

| Source | Role |
|---|---|
| `.dashboard_source.html` | the dashboard app source (HTML + CSS + JS in one file; `app.html` to the assembler) |
| `.assemble_dashboard.py` | inlines fflate + base64 sample xlsx into the source -> dashboard html; `--release` strips DEV blocks |
| `.fflate_umd.js` | fflate 0.8.2 UMD (MIT), inlined by the assembler (extracted from the built dashboard on 2026-10-25) |
| `.build_planner.py` | SUP 2 department planner builder (`<out.xlsx> "SUP 2"`) |
| `.build_planner_other_depts.py` | dead: the older-layout builder (until the 26 Oct scale-up) |
| `.build_master_planner.py`, `.build_duty_roster.py`, `.build_ops_room.py` | shared-file builders (`<out.xlsx>`) |
| `.seedplan.py` | demo data shared by all builders; switches to real data when `realdata.ON` |
| `.realdata.py` | reads `LODESTAR_Data_Input.xlsx` when env `LODESTAR_INPUT` points at it |
| `.lodestar_build.py` | **build driver: use this** (stages the dotted files under their import names in a temp dir) |

Older builder variants in `_archive/` are dead; ignore them.

## Build commands

Needs Python 3 + `openpyxl` (verified 3.1.5). Run from this folder.

```bash
# Dashboard (dev build, overwrites Flight_Ops_Planner_Dashboard.html here). Safe: no Excel file changes.
python3 .lodestar_build.py dashboard

# Release build into release/ (only when Brandon says so)
python3 .lodestar_build.py dashboard --release

# Rebuild Excel files from the builders with the real data, INTO ANOTHER FOLDER (empty plans!)
python3 .lodestar_build.py excel ../lodestar_rebuild --data input/LODESTAR_Data_Input.xlsx            # all 8
python3 .lodestar_build.py excel ../lodestar_rebuild --data input/LODESTAR_Data_Input.xlsx --only sup2  # sup2,others,master,duty,ops
```

Without `--data` the builders produce the demo set (sample crew, demo flights Oct-Nov). The driver refuses to write the
Excel files into this folder.

The dashboard embeds the current `.xlsx` files of this folder (SUP 2 as `TEMPLATE_B64`, the others in `SAMPLES_B64`), so
re-run `dashboard` after changing any Excel file. Verified 2026-10-25: the driver reproduces the live dev and release
dashboards byte for byte, and `excel --data input/LODESTAR_Data_Input.xlsx` reproduces all 8 live `.xlsx` files
(identical apart from the created/modified timestamps). So the live files are still pristine builder output with empty
plans; once Brandon starts planning in them, that stops being true.

Builder env flags (Excel Online test variants, normally off): `NOFILTER=1` (shows hidden empty crew slots, use for
verification copies), `NOCHART`, `NOCOMMENT`, `STATICNAMES`, `SMALLFREEZE`, `WEBCLEAN`, `COMPACT`.

## Layout stamps and version

- Each builder writes a stamp on the file's Dashboard sheet `Z2`, e.g. `LODESTAR dept layout 2`. The dashboard has
  `const LAYOUT = { dept: 2, master: 2, roster: 2, ops: 2 }`. A file with a higher stamp warns "newer than the dashboard";
  lower or missing = checked sheet by sheet and listed as "older layout". Bump both sides together when cells move.
- Dashboard version string: `Dashboard version 2026-10-26 z92` (two places in `.dashboard_source.html`: `#wDiag` and
  `spDiag`). Bump the `zNN` number on each change you ship so Brandon can tell builds apart.

## Key cell layout (department file; full detail in the builders and dashboard constants)

- `Dashboard!A5` plan year (name `PlanYear`; every date follows it), `B5` month, `G5` this department, `Z2` layout stamp.
- Month tabs Jan..Dec + `Jan (next year)` (SUP 2): MASTER rows from row 6, slot j (= shift*2 + slot) code on row 6+3j,
  time +1, comment +2; row 24 GROUND PROGRAMME; duty days row; crew grid from row 27 (26 in files without ground
  programme), 3 rows per person (AM/PM/NIGHT), days in D:AH, totals from AI. Col A = callsign on every crew row (autofilter).
- SDO / BDO Plan: month mi block at column 1+8*(mi%3), title row 6+16*floor(mi/3), week w on title row+3+2w (Mon..Sun);
  13th block (next Jan) at A70-G85. Identical cells in Duty_Roster.
- Roster columns are found from header row 5 (Callsign | Name | Initials | Cat Status | Role | Status | Remarks).
- Master Planner Flights rows 6..1005 (A date, B shift, C code, D time, E crew override, F comment); Flight Codes
  (E crew tags P L T S1 S2, H syllabus tag); Day Status one row per date from row 6 (to row 402 with next Jan).
- Every save appends to the file's own `Change Log` sheet (created on first save by the dashboard).

## Testing

The old Node/Playwright tests (`web/*.test.js`, SharePoint mock `spmock2.js`) lived in a cloud scratchpad that no longer
exists. New checks are in `tests/` (run `python3 .lodestar_build.py dashboard && node tests/my_lodestar.test.js`). To check a change, open the built dashboard in Chromium/Edge (Playwright works),
load the Excel files from this folder (file input or "Open every file (dev)" folder picker), and exercise the feature;
check saved files with openpyxl. Pages accept `window.OPS_TODAY` / `CUR_TODAY = "2026-10-14"` to fake today. A small
SharePoint REST mock is worth rebuilding if you touch save/merge/live refresh.

## Working with Brandon

- He tests on the squadron intranet and tells you results. Give him short, plain replies: what changed, which files to
  upload (always the DEV dashboard from this folder plus any changed `.xlsx`), what to test.
- Before building a sizeable UI change he usually wants a mock-up (HTML + PNG at 1280x720 in `previews/`) and says
  "build it". Small fixes: just do them.
- Update `PROJECT_CHECKLIST.md` and `HANDOFF.md` when something is built or decided.
