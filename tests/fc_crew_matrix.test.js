// Flight Codes: the Crew Matrix column (z195). Build first: python3 .lodestar_build.py dashboard. Run: node tests/fc_crew_matrix.test.js [filter]
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const MP = { mine: "Master_Planner", today: "2026-10-14", fresh: true };
const DEPT = { mine: "Flight_Ops_Planner_SUP2", today: "2026-10-14", fresh: true };
const open = page => page.evaluate(() => { window.confirm = () => true; document.querySelectorAll(".view").forEach(v => v.classList.remove("on")); document.getElementById("v-codes").classList.add("on"); renderCodes(); });
const fc = page => page.evaluate(() => withBook(mpIdx(), () => { const out = buildXlsx(); return readCellsOf(out.files, WB.paths["Flight Codes"], WB.sst || []); }));
const row = (page, code) => page.evaluate(code => books[mpIdx()].S.codeAll.findIndex(k => k.code === code), code);

test("column_shows_with_the_matrix_missions", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(() => ({ th: [...document.querySelectorAll("#codeTable th")].map(t => t.textContent), opts: [...document.querySelector("#codeTable select[data-f='cmx']").options].map(o => o.textContent) }));
  assert.ok(r.th.includes("Crew Matrix"), r.th.join("|"));
  assert.ok(r.opts.includes("MAS TRG") && r.opts.includes("Not checked") && /^Auto/.test(r.opts[0]), r.opts.join("|"));
}, MP);

test("blank_follows_the_mission_type", async ({ page }) => {
  const r = await page.evaluate(() => ({ eis: cmMission("EIS"), mt: books[mpIdx()].S.codes.find(k => k.code === "EIS").mtype }));
  assert.strictEqual(r.eis, r.mt);
}, MP);

test("picking_a_mission_saves_H_and_the_check_uses_it", async ({ page }) => {
  await open(page); const i = await row(page, "EIS");
  await page.selectOption("#codeTable select[data-fc='" + i + "'][data-f='cmx']", "MAS TRG");
  const c = await fc(page), m = await page.evaluate(() => cmMission("EIS"));
  assert.strictEqual(c["H" + (6 + i)], "MAS TRG"); assert.strictEqual(c.H5, "Crew Matrix"); assert.strictEqual(m, "MAS TRG");
  await page.evaluate(() => { document.querySelectorAll(".view").forEach(v => v.classList.remove("on")); document.getElementById("v-cmx").classList.add("on"); renderCmx(); });
  const t = await page.evaluate(() => document.querySelector("#cmxWrap .cmxcodes").textContent);
  assert.ok(/MAS TRG: [^·]*EIS/.test(t), t);
}, MP);

test("not_checked_skips_the_code", async ({ page }) => {
  await open(page); const i = await row(page, "MAS TRG");
  await page.selectOption("#codeTable select[data-fc='" + i + "'][data-f='cmx']", "-");
  const c = await fc(page), m = await page.evaluate(() => cmMission("MAS TRG"));
  assert.strictEqual(c["H" + (6 + i)], "-"); assert.strictEqual(m, "");
}, MP);

test("remove_moves_the_column_up_too", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(() => { const P = books[mpIdx()].S, i = P.codeAll.findIndex(k => !k.code); withBook(mpIdx(), () => { put("Flight Codes", "A" + (6 + i), "ZZ1"); put("Flight Codes", "A" + (7 + i), "ZZ2"); put("Flight Codes", "H" + (7 + i), "MAS TRG");
    Object.assign(S.codeAll[i], { code: "ZZ1" }); Object.assign(S.codeAll[i + 1], { code: "ZZ2", cmx: "MAS TRG" }); mkCodes(S); }); fcRemove(i); return { i, k: P.codeAll[i].code, cmx: P.codeAll[i].cmx }; });
  const c = await fc(page);
  assert.strictEqual(r.k, "ZZ2"); assert.strictEqual(r.cmx, "MAS TRG"); assert.strictEqual(c["H" + (6 + r.i)], "MAS TRG"); assert.ok(!c["H" + (7 + r.i)]);
}, MP);

test("departments_see_it_read_only", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(() => [...document.querySelectorAll("#codeTable select[data-f='cmx']")].every(s => s.disabled));
  assert.ok(r);
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
