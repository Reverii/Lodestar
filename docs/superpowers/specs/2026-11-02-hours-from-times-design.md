# Planned hours from the Master Planner time range (spec, 2 Nov 2026)

Status: **design agreed with Brandon on 2 Nov, written spec awaiting his review. Nothing is built.** Asked by Brandon: take Flight Hrs and Sorties off the Activities page and use the Master Planner instead, to cut data entry.

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

## Agreed design (Brandon, 2 Nov)
- **Hours are planned hours only.** ATOM is the truth for actual hours; LODESTAR's own number is the plan, taken from the flight's time range (end earlier than the start = next day; 0 h or over 12 h = "Check time"; no end time falls back to nothing once Flight Hrs is gone, shown as "No end time"). Everyone planned on a flight is credited with that flight's range.
- **Running change** (ground or airborne): one flight split into 2-3 callsigns with different objectives. It is one flight on the Master Planner with **one time range covering all of it** (for example 0830-1230) and a **Sorties number on the flight**.
- **Activities page:** Flight Hrs and Sorties columns are removed (Master Planner Flight Codes and every department's Activities).
- **Master Planner `Flights` sheet:** the Sorties column becomes a typed column (blank = 1) instead of a lookup from the code; the Hrs column becomes a formula from the time range (or is computed by the dashboard). Combined codes such as `2xFLT-1.5` are no longer needed: use `FLT-1.5` with Sorties 2.
- **The Ops Room** keeps splitting one flight into its sortie rows (aircraft 1/2, 2/2) from the flight's Sorties number.
- **Crew** members of a running change are on the one flight (one code in their cell), whichever sortie they fly.
- **Excel totals in the department files:** per-person Fly Hrs and the Overview hours cannot read a time range reliably in plain Excel, so they are dropped from Excel (the dashboard shows them from the time range). Flights counts stay in Excel. Open for Brandon to confirm (he has not answered this one yet): drop the Excel Fly Hrs, or keep a long formula.
- **The crew warning** (planned sorties against crew sorties) uses the flight's Sorties number instead of the code's.

## Changes
- Builders: `.build_master_planner.py` (Flight Codes, Flights L, month tabs, Dashboard), `.build_planner.py` (Activities D and the ActHrs name, Fly Hrs rows, Overview, Dashboard charts, help text), `.realdata.py` and the input workbook (drop the Hrs and Sorties columns), and the Flights sheet gains the typed Sorties column.
- Dashboard: one helper (`mpFlHrs`, already built in z125) used everywhere hours are shown; per-person hours read the matching MASTER flight's time range; the Activities page loses the Flight Hrs and Sorties columns; the Master Planner day panel gets a Sorties box on each flight (default 1) and the flight card shows it; export, KPI cards, chips and totals switch over; the end of a calendar chip stays "typed end, else start" (no hours to add).
- Layout stamps: dept 3 to 4, master 2 to 3 (Dashboard version check handles older files). Rebuild fresh with the layout-3 replacement already on the to-do list (dummy data only, no migration).
- Tests: update the tests that read hours or sorties (`master_calendar`, `mp_export`, `my_lodestar`, `wd_row`); new tests for the per-person hours and the Excel build.

## Not changing
ATOM clocked hours, Ops Room planned hours per row (they will read the time range), the 12 h and midnight rules, crew tags.
