// Syllabus stages named by the CAT held (z153): OCU -> CAT D -> CAT C -> CAT B -> CAT A, the CAT A stage (gives Instructor) only for selected crew.
// Needs a set built after z153: LODE_FILES=<folder from python3 .lodestar_build.py excel <folder>> node tests/syllabus_stages.test.js
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const openSyl = (page, id) => page.evaluate(id => { document.querySelector("nav.tabs button[data-v='syl']").click(); if (id) { sylSel = { id, stage: null, code: null }; renderSyl(); } }, id);
const pathOf = (page, id) => page.evaluate(id => { const p = S.roster.find(x => x.id === id), P = sylPath(S.sylDef, S, p); return { wk: P.wk < 0 ? null : P.stages[P.wk].stg.name, skip: P.stages.filter(s => s.skip).map(s => s.stg.name) }; }, id);

test("builder_stages_by_cat_held", async ({ page }) => {
  const r = await page.evaluate(() => S.sylDef.stages.map(s => s.name + ">" + s.gives));
  assert.deepStrictEqual(r, ["OCU>CAT D", "CAT D>CAT C", "CAT C>CAT B", "CAT B>CAT A", "CAT A>Instructor"]);
});
test("each_cat_works_on_its_own_stage", async ({ page }) => {
  assert.strictEqual((await pathOf(page, "OWL")).wk, "OCU");
  assert.strictEqual((await pathOf(page, "EAGLE")).wk, "CAT D");
  assert.strictEqual((await pathOf(page, "FALCON")).wk, "CAT C");
  assert.strictEqual((await pathOf(page, "KESTREL")).wk, "CAT B");
});
test("cat_a_not_selected_is_complete", async ({ page }) => {
  assert.deepStrictEqual(await pathOf(page, "HAWK"), { wk: null, skip: ["CAT A"] });
  await openSyl(page, "HAWK");
  const t = await page.evaluate(() => document.getElementById("sylTree").innerText);
  assert.ok(/instructor training only if selected/.test(t), t.slice(0, 200));
});
test("instructor_role_holds_the_stage", async ({ page }) => {
  assert.deepStrictEqual(await pathOf(page, "VIPER"), { wk: null, skip: [] });
});
test("switch_selects_and_writes_b8", async ({ page }) => {
  await openSyl(page, "HAWK");
  await page.click("[data-sylsel]");
  assert.strictEqual((await pathOf(page, "HAWK")).wk, "CAT A");
  const c = await page.evaluate(() => [S.sylDef.sel.join(","), [...books[cur.b].dirty].some(k => /Syllabus Settings!B8/.test(String(k)))]);
  assert.deepStrictEqual(c, ["HAWK", true]);
  await page.click("[data-sylsel]");
  assert.deepStrictEqual(await pathOf(page, "HAWK"), { wk: null, skip: ["CAT A"] });
});
test("no_switch_below_cat_a", async ({ page }) => {
  await openSyl(page, "KESTREL");
  assert.strictEqual(await page.evaluate(() => !!document.querySelector("[data-sylsel]")), false);
});

(async () => {
  const only = process.argv[2];
  let pass = 0, ran = 0;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue;
    ran++; let S = null;
    try { S = await boot(Object.assign({ today: "2026-10-26" }, t.opts)); await t.fn(S); if (S.errs.length) throw new Error("page errors: " + S.errs.join(" | ").slice(0, 300)); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 300)); }
    if (S) await S.close();
  }
  console.log(pass + "/" + ran + " pass");
  process.exit(pass === ran ? 0 : 1);
})();
