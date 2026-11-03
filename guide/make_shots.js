// Screenshots for the Master Planner guide (demo data only). Run: node guide/make_shots.js (build the dashboard first).
// 03_day_panel.png was trimmed by hand afterwards (empty strip at the bottom).
const { chromium } = require("playwright");
const { boot } = require("../tests/lode_lib");
const OUT = __dirname + "/img/";
require("fs").mkdirSync(OUT, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const HIDE = "#devBadge{display:none!important} *{animation:none!important;transition:none!important}";
(async () => {
  // boot() makes its own browser at scale 1; patch chromium.launch to give pages at scale 2
  const orig = chromium.launch.bind(chromium);
  chromium.launch = async (...a) => { const b = await orig(...a); const np = b.newPage.bind(b); b.newPage = opts => np(Object.assign({}, opts, { deviceScaleFactor: 2, locale: "en-GB" })); return b; };
  const shot = async (p, name, el) => { await wait(500); if (el) await p.locator(el).screenshot({ path: OUT + name + ".png" }); else await p.screenshot({ path: OUT + name + ".png" }); console.log("shot", name); };
  const mp = (p, mi, d) => p.evaluate(([mi, d]) => { document.querySelector("nav.tabs button[data-v='mp']").click(); cur.mpM = mi; cur.mpDay = d; cur.mpNew = null; renderMp(); }, [mi, d]);

  // 1. department screen (SharePoint stubbed)
  { const S = await boot({ blank: true, today: "2026-10-14" }); const p = S.page; await p.addStyleTag({ content: HIDE });
    const F = (n, m, by) => ({ Name: n, ServerRelativeUrl: "/x/" + n, TimeLastModified: m, By: by });
    await p.evaluate(files => { window.SP_NOW = "2026-10-14T09:10:00"; SP.folder = "/sites/121SQN/Program"; SP.files = files; window.spList = async () => { SP.listedAt = new Date(window.SP_NOW); }; spRemember("dept", "Master Planner"); document.getElementById("welcome").style.display = "none"; return spShowDepts(); },
      [F("Flight_Ops_Planner_SUP1.xlsx", "2026-10-14T08:12:00", "R. Tan"), F("Flight_Ops_Planner_SUP2.xlsx", "2026-10-14T07:40:00", "S. Lim"), F("Flight_Ops_Planner_TACCO.xlsx", "2026-10-13T16:55:00", "J. Koh"),
       F("Flight_Ops_Planner_Loadmaster.xlsx", "2026-10-12T11:20:00", "A. Ng"), F("Flight_Ops_Planner_Pilot.xlsx", "2026-10-14T06:58:00", "M. Lee"), F("Master_Planner.xlsx", "2026-10-14T08:30:00", "H. Yeo"),
       F("Duty_Roster.xlsx", "2026-10-09T09:05:00", "D. Chua"), F("Ops_Room.xlsx", "2026-10-14T08:05:00", "K. Ong")]);
    await shot(p, "01_department_screen"); await S.close(); }

  const S = await boot({ mine: "Master_Planner", today: "2026-10-14" }); const p = S.page; await p.addStyleTag({ content: HIDE });
  await p.evaluate(() => { SP.user = { Title: "H. Yeo", Email: "" }; });
  // 2. month calendar
  await mp(p, 9, null); await shot(p, "02_calendar");
  // 3. day panel (a busy day), tall viewport so the whole panel shows
  await p.setViewportSize({ width: 1280, height: 1150 }); await p.addStyleTag({ content: "#mpKpis{visibility:hidden}" });
  await mp(p, 9, 20); await shot(p, "03_day_panel", "#mpSide");
    // 4. one flight card, then a new code being typed
  await mp(p, 9, 13); await shot(p, "04_flight_card", "#mpSide .spf >> nth=0");
  await p.evaluate(() => { const el = document.querySelector("#mpSide input[data-f='code']"); el.value = "SAR-EX"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await p.evaluate(() => { cur.mpNew.crew = ["P", "L", "S1"]; cur.mpNew.mtype = "OPS"; cur.mpNew.desc = "Search and rescue exercise"; renderMp(); });
  await shot(p, "05_new_code", "#mpSide .spf >> nth=0");
  await p.evaluate(() => { cur.mpNew = null; renderMp(); });
  // 6. no-flying day
  await mp(p, 9, 8); await shot(p, "06_no_flying_day", "#mpSide");
  // 7. squadron events: a day with one, plus one with no crew
  await mp(p, 9, 13); await shot(p, "07_squadron_events", "#mpSide");
  await p.setViewportSize({ width: 1280, height: 720 }); await p.addStyleTag({ content: "#mpKpis{visibility:visible!important}" });
  // 8. export dialog
  await mp(p, 9, null); await p.click("#mpExport"); await shot(p, "08_export", "#mpExpPop .box");
  await p.click("#mpExpCancel");
  // 9. flight codes page
  await p.evaluate(() => document.querySelector("nav.tabs button[data-v='codes']").click()); await shot(p, "09_flight_codes");
  // 10. crew matrix
  await p.evaluate(() => document.querySelector("nav.tabs button[data-v='cmx']").click()); await shot(p, "10_crew_matrix");
  // 11. requests inbox (one sample request from a department, in memory only)
  await p.evaluate(() => { const b = books.find(b => b.S.dept === "TACCO"); b.S.hasReq = true; b.S.req = [{ id: "R1", row: 5, raised: "2026-10-13", note: "Need a second NVG sortie on 22 Oct for two TACCO trainees." }]; cur.rqShow = true; });
  await mp(p, 9, null); await wait(400); { const bb = await p.locator("#mpReq").boundingBox(); await p.screenshot({ path: OUT + "11_requests.png", clip: { x: bb.x, y: bb.y, width: 520, height: bb.height } }); }
  // 12. top bar
  await shot(p, "12_top_bar", "header");
  // 13. menu open
  await p.evaluate(() => document.getElementById("mpTabBtn").click()); await shot(p, "13_menu"); { const bb = await p.locator("#mpMenu .tmenu").boundingBox(); await p.screenshot({ path: OUT + "13_menu.png", clip: { x: bb.x - 230, y: 0, width: bb.width + 260, height: bb.y + bb.height + 10 } }); }
  console.log(S.errs.join("\n")); await S.close();
})();
