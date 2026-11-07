# LODESTAR (Flight Ops Planner): project checklist and roadmap

Last updated: 7 Nov 2026 (z197). Tell Claude in this thread when something changes and the list will be updated.

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
- [-] ~~Pairing rules: e.g. TRAINEE or CAT D must fly with an Instructor~~ Not required (21 Oct); the crew matrix (z119, 1 Nov) is a separate request that Brandon asked for
- [ ] ⏸ ON HOLD (21 Oct): Ground qualification expiries (medical, sea survival, CRM, aviation medicine, sim checks) with amber/red warnings like the passport check
- [x] Down-chit / up-chit (built 21 Oct, z19, SUP 2): an MC on the plan down-chits the person from that day until an up-chit date on the new Medical Chits sheet. DOWN tag on the name, striped red days, a red box on any flight planned while down, warning in the cell picker and on Ops Room seats (DOWN), plus a DOWN-CHIT row in the Ops Room Movement card. Up-chit from the Planner (click DOWN or Up-chit… in the cell list) or the Ops Room (seat, or click a name in its Down-chit column); it warns rather than blocks. Ops Room Down-chit column (z22) lists everyone down-chitted (crew, dept, since; no reason shown, your call), and "+ Down-chit" down-chits someone without an MC (done, checked off by you 21 Oct)
- [-] ~~Postings in and out: date a person joins/leaves so they only appear in the months they're in the unit~~ Not required (21 Oct)
- [ ] ⏸ ON HOLD (21 Oct): Who may see Personnel Info on SharePoint? (personal data; may need its own restricted file)

- [x] Master Planner export (z95, 27 Oct): Export… on the Master Planner view, Calendar + List sheets, flight codes can be left out, flights and planned hours only (no crew)
- [x] Planner crew filter chips: Active / SANS / NSMEN / Inactive (z95, 27 Oct)

## 4. Currency (off hold 26 Oct: ATOM export drives it)
- [x] ATOM currency v2 (z94, 26 Oct): the Ops Room publishes the daily export into an `ATOM Currency` sheet in the Ops Room file; five currencies (Day Capt, Day Curr, IRT, Night Capt, Night Curr) and clocked hours; Planner expiry-day marker then alert; Ops Room seat check; ATOM clocked hours in Flown Hrs and My Lodestar. IRT: the expiry day is only highlighted in the Planner (27 Oct). (older z92 line follows)
- [x] ATOM currency (z92, 26 Oct): Currency tab reads an ATOM export (matched by roster Initials), Names to fix, flight-needs table (ATOM Needs sheet in the Ops Room file), Planner red corner + name badge, Ops Room CURR mark, My Lodestar currency card. Later: projection of planned flights (layer 3)

- [~] Currency Rules sheet (open rule system for pilots and non-pilots, up to 12 rules) and Currency sheet (every department)
- [~] Currency tab, red/amber badges on names, warning in the cell picker (every department)
- [x] Mission currency and Night flying dropped (Brandon, 7 Nov, z197): ATOM is the true currency; only the 45-day General flying guideline is built in. Remove the two rules from your live files (Currency tab, right-click, Remove)
- [ ] Your real currency rules entered (if any beyond General flying), and each person's "before the planner" dates filled in
- [ ] ❓ Any pilot rules that depend on other rules (e.g. "if lapsed, must fly with an instructor")?

## 5. Master Planner (squadron flights)

- [x] Flights list (one row per flight, no limit per shift), Day Status for no-flying days
- [x] Master Planning tab: month calendar with flight chips, day side panel, add/remove flights
- [x] Crew tags per flight (P, L, T, S1, S2), defaults from the flight code
- [x] Ground Programme sheet and green ground chips
- [?] Squadron events: ALL crew tag; a blank crew is an error (red NO CREW), new events start empty (z111, 31 Oct, Brandon); old blank rows turn red until filled in
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
- [?] BDO is a person from the BDO crew list, not a department (Brandon, 5 Nov): the Duty Planner picks the person per day (blank = no BDO needed); the department's copy puts BDO on that person's WD row. **Built z177**, awaiting his test. The live Duty_Roster.xlsx needs a rebuild (migration) for the Excel dropdown to list people

## 8. Ops Room (all departments)

- [x] Department selector revamp (z100, 28 Oct): hero with the logo, status line, wide Ops Room card, cards showing when each file changed and by whom, last-used highlight, missing-file card, 15-second refresh (built; to test on SharePoint: the by-name line, the refresh)

