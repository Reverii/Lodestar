# ATOM currency v2: shared by the Ops Room, five currencies, two-layer Planner (2026-10-26)

Status: design agreed in chat with Brandon; written spec awaiting his review. Nothing of v2 is built.
Replaces the scope of `2026-10-26-atom-currency-design.md` (v1, built as dashboard z92 and merged to `main`) wherever the two differ. v1 stays the
record of what z92 does today.

## Purpose
ATOM, the squadron's closed-network system, is the real truth for currency. Lodestar cannot connect to it. Once a day the Ops Room exports ATOM to
Excel. Lodestar reads that export once, shares what it needs with every other dashboard through the Ops Room file, and shows planners (1) where a
currency expires before they plan, and (2) an alert if they plan a flight on or after it.

## Decisions (Brandon, 2026-10-26)
- **ATOM is the truth.** Lodestar shows ATOM's numbers and does not work out its own for these items.
- **Only these ATOM fields are used:** the Flight currencies **Day Capt, Day Curr, IRT, Night Capt, Night Curr**, and **Flying Hours Clocked: Current Month**.
  Everything else in the export (SIM, LSS and Mission currencies, Instructor Check, PAFI, SATR, I-SATR, FDT, sorties, SIM package) is ignored and never stored.
- **The Ops Room adds the export once a day** from the dashboard; the data is **pushed to every section** by being saved in a new sheet
  **`ATOM Currency` in `Ops_Room.xlsx`**. The next day the Ops Room adds the new export and it **replaces** the old data.
- **Two layers in the Planner:** 1 preventive (the day a currency expires is marked before anything is planned), 2 reactive (a flight on or after the
  expiry day alerts). No tint after the expiry day (felt intrusive). Wording is "expires" / "expired".
- **Names stay clean:** no currency badge on a person's name in the Planner (option 2).
- **General flying currency (45 / 90 / 180 days since last flown) is a different thing**, comes from the planned flights (the existing Currency rules), and is
  not read from ATOM. Pilots seldom lapse it. It is left as it is.
- **Hours:** ATOM's Clocked hours (Current Month) show in the Planner totals and on My Lodestar.
- Applies to all five departments (all are on one template since 26 Oct).
- **IRT behaviour in the Planner is open** ("circle back"): see Open items. Until Brandon decides, IRT is read and shown on the Currency tab and My Lodestar only.

