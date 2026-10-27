// Ops Room redesign tests. Build the dashboard first: python3 .lodestar_build.py dashboard
// Run: node tests/ops_room.test.js [name-filter]
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const RO = { mine: "Flight_Ops_Planner_SUP2" };   // a department view (Ops Room file read-only)
const ED = { mine: "Ops_Room" };                    // the Ops Room view (everything editable)
const DAY = "2026-10-14";                           // a demo day with flights
const goOps = (page, iso) => page.evaluate(iso => { cur.opsDay = iso; document.querySelector("nav.tabs button[data-v='ops']").click(); renderOps(); }, iso);

test("chips_no_seats_or_downchit", async ({ page }) => {
  await goOps(page, DAY);
  const labs = await page.evaluate(() => [...document.querySelectorAll("#opsStats .opsk small")].map(x => x.textContent.trim()));
  for (const l of ["Flights", "Sorties", "Flown", "Cancelled"]) assert.ok(labs.includes(l), l + " missing: " + labs.join());
  assert.ok(!labs.includes("Seats filled") && !labs.includes("Down-chit"), labs.join());
}, ED);
test("no_timeline", async ({ page }) => {
  await goOps(page, DAY);
  assert.strictEqual(await page.evaluate(() => document.getElementById("opsView")), null);
  assert.strictEqual(await page.evaluate(() => typeof opsTimeline), "undefined");
  assert.strictEqual(await page.evaluate(() => document.querySelector("#v-ops button[data-vw]")), null);
}, RO);

// the Day Board cells of an Area line / Codes for the open day: ref and value helpers run in the page
const AREA_SET = (page, vals) => page.evaluate(vals => { const st = books[opsIdx()].S, row = 6 + dayOfYear(...Object.values((({ y, mi, d }) => ({ y, mi, d }))(opsDay(cur.opsDay))));
  OPS_DB_CELLS.filter(c => c.stack >= 0).forEach(c => { st.db[c.col + row] = vals[c.sub] || ""; }); renderOps(); }, vals);

test("side_cards_below_table", async ({ page }) => {
  await goOps(page, DAY);
  const g = await page.evaluate(() => { const s = document.getElementById("opsSide").getBoundingClientRect(), m = document.getElementById("opsMain").getBoundingClientRect(), w = document.getElementById("opsWrap").getBoundingClientRect();
    return { sideTop: s.top, mainBottom: m.bottom, mainW: m.width, wrapW: w.width, txt: document.getElementById("opsSide").innerText }; });
  assert.ok(g.sideTop >= g.mainBottom - 1, "side " + g.sideTop + " main bottom " + g.mainBottom);
  assert.ok(g.mainW >= 0.9 * g.wrapW, g.mainW + " of " + g.wrapW);
  for (const h of ["Ground programme", "Down-chit", "Remarks"]) assert.ok(g.txt.includes(h), h);
  assert.ok(/Movement|Leave and MC/.test(g.txt));
}, ED);
test("codes_card_next_to_dob", async ({ page }) => {
  await goOps(page, DAY);
  const g = await page.evaluate(() => { const c = document.querySelector("#opsBoard .odi.codes"), d = document.querySelector("#opsBoard .odi.dob"); return { has: !!c, cl: c && c.getBoundingClientRect().left, dl: d && d.getBoundingClientRect().left, side: document.getElementById("opsSide").innerText }; });
  assert.ok(g.has && g.cl > g.dl, JSON.stringify(g));
  assert.ok(!/Codes/i.test(g.side), "Codes still in the side cards");
}, ED);
test("area_hidden_when_empty", async ({ page }) => {
  await goOps(page, DAY);
  await AREA_SET(page, {});
  assert.strictEqual(await page.evaluate(() => document.querySelector("#opsSide .opsac")), null);
  await AREA_SET(page, { Echo: "VIPER" });
  const t = await page.evaluate(() => { const a = document.querySelector("#opsSide .opsac"); return a ? a.innerText : null; });
  assert.ok(t && /echo/i.test(t) && /VIPER/.test(t) && !/oscar/i.test(t), String(t));
}, ED);
test("area_add_button", async ({ page }) => {
  await goOps(page, DAY); await AREA_SET(page, {});
  assert.ok(await page.evaluate(() => !!document.getElementById("opsAreaAdd")), "button in the Ops Room view");
  await page.click("#opsAreaAdd");
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll("#opsSide .opsac .v.oe").length), 3);
  await page.evaluate(iso => opsGo(iso), "2026-10-15");
  assert.strictEqual(await page.evaluate(() => document.querySelector("#opsSide .opsac")), null, "closed on a new day");
  await page.evaluate(() => { document.body.classList.add("opsfs"); renderOps(); });
  assert.ok(await page.evaluate(() => !document.getElementById("opsAreaAdd")), "no button in projector mode");
}, ED);
test("area_add_button_absent_read_only", async ({ page }) => {
  await goOps(page, DAY);
  assert.ok(await page.evaluate(() => !document.getElementById("opsAreaAdd")));
}, RO);

(async () => {
  const only = process.argv[2];
  let pass = 0, ran = 0;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue;
    ran++; let S = null;
    try { S = await boot(Object.assign({}, t.opts)); await t.fn(S); if (S.errs.length) throw new Error("page errors: " + S.errs.join(" | ").slice(0, 300)); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 300)); }
    if (S) await S.close();
  }
  console.log(pass + "/" + ran + " pass");
  process.exit(pass === ran ? 0 : 1);
})();
