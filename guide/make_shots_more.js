// Screenshots for the Getting started, Planners, Duty Planner and Ops Room parts of the guide (demo data only).
// Run: LODE_FILES=<folder with a fresh demo set> node guide/make_shots_more.js [dept,duty,ops]
// (build the dashboard first; make the demo set with: python3 .lodestar_build.py excel <folder>). The Master Planner part uses make_shots.js.
const { chromium } = require("playwright");
const { boot } = require("../tests/lode_lib");
const OUT = __dirname + "/img/";
require("fs").mkdirSync(OUT, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const HIDE = "#devBadge{display:none!important} *{animation:none!important;transition:none!important}";
const ONLY = process.argv[2] || "";
(async () => {
  const orig = chromium.launch.bind(chromium);
  chromium.launch = async (...a) => { const b = await orig(...a); const np = b.newPage.bind(b); b.newPage = opts => np(Object.assign({}, opts, { deviceScaleFactor: 2, locale: "en-GB" })); return b; };
  const shot = async (p, name, el, clip) => { await wait(500); const o = { path: OUT + name + ".png" }; if (clip) o.clip = clip;
    if (el) await p.locator(el).first().screenshot(o); else await p.screenshot(o); console.log("shot", name); };
  const tab = (p, v) => p.evaluate(v => document.querySelector("nav.tabs button[data-v='" + v + "']").click(), v);
  const run = k => !ONLY || ONLY.split(",").includes(k);
  const box = async (p, sel) => p.locator(sel).first().boundingBox();

  // ---------- a department planner (SUP 2) ----------
  if (run("dept")) {
    const S = await boot({ mine: "Flight_Ops_Planner_SUP2", today: "2026-10-14", title: "S. Lim" }); const p = S.page; await p.addStyleTag({ content: HIDE });
    await tab(p, "plan"); await p.evaluate(() => $("btnToday").click()); await wait(800); await p.evaluate(() => { const g = document.querySelector("#plan"); if (g && g.parentElement) g.parentElement.scrollLeft = 0; });
    await shot(p, "20_planner");
    await shot(p, "21_header", "header");
    await shot(p, "21_tabs", "nav.tabs");
    await p.evaluate(() => openHelp()); await shot(p, "22_help", "#helpPop .box"); await p.evaluate(() => { $("helpPop").style.display = "none"; });
    // cell list (right-click) and cell card (click) on a crew cell, 14 Oct
    const k = await p.evaluate(() => { const t = [...document.querySelectorAll("#plan td[data-k]")].filter(t => !t.dataset.k.startsWith("m:")).find(t => { const q = keyParts(t.dataset.k); return q.d === 13 && q.r === 0; }); return t && t.dataset.k; });
    console.log("key", k);
    if (k) {
      await p.click("#plan td[data-k='" + k + "']", { button: "right" }); await wait(500);
      const pb = await box(p, "#pop"); if (pb) await p.screenshot({ path: OUT + "23_cell_list.png", clip: { x: Math.max(0, pb.x - 10), y: Math.max(0, pb.y - 10), width: pb.width + 20, height: Math.min(pb.height + 20, 720 - Math.max(0, pb.y - 10)) } }); console.log("shot 23_cell_list", JSON.stringify(pb));
      await p.keyboard.press("Escape"); await wait(300);
      const k2 = k.replace(/^g:0:/, "g:4:"); await p.click("#plan td[data-k='" + k2 + "']"); await wait(500);
      const cb = await box(p, "#cellCard"); if (cb) await p.screenshot({ path: OUT + "23_cell_card.png", clip: { x: Math.max(0, cb.x - 10), y: Math.max(0, cb.y - 10), width: cb.width + 20, height: Math.min(cb.height + 20, 720 - Math.max(0, cb.y - 10)) } }); console.log("shot 23_cell_card", JSON.stringify(cb));
      await p.keyboard.press("Escape");
    }
    await tab(p, "ov"); await wait(600); await shot(p, "24_overview");
    await tab(p, "syl"); await wait(600); await p.evaluate(() => { const e = [...document.querySelectorAll("#v-syl *")].find(x => x.children.length < 4 && /^FALCON/.test(x.textContent.trim())); if (e) e.click(); }); await wait(600); await shot(p, "25_syllabus");
    await tab(p, "roster"); await wait(600); await shot(p, "26_roster");
    await tab(p, "cur"); await wait(600); await shot(p, "27_currency");
    await tab(p, "sdo"); await wait(600); await shot(p, "40_duty_dept");
    console.log(S.errs.join("\n")); await S.close();
  }
  // ---------- Duty Roster as own file ----------
  if (run("duty")) {
    const S = await boot({ mine: "Duty_Roster", today: "2026-10-14", title: "D. Chua" }); const p = S.page; await p.addStyleTag({ content: HIDE });
    await p.setInputFiles("#fileInputMore", require("path").join(process.env.LODE_FILES || require("../tests/lode_lib").ROOT, "Flight_Ops_Planner_SUP2.xlsx")); await wait(2500);
    await tab(p, "sdo"); await wait(800); await shot(p, "41_duty_roster");
    await p.evaluate(() => { const h = [...document.querySelectorAll("#v-sdo h3, #v-sdo .mhd, #v-sdo div")].find(x => /^OCTOBER 2026/.test(x.textContent.trim())); if (h) h.scrollIntoView({ block: "start" }); }); await wait(500); await shot(p, "42_duty_october");
    await p.evaluate(() => { const b = [...document.querySelectorAll("#v-sdo button")].find(x => /^SDO/.test(x.textContent.trim())); if (b) b.click(); window.scrollTo(0, 0); }); await wait(600); await shot(p, "43_duty_sdo");
    console.log(S.errs.join("\n")); await S.close();
  }
  // ---------- Ops Room ----------
  if (run("ops")) {
    const S = await boot({ mine: "Ops_Room", today: "2026-10-14", title: "K. Ong" }); const p = S.page; await p.addStyleTag({ content: HIDE });
    await p.setInputFiles("#fileInputMore", require("path").join(process.env.LODE_FILES || require("../tests/lode_lib").ROOT, "Flight_Ops_Planner_SUP2.xlsx")); await wait(2500);
    const go = iso => p.evaluate(iso => { cur.opsDay = iso; document.querySelector("nav.tabs button[data-v='ops']").click(); renderOps(); }, iso);
    await go("2026-10-14"); await wait(800); await shot(p, "51_ops_board");
    await shot(p, "53_ops_strip", "#opsBoard");
    // seat popup
    const td = p.locator("table.opst td[data-oc]").nth(1); await td.click(); await wait(500);
    const pb = await box(p, "#opsPop"); if (pb) await p.screenshot({ path: OUT + "54_seat_pop.png", clip: { x: Math.max(0, pb.x - 10), y: Math.max(0, pb.y - 10), width: pb.width + 20, height: Math.min(pb.height + 20, 720 - Math.max(0, pb.y - 10)) } }); console.log("seat pop", JSON.stringify(pb));
    await p.evaluate(() => { $("opsPop").style.display = "none"; cur.opsPop = null; });
    // Ops Add and AFP dialogs
    await p.click("#opsAddBtn"); await wait(500); await shot(p, "55_ops_add", "#oaPop .box"); await p.evaluate(() => { $("oaPop").style.display = "none"; });
    await p.evaluate(() => afpOpen()); await wait(500); await shot(p, "56_afp", "#afpPop .box"); await p.evaluate(() => { $("afpPop").style.display = "none"; });
    // ground programme: one Ops row added in memory (not saved), the card, then the row dialog with the department reference
    await p.evaluate(() => { grrSave(opsDay(cur.opsDay).iso, grrNewKey(), "manual", { time: "1400H-1600H", act: "Dinghy drill", note: "Pool", who: "ALL" }); renderOps(); }); await wait(500);
    await p.hover("#opsSide .card.gp tbody tr >> nth=0"); await wait(400); { const cb = await box(p, "#opsSide .card.gp"), tb = await box(p, "#opsSide .card.gp table"); await p.screenshot({ path: OUT + "57_ground_card.png", clip: { x: cb.x, y: cb.y, width: cb.width, height: tb.y + tb.height - cb.y + 14 } }); console.log("shot 57_ground_card"); }
    await p.click("#grAddBtn"); await wait(500); await shot(p, "58_ground_row", "#grPop .box"); await p.click("#grCancel");
    console.log(S.errs.join("\n")); await S.close();
  }
})();
