# AC and Pax tags in the planner (design, 31 Oct 2026)

Checklist item 9.5. Brandon's decisions: 30 Oct (tags, formation, Pax counts nowhere) and 31 Oct (planners set the AC on the planner grid; the Ops Room sets roles from its flight list, as it does today).

## Goal

A planner can say, on the planner grid, which pilot is the Aircraft Captain (AC) on a flight and who is a passenger (Pax). The Ops Room starts from those tags instead of guessing by seniority. The Ops Room can still change roles on its flight list, and its choice wins.

## Rules (settled)

- Two tags only: **AC** (Pilot department, one pilot per aircraft) and **Pax** (any department).
- There is no co-pilot tag. Every other pilot planned on the flight is a co-pilot: the first takes the Pilot seat, further pilots show as additional crew, as today.
- A formation flight may carry two AC tags. They pair with the co-pilots in roster order. The Ops Room can swap.
- A Pax cell does not count in the dashboard's planned flying hours, flights, currency or crew rest, nor in Ops Room hours (already true there).
- Flights with no tag behave exactly as today (seniority guess).

## Storage

- New sheet `Role Tags` in each department file, created by the dashboard on first save (same pattern as `Change Log`). Header row 5, data from row 6: Date | Shift | Callsign | Tag (`AC` or `PAX`). One row per tagged cell.
- No change to any builder, no layout stamp bump, no migration. Plain Excel does not show the tags.
- Read when the file opens and on every live refresh. Rows whose cell is no longer a flight activity are ignored, and dropped on the next save.
- Excel's own monthly totals are formulas on the activity code, so they still count a Pax cell. Left as is on purpose: changing them means a layout change. Only the dashboard's own numbers exclude Pax.

## Planner grid

- The cell popup (`openPop`) gets a **Role on this flight** row: None / AC / Pax.
- Shown only on a flight activity. AC is offered only in the Pilot file; other departments get Pax only.
- A tagged cell shows a small AC or PAX chip. Everyone can read tags (other departments open read-only); only a file's own planner can set them (`mayEdit`).
- Setting a tag writes the `Role Tags` row, appends to the Change Log like any edit, and is covered by undo and redo.

## Ops Room

- `opsDay` seating: where a flight's planned pilots include an AC-tagged one, that pilot takes the Captain seat and the others are co-pilots. This replaces the seniority swap for that aircraft only.
- A planner-tagged Pax person is not seated. They show under additional crew with the green PAX badge.
- The Ops Room's saved choices win. Seats already do (`o.seat`). For Pax: once the Ops Room changes a flight's Pax list, its saved list is the truth. "Decided, nobody" is saved as `-` in the existing Pax column, so the Ops Room file's layout does not change. Both `paxList` and the Pax toggle must treat `-` as empty.
- Ops Room buttons (Pax toggle, seat swap) stay as they are.

## Dashboard-only numbers that skip Pax

My Lodestar (planned hours, flights), ATOM currency and crew rest, and the Ops Room's flown-hours credit (already skipped). A single helper `isPaxCell(dept, id, iso, shift)` is the one test.

## Not in scope

Co-pilot tag, AC for non-pilots, changing Excel totals, any change to the Master Planner crew tags (P L T S1 S2).

## Tests

New `tests/role_tags.test.js`, on department files with fake crew:
1. Set AC and Pax in a department file; save; the `Role Tags` sheet holds the rows.
2. Reopen: chips show; non-planner (View only) cannot change.
3. Ops Room: AC-tagged junior pilot is Captain over a senior one; no tag keeps the seniority guess.
4. Formation with two AC tags pairs with co-pilots in roster order.
5. Planner Pax person: not seated, PAX badge, no hours credit.
6. Ops Room removes a planner's Pax: stays removed (`-`), and a reload keeps it.
7. Pax cell excluded from My Lodestar totals.
Existing suites (`my_lodestar`, `ops_room`, `other_depts`) must still pass.

## Open points

None.