- [x] Ops Room redesign (z97, 27 Oct): side cards in a bottom row, Cat colours and a SANS / NSMEN box on every callsign, standby rows at flight size, Codes on the Day Board, Area only when filled, Ground programme by shift with "until", Leave and MC by department, clock, light / dark, no Timeline, fits the screen height (built; to tune on the real projector)
- [x] Ops Room: SANS and NSMEN shown apart (z157, 4 Nov): NSMEN keep the green box, SANS are underlined in their Cat colour
- [?] Miscellaneous Notes page (z162, 4 Nov, Brandon): an Excel-like scratch sheet per department under Planning ▾ (A to Z, 100 rows, type / paste from Excel / Bold / Wrap / column widths / Clear sheet), saved in a hidden `Misc Notes` sheet of the department file, not shown to other departments or the Ops Room (Brandon confirmed 4 Nov: the Ops Room should not see it); the Change Log only counts changed cells (awaiting his test)
- [x] Ops Room Leave and MC card lists names downwards (z164, 4 Nov, Brandon) (SharePoint test OK, 4 Nov)
- [x] Syllabus Tracking: crew with no callsign are selected one at a time, picked by name (z165, 4 Nov bug fix) (SharePoint test OK, 4 Nov)
- [x] Ops Room: crew added to a flight no longer shows twice (seat and additional crew) on the first flight with that code (z170, 4 Nov bug fix) (SharePoint test OK, 4 Nov)
- [x] Planner MASTER rows show a 3rd (and later) flight in a shift as its own code and time, not a cut-off comment (z171, 4 Nov bug fix) (SharePoint test OK, 4 Nov)
- [x] Every time in 24-hour format with an H at the back, e.g. 0830H-1030H (z173, 4 Nov, Brandon): typed times are saved that way and older times are shown that way; Excel's Master Planner hours also read a long dash and "to" (after a rebuild) (SharePoint test OK, 4 Nov)
- [?] Running change (2 or 3 sorties on one flight) in the department Planner (Brandon, 4 Nov): the planner is responsible for crewing every sortie (1/2, 2/2), so the Planner must show the sorties and let each person be on one or both; the short-of-crew warning checks each sortie. **Settled (Brandon, 4 Nov):** the flight's time range covers the whole running change and is split evenly between the sorties (Circuit training 1000H-1300H with 2 sorties = 1.5 hrs each), so a person on one sortie gets 1.5 hrs and on both 3 hrs. Same crew on both sorties, or slightly different crew (someone Pax on callsign 1, crew on callsign 2). Pax marked per sortie by the planner (option A, Brandon 4 Nov). The parts are labelled Flight 1/2, Flight 2/2 (Brandon, 4 Nov). Mock-up `previews/running_change_mockup_{planner,popup,ops}.png`. **Built z175 (4 Nov):** cell tags, popup Crew / Pax / Not on per flight, hours split, short when a flight has nobody, Ops Room rows seated per flight with their share of the time; saved in Role Tags column E (no layout change); awaiting his test. **Decided (Brandon, 5 Nov):** a person marked Pax on a flight is just Pax; the Sorties box means a running change for now (a formation is entered as two flights)
- [x] Ops Room duty strip headings slightly bigger (z172, 4 Nov, Brandon) (SharePoint test OK, 4 Nov)
- [x] My Lodestar recognises a SharePoint name with the appointment at the back, and short roster names like "B TAN" / "TAN PH" (z168, 4 Nov) (SharePoint test OK, 4 Nov)
- [x] Excel "problem with some content" in the department files: broken Daily View formulas fixed in the builder, and repaired by the dashboard on save (z167, 4 Nov) (SharePoint test OK, 4 Nov)
- [x] Flight Codes Syllabus tag is a dropdown of the syllabus tracks (z166, 4 Nov, Brandon; dashboard only, Excel column stays free text) (SharePoint test OK, 4 Nov)
- [x] Ops Room ground programme as a sorted table (z104, 31 Oct, Brandon): Time | Activity | Location (the Master Planner note) | Personnel; clock times, then AM/PM/NIGHT, WD, then TILL dates; strip grows with the list, auto-scrolls on the projector
- [?] Ops Room ground programme rework (z111, 31 Oct, Brandon): rows merge across departments, borrow time and location from a squadron event, red NO PERSONNEL when nobody is on a row, pencil / hide / + Ops row saved in a `Ground Rows` sheet in the Ops Room file (awaiting his test)
- [?] Ops Room ground programme filled by hand (z112, 31 Oct, Brandon): planners' items no longer pulled in; + Ops row shows them as a read-only reference by department; Time quick buttons; TILL rows run to the date (awaiting his test). My Lodestar keeps reading the planners' cells (his call)
- [ ] On hold (27 Oct, Brandon): a scale control for the whole dashboard
- [x] Ops Room item closed (28 Oct, Brandon): the redesign stands as shipped (z97 to z99). Not coming back: the Timeline view, the empty-seats filter chip, the Down-chit chip, the Movement leave comments

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
- [~] Data migration: a way to move data already typed into an old-layout file into the new template. Built for layout 4 -> 5 (z183, Upgrade department files…); a later layout change needs its own rules
- [x] Ready to scale: Brandon said go on 22 Oct
- Scaled up again 26 Oct (z91): all 5 department files are on the SUP 2 template; new changes go to every department

