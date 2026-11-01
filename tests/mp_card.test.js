// Master Planner flight card: planned hours from the time range, day summary, facts (z125). Build first: python3 .lodestar_build.py dashboard
// Run: node tests/mp_card.test.js [name-filter]
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const ED = { mine: "Ops_Room", fresh: true }, RO = { mine: "Flight_Ops_Planner_SUP2", fresh: true };
const hrs = (page, time, code) => page.evaluate(([t, c]) => { const P = masterBook().S; return mpFlHrs(P, { code: c || "FLT-2.0", time: t }); }, [time, code]);

test("range_gives_hours", async ({ page }) => {
  assert.deepStrictEqual(await hrs(page, "0830-1030"), { h: 2, src: "range", bad: "" });
  assert.deepStrictEqual(await hrs(page, "1000-1130"), { h: 1.5, src: "range", bad: "" });
  assert.deepStrictEqual(await hrs(page, "1800H-2000H"), { h: 2, src: "range", bad: "" });
  assert.deepStrictEqual(await hrs(page, "08:30 - 10:30"), { h: 2, src: "range", bad: "" });
}, ED);
test("midnight_crossing_adds_a_day", async ({ page }) => {
  assert.deepStrictEqual(await hrs(page, "2200-0100"), { h: 3, src: "range", bad: "" }); assert.deepStrictEqual(await hrs(page, "2330-0030"), { h: 1, src: "range", bad: "" });
}, ED);
test("no_end_falls_back_to_the_code_hours_with_a_warning", async ({ page }) => {
  const r = await hrs(page, "0830", "FLT-2.0"); assert.strictEqual(r.bad, "No end time"); assert.strictEqual(r.src, "code"); assert.strictEqual(r.h, 2);
  assert.strictEqual((await hrs(page, "", "FLT-2.0")).bad, "No time");
}, ED);
test("zero_or_over_12_hours_is_check_time", async ({ page }) => {
  assert.strictEqual((await hrs(page, "0830-0830")).bad, "Check time"); assert.strictEqual((await hrs(page, "0830-0730")).bad, "Check time"); assert.strictEqual((await hrs(page, "0600-1800")).bad, ""); assert.strictEqual((await hrs(page, "0600-1801")).bad, "Check time");
}, ED);
const panel = (page, d) => page.evaluate(d => { document.querySelector("nav.tabs button[data-v='mp']").click(); cur.mpM = 9; cur.mpDay = d; renderMp(); return { sum: (document.querySelector("#mpSide .spsum") || {}).textContent, facts: [...document.querySelectorAll("#mpSide .spfacts")].map(x => x.textContent), html: document.getElementById("mpSide").innerHTML }; }, d);
test("panel_shows_hours_and_day_summary", async ({ page }) => {
  const P = await page.evaluate(() => { const P = masterBook().S; const day = [...Array(31).keys()].find(d => [0, 1, 2].some(s => mpShift(P, 9, d, s).some(f => f.code && f.time && /\d\s*-\s*\d/.test(f.time)))); return { day }; });
  assert.ok(P.day != null, "the demo has a flight with a range");
  const r = await panel(page, P.day);
  assert.ok(/\d+ flights?\s*\d+\.\d H planned/.test(r.sum), r.sum); assert.ok(r.facts.length && r.facts.every(f => /\d\.\d H/.test(f)), r.facts.join("|"));
}, ED);
test("view_only_panel_has_no_duplicate_time_box_and_shows_description", async ({ page }) => {
  const day = await page.evaluate(() => { const P = masterBook().S; return [...Array(31).keys()].find(d => [0, 1, 2].some(s => mpShift(P, 9, d, s).some(f => f.code))); });
  const r = await panel(page, day); assert.ok(/spdesc/.test(r.html), "description line"); assert.ok(!/<select/.test(r.html.replace(/<select class='mpst2[\s\S]*?<\/select>/, "")), "no editable boxes");
}, RO);

(async () => {
  const only = process.argv[2]; let pass = 0, ran = 0, S = null;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue; ran++;
    try { if (!S || (t.opts && t.opts.fresh)) { if (S) await S.close(); S = await boot(Object.assign({}, t.opts)); } await t.fn(S); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 300)); if (S) { await S.close(); S = null; } }
  }
  if (S) await S.close(); console.log(pass + "/" + ran + " pass"); process.exit(pass === ran ? 0 : 1);
})();
