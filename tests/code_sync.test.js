// Flight codes from the Master Planner (z131): a Master Planner code is a flight without the manual copy, and every save adds missing codes to Activities (add only).
// Build first: python3 .lodestar_build.py dashboard. Run: [LODE_FILES=<layout-4 set>] node tests/code_sync.test.js [name-filter]
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const FRESH = { fresh: true };

// pick a flight cell on SUP 2's MASTER rows (month mi, day d, shift s) whose code is a flight in Activities; returns its details
const pick = page => page.evaluate(() => {
  const fc = flCatName(S);
  for (let mi = 0; mi < 12; mi++) { const M = S.m[mi]; if (!M) continue;
    for (let j = 0; j < 6; j++) for (let d = 0; d < 28; d++) { const c = M.master[j] && M.master[j][d];
      if (c && S.acts.some(a => a.code && a.code.toUpperCase() === c.toUpperCase() && same(a.cat, fc))) return { mi, d, s: Math.floor(j / 2), code: c }; } }
  return null;
});
// forget the Activities row of a code (as if it was never copied)
const dropAct = (page, code) => page.evaluate(code => { const a = S.acts.find(x => x.code && x.code.toUpperCase() === code.toUpperCase()); a.code = ""; a.desc = ""; a.cat = ""; a.mtype = ""; a.stag = ""; }, code);

test("code_on_master_list_is_a_flight_without_copy", async ({ page }) => {
  const c = await pick(page); assert.ok(c, "no flight on a MASTER row in the demo set");
  await dropAct(page, c.code);
  const r = await page.evaluate(code => ({ is: isFlightCode(S, code), ci: (actIndex().get(code.toUpperCase()) || {}).ci, fl: CAT_FLIGHT }), c.code);
  assert.ok(r.is, "isFlightCode"); assert.strictEqual(r.ci, r.fl);
}, FRESH);
test("code_on_master_row_is_a_flight_when_not_on_any_list", async ({ page }) => {
  const c = await pick(page); await dropAct(page, c.code);
  await page.evaluate(code => { const P = masterBook().S; P.codes = P.codes.filter(k => k.code.toUpperCase() !== code.toUpperCase()); }, c.code);
  assert.ok(await page.evaluate(code => isFlightCode(S, code), c.code), "the MASTER row alone makes it a flight");
  // a code on no list and on no MASTER row is not
  assert.ok(!(await page.evaluate(() => isFlightCode(S, "ZZNOPE"))));
}, FRESH);
test("picker_offers_planned_flight_with_missing_activity", async ({ page }) => {
  const c = await pick(page); await dropAct(page, c.code);
  const r = await page.evaluate(c => { cur.m = c.mi; renderPlanner(); const k = "g:" + gridRow(0, c.s) + ":" + c.d; openPop(k); const it = popItems.find(a => a.code.toUpperCase() === c.code.toUpperCase()); return it ? { grp: it.grp } : null; }, c);
  assert.ok(r, "the planned flight is in the picker"); assert.ok(/flights/.test(r.grp), r.grp);
}, FRESH);
test("ground_code_with_same_name_stays_ground", async ({ page }) => {
  const r = await page.evaluate(() => {
    const gc = S.cats.findIndex((c, i) => c && i !== CAT_FLIGHT), slot = S.acts.find(a => !a.code);
    slot.code = "ZZG"; slot.cat = S.cats[gc]; slot.desc = "Ground thing";
    masterBook().S.codes.push({ code: "ZZG", desc: "", crew: "", mtype: "" });
    return { ci: actIndex().get("ZZG").ci, gc, fl: CAT_FLIGHT };
  });
  assert.strictEqual(r.ci, r.gc); assert.notStrictEqual(r.ci, r.fl);
}, FRESH);

(async () => {
  const only = process.argv[2]; let pass = 0, ran = 0, S = null;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue; ran++;
    try { if (!S || (t.opts && t.opts.fresh)) { if (S) await S.close(); S = await boot(Object.assign({}, t.opts)); } await t.fn(S); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 300)); if (S) { await S.close(); S = null; } }
  }
  if (S) await S.close(); console.log(pass + "/" + ran + " pass"); process.exit(pass === ran ? 0 : 1);
})();
