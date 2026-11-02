# Flight codes and hours: where things stand (2 Nov 2026, after z130)

Written at the end of a design chat with Brandon. Nothing below the "Built" line is built yet. No Excel layout change is involved in any option except A.

## Built (z130, merged to main)
- Master Planner flight card: the code box is type-or-pick. An existing code (case and spaces ignored) is used. A new code opens a panel (default crew, Mission Type, description) and **Add code** writes it to the first empty row of Flight Codes and sets the flight's code. Test: `node tests/flight_code_combo.test.js` (4).
- Brandon's reasoning: hours now come from the time range, so one `MAS` code replaces MAS3 / MAS4 / MAS6. His data is demo; no rename tool wanted. He edits Flight Codes in his input workbook and rebuilds with `--data`.

## The problem found (Brandon's screenshot, a Planner cell picker)
On a day with a MASTER flight, the picker said "No flights on the master list this day". The MASTER row showed a red **AWAY S** flight. Cause: the code exists on the Master Planner (probably created with the new type-a-code box) but was never copied into this department's Activities sheet.
- `.dashboard_source.html:1667` `isFlightCode(st, code)` decides "is it a flight" by looking the code up in `st.acts` (Activities) and checking the category.
- `.dashboard_source.html:5059-5071` the picker lists a master flight only if its code passes that test (`isFl`).
- `.dashboard_source.html:4887` `plannedFlights(M, d, s)` reads the MASTER rows and already knows the day's codes.
So a code missing from Activities is not a flight: not offered, not coloured, not counted (crew rest, flight counts, currency, crew matrix, Excel monthly totals).
Z130 made this easier to hit: new codes are created on the Master Planner and reach a department only on its next "Copy flight codes".

## Hours: what is already true
Hours no longer come from Activities (z126 to z128). The dashboard works them out in `cellHrs(M, s, d, code)` (`.dashboard_source.html:2888`) from the first MASTER slot of that shift with the same code and a usable time range. So the hours in the Planner already come from the Master Planner's time boxes.

## Gap 1: Excel shows no hours (by design since z128)
- `.build_planner.py:71` per-person column "Fly Hrs (dashboard)"; `:77` and `:811` kept in place but blank and hidden.
- `.build_planner.py:978` and `:993` Summary "Fly hrs" row blank and hidden; `:741` the Dashboard-sheet card sums the blanks (0.0).
- The dashboard never writes hours back into those cells.

## Gap 2: "is it a flight" comes from Activities, not the MASTER row
The three places in "The problem found" above. `isFlightCode` is the one decision point for crew rest, flight counts, currency and the crew matrix.

## Options discussed (none chosen yet)
1. **Remove the flight-code block from Activities and read the Master Planner.** Not possible as such: the department Excel needs the codes locally (monthly totals, cell dropdowns, colours, crew checks), and Excel cannot read another workbook's list reliably on SharePoint.
2. **Automatic sync (recommended if no manual step is wanted).** On open the dashboard compares the department file with the Master Planner's Flight Codes. On Save it writes new or changed codes into Activities (including Mission Type and the dropdown range). The block leaves the Activities page ("Flight codes come from the Master Planner."). The Copy button and the "codes missing" check go. Retired codes only stop being offered; old flights stay. Dashboard only, no layout bump.
3. **Picker reads the MASTER rows, and the existing "Copy from the Master Planner" button also adds missing codes to Activities** (smaller change; still one press per change; a red MASTER cell plus a one-line hint shows when a press is needed).
4. **A: write each person's hours into the Excel Fly Hrs column on Save** (plain numbers; Excel shows them but only the dashboard refreshes them). Only worth it if people read Excel hours without the dashboard.
5. **B: MASTER rows decide what is a flight** (change `isFlightCode` and the picker's `isFl` to also accept a code present in the MASTER rows of that department's month). Fixes the AWAY S picker problem with no Activities change. Excel monthly flight counts would still need the code on Activities unless the formulas change as well.
6. **C: B and A together.**

## Recommendation
B first (it fixes what Brandon hit), together with option 2 or 3 so the code also reaches Activities and the Excel totals stay right. A only if the Excel hours are actually used. Quick check for Brandon now: on Activities press "Copy flight codes from the Master Planner" and Save; the picker should then show AWAY S.

## Open question for Brandon
Which one: (2) automatic sync on save, (3) the Copy button does both jobs, plus whether to do B and/or A.
