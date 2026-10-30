# Other departments open by themselves; "View only" for people without edit rights (2026-10-30)

Status: written for Brandon's review. Nothing is built. No mock-up is needed: one button goes and one small chip appears.
Planning source: `PROJECT_CHECKLIST.md` section 9, item 3 (Brandon, 29 Oct).

## Purpose
On the real SharePoint only the planners and the Master Planner can edit the Excel files; everyone else can read every file. Today a person opens their own department
and must press "Add other departments" before the Ops Room seats and My Lodestar can show other departments' crew. That button is no longer needed on SharePoint. And a person
without edit rights is shown "Save to Excel" and editing controls that can only fail.

## Decisions
- **On SharePoint, the other four department planners open read-only in the background** right after the chosen department opens (beside the Duty Roster, Master Planner and Ops Room that already open).
  The person's own planner appears first and is usable at once; the others load while they work.
- **The "Add other departments" button is hidden on SharePoint.** It stays when the dashboard runs from local files (no folder to read from). "Show all files in the folder instead" (the file picker) is unchanged.
- **Ops Room mode is unchanged** (it already opens every file).
- **View only:** when SharePoint says the signed-in person cannot edit a file, that file is read-only for them: no Save button, no undo/redo, cell editing refused with a plain message,
  and a "View only" chip beside the file name. If the permission check fails or is unclear, the file is treated as editable (as today). A save that SharePoint refuses (403) says
  "You only have view access to this file." instead of a technical message.
- Wording: plain English; 121 SQN is one squadron.

## Behaviour
1. **Opening a department** (`spOpenDept`): open the own file, check its edit right, `renderAll()`, then open the other departments one by one in the background (Duty Roster, Master Planner and Ops Room as today).
   A small line in the book bar shows "Opening other departments… 2 of 4" and disappears when done. A file that fails to open is skipped and named once in a toast; the rest still open.
   Loading must not move the person's month, selection or scroll position.
2. **Already-open files** are not opened twice (a second department click while loading is ignored; reopening skips files that are open).
3. **Edit right check:** `GET <site>/_api/web/GetFileByServerRelativeUrl('<url>')/ListItemAllFields/EffectiveBasePermissions` (odata=verbose). Edit is allowed when the Low bit for `EditListItems` (value 4) is set.
   The result is stored on the book as `noEdit`. Checked for the file that would be editable: the own file, or in Ops Room mode every file. Read-only background files are not checked.
4. **One test of what is editable** replaces the many `bi === 0 || OPS` tests: `mayEdit(bi)` is true when the book has no `noEdit` flag and (`bi === 0` or Ops Room mode). `readOnly()`, the Planner, Syllabus,
   Currency, Ops Room, popups and the save button all use it.
5. Live refresh is unchanged: it already checks every open SharePoint book every 15 seconds (up to 8 files, one request each).

## Constraints
- Offline; SharePoint REST on the same site only; macro-free; dev build only; version becomes z101. No Excel or layout change.
- The SharePoint permission check needs one real test on Brandon's site; the synthetic tests cover both outcomes.

## Testing
New `tests/other_depts.test.js` (stubbed SharePoint: `spJson`, `spFetch`, `spList`, `SP.on`): the other four departments open after `spOpenDept` and the Ops Room board has their crew without any button; `#btnAdd` hidden on SharePoint and shown otherwise;
a failed department is skipped and named; no double opening; the own planner is shown before the others finish; permission stub with `Low` bit set / not set / error: editable / `noEdit` / editable; with `noEdit` no Save button, a cell edit is refused with the message,
"View only" chip shown; a 403 on save gives the plain message. Existing suites stay green.

## Open items
1. The permission check (`EffectiveBasePermissions`) must be confirmed on the real SharePoint.
2. Opening four more files adds a few seconds in the background; Brandon to judge on the real folder.
