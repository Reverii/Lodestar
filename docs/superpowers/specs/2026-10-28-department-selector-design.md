# Department selector: a revamped start screen on SharePoint (2026-10-28)

Status: design agreed with Brandon through two mock-ups; written spec awaiting his review. Nothing is built.
Target look: `docs/superpowers/mockups/dept-select-v2/` (`DeptSelect_v2_normal.png`, `DeptSelect_v2_edge.png`, `gen_dept_v2.py`, the logo SVG; invented names and times).
The mock-up is a picture, not the code: the screen keeps the dashboard's existing behaviour (what each card opens).

## Purpose
When the dashboard is opened from the SharePoint folder with no file loaded, it asks "Which department are you from?". That screen was written in the very early
build. It becomes the squadron's front door: one click into your own planner, and a quick look at whether the plans are current before you open one.

## Decisions (Brandon, 2026-10-28)
- **Main job: show the state of the files**, not only open them.
- **Each card shows:** the department name, when its file was last changed (date and time), who last changed it, and the file name in small grey type.
- **Ops Room stands out** as a wide card; **everything else is one grid** (SUP 1, SUP 2, TACCO, Loadmaster, Pilot, Duty Planner, Master Planner).
- **Returning users:** the screen always shows; the department opened last time is highlighted and tagged "You opened this last". One click confirms.
- **Logo:** the Compass Rose logo (the one on the welcome screen) in a dark hero band with the question.
- **Ops Room card wording is one line:** "The day's flights and crew. Every department's file is editable." The card is tinted light blue so it does not merge with the dark hero band.
- Wording: 121 SQN is one squadron; plain English.

## What the screen shows (top to bottom)
1. **Hero band** (dark): the Compass Rose logo with "LODESTAR · 121 SQN · FLIGHT & OPS PLANNER" on the left; on the right "Which department are you from?" and
   "Your department's planner opens for editing. The other departments open beside it, read-only."
2. **Status line:** a green dot, "**Connected to <folder name>** · <n> files · checked <HH:MM>, refreshes every 15 seconds". If the last refresh failed the dot is amber and the line says
   "couldn't check at <HH:MM>, showing what was seen at <HH:MM>".
3. **Ops Room card** (wide, light blue): the name, the one-line description, the Ops Room file's last change and who made it, and an "Open Ops Room" button. Clicking anywhere on the card opens the Ops Room
   (every department file, editable), as today.
4. **Grid of cards**, four across at the 1120 px width (fewer when the window is narrow): SUP 1, SUP 2, TACCO, Loadmaster, Pilot, Duty Planner, Master Planner in that order, then a dashed
   "Show all files in the folder instead" card (opens the existing file picker).
5. **Footer:** a key for the dots (green changed today; amber changed 1 to 6 days ago; red a week or more) and a Cancel button.

## A department card
- **Name** (large). **When:** a coloured dot and the time ("Today 08:12", "Yesterday 16:55", "Mon 26 Oct 11:20", with the year added when it is not this year). **By:** "by <name>" in small type, left out when SharePoint
  does not give a name. **File name** small grey, cut with an ellipsis when long.
- The dot and the date text: green when the file changed today, amber 1 to 6 calendar days ago, red 7 or more (the date text turns orange-brown). Grey when the time is missing or unreadable ("Changed: unknown").
  A time in the future (clock difference) counts as today.
- **Last used:** the card of the department stored under `spRecall("dept")` has a blue border, a pale blue fill and the tag "You opened this last". The Ops Room card gets the same border and tag when Ops Room was the last choice.
- **Missing file:** the card is grey with a dashed border, not clickable, reading "No file in this folder" and "Looking for <expected file name>". (Today's code disables the button and says "file not found".)
- Clicking a card opens that department exactly as today (`spOpenDept(label)`): its own file editable, the Duty Roster, Master Planner and Ops Room read-only beside it.
- Every value from SharePoint (names, file names) is escaped before it goes into the page.

## Who last changed a file
- The file list asks SharePoint for the editor: `.../Files?$expand=ModifiedBy&$select=Name,ServerRelativeUrl,TimeLastModified,ModifiedBy/Title`. If that request is refused (some sites do not allow the expand), the dashboard asks again
  without it and shows no "by" line; nothing else changes. The result is remembered for the session, so the second try is not repeated on every refresh.
- This is the one part that needs a test on Brandon's SharePoint. The synthetic tests cover both outcomes.

## Refresh
- While the screen is open it checks the folder every 15 seconds (the same pace as the live refresh) and redraws the cards, so a plan saved a minute ago shows up. The timer stops when the screen is closed (opening a department,
  Cancel or the file picker). Changes to the folder list that make the last-used department disappear just show its card as missing.

## Wide box
- The department screen uses a wider box (about 1120 px, 94% of the window on small screens); the file picker keeps its current narrow box. At 1280x720 the whole screen fits without scrolling; below that the box scrolls inside itself.

## Constraints
- Offline, no CDN; macro-free; single file; **dev build only** (this is product code, not inside DEV markers); SharePoint REST only on the same site; the version string becomes z100.
- No Excel change, no layout stamp change, no change to what opening a card does.
- The logo is reused from the welcome screen markup (no new image file).

## Testing
- New `tests/dept_select.test.js` (Playwright): there is no SharePoint, so the tests stub `SP.files` and `spList` / `spJson` in the page and use a `window.SP_NOW` clock. Checks: card order and texts; time wording for today, yesterday, this week, old, other year, missing and invalid times;
  dot colours; last-used highlight and tag (department and Ops Room); missing-file card is disabled and says so; escaping of a hostile file name; the "by" line shown when `ModifiedBy` is present and absent when the expand is refused (and that the fallback list is used);
  clicks reach `spOpenDept` / `spOpenOps` / `spShowPicker`; the refresh redraws after a changed list, stays quiet on a failed refresh with the amber status line, and stops when the screen closes; fits 1280x720 without scrolling.
- Existing tests stay green (`ops_room`, `my_lodestar`, `planner_filter`, `mp_export`, `master_calendar`, `atom`).

## Open items
1. "By <name>": whether Brandon's SharePoint returns the editor (needs one real test). The name is shown as SharePoint gives it, not shortened.
2. The 7-day red threshold is my choice; adjust after he sees it on real files.
3. The hero logo replays its short animation each time the screen opens (as the welcome screen does).
