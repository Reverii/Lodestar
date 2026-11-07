# LODESTAR landing page: note for building it

Written 7 Nov 2026, after z196. This note is for planning the page. Nothing has been built yet.

## What the page is for

The landing page is the first thing people see when they open LODESTAR. It answers three questions in a few seconds:

1. What is LODESTAR? ("One unified plan. One true north." The daily flying ops planner for 121 SQN.)
2. Where do I go? One clear button into the dashboard, plus the few other links people need.
3. Is everything working? The current dashboard version, and who to contact if something looks wrong.

It is not a second dashboard. It shows no plans, crew or currency data.

## Where it lives (decide first)

| Option | Where | Good for | Watch out for |
|---|---|---|---|
| A. Intranet start page | The SharePoint folder "Program", next to the dashboard, e.g. `LODESTAR.html` / `.aspx` | Daily use at the squadron | Fully offline: no CDN, no web fonts, no outside links. Everything has to be in one file |
| B. GitHub Pages front page | The root of the Pages site, with the demo dashboard and `/briefing/` moved under it | Showing LODESTAR to people outside the squadron | Demo data only. Never real crew, callsigns or currency dates |
| C. Both | One source, two builds (as the dashboard does with `--demo`) | Everything | More to maintain |

Suggested: **A first**, because that is where the crew are. B can reuse the same page later with the links changed.

## Hard rules (from CLAUDE.md)

- Offline: inline everything (CSS, logo SVG, any script). No CDN, no Google Fonts, no network calls except SharePoint REST on the same site.
- Must work in Edge / Chromium on the intranet, from SharePoint, at about 1280 x 720 with no scrolling for the main part.
- 121 SQN is one squadron. No wording that splits it into Air Force vs Navy or similar.
- Plain English, full sentences, no code words (no "z196", "layout stamp", "dept file" in the main text).
- If it ever uses dev-only bits, wrap them in `<!--DEV--> ... <!--/DEV-->` so the release build can strip them.
- No real data on the GitHub Pages copy.

## Look and feel

- Logo: Compass Rose, `logo/final/Lodestar_logo_dark.svg` on a dark background (or `_light` on light). The icon is `logo/final/Lodestar_icon.svg`, the browser tab icon is `logo/final/Lodestar.ico`.
- Optional intro: `logo/animated/Lodestar_logo_animated.svg` (SVG, so it works offline). Play it once, short, and let people skip it. Don't use the 8 s mp4 here.
- Colours: the dashboard's slate scale (`--s900 #0f172a` background, `--s800 #1e293b` panels, `--s400 #94a3b8` muted text, `--s100 #f1f5f9` light text) with the blue accent `#60a5fa` / `#2563eb`. The amber BETA tag (as in the dashboard header) while we are in beta.
- Tagline as in the briefing: "One unified plan." then "One true north." in the gradient style.
- Fonts: system fonts only (Segoe UI on the intranet PCs).

## Sections (top to bottom)

1. **Header**: logo, LODESTAR wordmark, BETA tag, "121 SQN Flight & Ops Planner".
2. **Hero**: the tagline, one sentence on what it does ("Every department plans in its own file; the Master Planner, Duty Roster and Ops Room see one plan."), and the big button **Open LODESTAR** (goes to `Flight_Ops_Planner_Dashboard.aspx` in the same folder).
3. **Who uses what** (4 small cards, each with one line and the button that opens the dashboard for that role):
   - Department planners (SUP 1, SUP 2, TACCO, Loadmaster, Pilot): plan your crew's month.
   - Master Planner: the flights programme, flight codes and crew matrix.
   - Duty Planner: BDO and SDO days.
   - Ops Room: the day board, standby and the AFP export.
4. **Quick help**: three or four short lines, e.g. "Save to Excel keeps your changes", "The ? button on each tab explains that tab", "Opened the wrong department? Pick it again from the start screen".
5. **Footer**: the dashboard version (typed by hand, or read from the dashboard file, see below), "Last updated", and who to contact (Brandon).

Keep 1 to 3 on one 1280 x 720 screen. 4 and 5 can sit below.

## Nice to have (only if cheap)

- Show the live dashboard version by reading `Dashboard version ... zNNN` out of the dashboard file through SharePoint REST, so it never goes stale.
- "Files in this folder" check: list the eight `.xlsx` files and the dashboard with their last saved time (SharePoint REST, same as the dashboard's file list). Only names and times, no contents.
- A link to the briefing (`/briefing/`) on the Pages copy only.

## Not on the page

Things Brandon has already decided against in the dashboard (CLAUDE.md, "Not required") stay off here too: no weekly CO summary, no look-ahead panel, no notes for the day, no phone layout.

## Questions for Brandon before building

1. Where does it live: A (intranet), B (GitHub Pages) or C (both)?
2. Should it replace the link people use today, i.e. do they land here and click into the dashboard, or open the dashboard directly as now?
3. Role cards: just open the dashboard, or open it already on that role's tab?
4. Intro animation: yes / no?
5. Contact line: your name only, or a group mailbox / extension?
6. Live version and file check (Nice to have): wanted now, or later?

## How to build it (when he says "build it")

1. Mock-up first: `previews/landing_mockup.html` and a PNG at 1280 x 720 (Brandon usually wants this for a sizeable UI).
2. Source as a hidden dotted file, e.g. `.landing_source.html`, and a small step in `.lodestar_build.py` (`landing`) that inlines the logo SVG and writes `LODESTAR.html` (plus the `.aspx` copy for SharePoint, check `grep -c "<%"` is 0).
3. A Playwright check in `tests/` that it opens with no console errors, has no outside URLs, and the Open button points at the dashboard.
4. Update `HANDOFF.md`, `PROJECT_CHECKLIST.md` and the file table in `CLAUDE.md`.
