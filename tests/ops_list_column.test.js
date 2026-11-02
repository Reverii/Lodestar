// Activities "Show in Ops Room list" (z138): the planner chooses which activities appear under "From the department plans" in the Ops Room.
// Build first: python3 .lodestar_build.py dashboard. Run: [LODE_FILES=<set>] node tests/ops_list_column.test.js
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// put a code in the first person's AM cell on day 3 of the first month and ask the Ops Room list for that day
const refFor = (page, code) => page.evaluate(code => {
  const M = S.m[0]; M.grid[gridRow(0, 0)][2] = code;
  const r = opsDeptRef({ y: S.year, mi: 0, d: 2, gr: [] });
  return r.some(x => x.dept === S.dept && x.items.some(i => i.act === code));
}, code);
const actOf = (page, code) => page.evaluate(code => S.acts.findIndex(a => a.code === code), code);
const setOps = (page, i, v) => page.evaluate(([i, v]) => { renderActs(); const el = document.querySelector("#actTable select[data-a='" + i + "'][data-f='ops']"); el.value = v; el.dispatchEvent(new Event("change", { bubbles: true })); return !!el; }, [i, v]);

test("without_the_column_the_category_rule_still_applies", async page => {
  const r = await page.evaluate(() => { S.hasOps = false; const f = c => { const a = S.acts.find(x => x.code === c); return a ? opsListOn({ ...a, ci: S.cats.findIndex(k => k && k === a.cat) }) : null; }; return [f("Meeting"), f("SIM"), f("Detachment"), f("OIL")]; });
  assert.deepStrictEqual(r, [true, true, true, false]);
});
test("first_choice_makes_the_column_and_keeps_the_listed_ones", async page => {
  const i = await actOf(page, "OIL"); assert.ok(i >= 0, "OIL in Activities");
  assert.ok(await setOps(page, i, "Yes"));
  const r = await page.evaluate(() => ({ has: S.hasOps, hdr: dirty.get("Activities!E5"), sim: S.acts.find(a => a.code === "SIM").ops, oil: S.acts.find(a => a.code === "OIL").ops, e: dirty.get("Activities!E" + (ACT_ROW0 + S.acts.findIndex(a => a.code === "OIL"))) }));
  assert.ok(r.has); assert.strictEqual(r.hdr.val, "Ops Room list"); assert.strictEqual(r.sim, "Yes"); assert.strictEqual(r.oil, "Yes"); assert.strictEqual(r.e.val, "Yes");
  assert.ok(await refFor(page, "OIL"), "OIL is now listed");
});
test("no_hides_an_activity_from_the_list", async page => {
  const i = await actOf(page, "SIMCEN");
  await setOps(page, i, "No");
  assert.ok(!(await refFor(page, "SIMCEN")), "SIMCEN hidden");
  assert.ok(await refFor(page, "Meeting"), "Meeting still listed");
});

(async () => {
  let pass = 0; const S = await boot({ fresh: true });
  for (const t of tests) { try { await t.fn(S.page || S); pass++; console.log("ok   " + t.name); } catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 300)); } }
  await S.close(); console.log(pass + "/" + tests.length + " pass"); process.exit(pass === tests.length ? 0 : 1);
})();
