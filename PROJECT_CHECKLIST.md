# LODESTAR (Flight Ops Planner): project checklist and roadmap

Last updated: 21 Oct 2026 (evening review). Tell Claude in this thread when something changes and the list will be updated.

**Status key**
- `[x]` Built (in every file that needs it)
- `[~]` Built for SUP 2 only (or SUP 2 + SUP 1 + Loadmaster demo), waits for scale-up
- `[?]` Built, awaiting your test
- `[ ]` Not started
- `[-]` Not required (dropped by you)
- ❓ = open question for you to decide
- ⏸ = on hold (parked by you)

---

## 1. Foundations and setup

- [x] One Excel per department (SUP 1, SUP 2, TACCO, Loadmaster, Pilot), each department edits its own file and views the others
- [x] Offline HTML dashboard that opens your own Excel to edit and others view-only
- [x] Macro-free .xlsx (no VBA)
- [?] Dashboard running inside SharePoint ("Program" folder), listing/opening/saving the Excels. Only tested against a mock so far
- [?] Excel Online opening the files. Test files (WEBCLEAN, SMALLFREEZE, COMPACT) are in `SharePoint tests/` awaiting your results
- [?] Compact layout for 1920x1200 at 150% scaling
- [x] Intranet allows local HTML files (answered 21 Oct). All the Excel files and the dashboard will be hosted in SharePoint, so SharePoint is the main way to run it
- [x] Browser: Edge now, possibly Chrome later (answered 21 Oct). Both use the same engine, so one build works for both
- [x] Project name: LODESTAR (picked 21 Oct)
- [x] Dashboard rebranded as LODESTAR (21 Oct)
- [x] LODESTAR logo in the dashboard, animated on the start page (checked 24 Oct)
- [x] Two people saving the same file: not needed, only one person per department plans at a time (decided 21 Oct). Exception to watch: the Ops Room can also write to department files, so it and a department planner could overlap
- [ ] Clean up: archive the old `Prog/Sup2 Planner/` folder and the `SharePoint tests/` folder once tests are done

## 2. Department planner (month tabs)

- [x] AM / PM / Night rows per person per day with activity dropdowns
- [x] Monthly totals: flights, ground duty, SDO, leave (days)
- [x] MASTER rows (2 slots per shift) with flight code, time and comment rows
- [x] Coverage warnings per shift (red no crew, amber short, green covered)
- [x] Fold MASTER into one row per shift with count chips
- [x] Cell notes / comments on crew cells (purple corner)
- [x] GROUND PROGRAMME row under MASTER (every department since the 22 Oct scale-up)
- [x] Initials column on Roster (every department)
- [-] ~~Double-booking check: same person on a flight and SDO/leave/course on the same day or shift~~ Not required (21 Oct)
- [x] Crew rest check: warn when someone is planned to fly on 5 days in a row (any shift); a day without a flight resets the count. Built 21 Oct (dashboard z16): orange outline on the 5th+ day, REST badge by the name, warning in the cell picker. Dashboard only, so every department gets it (done, checked off by you 21 Oct)
- [x] Planned-vs-flown: built 21 Oct (dashboard z17) in the Ops Room: Flown = ATD and ATA filled; Cancelled with a reason (Weather, Aircraft U/S, Crew sick / unavailable, Tasking change, ATC / Airspace, Other + note); past flights still open show NOT CLOSED; cancelled flights are struck through in the department Planners and drop out of totals, currency and crew rest; month summary card. Saved in Ops_Room_2026.xlsx Flight Crew Y Status, Z Cancel Reason. No Aborted, no Re-plan (your call) (done, checked off by you 21 Oct)
- [-] ~~Fair share view: flights / SDO / weekends per person compared with the department average~~ Not required (21 Oct)
- [-] ~~Print layouts: weekly or daily programme that fits one A4/A3 page~~ Not required (21 Oct)

## 3. Roster and personnel

- [x] Roster: Callsign, Name, Cat Status (name colour), Role, Status, Remarks
- [x] SANS / NSmen section listed at the bottom of every planner
- [x] Personnel Info sheet (DOB, passport expiry, NOK, etc.), every department, not shown in dashboard by design
- [ ] ⏸ ON HOLD (21 Oct): Qualifications per person (which mission types / codes they are cleared to fly), and a warning when someone is planned on a flight they aren't cleared for
- [-] ~~Pairing rules: e.g. TRAINEE or CAT D must fly with an Instructor~~ Not required (21 Oct)
- [ ] ⏸ ON HOLD (21 Oct): Ground qualification expiries (medical, sea survival, CRM, aviation medicine, sim checks) with amber/red warnings like the passport check
- [x] Down-chit / up-chit (built 21 Oct, z19, SUP 2): an MC on the plan down-chits the person from that day until an up-chit date on the new Medical Chits sheet. DOWN tag on the name, striped red days, a red box on any flight planned while down, warning in the cell picker and on Ops Room seats (DOWN), plus a DOWN-CHIT row in the Ops Room Movement card. Up-chit from the Planner (click DOWN or Up-chit… in the cell list) or the Ops Room (seat, or click a name in its Down-chit column); it warns rather than blocks. Ops Room Down-chit column (z22) lists everyone down-chitted (crew, dept, since; no reason shown, your call), and "+ Down-chit" down-chits someone without an MC (done, checked off by you 21 Oct)
- [-] ~~Postings in and out: date a person joins/leaves so they only appear in the months they're in the unit~~ Not required (21 Oct)
- [ ] ⏸ ON HOLD (21 Oct): Who may see Personnel Info on SharePoint? (personal data; may need its own restricted file)

