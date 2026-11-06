// The Crew Matrix edited on the page (z190). Build first: python3 .lodestar_build.py dashboard. Run: node tests/crew_matrix_edit.test.js [filter]
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const MP = { mine: "Master_Planner", today: "2026-10-14", fresh: true };
const DEPT = { mine: "Flight_Ops_Planner_SUP2", today: "2026-10-14", fresh: true };
const open = page => page.evaluate(() => { window.confirm = () => true; document.querySelectorAll(".view").forEach(v => v.classList.remove("on")); document.getElementById("v-cmx").classList.add("on"); renderCmx(); });
const sheet = page => page.evaluate(() => withBook(mpIdx(), () => { const out = buildXlsx(); return WB.paths[CM_SHEET] ? readCellsOf(out.files, WB.paths[CM_SHEET], WB.sst || []) : null; }));

test("editors_get_the_edit_table", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(() => ({ sel: document.querySelectorAll("#cmxWrap select[data-f='ac']").length, inp: document.querySelectorAll("#cmxWrap input[data-f='m']").length, add: !!document.getElementById("cmAddM") }));
  assert.ok(r.sel >= 9 && r.inp >= 9 && r.add, JSON.stringify(r));
}, MP);

test("first_change_makes_the_sheet_and_the_check_follows", async ({ page }) => {
  await open(page);
  await page.selectOption("#cmxWrap tr[data-cmr='0'] select[data-f='ac']", "D");
  const c = await sheet(page);
  assert.ok(c, "sheet made"); assert.strictEqual(c.A2, "MAS TRG"); assert.strictEqual(c.C2, "D"); assert.strictEqual(c.K2, "A, B, C, D");
  const r = await page.evaluate(() => ({ ac: CM_RULES().rows[0].ac, src: CM_RULES().src }));
  assert.strictEqual(r.ac, "D"); assert.strictEqual(r.src, "sheet");
}, MP);

test("switch_off_keeps_the_row_out_of_the_check", async ({ page }) => {
  await open(page);
  const n0 = await page.evaluate(() => CM_RULES().rows.length);
  await page.click("#cmxWrap tr[data-cmr='1'] td:first-child", { button: "right" });
  await page.evaluate(() => [...document.querySelectorAll("#opsCtx button")].find(b => /Switch off/.test(b.textContent)).click());
  const r = await page.evaluate(() => ({ n: CM_RULES().rows.length, all: CM_RULES().all.length, off: document.querySelector("#cmxWrap tr[data-cmr='1']").classList.contains("roff") }));
  const c = await sheet(page);
  assert.strictEqual(r.n, n0 - 1); assert.strictEqual(r.all, n0); assert.ok(r.off); assert.strictEqual(c.J3, "Off");
}, MP);

test("copy_move_remove_rows", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(() => { const n0 = cmList().length; cmAct(0, "dup"); const a = cmList().length; cmAct(0, "down"); cmAct(1, "del"); return { n0, a, b: cmList().length }; });
  assert.strictEqual(r.a, r.n0 + 1); assert.strictEqual(r.b, r.n0);
}, MP);

test("add_mission_bad_until_filled", async ({ page }) => {
  await open(page);
  await page.click("#cmAddM");
  const j = await page.evaluate(() => cmList().length - 1);
  let bad = await page.evaluate(j => document.querySelector("#cmxWrap tr[data-cmr='" + j + "']").classList.contains("cmbad"), j);
  assert.ok(bad, "a row with no mission is red");
  await page.fill("#cmxWrap tr[data-cmr='" + j + "'] input[data-f='m']", "SAR"); await page.press("#cmxWrap tr[data-cmr='" + j + "'] input[data-f='m']", "Tab");
  await page.selectOption("#cmxWrap tr[data-cmr='" + j + "'] select[data-f='ac']", "B");
  const r = await page.evaluate(j => ({ bad: document.querySelector("#cmxWrap tr[data-cmr='" + j + "']").classList.contains("cmbad"), used: CM_RULES().rows.some(x => x.m === "SAR" && x.ac === "B") }), j);
  assert.ok(!r.bad && r.used, JSON.stringify(r));
}, MP);

test("cat_order_change_refuses_a_used_cat", async ({ page }) => {
  await open(page);
  await page.fill("#cmCats", "A, B, C"); await page.press("#cmCats", "Tab");
  const r = await page.evaluate(() => CM_RULES().cats.join(","));
  assert.strictEqual(r, "A,B,C,D", "D still used");
  await page.fill("#cmCats", "A, B, C, D, E"); await page.press("#cmCats", "Tab");
  assert.strictEqual(await page.evaluate(() => CM_RULES().cats.join(",")), "A,B,C,D,E");
}, MP);

test("departments_see_the_read_only_view", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(() => ({ sel: document.querySelectorAll("#cmxWrap select").length, txt: document.getElementById("cmxWrap").textContent }));
  assert.strictEqual(r.sel, 0); assert.ok(/Crew matrix/.test(r.txt));
}, DEPT);

(async () => {
  const only = process.argv[2]; let pass = 0, ran = 0, S = null;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue; ran++;
    try { if (!S || (t.opts && t.opts.fresh)) { if (S) await S.close(); S = await boot(Object.assign({}, t.opts)); } await t.fn(S); if (S.errs.length) throw new Error(S.errs.join(" | ")); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 300)); if (S) { await S.close(); S = null; } }
  }
  if (S) await S.close(); console.log(pass + "/" + ran + " pass"); process.exit(pass === ran ? 0 : 1);
})();
