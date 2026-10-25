# LODESTAR

One unified plan. One true north.

LODESTAR is 121 SQN's daily flying ops planner: one Excel file per department (SUP 1, SUP 2, TACCO, Loadmaster, Pilot), plus Master Planner, Duty Roster and Ops Room, with an offline HTML dashboard that reads them. Everything runs offline in desktop Excel and Edge/Chromium, with no macros.

## What's here

- `*.xlsx`, `Flight_Ops_Planner_Dashboard.html`: built files holding the DEMO crew set (dummy names and sample plans). Real crew data is kept off GitHub; the squadron copies live in the SharePoint "Program" folder.
- `.lodestar_build.py`: build driver. `python3 .lodestar_build.py dashboard` rebuilds the dashboard; `python3 .lodestar_build.py excel OUTDIR` rebuilds fresh (empty) Excel files. Needs Python 3 and openpyxl.
- `.build_*.py`, `.seedplan.py`, `.realdata.py`, `.assemble_dashboard.py`, `.dashboard_source.html`, `.fflate_umd.js`: the builders and dashboard source the driver uses.
- `CLAUDE.md`, `HANDOFF.md`: working notes for picking the project up in Claude Code.
- `PROJECT_CHECKLIST.md`: roadmap and feature list.
- `logo/`, `deck/`, `specs/`: Compass Rose logo, the CO reveal deck, syllabus item list.

The dashboard reads cells by exact row positions, so the dashboard and the Excel files must always be rebuilt as a matched set.
