# ATOM currency data in Lodestar: design (2026-10-26)

Status: design agreed in chat with Brandon (layers 1 and 2). Nothing is built. Layer 3 (projection) is a later spec.

## Purpose
ATOM, the squadron's closed-network system, tracks every aircrew currency. Lodestar cannot connect to it. Brandon exports
ATOM to Excel by hand. Lodestar reads those exports so planners can see who is current, and are warned when they plan someone
who will not be current on the day of a flight.

## Decisions (Brandon, 2026-10-26)
- Build in layers: **1 status view**, then **2 planning check**. **3 projection** (a planned flight extends an expiry) comes later.
- The 7 sample exports are ATOM as it stood on different dates in October. The 12:41 file has the newest data (every expiry is
  the same or later than in the other six); the other six were exported later but hold older data.
- The `ACS` sheet is the Loadmaster department.
- **Initials are the key.** In the release build, each person's Initials on the Crew Roster are the same as their name in ATOM (`A NGO`,
  `HO KM`, `SAMY`). Brandon assigns them on the roster list. Matching is an exact lookup, not a guess.
- This takes the Currency work off hold. The three sample rules on the Currency tab are placeholders; the real list is in ATOM.

## What an ATOM export looks like (from the 7 sanitized samples)
- One workbook, five sheets: `PILOT`, `ACS`, `TACCO`, `SUP1`, `SUP2`. Row 1 holds merged group titles; row 2 the column names;
  row 3 is a status band (" -> Active"); people start on row 4. Status is `Active`, `Staff/Assigned` or `NSmen`, with a band row
  before each group.
- Person columns: Status, Name, CAT, Instructor CAT. Names come in different shapes: `A NGO`, `HO KM`, `S LIM JH`, `SAMY`.
- **Currency groups (the only ones Lodestar reads):** Flight Currencies, SIM Currencies, LSS Currencies, Mission Currencies.
  A pilot has 21 currencies (Day Capt, Day Curr, IRT, Instructor Check, Night Capt, Night Curr, PAFI (SE), SIM, ACE, APT, Dinghy (P), SVT,
  Airlift, EIS, MAI/MCAS, MAS, MAS (M), MAS (S), MAS TACT, SAL, SGH); the other sheets have 11 to 14.
- **Cell values:** a date such as `16 Nov 26` is the day the currency **expires**. `-` means the person does not hold it. `N/A` means it
  does not apply to them. A blank or a single space means not recorded.
- **Ignored on purpose:** SIM Package, Instrument Flying, FDT Remaining, Flying Hours Clocked, Sorties Clocked, SATR and I-SATR (the
  remarks can be personal). Lodestar never stores or shows them.
- **No as-of date inside the file.** Only the export time (workbook created time, file name) is recorded. It is not the date of the data.
- Dates only move later between snapshots, so expiry dates extend as flying is logged.

## Layer 1: status view
**Getting a file in**
- **Add ATOM export** (Currency tab and the Add other departments flow) opens one export file; the SharePoint folder scan and the dev folder
  picker also pick up any `.xlsx` whose sheets include a row-2 header with `Name` and a currency group. It is read-only: never saved,
  never written back.
- The file is read by **header names**, not column positions, so a new or moved column does not break it. A currency that appears
  later is shown automatically; one that disappears is listed as missing.
- **As of:** the export time by default, shown beside the file, with a small date box to change it (remembered in the browser).
  Banner: amber when the data is more than 7 days old, red after 30. Never pick the "newest" of several files by name; with
  several files open, the user chooses which is the current one, and the as-of date decides the default.

**Matching people**
- Sheet to department: `PILOT` = Pilot, `ACS` = Loadmaster, `TACCO`, `SUP1`, `SUP2`.
- An ATOM name is matched to the **Initials** on that department's Crew Roster, ignoring capitals and extra spaces. Nothing else is tried:
  no surname guessing, no callsign or name matching. The matching is done in memory each time; no mapping is saved anywhere.
- A short **Names to fix** list shows what needs attention, and fixing it is done on the Crew Roster tab (the list links there):
  ATOM names with no matching Initials, roster people whose Initials are not in ATOM, two roster people with the same Initials, and
  ATOM CAT against the roster's Cat status.
- Until a person matches, they simply have no ATOM currencies shown; the grid and the Planner never guess.

**Reading a cell**
- Date before the as-of day: **Lapsed**. Within 14 days after it: **Due** (the 14 can be changed, remembered in the browser).
  Otherwise **OK**. `-` and `N/A` are hidden (not held). Blank: "not recorded", shown grey.
- Everything is judged against the day the user is looking at, so My Lodestar and the Planner can ask about any date.

**Where it shows**
- **Currency tab:** a person-by-currency grid for the whole squadron, worst first, with department and "problems only" filters,
  counts on top, and the as-of line. Not limited to 12 columns.
- **Planner (SUP 2):** the red and amber marks beside names include ATOM lapses.
- **My Lodestar:** the currency card uses ATOM when a file is open; the existing flight-based rules stay as the fallback.
- **Ops Room:** a small red mark on a seat when the person lacks a currency that flight needs (layer 2 table).
- The same **Names to fix** list also catches CAT differences and roster people missing from ATOM (see Matching people).

## Layer 2: planning check
- A small table, kept in a dashboard-created sheet `ATOM Needs` in `Ops_Room.xlsx` (created on first save, as `Change Log` is), says which currencies a flight needs: by flight code or
  mission type (for example `NVG-*` needs Night Curr; `FLT-*` needs Day Curr; `MAS TRG` needs MAS). Edited on the Currency tab.
- When a flight code is put in a Planner cell (or a Block of days over a flight), and the person's currency has expired by that day,
  the cell gets a red corner and a note such as "Night Curr ended 27 Oct". It warns; it never blocks.
- The Planner cannot tell the seat, so it checks the general currency (`Curr`). The Ops Room checks the captain currency (`Capt`)
  when the Aircraft Captain seat is filled.
- Without projection the check uses the ATOM expiry as it stands. A flight planned earlier in the month does not yet extend it; that
  is layer 3, and the warning says "from ATOM as of <date>" so nobody reads it as a forecast.

## Scope and rules
- Reads only. No Excel file layout changes (new sheets are created on first save). Offline, no network. Dev mode first; dev-only code in DEV markers.
- Scaled up 2026-10-26: all five departments share the SUP 2 template, so the status view and the Planner warnings (layer 2) cover every department.
- Privacy: the export carries names. It stays in the same SharePoint folder and access as the other files. Lodestar keeps no copy and reads
  currency columns only.

## Edge cases
- Stale file, no file open, a sheet missing, header names changed, two roster people with the same Initials, a blank Initials cell, a person on two sheets, a date in an
  unexpected format (shown as "not recorded" with the raw text), `NIL` callsigns, an export that has only some departments.
- Several files open at once: the grid uses the one marked current; the others can be shown side by side later.

## Testing
- Synthetic exports built in the test script with openpyxl, matching the structure above (merged group row, band rows, all value kinds,
  odd names). Brandon's exports are **not** copied into the public repo.
- Checks: header-based reading; moved and extra columns; each value kind; status at several as-of days; Initials matching (case, spaces,
  unmatched, duplicated, blank); stale banner; the Planner warning appears and clears; nothing is written to any file by the view.
- A later backtest (layer 3) will compare an older snapshot plus the flying logged since against a newer snapshot.

## Next steps
1. Brandon reads this spec.
2. A 1280x720 mock-up of the Currency grid and the cell warning in `previews/`, for "build it".
3. Implementation plan, then build in dev mode.