## 4. Currency (off hold 26 Oct: ATOM export drives it)
- [x] ATOM currency (z92, 26 Oct): Currency tab reads an ATOM export (matched by roster Initials), Names to fix, flight-needs table (ATOM Needs sheet in the Ops Room file), Planner red corner + name badge, Ops Room CURR mark, My Lodestar currency card. Later: projection of planned flights (layer 3)

- [~] Currency Rules sheet (open rule system for pilots and non-pilots, up to 12 rules) and Currency sheet (every department)
- [~] Currency tab, red/amber badges on names, warning in the cell picker (every department)
- [ ] Your real currency rules entered (the three are samples), and each person's "before the planner" dates filled in
- [ ] ❓ Any pilot rules that depend on other rules (e.g. "if lapsed, must fly with an instructor")?

## 5. Master Planner (squadron flights)

- [x] Flights list (one row per flight, no limit per shift), Day Status for no-flying days
- [x] Master Planning tab: month calendar with flight chips, day side panel, add/remove flights
- [x] Crew tags per flight (P, L, T, S1, S2), defaults from the flight code
- [x] Ground Programme sheet and green ground chips
- [x] Flight Codes sheet is the one list of flight codes (with Mission Type); departments copy it into Activities
- [x] "Copy flights and ground programme from the Master Planner" into the department file (SUP 2 full; SUP 1/Loadmaster flights only) (checked 24 Oct: all 5 department files are on the same template)
- [x] Source of truth: the Master Planner (decided 21 Oct). The Flight Programme has been removed
- [-] ~~Aircraft availability: number of serviceable aircraft per day, warning when flights planned exceed aircraft~~ Not required (21 Oct)
- [x] Tail numbers (built 22 Oct, z27): fleet 710-718 (9 aircraft); each Ops Room flight row has an actual tail and a standby (SBY) tail dropdown, both optional, saved in Ops_Room Flight Crew H (Tail) and AA (Standby Tail) (done, checked off by you 22 Oct)
- [-] ~~Weekly flying summary for the CO: sorties and hours planned vs flown per week/month~~ Not required (21 Oct)
- [x] Requests to the Master Planner (built 22 Oct, z37, every department; free notes, your choice): Master Planning > Requests inbox > + New request; saved on the department's Requests sheet; the Master Planner answers Done / Declined with a reply in its own file; the department sees the answer (done, checked off by you 22 Oct)

## 6. Flight Programme (removed, 21 Oct)

- [x] Removed Flight_Programme_2026.xlsx (moved to _archive), the Flight Programme page in the Master Planner menu and "Put crew on their plans" from the dashboard (21 Oct). The dashboard now refuses the old file with a note that the Master Planner is the one list of flights
- [-] ~~Printable daily flight programme / authorisation sheet~~ Dropped with the Flight Programme
- [-] ~~Should ATD/ATA (actual times) feed back into the planners as "flown"?~~ Dropped with the Flight Programme

## 7. Duties (BDO and SDO)

- [x] SDO Roster (SDO Planner role) assigns a department per day. Superseded by the Duty Planner below
- [x] Departments copy their SDO days with one click; only SUP 1, SUP 2, Loadmaster do SDO
- [x] Duty Planner (renamed from SDO Planner, 21 Oct): two duties, BDO (Base Duty Officer) and SDO (Squadron Duty Orderly). Duty_Roster_2026.xlsx replaces SDO_Roster_2026.xlsx (archived), with a department per day for each duty and a list of who can do each duty. SUP 2 file has a BDO Plan sheet and a DUTY DAYS row; the copy button copies both duties; people not on a duty's crew list are outlined red (every department since the 22 Oct scale-up; SDO only for SUP 1, SUP 2 and Loadmaster) (checked 24 Oct: all 5 department files are on the same template)
- [ ] Upload the current release to SharePoint: dashboard, all 5 department files, Master_Planner, Duty_Roster and Ops_Room (files no longer carry "_2026" in the name; archive the old ones there) (you)
- [-] ~~Assign the SDO person (not just the department) and check they aren't flying Night before / AM after~~ Not required (21 Oct)
- [-] ~~SDO fairness count per person (weekdays vs weekends / public holidays)~~ Not required (21 Oct)
- [-] ~~SDO swap: a simple way to record a swap between two people~~ Not required (21 Oct)
- [x] SUP 1 / Loadmaster moved to the Duty Planner setup (22 Oct scale-up)

