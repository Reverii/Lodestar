# Ops Room ground programme rework (design)

Date: 2026-10-31. Status: draft for Brandon's review. Dashboard target: z111 (dev build).

## Purpose

The Ops Room ground programme card should look like the squadron's own sheet (Time | Activity | Location | Personnel),
one row per event, and fill itself from the plans so the Ops Room does not have to go through five department plans.
The Ops Room can fix a row and add one-off rows. A row with nobody on it is an input mistake and is shown as one.

## Decisions (Brandon, 31 Oct)

1. A squadron event may involve only some people, so a blank crew must **not** mean "everyone".
2. An empty Personnel cell is an input mistake: flagged red, never shown as "TBC", blank or "ALL RELEVANT PERSONNEL".
3. "Everyone" must be chosen on purpose (new **ALL** option). New events start empty (no default of ALL).
4. Merged department rows keep a small department dot.
5. No Excel layout change; Ops Room edits live in the Ops Room file.

## 1. Master Planner: who is on a squadron event

- `CREW_TAGS` (P, L, T, S1, S2) gains **ALL**. Tag meaning: ALL = every department; others = the departments they name.
- New events start with an empty crew. An event with an empty crew shows a red **NO CREW** mark on its Master Planner
  calendar chip and in the day panel.
- Places that treat blank crew as everyone, all changed together:
  - `opsGround` (prints "All" for blank crew),
  - `deptGround` / `needsDept` (copies squadron events into a department plan),
  - the header text on the Master Planner `Ground Programme` sheet (row 2: "Crew blank = everyone"), reworded to "Crew: ALL, or tags P L T S1 S2. Blank is an error".
- Existing rows with a blank crew turn red until filled in. This is intended.
- Layout stamp: expected unchanged (a tag value and header wording only, no cell moves). Confirm while building; if a
  cell moves, bump `LAYOUT.master` and the builder stamp together.

## 2. Ops Room table: how a row is built

Row sources, merged into one list (sorted as today: clock times, AM / PM / NIGHT, WD, TILL dates):

| Source | Time | Location | Personnel |
|---|---|---|---|
| Squadron event (Master Planner) | its time | its Comment | tag group label (e.g. "SUP 1, SUP 2") plus named people found in department plans on the same activity, day and slot |
| Department item (plans) | slot, or the time of a matching squadron event | from a matching squadron event, else blank | callsigns merged across departments |
| Manual Ops row | typed | typed | picked from the roster, or ALL |

- Department items merge across departments by **activity + slot + until-date** into one row: `A / B / C` in Cat colours,
  each person group preceded by its small department dot (`deptChip`).
- A department item borrows time and location from a Master Planner squadron event with the same activity on the same day.
- Long lists show first names and "+N"; the full list is the hover text.
- A row with no personnel from any source shows a red **NO PERSONNEL** mark. The ALL option shows "ALL RELEVANT PERSONNEL".

## 3. Ops Room edits and manual rows

- Each row has a pencil. Only the fields the Ops Room changed are saved (time, activity, location, personnel); unchanged
  fields keep following the plans and the Master Planner.
- A row can be hidden (a cancelled event). Hidden rows can be shown again from a small "hidden (n)" link under the table.
- **+ Ops row** adds a one-off (Time, Activity, Location, Personnel). It cannot be saved without Time, Activity and Personnel.
- Storage: a dashboard-created sheet `Ground Rows` in `Ops_Room.xlsx`, created on first save, same pattern as `Role Tags`
  and `Ops Add`. Columns: Date | Key | Kind (override / manual / hidden) | Time | Activity | Location | Personnel | Saved by / at.
  Key for automatic rows is `source|activity|slot|until`; manual rows get a generated id.
- Orphans: if a planner renames or moves an item and an override no longer matches any row, the override is shown as a
  manual row with a "was linked" mark, never dropped silently.
- Only edit-capable users (`OPS || opsEditable()`) see the pencil, hide and + Ops row controls; everyone else reads.
- Every save appends to the Ops Room file's `Change Log` like other Ops Room saves.

## 4. Out of scope

Naming individual people on a Master Planner event (tags only, plus plan lookup); changes to department GROUND
PROGRAMME rows or the department files; migration of existing blank-crew events; a new Excel column.

## 5. Testing

- `tests/ops_room.test.js`: blank crew shows NO PERSONNEL; ALL; tag subsets; merge across departments with dot; borrowing
  time and location; override saved and re-read; hide and unhide; manual row validation; orphan override.
- `tests/master_calendar.test.js`: NO CREW mark on blank, cleared by ALL or a tag; new event starts empty.
- Department copy path (`deptGround`) checked on a rebuilt demo set (build into another folder; live `.xlsx` untouched).
- Check My Lodestar and the Master Planner export for any reliance on blank crew.
- Bump the dashboard version to z111 (two places); update `HANDOFF.md` and `PROJECT_CHECKLIST.md`.
