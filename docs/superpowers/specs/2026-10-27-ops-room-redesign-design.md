# Ops Room redesign: a calmer board for the room (2026-10-27)

Status: design agreed with Brandon through five mock-ups (v1 to v5); written spec awaiting his review. Nothing is built.
Target look: `docs/superpowers/mockups/ops-room-v5/` (`OpsRoom_v5_normal.png`, `_10flights.png`, `_normal_dark.png`, and `gen_ops_v5.py`, invented crew).
The mock-up is a picture of the layout, not the code: the real board keeps the data and editing that exist today.

## Purpose
The Ops Room page is the squadron's daily ops information panel, shown on a large TV across the room, glanced at, mostly read.
Today it works but feels too busy and too small. The redesign keeps the screen Brandon already knows and makes it calmer, with
the flights and who is flying each one as the first thing seen. Brandon edits only ad hoc items (DOB timing, Safety, Security, Intel,
remarks); everything else fills itself from the department plans.

## Decisions (Brandon, 2026-10-26 / 27)
- **Keep today's screen** (its top, its flight table and columns, its Standby block, its cards). The redesign is a change to it, not a new layout.
- **The top stays** as it is: date and Today / Tomorrow, the chips, the Day Board (SXO, OPS O, SDO, BDO by AM / PM / NIGHT, Safety, Prefect, Security, Intel, DOB).
- **Remove the "Seats filled" and "Down-chit" chips.** (The Down-chit card stays.)
- **Cat colours on every callsign:** CAT A black, CAT B green, CAT C yellow, CAT D red, OCU (TRAINEE) pink. SANS and NSMEN show as a **green box**.
- **P crew as important as the flying crew:** the standby rows (P1, P2, BU) are as big as a flight row, with the same seat columns and colours.
- **Side panel goes to the bottom** as a row of cards; the flight table takes the full width.
- **CODES** moves into the Day Board strip, as a card next to DOB.
- **Area (Oscar, Echo, Nov)** is shown only when filled (see Area below).
- **Ground programme** is grouped AM / PM / NIGHT; a multi-day item says "until <date>".
- **Leave and MC** is grouped by department (replaces Movement).
- **Remove the Timeline view.**
- **Clock and theme:** a clock in the bar; a light / dark switch.
- **Text a little smaller** than today (Brandon: "font seems a little too big"), and with the page shrinking to fit the screen height. A scaling function for the whole dashboard was discussed and put **on hold** (2026-10-27).
- **Projector** stays what it is today: full screen, no menus. It is not a separate display.
- **ATD, ATA and Hours** stay (Brandon asked for them back); so do Brief Timing and the per-flight Remarks.
- **Not on the Ops Room:** ATOM currency, new data fields, new Excel layout (nothing in any builder changes, no layout stamp change).
- Wording: 121 SQN is one squadron. Plain English.

## What the page shows (top to bottom)
1. **Bar:** the long date, Today / Tomorrow / day arrows, the date picker, then (right) the **clock**, the **theme switch**, + Ops Add, A- / A+, Projector.
   The Table / Timeline buttons go. Nothing else new.
2. **Chips:** Flights, Sorties, MC not set (when any), Flown, Cancelled, Not closed (past days or open sorties), and the day-status chip when set. Filtering by a chip stays.
   Removed: Seats filled, Down-chit.
3. **Day Board strip:** as today, plus a **Codes** card after DOB (typed per day, same cell as now). Names are Cat-coloured where the person is known.
4. **Flights table**, full width: columns as today. Rows are the AM / PM / NIGHT bands, then the **Standby Duty** block (1 Set / 2 Set, P1, P2, BU) at the same row size and
   seat styling as a flight row (today the standby rows are smaller).
5. **Bottom row of cards**, left to right: **Ground programme** (AM, PM, NIGHT side by side), **Leave and MC**, **Down-chit** (with the Area card under it when it has something),
   **Remarks** (the notepad, taking the rest of the width).

## Cat colours and the SANS / NSMEN box
- A callsign uses its Cat class (`catA` black, `catB` green, `catC` yellow, `catD` red, `catT` pink) everywhere a crew name appears on the page: seats, standby seats, extra crew,
  Ground programme, Leave and MC, Down-chit, Day Board duty names. `catT` becomes pink on this page (the Planner keeps its magenta).
- A person whose roster Status is SANS or NSMEN gets a green box around the name (white text) instead of a Cat colour, in the same places. Cat status is still shown by tooltip.
- A small key (A B C D OCU, SANS / NSMEN) sits under the board; it can be hidden by the projector size when the page is tight.
- Seat data already carries the Cat; it must also carry the roster Status so the box can be drawn.

## Standby block
- Same rows as today (1 Set: one P1/P2 row; 2 Set: P1 and P2 rows; BU), same Alert status cell. Only the size changes: callsigns and seat names at the flight-row size,
  the label (P1, P2, BU) large and bold, the green band kept.