## 8. Ops Room (all departments)

- [-] ~~All Departments tab: month matrix per department, day view by shift~~ Removed (you, 21 Oct, z24). The Ops Room button still opens every file
- [-] ~~Plan a joint flight across departments~~ Removed with the All Departments tab (21 Oct, z24); use Ops Add or the Master Planner
- [x] Ops Room for the SDO and AOS on duty (21 Oct): the day's flights from the Master Planner, ground programme, tomorrow's forecast, and each flight's crew seats (Aircraft Captain, Co-Pilot, Loadmaster, TACCO, SUP 1, SUP 2) from the department plans. Day bar (Today / Tomorrow / any date), suggested Captain with a swap button, Ops notes and unmatched crew. Mission Commander and CRMO are marked and saved in Ops_Room_2026.xlsx. The Ops Room picks the pilot seats (your decision)
- [x] Pilot file on the new template (22 Oct) (needed for the Ops Room pilot seats to come from a Pilot plan)
- [x] Ops Room flight table sized for a projector, with the duty header and the ground programme merged in (21 Oct)
- [x] AOS role = the Ops Room (decided 21 Oct); no separate role needed
- [x] Ops Room standby block (P1, P2, BU) under NIGHT only (21 Oct)
- [x] Ops Add (21 Oct, z23): "+ Ops Add" in the Ops Room adds an ad hoc flight for the day (shift, code, time, crew, comment), saved in the Ops Room file's Ops Add sheet, not the Master Planner. It shows in the flight table with an OPS ADD tag; departments get it on their MASTER rows (copy from the Master Planner, comment OPS ADD); crew seated on it get the code on their plan. Remove it from its status pill (done, checked off by you 22 Oct)
- [x] Activity list settled from your Activities_List_to_fill.xlsx and applied to SUP 2 (21 Oct): Flight, Sim, Ground Duty (BU, P1, P2), Squadron Duty (SDO, BDO, OPS O, SXO), Admin, Medical, Oversea Duty, Leave, Off. GND-OPS and MAINT removed (checked 24 Oct: all 5 department files are on the same template)
- [x] SXO and OPS O activities in the Pilot and TACCO files (22 Oct)
- [-] ~~Squadron-wide daily availability: who is free / on leave / on course per shift across all departments~~ Not required (21 Oct)
- [ ] ⏸ ON HOLD (21 Oct): Squadron dashboard page: key numbers for the month (sorties planned/flown, currency lapses, coverage gaps, duties filled)

## 9. Leave, courses and other absences

- [x] Leave counted in days
- [-] ~~Leave balance per person (entitlement vs taken vs planned)~~ Not required (21 Oct)
- [x] Courses / attachments / overseas exercises as multi-day blocks (21 Oct, z18): "Block of days…" at the bottom of the cell picker. Pick the activity, from/to dates (can cross months), shifts, skip weekends / public holidays, keep or replace existing cells, optional comment on the first day
- [x] Public holidays for 2026 and 2027 (Singapore, from MOM, in-lieu Mondays included) on the SUP 2 Activities sheet. (dates confirmed by you, 21 Oct)

## 10. Scaling up (waits for your go-ahead)

- [x] SUP 1 and Loadmaster rebuilt on the current template (checked 24 Oct: all 5 department files are on the same template)
- [x] Bring SUP 1 and Loadmaster up to the current SUP 2 template (checked 24 Oct: all 5 department files are on the same template)
- [x] Build TACCO and Pilot from the SUP 2 template (22 Oct; SUP 1 and Loadmaster rebuilt too)
- [ ] Data migration: a way to move data already typed into an old-layout file into the new template, so scale-up or later layout changes don't lose work
- [x] Ready to scale: Brandon said go on 22 Oct
- Scaled up again 26 Oct (z91): all 5 department files are on the SUP 2 template; new changes go to every department

## 11. Running it long term

