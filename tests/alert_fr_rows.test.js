// Planner ALERT and FLYING RESTRICTION rows, SQUADRON PROGRAMME label (z184). Build first: python3 .lodestar_build.py dashboard
// Run: node tests/alert_fr_rows.test.js [--shot]
const assert = require("assert");
const path = require("path");
const { boot } = require("./lode_lib");
(async () => {
  const { page, errs, close } = await boot({ mine: "Flight_Ops_Planner_SUP2", today: "2026-11-06" });
  let pass = 0, fail = 0;
  const t = async (name, fn) => { try { await fn(); pass++; console.log("ok   " + name); } catch (e) { fail++; console.log("FAIL " + name + ": " + e.message); } };
  // put two SUP 2 people on P1 / BU on 6 Nov and a restriction over 5..7 Nov, then show November
  await page.evaluate(() => {
    const A = actIndex(); ["P1", "BU"].forEach(c => { if (!A.get(c)) S.acts.push({ code: c, desc: "Standby", cat: S.cats[CAT_GD] }); });
    const M = S.m[10], ids = S.roster.map((p, i) => [p, i]).filter(([p]) => p.id).slice(0, 2);
    M.grid[gridRow(ids[0][1], 0)][5] = "P1"; M.grid[gridRow(ids[1][1], 0)][5] = "BU"; window.__ids = ids.map(x => x[0].id);
    const ob = books[opsIdx()]; ob.S.fr = [{ row: 2, from: "2026-11-05", to: "2026-11-07", text: "Eastern area closed", by: "" }];
    cur.m = 10; renderControls(); document.querySelector("nav.tabs button[data-v='plan']").click(); renderPlanner();
  });
  await t("squadron_programme_label", async () => { const x = await page.textContent("tr.gndrow td.gndlab"); assert.strictEqual(x, "SQUADRON PROGRAMME"); });
  await t("alert_row_shows_own_standby_crew", async () => {
    const r = await page.evaluate(() => { const c = [...document.querySelectorAll("tr.alrow td.c")]; return { n: c.length, d6: c[5].innerText, d5: c[4].innerText, tip: c[5].title, ids: window.__ids }; });
    assert.strictEqual(r.n, 30); assert.ok(r.d6.includes("P1 " + r.ids[0]) && r.d6.includes("BU " + r.ids[1]), JSON.stringify(r)); assert.ok(/SUP 2/.test(r.tip), r.tip);
  });
  await t("restriction_row_covers_its_days", async () => {
    const r = await page.evaluate(() => [...document.querySelectorAll("tr.frrow td.c")].map(c => c.classList.contains("on")));
    assert.deepStrictEqual([3, 4, 5, 6, 7].map(i => r[i]), [false, true, true, true, false]);
    assert.ok(/Eastern area closed/.test(await page.textContent("tr.frrow td.c.on")));
  });
  await t("rows_sit_between_programme_and_duty_days", async () => {
    const o = await page.evaluate(() => [...document.querySelectorAll("tr.gndrow, tr.alrow, tr.frrow, tr.sdorow")].map(r => r.className));
    assert.deepStrictEqual(o, ["gndrow", "alrow", "frrow", "sdorow"]);
  });
  await t("no_page_errors", async () => { assert.deepStrictEqual(errs.filter(e => !/DIALOG/.test(e)), []); });
  if (process.argv.includes("--shot")) { await page.evaluate(() => document.querySelector("tr.gndrow").scrollIntoView({ block: "center" })); await page.screenshot({ path: path.join(__dirname, "..", "previews", "alert_fr_rows.png") }); }
  console.log(pass + " passed, " + fail + " failed"); await close(); process.exit(fail ? 1 : 0);
})();