## Area and Codes
- **Codes** is a Day Board card (stays typeable in the Ops Room view).
- **Area** has three lines (Oscar, Echo, Nov). A line is shown only when it has text. When no line has text the card is not drawn. The Ops Room user can add one
  without leaving the page: a small "+ Area" button next to the Down-chit heading (editable view only, hidden in projector) opens the three empty lines until the day changes
  or the page redraws.
- Area here is the area code of the day, not the flight's AO.

## Ground programme
- Items are listed under three headings **AM**, **PM**, **NIGHT**, as three columns in the card. An item shows the activity, its time if it has one, the callsigns (Cat-coloured), and the
  place or note.
- A multi-day item (an activity the same crew has on consecutive days, for example On course, Outstation) shows "until <day month>" (the last consecutive day) instead of a time.
- Master Planner ground-programme items keep their own time, shift (by time) and crew tags; items with no time go under AM. "All crew" stays "All crew".
- Leave, OIL and MC are not here (they are in Leave and MC); duties and standby are not here (Day Board and the table).

## Leave and MC
- One row per department (Pilot, Loadmaster, TACCO, SUP 1, SUP 2, in the table's seat order), each with the people on Leave, OIL or MC that day: callsign (Cat-coloured) and the code (LL, OL, OIL, MC) small.
  A department with nobody shows a dash. Shifts shown when it is not the whole day (as today).

## Text size and fit
- The Ops Room keeps its own A- / A+ and remembered size. The default is one step smaller than today's (today the first-time default is the second-largest step).
- The page shrinks (never grows) so the whole page, table and bottom row, fits one screen height as well as the width (today it fits the width only). Smallest allowed 60%.
  On a busy day (10 flights) it must still fit at 1920x1080 and 1280x720 with no vertical page scroll in projector mode.
- Rows are not stretched to fill a quiet day beyond the chosen size; spare room is simply space.
- A scale control for the whole dashboard is **on hold** (Brandon, 2026-10-27); see Open items.

## Theme
- A light and a dark theme for this page only (the other pages stay light). The chip in the bar switches; the choice is remembered on this computer (localStorage, in try/catch).
  Default light. Dark follows the mock-up: dark navy page, Cat colours brightened (A white, B light green, C light yellow, D light red, OCU light pink), shift bands keep their hues.
- The theme applies in normal and projector mode.

## Clock
- The current time, `HH:MM`, large, in the bar; refreshed every 10 seconds. Uses the existing `opsNowMin()` so tests can fake it with `window.OPS_NOW`.

## Timeline removal
- Remove the Table / Timeline buttons, `opsTimeline`, the `opsVw` state and the Timeline CSS. The table is the only view. A saved "tl" view in localStorage is ignored.

## Constraints
- Offline, no network; macro-free; single file; dev build only (not in DEV markers: this is the product). Version string bumps to z97 in both places.
- No Excel layout change; no change to what is saved in `Ops_Room.xlsx`. All editing paths (click a cell, pick a seat, tail pop-up, Ops Add, down-chit, set 1/2, remarks) keep working.
- Screen budget 1280x720 usable; checked at 1920x1080 as well.

## Testing
- New `tests/ops_room.test.js` (Playwright, demo files, `window.OPS_TODAY` / `OPS_NOW`): the side cards sit below the flight table; the two removed chips are gone and the rest remain; Timeline gone;
  Cat classes on seats and a SANS person's green box; standby row font size equals a flight row's; Codes card in the Day Board; Area card absent when empty, present when filled, `+ Area` in the editable view
  and not in projector mode; Ground programme grouped AM / PM / NIGHT with "until" for a multi-day item; Leave and MC by department; theme switch and persistence; clock text; page fits the viewport height
  at 1920x1080 and 1280x720 with a 10-flight day (no vertical scroll in projector mode); the A- / A+ size is remembered and the default is one step smaller; existing editing paths still work (seat pick, Ops Add, 1 Set / 2 Set, remarks save).
- The existing tests (`my_lodestar`, `planner_filter`, `mp_export`, `atom`) stay green; the ATOM test's "no CURR on Ops Room seats" check stays.
- Real-SharePoint behaviour (background open of the Ops Room file) is not exercised here; unchanged.

## Open items
1. The default size step and the 60% floor are my estimate; Brandon tunes them on the real projector.
2. **On hold:** a scale control for the whole dashboard (every page, percentage steps, remembered per kind of page, an Auto fit on the Ops Room). Risk: pop-ups and frozen panes under CSS zoom. Revisit when Brandon asks.
3. Day Board duty names are coloured only where a person can be identified from the plans; typed-in text stays plain.
4. Leave and MC and Ground programme can overflow on a very full day; they scroll inside their card rather than push the page.