- [x] Year rollover: "Start new year" built 23 Oct; files are now year-agnostic
- [x] Plan next January while still in December (built 24 Oct, z83): 'Jan (next year)' tab after Dec (SUP 2 file; other departments get it when scaled up), Master Planner, Duty Roster and Ops Room take next-January dates, the planner month list goes on to January of next year, crew rest and the Master copy run across 31 Dec; Start new year moves it into the new January without retyping
- [x] Add the 'Jan (next year)' tab to SUP 1, TACCO, Loadmaster and Pilot (scale-up 26 Oct, z91)
- [ ] Backups: where old versions are kept (SharePoint version history may be enough; confirm it's on)
- [ ] ⏸ ON HOLD (22 Oct): Change log: who changed what and when (at least "last saved by / at" per file)
- [x] Version check (z18): a banner lists any open file with an older layout and what's missing; a red warning (and a confirm before Save) if a file is newer than the dashboard. New files carry a layout stamp on the Dashboard sheet
- [ ] ⏸ ON HOLD (21 Oct): User guide for each role (department planner, Master Planner, Duty Planner, Ops Room)
- [ ] Handover note for whoever maintains the files after you
- [ ] Trial run: SUP 2 uses it for real for one month, then a feedback round

- [?] Syllabus tracker (built 23 Oct, z72, SUP 2 only; no longer KIV): shared Syllabus.xlsx with a default number of chances (Settings B6), syllabus sets (SUP 1, SUP 2 and TACCO share one; Pilot and Loadmaster separate) and items with a per-item chances override. Results are logged on the SUP 2 Syllabus Log sheet. Pass/fail is marked by hand; Cat Status is never changed automatically (paperwork first). Awaiting your test
- [x] Real SUP 2 syllabus built in (47 items, 4 stages, no Instructor stage for now)
- [x] Syllabus extras: forecasting in the picker, Ops Room syllabus tag (item only, no attempts/results), Syllabus tag column on Master Planner Flight Codes (H) to filter picker items, list-style picker (z80)
- [ ] Send the Pilot and Loadmaster syllabus lists (you)
- [x] Ops Room picks up department changes without a page refresh: the dashboard re-checks other files every 15 s and when the window gets focus (SharePoint only) (24 Oct)
- [x] Dev mode and release build of the dashboard (built 23 Oct, z70)

## 12. Nice to have (suggestions)

These aren't gaps, just ideas that could make it nicer to use. Pick any you like.

- [x] "Today" button (Planner, My schedule) and today highlighted in blue on the Planner, My schedule, Master Planning and Duty Planner (z18)
- [x] My schedule tab (z18): pick anyone from the open department files, see their month as a calendar (flights with planned times, duties, ground programme, leave, cell comments, cancelled flights) with month totals
- [x] My schedule tab removed (z90): My Lodestar does the same job, and View as looks up anyone
- [x] My Lodestar (z90): first tab, read-only personal home page (cards, Today, Next 7 days, What changed, month so far); matched to the roster from the SharePoint sign-in name, else a remembered pick. No Passport card, no Outlook button (Brandon, 25 Oct)
- [x] Find box on the Planner (z18): outlines every cell, time or comment in the month that matches, and matching names; Enter jumps to the next
- [-] ~~Copy last week / repeat pattern: copy a week of plans onto the next week~~ Not required (21 Oct)
- [x] Undo / redo (z18): ↶ ↷ buttons in the header, Ctrl+Z / Ctrl+Y, up to 40 steps; history restarts after Save
- [x] "Unsaved changes" reminder when closing the browser tab (checked 21 Oct; it was already there)
- [ ] ⏸ ON HOLD (21 Oct): What changed since last save: a short list shown before you press Save
- [-] ~~Export to PDF / print button for the month, week and daily programme~~ Not required (22 Oct)
- [-] ~~Colour themes: light mode for printing or bright offices~~ Not needed: the dashboard is already a light theme (22 Oct)
- [ ] ⏸ ON HOLD (22 Oct): Keyboard shortcuts in the Planner (type a code straight into a cell, arrow keys to move)
- [ ] Birthday / ORD / posting-out reminders from the roster dates
- [ ] Passport expiry warning before an overseas exercise date
- [ ] ⏸ ON HOLD (22 Oct): Hours and sorties chart per person for the year (planned)
- [ ] Simple "readiness" score per department: % of crew current and available this week
- [-] ~~Notes for the day (e.g. VIP visit, range closure) shown across all departments~~ Not required: special events go in the Master Planner ground programme (21 Oct)
- [x] Help pop-up (?) at the right end of the tab bar: explains the open tab and its colours (built 21 Oct, z19) (done, checked off by you 21 Oct)
- [-] ~~Look-ahead panel: next 7 days of coverage gaps (flights short of crew, duties not filled) in one list (added 21 Oct)~~ Not required (22 Oct)
- [-] ~~Phone-friendly read-only view so crew can check their own schedule on SharePoint mobile (added 21 Oct)~~ Not required (22 Oct)
- [-] ~~Export my schedule / duty days as a calendar file (.ics) to load into Outlook (added 21 Oct)~~ Not required (22 Oct)
- [-] ~~Auto-close reminder: Ops Room flags yesterday's flights still NOT CLOSED when it opens (added 21 Oct)~~ Not required (22 Oct)