## What changes from v1 (z92)
- The reader keeps only the five currencies and the hours column (v1 read four groups and about 20 columns).
- **Removed:** the "What each flight needs" table, the `ATOM Needs` sheet and its editor; the "ATOM ⚠ n" and "▲ n" badges on names; mission and LSS handling.
- **Kept:** exact matching by roster Initials, the Names to fix panel, the stale banner and as-of date, the due window, "Add ATOM export" (now also
  the Ops Room's way to publish), My Lodestar's currency card.
- **New:** the shared sheet, the two-layer Planner, the Ops Room seat check for Capt, hours in the Planner totals and My Lodestar.

## The shared sheet `ATOM Currency` (in Ops_Room.xlsx)
Created by the dashboard on the first publish (as `Change Log` is), by `sheetEnsure`, at save time. No change to any builder; no layout stamp change.
- `A1` title line "Written by the Lodestar dashboard from an ATOM export. Replaced every day. Do not edit."
- `A2` "As of", `B2` the export's as-of date and time as `YYYY-MM-DD HH:MM`; `A3` "Source file", `B3` its file name; `A4` "Hours month", `B4` `YYYY-MM`
  (the month the hours belong to, from the as-of date); `A5` "Published by", `B5` the signed-in name (SharePoint) or blank.
- Row 7: headers `Initials | Department | CAT | Day Capt | Day Curr | IRT | Night Capt | Night Curr | Clocked hours (month)`. People from row 8, to row 507.
- Cell values: a date is the expiry as ISO text `YYYY-MM-DD` (Excel-safe, readable); `-` not held; `N/A` not applicable; blank not recorded; any other text is kept as typed.
  Hours are a number. Only Initials are stored, never full names (the ATOM `Name` is the Initials).
- A publish writes every row, and blanks any old row below the new last row.

## Publishing (Ops Room)
- **Who:** only in the Ops Room view (editable books). Other views never write.
- **How:** the Currency tab's "Add ATOM export" opens the file; in the Ops Room view with the Ops Room file open it asks "Publish to everyone?" and, on yes,
  writes the sheet (dirty cells, normal save, the same autosave and merge as other edits). Without the Ops Room file open it only shows it to the user.
- **Manual add stays** for anyone (session only, as in v1), shown as "File added by you" and used instead of the shared data until it is closed.
- Publishing again replaces all data. It is logged in the Change Log like any other save (one line: "ATOM published: file name, as of").
- Edge cases: an export with only some departments publishes those departments and leaves the others' rows out (the Currency tab says which are missing);
  a second Ops Room user publishing at the same time follows the normal last-saved-wins merge for the sheet.

## Reading (every dashboard)
- The Ops Room book's `ATOM Currency` sheet is read into the same in-memory shape v1 uses (`AtomFile`), so the grid, matching, Names to fix, My Lodestar and the
  Planner use one code path. The as-of date, stale banner and due window work as in v1.
- **Department dashboards open the Ops Room file read-only in the background** (SharePoint and the folder pickers), so they receive the shared data and
  its 15-second live refresh. Existing features that wait for the Ops Room file (cancellations, flown hours) benefit too.
- Matching is by exact roster Initials within the department (v1 rules, unchanged).

## Planner (all departments, planning view)
Day versus night follows the **shift row** the flight is in (AM, PM = Day; NIGHT = Night). A flight is any cell whose activity category is Flight.
- **Layer 1, preventive (before you plan).** On the day a currency expires, the cell is marked with a coloured edge and a short label ("Day Curr expires",
  "Night Curr expires"), in the rows it applies to: Day Curr on AM and PM, Night Curr on NIGHT. Capt currencies ("Day Capt expires", "Night Capt expires") get a
  lighter outline in the same rows, and are only a heads-up: the Planner does not know the seat. Nothing is tinted after the expiry day. Hover gives the full line.
- **Layer 2, reactive (once planned).** A flight in a Day shift row on or after the Day Curr expiry day, or in the NIGHT row on or after the Night Curr
  expiry day, gets the red corner and "⚠ NOT CURRENT"; hover says "Night Curr expired 5 Nov. From ATOM, data as of …". A flight is not alerted before the expiry day.
  Capt currencies never alert in the Planner.
- A currency that is `-`, `N/A` or not recorded produces no mark and no alert (v1 rule).
- The legend gains the new chips; the old per-person ATOM badge and the "▲ n" count are removed; the general flying rules keep their own cell warnings.
- Only flight cells and the expiry-day cells are marked; leave and ground cells stay clean.

## Ops Room
- A seat shows a red "CURR" mark when the person's Day or Night Curr has expired by the flight's day, and for the **Aircraft Captain seat** also the matching Capt
  currency. Day or Night follows the flight's shift. Warns only.

## Currency tab
- The grid has five currency columns plus "Clocked hours (month)", for the selected department or All, worst first; the due window, "only crew with a
  problem", counts, stale banner and Names to fix panel are as in v1. IRT appears here. Not-held and N/A show a dash, not-recorded a "?".

## Hours (ATOM is the truth)
- **Planner totals:** the "Flown Hrs" column shows ATOM's Clocked hours (month) when the month shown equals the hours month in the sheet (`B4`); otherwise it keeps
  the Ops Room figure (ATD to ATA) or a dash. Planned hours stay. The tooltip says "from ATOM, as of …".
- **My Lodestar, Month so far:** hours flown uses ATOM the same way, labelled "from ATOM, as of <date>".
- ATOM's "Current Month" is the month of the export, so ATOM hours never appear against another month.

## Privacy and constraints
- Offline, no network except SharePoint on the same site; macro-free; dev mode (new dev-only code inside the DEV markers).
- Lodestar stores Initials, department, CAT, five dates and one hours figure per person: no names, no SATR, no remarks. The sheet is in a file Brandon already
  controls on SharePoint. The export file itself is never kept.
- Wording: plain English, "expires / expired"; 121 SQN is one squadron.
- The checklist rule "actual flying hours tracking beyond the Ops Room" is changed by Brandon's decision and is updated when this is built.

## Testing
- Synthetic ATOM exports only (never Brandon's real files in the repo), from `tests/make_atom_fixture.py`, extended for the hours column.
- Checks: only the five currencies and the hours are read, nothing else leaks; publish writes the sheet and a second publish replaces it (fewer people leaves no stale rows);
  the sheet survives save and live merge; a department dashboard reads it from the Ops Room file read-only; layer 1 marks the expiry day in the right rows and nothing after;
  layer 2 alerts on and after the expiry day and not before; Capt never alerts in the Planner and does on the captain seat; `-`, `N/A` and blank produce nothing;
  hours show only for the matching month; the removed badges and table are gone; matching, Names to fix and the stale banner still pass; nothing writes to the ATOM file.
- Mock-ups: `previews/Planner_pilot_1920_v3.png` (Pilot planning view at 1920x1200).

## Open items
1. **IRT in the Planner** (Brandon: circle back). Candidates: a red marker across all three rows with an alert on any flight (like a safety currency, as in the mock-up), or shown on the Currency tab and My Lodestar only.
2. The general flying rules (45 / 90 / 180) are still the three sample rules; the real ones are to be entered later.
3. Real, unsanitised exports from another generator have not been tried (the parser needs the usual `<c r="A1">` layout).
4. Deferred minors from the z92 review that are not touched by this redesign: duplicate names on one ATOM sheet use the first row; departments missing from an export are only listed in Names to fix.
