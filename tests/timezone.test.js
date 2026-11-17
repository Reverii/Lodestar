// Singapore time (UTC+8): "today" and the time stamps follow the local clock, also in the early morning while UTC is still on the
// day before (bug testing round, 17 Nov). The other suites fake today with OPS_TODAY; this one uses the real clock.
// Build the dashboard first: python3 .lodestar_build.py dashboard. Run: node tests/timezone.test.js
// (Every suite can also be run in Singapore time: TZ=Asia/Singapore node tests/run_all.js --build; 93 of 93 clean on z212.)
const assert = require("assert");
const path = require("path");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..");
const FILES = process.env.LODE_FILES ? path.resolve(process.env.LODE_FILES) : ROOT;

async function at(utc) {
  const b = await chromium.launch(), c = await b.newContext({ timezoneId: "Asia/Singapore" }), p = await c.newPage(), errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.clock.setFixedTime(new Date(utc));
  await p.goto("file://" + path.join(ROOT, "Flight_Ops_Planner_Dashboard.html"));
  await p.setInputFiles("#fileInput", path.join(FILES, "Flight_Ops_Planner_SUP2.xlsx"));
  await p.waitForFunction(() => typeof books !== "undefined" && books.length >= 1);
  const r = await p.evaluate(() => ({ today: opsToday(), ymd: todayYMD(), log: logTime(), hello: lodeHello(),
    col: (() => { document.querySelector("nav.tabs button[data-v='plan']").click(); const t = todayYMD(); cur.m = t.mi; renderPlanner(); return [...document.querySelectorAll("#plan th.tdy")].map(x => x.textContent.trim()).join(" "); })() }));
  await b.close(); return { r, errs };
}

(async () => {
  let pass = 0; const all = [
    ["early_morning_is_already_today", "2026-11-16T23:30:00Z", { today: "2026-11-17", log: "2026-11-17 07:30:00", hello: "Good morning", d: 16 }],
    ["late_evening_is_still_today", "2026-11-17T15:30:00Z", { today: "2026-11-17", log: "2026-11-17 23:30:00", hello: "Good evening", d: 16 }],
    ["new_year_morning", "2026-12-31T16:30:00Z", { today: "2027-01-01", log: "2027-01-01 00:30:00", hello: "Good morning", d: 0 }],
  ];
  for (const [name, utc, want] of all) {
    try { const { r, errs } = await at(utc);
      assert.deepStrictEqual([r.today, r.log, r.hello, r.ymd.d], [want.today, want.log, want.hello, want.d], JSON.stringify(r));
      if (want.today.startsWith("2026")) assert.ok(new RegExp("\\b" + (want.d + 1) + "\\b").test(r.col) && /Tue/.test(r.col), "the Planner marks today (Tue 17): " + r.col);
      assert.deepStrictEqual(errs, []);
      pass++; console.log("ok   " + name); }
    catch (e) { console.log("FAIL " + name + ": " + String(e.message).split("\n")[0].slice(0, 300)); }
  }
  console.log(pass + "/" + all.length + " pass"); process.exit(pass === all.length ? 0 : 1);
})();