## 11. Running it long term

- [x] Year rollover: "Start new year" built 23 Oct; files are now year-agnostic
- [x] Plan next January while still in December (built 24 Oct, z83): 'Jan (next year)' tab after Dec (SUP 2 file; other departments get it when scaled up), Master Planner, Duty Roster and Ops Room take next-January dates, the planner month list goes on to January of next year, crew rest and the Master copy run across 31 Dec; Start new year moves it into the new January without retyping
- [x] Add the 'Jan (next year)' tab to SUP 1, TACCO, Loadmaster and Pilot (scale-up 26 Oct, z91)
- [ ] Backups: where old versions are kept (SharePoint version history may be enough; confirm it's on)
- [ ] ⏸ ON HOLD (22 Oct): Change log: who changed what and when (at least "last saved by / at" per file)
- [x] Version check (z18): a banner lists any open file with an older layout and what's missing; a red warning (and a confirm before Save) if a file is newer than the dashboard. New files carry a layout stamp on the Dashboard sheet
- [~] DRAFTED (three PDFs in `guide/`, awaiting Brandon's read): User guide for each role (department planner, Master Planner, Duty Planner, Ops Room)
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

## 13. Planned next (29 Oct, Brandon; built 31 Oct except the guide)

Order was (30 Oct): 3, then 5 (AC and Pax tags), then 1; all three are built (z101 to z103). **Item 2 (requests) is omitted for now** (lists do not work on the squadron SharePoint). The guide (item 4) comes last and is **not to be generated until Brandon says so**.

- [x] **3. (built 31 Oct, z101, awaiting Brandon's test on SharePoint)** Rethink "Add other departments".** Brandon: on the real SharePoint only the planners and the Master Planner can edit the Excel files; everyone else is read-only and can read every department file. So the dashboard can open the other four department planners read-only in the background after your own file opens, and the button can go (the top tabs stay). Today the Ops Room seats and My Lodestar need those files (`deptOpen`, `spDeptExtras`). Also show "View only" instead of "Save to Excel" when the user has no edit right. Cost to weigh: a few seconds more to open, and the 15-second live check reads more files.
- [-] ~~**2. Request function in My Lodestar**~~ **OMITTED for now (Brandon, 30 Oct): SharePoint lists do not work on the squadron site, so the List option is out.** Not to be built or suggested again unless he reopens it. (Fallback noted, not chosen: one small file per request in an add-only Requests folder, which needs a folder permission set-up.) Earlier notes follow (leave, OIL, off and so on). Only planners can edit the programme, so a member cannot write into any department Excel. Proposal: each request is its own small file in one "Requests" folder on SharePoint where members can add files but not edit others (no overwrite clashes); the planner reviews it and, when approved, the dashboard fills the planner cells itself; the request form uses the same activity drop-down as the planner (one list of types), and a block of days works as it does now. A SharePoint List is the alternative (cleaner, more code). Needs a SharePoint permission set-up by Brandon / the site owner. Builds on the Master Planner Requests pattern (Done / Declined with a reply). Options weighed 29 Oct: (A) one small file per request in an add-only Requests folder; (B) a SharePoint List with the built-in setting that lets each member see only their own items (recommended, A as the fallback if lists are blocked); (C) a ready-made email draft (no auto-fill); Forms plus Power Automate (breaks the offline rule) and a shared editable Excel (save clashes) are not recommended. **Open:** can the site owner create a List; members see only their own requests, planners see all (to confirm); which activity types may be requested.
- [x] **1. (built 31 Oct, z103, awaiting Brandon's test; the 4th row is called WD, whole day: ground and admin items only, teal, plus a zoom control and a heavy divider between crew; spec `docs/superpowers/specs/2026-10-31-wd-row-design.md`, plan `docs/superpowers/plans/2026-10-31-wd-row.md`) A 4th row per member in every department** (AM / PM / NIGHT + one general row, no shift): for admin, ground programme and other general items, which may overlap a flight in the same shift. It counts in the totals and shows on the Ops Room ground programme and in My Lodestar. Layout change: 3 rows per person become 4 in every builder and in the dashboard (many `i * 3 + s` places), the layout stamp goes up, and a migration of typed plans is needed if planners have already typed into the live files. **Settled 29 Oct:** the live files hold dummy data only, so no migration: rebuild fresh with the new layout and replace the files. **Open:** where a 4th-row item sits on the Ops Room ground programme (proposal: a small "General" list under the AM / PM / NIGHT columns, or AM unless a time is typed).
- [x] **5. (built 31 Oct, z102, awaiting Brandon's test on SharePoint) Planner side: tag the AC and Pax per flight** (Brandon, 30 Oct). Today both can be set only on the Ops Room board. Only two tags: **AC** (Pilot department, one pilot per aircraft on a flight) and **Pax** (any department). No co-pilot tag: every other pilot planned on the flight is assumed to be a co-pilot (so a flight with three pilots needs one AC tag; the first co-pilot takes the Pilot seat, further pilots show as additional crew as today). On the Ops Room a Pax person gets a green PAX badge and is not credited with flown hours; it is saved on the flight's Ops Room row. The Ops Room uses the planner's tags as its starting point instead of the seniority guess; once the Ops Room changes a flight's roles, its choice wins for that flight (needs an explicit saved state so a planner's tag can be removed on the board). Saved in a dashboard-created sheet, so no Excel layout change and no migration; the tags show only in the dashboard, not in plain Excel. **Settled 30 Oct (Brandon):** a formation flight can have two AC tags, paired with the co-pilots in roster order (the Ops Room can swap); a Pax cell does **not** count in planned flying hours, flights, currency or crew rest. **Built 31 Oct (z102):** planners set None / AC / Pax in the cell popup on the planner grid (AC only in the Pilot file); tags live in a `Role Tags` sheet the dashboard creates on first save; the Ops Room starts from them and its own choice wins (a dash in the Pax column means "decided, nobody"). Excel's own monthly totals still count a Pax cell. Spec and plan: `docs/superpowers/specs/2026-10-31-ac-pax-tags-design.md`, `docs/superpowers/plans/2026-10-31-ac-pax-tags.md`.
- [~] **4. Full user guide** (Brandon, 29 Oct; **drafted** as three PDFs in `guide/` (Master Planner, Department Planner, Ops Room), Brandon: "draft the pdf"), from three points of view: department planners, the Master Planner, the Ops Room. Do it last, after items 3, 2 and 1 (they change the planner screens and add the request screen), though the Ops Room and Master Planner parts are stable and can be drafted earlier. Proposal: one guide in three parts, each starting with a one-page quick start, then step-by-step sections with demo-data screenshots only (no real crew, no ATOM data). **Settled 30 Oct (Brandon): format PDF; audience the users; three parts: Planners, Master Planner, Ops Room. DO NOT GENERATE until Brandon says so.** **Settled 3 Nov (Brandon): the Duty Planner is a fourth part (its own role); My Lodestar is left out of the guide for now.** **Master Planner part drafted 3 Nov** (`guide/LODESTAR_Guide_Master_Planner_DRAFT.pdf`, awaiting his read). Outline proposed 3 Nov: Getting started (SharePoint, department screen, top bar, Refresh, Save / autosave, View only); Planners; Master Planner; Duty Planner; Ops Room; appendix (colour key). The briefing slide 18 already promises a full PDF guide.
- [x] Master Planner export reformatted (z106, z107, 31 Oct, Brandon): Calendar sheet only (List dropped), flight and hours columns inside each day, banner, month bands, weekend tint, one landscape page wide. Awaiting his look in desktop Excel
- [x] Tabs (z108, 31 Oct, Brandon): Overview moved under Planning (renamed from Planner); Changes renamed Changelog, shows only own department, Master Planner and Ops Room (everything in Ops Room mode)
- [x] Ops Room bottom cards the same height when the ground programme is empty (z105, 31 Oct)
- [x] Planner cell picker on right-click (z113, 1 Nov, Brandon): left click only selects; right-click (or Enter / typing) opens the picker; help texts updated. Confirmed working (1 Nov). Open ideas, not picked: an on-screen hint, long-press for touch screens
- [x] Flight card (z114, 1 Nov, Brandon): left click on a cell shows its details, the cell comment (typed there now, no longer in the picker) and, on a flight, the crew from every department in seat columns (AC, Pilot, LM, TACCO, SUP 1, SUP 2); a MASTER cell shows its time and comment (z114 to z117). Confirmed working (1 Nov)
- [x] MASTER rows locked in the Planner (z114, 1 Nov, Brandon): fully locked, they fill only from the Master Planner copy button and Ops Add. Confirmed working (1 Nov)
- [?] My Lodestar "My month" calendar (z118, 1 Nov, Brandon): whole month as a grid, click a flight for the flight card with crew, click a day to move Today; month arrows (awaiting his look)
- [x] Crew matrix (z119, 1 Nov, Brandon; confirmed working, the flight code Mission Type must read exactly like the matrix Mission): CAT needed per seat on MAS TRG / OPS / TACT, warns on the flight card, Planner and Ops Room; the matrix is a Crew Matrix sheet in the Master Planner file (edit in Excel), built-in default until then; warn only (awaiting his look; he types the Mission Type on the MAS flight codes)
- [ ] Decide (GitHub Pro now on): make the repo private, and whether the Pages links (dashboard, briefing) stay public.
- [?] Refresh (z120, 1 Nov, Brandon): ⟳ Refresh button plus F5 / Ctrl+R re-read the files without going back to the login screen; a real reload returns to your department and tab (Ctrl+Shift+R is the full reload)
- [?] Top bar (z121, 1 Nov, Brandon): Open my Excel and Add other departments hidden; the LODESTAR logo goes back to the department screen
- [?] Ops Room (z122, 1 Nov, Brandon): the flight table is enlarged (up to 1.6x) to fill a tall window
- [?] Change Log (z123, 1 Nov, Brandon): runs of cells in one save are one line, MASTER copies are not logged, repeat edits of a cell merge, rows older than 90 days are dropped (awaiting his look)
- [x] z150 (3 Nov): saved files stay readable by Excel (hidden control characters cleaned, NaN not written, desktop Excel calcChain dropped); awaiting Brandon's exact error message to confirm the cause
- [?] Health check page (Maintenance tab, Admin mode): mock-up `previews/health_check_mockup.png` (3 Nov), awaiting Brandon
- [?] Syllabus stages (z153, 3 Nov, Brandon): OCU, CAT D, CAT C, CAT B, CAT A, named by the CAT held; the CAT A stage is instructor training for selected crew only (switch on the Syllabus tab, Syllabus Settings B8). SUP 2's items relabelled, codes unchanged. Send the instructor (CAT A stage) items. Awaiting his look
- [x] z151 (3 Nov): ATOM mission currencies (Currency tab Mission group, purple expiry-day mark on the WD row, My Lodestar card; no MAI/MCAS; Airlift / SGH only Pilot and Loadmaster; '-' grey; expired quiet) and the past flights check (flights the Ops Room never closed, last 45 days). Awaiting Brandon's test
- [ ] Admin mode (Brandon, 1 Nov: build towards the END of the dev stage, after the DEV code is stripped; not now). Plan: an `Admins` sheet in the Master Planner file lists the SharePoint sign-in names; an admin sees a "Maintenance" tab at the far right (nobody else does; no sheet = no admins). Holds Start new year and Change Log clear / 90-day setting (with confirms), creating helper sheets (Crew Matrix, Role Tags, Admins), a health check (version, layout stamps, last saves, Names to fix) and editing the shared files. Not security (SharePoint permissions are); a tidy-up. Open: who is on the list (suggest Brandon plus one backup). **Feature list drafted 5 Nov** (HANDOFF, "Next session"): checks, housekeeping, settings, upgrade files. **⏸ ON HOLD (Brandon, 6 Nov): not needed while still in dev.** Decided so far (6 Nov): a separate `LODESTAR_Admin.html` built from the same source (admin code stripped from the normal dashboard), kept in a permission-restricted subfolder of Program (no Admins sheet); items wanted: health check (layout, Excel can open it, Change Log size; no saved-by, no "not saved N days"), data checks, dashboard version per file, copy report, Start new year moved there, Change Log clear, and **Wipe data** (all eight files back to empty plans: keeps Roster, Personnel Info, Activities, Currency Rules and Currency, Syllabus items and Log, Flight Codes, Crew Matrix, Duty Crew, AFP Settings; clears plans, notes, tags, requests, Misc Notes, flights, Day Status, ground programme, BDO / SDO days, Ops Room board, Ops Add, Ground Rows, Restrictions, Medical Chits, ATOM Currency, Change Logs; type WIPE to confirm). Not wanted: helper-sheet creation, backup zip, Settings sheet, reload notice
- [?] Flying Restriction banner (z124, 2 Nov, Brandon): slim red banner at the top of the Ops Room with typed text for a date range; added from the Ops Room (+ Restriction) or the Master Planner day panel (needs the Ops Room file open for editing); saved in a `Flying Restrictions` sheet in the Ops Room file (awaiting his look)
- [?] Master Planner flight card (z125, 2 Nov, Brandon): planned hours (from the time range, midnight crossing OK), description, mission type, sorties and a day summary; view-only card is plain text (awaiting his look)
- [?] Streamline (Brandon, 2 Nov; built z126 to z128, awaiting his look and the file replacement): drop Flight Hrs and Sorties from the Activities page, hours from the Master Planner time range everywhere, sorties = number of flights; changes the Excel totals in all five department files, do it with the layout-3 file replacement
- [x] Repo files replaced with the fresh layout set (2 Nov, Brandon: dept 4, master 3; demo data). To do on his side: build the real-data set with `--data` and upload all eight files plus the DEV dashboard to SharePoint together
- [?] Flight code typed on the Master Planner card (z130, 2 Nov, Brandon): the code box is type-or-pick; an existing code (case and spaces ignored) is used, a new one asks for default crew, Mission Type and description and is added to the Flight Codes sheet. One `MAS` code replaces MAS3 / MAS4 / MAS6 since hours come from the time range (awaiting his look). Mock-up `previews/flight_code_combo_mockup.png`; the near-duplicate prompt was dropped (spaces and case match silently)
- [?] Flight codes reach the departments by themselves (z131, 2 Nov, Brandon's `AWAY S`): a Master Planner code counts as a flight everywhere, every save adds missing codes to Activities (add only, retired codes stay), the Copy button is gone (awaiting his test on SharePoint). Plan `docs/superpowers/plans/2026-11-02-flight-code-auto-sync.md`
- [-] ~~CAT hours tracking under Syllabus Tracking (Brandon, 2 Nov: D to C 100 hrs, C to B 200, B to A 300, hours from ATOM)~~ Dropped (2 Nov, Brandon): the ATOM export has no total flying hours (only Current Month, Last 3 Months Avg, Cumulative Monthly Avg for WY), ATOM is a separate system, so it is not built. Not to be suggested again unless the export gains a total column.
- [?] Ops Room list chosen by the planner (z138, 2 Nov, Brandon): Activities page column "Show in Ops Room list" decides which activities appear under From the department plans; without the column the category rule (Admin, Sim, Oversea Duty) applies (awaiting his test)
- [?] Ops Room scaling (z139, 2 Nov, Brandon): top and bottom cards keep their size, only the flight table scales with the number of flights (awaiting his look)
- [x] Ops Room dark mode removed (z140, 2 Nov, Brandon: not needed)
- [?] Ops Room drag bars (z141, 2 Nov, Brandon): bars under the duty strip and above the bottom cards, drag to resize with the text scaling to fit, double-click for automatic, remembered on this computer (awaiting his look)
- [?] Projector full screen cut the bottom cards (z142, 3 Nov, Brandon): the page now fits again as the window settles (awaiting his look)
- [?] Merge runs in the Planner (z144, 2 Nov, Brandon): identical ground / leave cells on following days (and AM, PM, NIGHT) show as one block, display only, button Merge runs On / Off next to Find (awaiting his look)
- [?] Ops Room right-click menus (z145, 2 Nov, Brandon): + Area and + Down-chit buttons removed; right-click the Down-chit card for + Down-chit (and + Area), right-click the Leave and MC card for + Leave and + MC (fills the person's plan, any open department file) (awaiting his look)
- [?] Remove Leave from the Ops Room (z146, 2 Nov, Brandon): right-click a name on the Leave and MC card, remove this day or the whole run (awaiting his look)
- [?] Several lines in the Ops Room duty strip (z147, 2 Nov, Brandon): SXO / OPS O / SDO / BDO, Safety, Prefect, Security, Codes take Enter for a new line (awaiting his look)
- [?] Edit the syllabus items on the dashboard (z154, 4 Nov, Brandon; merged): ✎ Edit syllabus items on the Syllabus tab: a table per stage grouped by track, add / rename / reorder / remove items and tracks, default chances, codes with results locked, duplicate codes flagged and not saved; saved to the Syllabus Items sheet with Save to Excel; stage names stay in Excel (awaiting his test)
- [?] Crew Roster order (z155 built 4 Nov, awaiting his test; Brandon: sorting, adding crew in the middle): right-click a person for Insert crew above / below, Move up / down, Sort regular crew… (Cat Status then rank, Callsign, Name, Role; preview before and after). Each person's plans on every month tab, Personnel Info and Currency rows move with them; comments, chits, syllabus and tags follow the callsign. Rank order (Brandon, 4 Nov): one structure per department: Pilot and TACCO officers LTC, MAJ, CPT, LTA; Loadmaster WOSE 1WO, 2WO, 3WO, MSG, SSG, 1SG, 2SG, 3SG; SUP 1 and SUP 2 ME3, ME2, ME1. One combined list in that order (a department only meets its own); "(NS)" ignored; unknown ranks last, same rank by name. Plus SANS and NSMEN as two separate groups (Crew Roster and Planner bands, SANS first; same purple rows in the file, kept grouped by Status, no layout change). Mock-up `previews/roster_order_mockup_*.png` (script `previews/roster_order_mockup.js`), awaiting his look
- [?] Sort by rank and a Rank column (z156, 4 Nov, Brandon): Sort dialog "Rank, then Cat Status"; Crew Roster shows Rank left of Name (Excel keeps them in one Crew Member cell); the dropdown lists the department's own ranks (awaiting his test)
- [?] My Lodestar recognises crew whose roster name starts with any Crew Roster rank, WOSE ranks included (z178, 5 Nov; Brandon sets ranks on the Crew Roster page) (awaiting his test)
- [ ] Rebuild the repo demo xlsx with the fixed builder: not yet (Brandon, 5 Nov)
- [?] AFP export from the Ops Room (z179, 5 Nov, Brandon): ⇩ Export AFP on the Ops Room fills the squadron AFP format (sheet "121", built into the dashboard, no CO details) for the day on screen and downloads it. Decided: names Rank Name (CAT); SXO and OPS O / SDO box line 1 = AM, 2 = PM, 3 = NIGHT; standby P1 = AM SAL, P2 = PM SAL, BU = BU, no alert timing; no MC / CRMO; brief time in the flight REMARKS; IN TIME always 0900H; Prepared by the SDO, Vetted by the OPS O; Planned = Master Planner, Tasked = Ops Room board; Mission = Mission Type; Simulator = crew planned on SIM; CO name and number typed once (kept in the Ops Room file). Awaiting his test in desktop Excel
- [?] Misc Notes formatting (z180, 6 Nov, Brandon): format painter, font size, bold / italic / underline / strikethrough, text and fill colour, borders (all, outside, thick outside, bottom, none), align left / centre / right, merge and unmerge, wrap; saved as real Excel formatting in the hidden sheet (awaiting his test)
- [x] Syllabus (6 Nov, Brandon): SUP 1, SUP 2 and TACCO share the same syllabus; Pilot and Loadmaster start empty (builder; in the fresh intranet set)
- [?] Crew Roster: Remove crew and Transfer to SANS / NSMEN / regular crew on the right-click menu (z181, 6 Nov, Brandon): plans, Personnel Info and Currency go with the person; Remove asks first and the crew below move up (awaiting his test)
- [?] Add a rank (z182, 6 Nov, Brandon): + Add rank… at the bottom of the Crew Roster Rank dropdown, you pick which rank it comes after; kept in the file's Ranks sheet (awaiting his test)
- [?] + Add role on the Crew Roster (z187, 7 Nov, Brandon): Roles sheet per department file, order after a chosen role, optional "counts as instructor"; BETA tag in the header, DEV tag hidden (awaiting his look)
- [?] Real crew list (z186, 7 Nov, Brandon): crew list workbook filled from ATOM (Initials, Rank, Callsign, Active / NSMEN / SANS); a new eight-file set built from it with empty plans (his choice); ranks COL, SLTC, MWO added (awaiting his upload)
- [?] Planner rows (z184, 6 Nov, Brandon): GROUND PROGRAMME renamed SQUADRON PROGRAMME; new ALERT row (z185: the alert state AL90 / AL2 set per week by the Master Planner, Alert States sheet; P1 / P2 / BU crew in the tooltip; rows slimmed to keep the old height) and FLYING RESTRICTION row (from the Ops Room restrictions); dashboard only, no Excel change (awaiting his look)
- [?] Planner notes vs Ops Room remarks (Brandon, 7 Nov: **option 1 chosen**, **built z188 (7 Nov), awaiting his test**). The planner's flight card gets two boxes: **Planner note** (purple, planners only, never in the Ops Room or the AFP; existing cell comments stay as planner notes) and **For the Ops Room** (blue, shows as "SL · Back by 1500H" at the top of that flight's Ops Room Remarks). Grid: purple corner top right = planner note, blue corner top left = Ops Room line. Ops Room seats show only the name (the comment under the name goes). The Master Planner flight comment is left out of the Ops Room (Remarks hint text, view-only board, AFP); Ops Add comments stay. Storage: Cell Notes column H (spare), no layout change. The AFP REMARKS carry the Ops Room lines too (Brandon, 7 Nov: the AFP just reflects the Ops Room data) Mock-up `previews/cell_note_ops_mockup_{opt1,opt2,ops,ops_zoom}.png` (script `previews/cell_note_ops_mockup.js`)
- [?] Right-click Disable / Enable and Remove on the Currency tab Rules table and the Master Planner Flight codes table (Brandon, 7 Nov; **built z189 (7 Nov), awaiting his test**). Disable = keep the line, switch it off (grey, struck through, OFF tag). Disabled rule: not checked anywhere (no badges, warnings, Currency tab column), settings and "before" dates kept; Remove clears the rule row in place and its "before" dates (no shifting). Disabled code: not offered on the Master Planner card or the department cell pickers, existing flights keep it and still count; Remove only when no flight this year uses it (else "disable it instead"). Storage: Off mark in Currency Rules J and Flight Codes F (spare columns), dashboard only, no layout change
- [?] Crew Matrix editable on the dashboard (Brandon, 7 Nov; **built z190 (7 Nov), awaiting his test**). Master Planner > Crew Matrix becomes an edit table for whoever can edit the Master Planner file: each seat a CAT dropdown (the CAT order, plus "-" for no requirement), Shift Any / Day / Night, Mission typed or picked from the Mission Types on the flight codes, Notes; + Add row under a mission, + Add mission, right-click a row for Move up / down, Duplicate, Disable / Enable, Remove; CAT order editable (A B C D). The first edit makes the Crew Matrix sheet from the built-in default (no separate button). Saved in the existing Crew Matrix sheet (Disable = an Off mark in spare column J), no layout change. Others keep the read-only view
- [?] AC tag on standby (P1, P2, BU) in the Pilot plan (Brandon, 7 Nov; **built z191 (7 Nov), awaiting his test**). Today the AC / Pax choice in the cell popup appears only on flight cells, and the Ops Room standby rows guess the Captain (role, then CAT). Planned: in the Pilot file the popup on a P1 / P2 / BU cell offers None / AC (no Pax on standby); the Ops Room standby row seats the tagged pilot as AC and the other pilot as Pilot (1 Set P1/P2 row too); a pick made in the Ops Room still wins; no tag = today's guess. Saved in the Role Tags sheet like the flight tags, no layout change. AFP standby PILOT column follows the Ops Room seats (AC first) (Brandon, 7 Nov: the AFP just reflects the Ops Room data)
- [?] Ops Room Intel: only the flights that need intel (Brandon, 7 Nov: option 1; **built z192 (7 Nov), awaiting his test**). Intel Flights starts empty (no longer lists every flight); clicking it opens the day's flights with a tick box each (ETD and callsign, else the code; cancelled left out); only the ticked ones show; free text can still be added under them. Saved in the same Day Board cell, dashboard only, no layout change. Intel Spec unchanged
- [?] Ops Room standby rows reorganised (Brandon, 7 Nov: "looks good"; **built z192 (7 Nov), awaiting his test**). Brief Timing per standby row in the Brief Timing column (feeds the AFP BRF); one Alert status box per shift (Brandon: one box) over ETD to Hours with a heading, one line per alert time (level big, time small) and "+ alert time" by the heading (replaces the floating circle); AO / Area time a grey dash; the empty block gone; Remarks per row. Dashboard only, no layout change, 1 Set and 2 Set. Mock-up `previews/standby_layout_mockup_{now,new}*.png` (script `previews/standby_layout_mockup.js`)
- [?] My Lodestar: Next 7 days removed (Brandon, 7 Nov: redundant with the My month calendar; **built z193 (7 Nov), awaiting his test**). Today stays as it is (flight with brief / ETD / ETA / area / crew, duty, "Next: ..." hint); My month moves up directly under it; clicking a day still shows it in Today. The colours stay (the washed-out look in his screenshot was his HDR mode)
- [?] Crew Matrix also checks Standby duty (P1, P2, BU) (Brandon, 7 Nov; **built z191 (7 Nov), awaiting his test**). Today only flights are checked. **Decided (Brandon, 7 Nov): standby is checked against the MAS OPS rows** (P1, P2 and BU alike). Shift Day / Night works as for flights; the 1 Set P1/P2 row counts as one crew. Warnings in the same places as flights: CREW MATRIX ✕ on the Ops Room standby row, ⚠ CREW MATRIX on the Planner P1 / P2 / BU cells (tooltip says what's missing). Uses the standby AC tag item for the AC seat. Crew Matrix page says standby uses MAS OPS
- [?] Flight Codes: a Crew Matrix column to pick which matrix mission checks each code (Brandon, 7 Nov; **built z195, awaiting his test**). Auto = the mission named like the Mission Type (as before), or pick any mission on the Crew Matrix page, or Not checked. Saved in the Flight Codes sheet column H, no layout change
- [?] Wider flight card; P1 / P2 / BU cells open the card with the standby crew and crew matrix check; standby P1 / P2 / BU listed on Flight Codes to pick their crew matrix (Brandon, 7 Nov; **built z196, awaiting his test**). They stay ground duties (not flights); saved in Flight Codes K5:L8
- [?] More SANS / NSMEN rows (z183, 6 Nov, Brandon): 30 instead of 15 (75 people per department file), department layout 5, and Upgrade department files… on the start screen (dev) that copies everything typed in the old file into a new empty one (awaiting his upgrade of the intranet files)
