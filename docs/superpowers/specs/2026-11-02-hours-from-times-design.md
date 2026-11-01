# Planned hours from the Master Planner time range (spec, 2 Nov 2026)

Status: **draft for Brandon to review. Nothing is built.** Asked by Brandon on 2 Nov: take Flight Hrs and Sorties off the Activities page and use the Master Planner instead, to cut data entry.

## Goal
One place for a flight's hours: the time range typed on the Master Planner (every flight will have a full range). No Flight Hrs column to keep in step with it.

## What exists today
- **Master Planner file** `Flight Codes` sheet: Code, Description, Sorties, Flight Hrs, Crew, Mission Type. `Flights` sheet has formula columns G (Sorties) and L (Hrs) that look the code up. The month tabs and Dashboard sheet sum them ("Planned sorties", "Planned flying hrs").
- **Department files** copy the codes into `Activities` (D = Flight Hrs, L = Sorties calc). Named ranges `ActHrs` and `ActSort` feed Excel formulas: each person's monthly Flights and Fly Hrs, the Overview totals and charts, the Master warnings (planned sorties against crew sorties).
- **Dashboard** reads `hrs` and `sort` from the codes in about 50 places (calendar chips, KPI cards, export, planner totals, the new flight card).
- **Input workbook** `LODESTAR_Data_Input.xlsx` and `.realdata.py` carry Sorties and Hrs per flight code.

## The hard part: a person's cell holds only a code
A department planner cell says `FLT-2.0`, not which MASTER flight the person is on. So the time range cannot be looked up for a person directly. Two cases:
1. **Hours per person.** Needs "the MASTER flight in that shift with the same code", then its time range. The dashboard can do this. A plain Excel formula can, but it is long and slow (text parsing of "0830-1030", midnight crossing, two slots per shift, over 4 rows x 31 days x people).
2. **Sorties.** Today `2xFLT-1.5` (Sorties = 2) is how one crew flies two sorties in one shift, because a cell holds one code. The planned-sorties against crew-sorties warning depends on it. A count of MASTER flights cannot tell "one crew flying two sorties" from "two aircraft with two crews".

## Options
**A (recommended): remove Flight Hrs only, keep Sorties.**
- Flight Hrs disappears from Flight Codes, Activities and every sheet; hours come from the time range (end earlier than start = next day, over 12 h or 0 h = "Check time", as in z125).
- Sorties stays as the one per-code number (default 1; only combined codes such as `2xFLT-1.5` hold 2). It is one small column, but it is the only way to keep the crew-sorties warning right.
- Master Planner file: Flights column L (Hrs) becomes a formula reading the time range (or the dashboard computes it); the Planned flying hrs totals follow.
- Department files: per-person "Fly Hrs" and the Overview hours need the time range. Dashboard shows them; plain Excel shows flights only (Fly Hrs column removed), or a long formula (decision below).

**B: remove both.** Same as A, and sorties = number of MASTER flights; one crew flying two sorties must be planned as one flight, or the warning shows "short of crew" wrongly. Not recommended.

**C: do nothing in Excel, dashboard only.** Leave the columns, hide them from the Activities page and ignore them in the dashboard. No layout change, no file rebuild, but the Excel totals would disagree with the dashboard. Not recommended.

## Decisions needed from Brandon
1. A, B or C (recommended A).
2. Per-person Fly Hrs in plain Excel: drop them (dashboard shows them) or keep a long formula that reads the time range. Recommended: drop.
3. Combined codes (`2xFLT-1.5`): its time range on the Master Planner is one range covering both sorties (for example 0830-1130); hours then come from that range, not 2 x 1.5. OK?

## Changes if A is chosen
- Builders: `.build_master_planner.py` (Flight Codes, Flights L, month tabs, Dashboard), `.build_planner.py` (Activities D and the ActHrs name, Fly Hrs rows, Overview, Dashboard charts, help text), `.realdata.py` and the input workbook (drop the Hrs column).
- Dashboard: one helper (`mpFlHrs`, already built in z125) used everywhere hours are shown; per-person hours read the matching MASTER flight's time range; the Activities page loses the Flight Hrs column; export, KPI cards, chips and totals switch over; the end of a calendar chip stays "typed end, else start" (no hours to add).
- Layout stamps: dept 3 to 4, master 2 to 3 (Dashboard version check handles older files). Rebuild fresh with the layout-3 replacement already on the to-do list (dummy data only, no migration).
- Tests: update the tests that read hours (`master_calendar`, `mp_export`, `my_lodestar`, `wd_row`); new tests for the per-person hours and the Excel build.

## Not changing
ATOM clocked hours, Ops Room planned hours per row (they will read the time range), the 12 h and midnight rules, crew tags.
