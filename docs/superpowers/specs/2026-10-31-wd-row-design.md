# Fourth row per member: WD (whole day) (design, 31 Oct 2026)

Checklist item 9.1. Brandon's decisions, 31 Oct: the fourth row is called **WD** (whole day); it takes **general items only** (ground and admin, option A); WD has its own colour, **not the NIGHT colour** (teal proposed); keep the cell size and offer a **UI scaling option**; a **stronger divider between crew**, nothing more (no callsign tint).

## Goal

Each person gets a fourth row on every month tab, for ground, admin and other general items that may overlap a flight in the same shift. It counts in the monthly totals, shows on the Ops Room ground programme and on My Lodestar. The planner stays usable at 1280x720 with four rows per person.

## Rules (settled)

- Rows per person: AM, PM, NIGHT, **WD**. WD has no shift.
- WD accepts the activities in the categories **Ground Duty and Admin** only. Not accepted: flights, Sim, leave / off / medical / oversea, duty (SDO, BDO), standby (P1 / P2 / BU). Those stay in the AM / PM / NIGHT rows, so currency, crew rest, down-chits and the Ops Room crew pick keep reading only the three shift rows and do not change.
- A WD item counts once in the monthly **Gnd Duty** total for that day, even when AM, PM or NIGHT also holds a ground item. It does not count in flights, hours, leave or SDO.
- No migration. The live files hold dummy data: rebuild all five department files fresh (into another folder, never over the live files) and Brandon replaces them on SharePoint.
- Layout stamp: department files `dept 2` to `dept 3`, with `LAYOUT.dept = 3` in the dashboard. An older file gets the existing "older layout" warning.

## Excel (`.build_planner.py`, all five departments)

- Crew block start `G0 + 3*i` becomes `G0 + 4*i` (one named constant `PER = 4`, WD index 3). Callsign in column A on all four rows (same value, so the filter keeps the block together); name merged over the first two rows; role under it; the totals cells merge over four rows.
- Row label column: the WD cell is light teal (`CCFBF1`, text `115E59`); the empty WD cells carry a faint teal tint (`F0FDFA`).
- Totals (`METRICS` loop): the block range covers four rows for the "days" kinds (ground duty, leave and so on); the flight entries, hours and duty kinds still read three rows.
- WD data validation: a list of the allowed activities (a new named range `WdActivities` from the Activities sheet, categories Ground Duty and Admin). AM / PM / NIGHT keep today's full list.
- Daily View gets a WD column (G); the chooser reads `INDEX(..., 4*i + s + 1, ...)`. Cell Notes and Requests shift lists become `AM,PM,NIGHT,WD`; `_grid_row` matches four labels.
- Conditional formats, filters, freeze panes, the Dashboard crew table and the demo seed (`.seedplan.py`, writes at `3*ids`) move to the new row maths.
- Divider between crew: the block's top border is the heavy rule it already is in Excel; keep it.

## Dashboard (`.dashboard_source.html`)

- One constant `ROWS_PER = 4` and one helper `gridRow(i, s)`; all ~40 places that write `i * 3 + s` (and `ci * 3 + si`, `Math.floor(r / 3)`, `r % 3`) use them. No literal 3 is left for rows.
- Planner: the fourth row renders with a teal WD label. The popup on a WD cell lists only the allowed activities, shows no flight pairing and no Role (AC / Pax) row. Chips, comments and the Cell Notes sheet work on WD (shift `WD`). The key `g:r:d` simply carries the larger `r`.
- Divider: the first row of each person's block gets a 3 px near-black top border. Nothing else changes in the identity cells.
- Ops Room: the ground programme card gets a narrow **Whole day** column beside AM / PM / NIGHT, listing each department's WD items for that day (callsign and item). The crew picker (`opsCrewOn`) still reads three rows.
- My Lodestar shows WD items as whole-day items on the person's day.
- Change Log and `LOG_SHIFTS` / `LOG_SLOTS` know the WD label.
- Role Tags and AC / Pax never apply to WD (no flights).

## UI scaling

- A zoom control (minus, level, plus) in the top bar. Levels 100 / 90 / 85 / 80 / 75 %. Default **85 %** in the planner, 100 % elsewhere until a person changes it. Remembered per person in the browser (try/catch, like the Ops Room zoom).
- Applies to the whole UI except the Ops Room, which keeps its own zoom (the two never stack: on the Ops Room tab the page zoom is 100 %).
- Uses the browser's `zoom` on the page body. Sticky columns and headers scale with the grid.
- Mock-ups at 1280x720 with four full-size rows: 100 % shows 6 crew rows, 85 % shows 12, 75 % shows 16.

## Not in scope

WD for flights or leave, changes to currency / rest / down-chit logic, a "compact cells" mode, a callsign tint or spacer row between crew, migration of typed plans.

## Tests

New `tests/wd_row.test.js`; existing suites updated for the four-row maths.
1. Builder: a fresh department file has four rows per person, the stamp reads `dept layout 3`, the WD validation list holds only Ground Duty and Admin codes.
2. Excel totals: a WD ground item adds one ground-duty day; a day with a ground item in AM and WD still counts once; flights, hours, leave unchanged.
3. Dashboard: `gridRow(i, s)` matches the file; the popup on WD lists only allowed activities, no Role row; a WD edit saves to the right cell and writes the Change Log.
4. Ops Room: the Whole day column lists WD items; seats and hours do not change when WD is filled.
5. My Lodestar shows the WD item; currency and crew rest ignore it.
6. Zoom: default 85 % on the planner, 100 % on the Ops Room tab, level remembered across a reload.
7. An older file (stamp 2) opened by the new dashboard shows the "older layout" warning.

## Open points

None.
