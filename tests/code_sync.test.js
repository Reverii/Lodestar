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

// ---- Task 2: add-only sync on save
const syncOf = page => page.evaluate(() => { const before = dirty.size; const t = (syncQuiet(), $("toast").textContent); return { t, grew: dirty.size - before, keys: [...dirty.keys()].filter(k => k.startsWith("Activities!")) }; });
test("save_adds_missing_code_to_activities", async ({ page }) => {
  const c = await pick(page), k = await page.evaluate(code => { const P = masterBook().S, m = P.codes.find(x => x.code.toUpperCase() === code.toUpperCase()); return { desc: m.desc, mtype: m.mtype || "" }; }, c.code);
  await dropAct(page, c.code);
  const r = await syncOf(page);
  const a = await page.evaluate(code => S.acts.find(x => x.code && x.code.toUpperCase() === code.toUpperCase()), c.code);
  assert.ok(a, "code is back in Activities"); assert.strictEqual(a.desc, k.desc); assert.strictEqual(a.mtype, k.mtype);
  assert.ok(r.keys.length >= 3, "A, B, C written: " + r.keys.join(",")); assert.ok(r.t.includes(c.code), r.t);
}, FRESH);
test("case_and_spaces_do_not_duplicate", async ({ page }) => {
  const c = await pick(page);
  await page.evaluate(code => { const a = S.acts.find(x => x.code && x.code.toUpperCase() === code.toUpperCase()); a.code = code.toLowerCase().replace(/\s+/g, ""); }, c.code);
  const r = await syncOf(page);
  const n = await page.evaluate(code => S.acts.filter(x => x.code && codeKey(x.code) === codeKey(code)).length, c.code);
  assert.strictEqual(n, 1); assert.ok(!r.keys.some(k => /^Activities!A/.test(k)), "no new code row: " + r.keys.join(","));
}, FRESH);
test("changed_description_is_updated_not_the_code", async ({ page }) => {
  const c = await pick(page);
  await page.evaluate(code => { masterBook().S.codes.find(x => x.code.toUpperCase() === code.toUpperCase()).desc = "Brand new words"; }, c.code);
  const r = await syncOf(page);
  const row = await page.evaluate(code => ACT_ROW0 + S.acts.findIndex(x => x.code && x.code.toUpperCase() === code.toUpperCase()), c.code);
  assert.deepStrictEqual(r.keys, ["Activities!B" + row]);
}, FRESH);
test("retired_code_stays", async ({ page }) => {
  const c = await pick(page);
  await page.evaluate(code => { const P = masterBook().S; P.codes = P.codes.filter(k => k.code.toUpperCase() !== code.toUpperCase()); }, c.code);
  const r = await syncOf(page);
  assert.ok(await page.evaluate(code => S.acts.some(x => x.code && x.code.toUpperCase() === code.toUpperCase()) && isFlightCode(S, code), c.code), "still in Activities and a flight");
  assert.strictEqual(r.keys.length, 0, "nothing written: " + r.keys.join(","));
}, FRESH);
test("ground_name_clash_left_alone", async ({ page }) => {
  await page.evaluate(() => { const gc = S.cats.findIndex((c, i) => c && i !== CAT_FLIGHT), slot = S.acts.find(a => !a.code); slot.code = "ZZG"; slot.cat = S.cats[gc]; slot.desc = "Ground";
    masterBook().S.codes.push({ code: "ZZG", desc: "x", crew: "", mtype: "" }); });
  const r = await syncOf(page);
  assert.strictEqual(await page.evaluate(() => S.acts.filter(a => a.code === "ZZG").length), 1); assert.ok(r.t.includes("ZZG"), r.t);
}, FRESH);
test("full_activities_does_not_block_save", async ({ page }) => {
  await page.evaluate(() => { S.acts.forEach((a, i) => { if (!a.code) { a.code = "FILL" + i; a.cat = S.cats[CAT_FLIGHT]; } }); masterBook().S.codes.push({ code: "ZZFULL", desc: "x", crew: "", mtype: "" }); window.alert = () => { throw new Error("alert"); }; });
  const r = await syncOf(page);
  assert.ok(r.t.includes("ZZFULL") && /full/i.test(r.t), r.t);
}, FRESH);
test("view_only_and_other_departments_do_not_sync", async ({ page }) => {
  const c = await pick(page); await dropAct(page, c.code);
  const r1 = await page.evaluate(() => { books[0].noEdit = true; const n = dirty.size; syncQuiet(); const x = dirty.size - n; books[0].noEdit = false; return x; });
  assert.strictEqual(r1, 0, "view only");
  const r2 = await page.evaluate(() => { const bi = books.findIndex(b => b.S.kind === "master"); useBook(bi); const n = dirty.size; syncQuiet(); const x = dirty.size - n; useBook(0); return x; });
  assert.strictEqual(r2, 0, "not a department file");
}, FRESH);
test("master_other_year_does_not_sync", async ({ page }) => {
  const c = await pick(page); await dropAct(page, c.code);
  const n = await page.evaluate(() => { masterBook().S.year += 1; const n0 = dirty.size; syncQuiet(); return dirty.size - n0; });
  assert.strictEqual(n, 0);
}, FRESH);
test("save_path_runs_the_sync", async ({ page }) => {
  const c = await pick(page); await dropAct(page, c.code);
  const got = await page.evaluate(async code => { await saveOwn(); const i = S.acts.findIndex(x => x.code && x.code.toUpperCase() === code.toUpperCase()); return { i, v: cellsAt(books[0], WB.files, "Activities")["A" + (ACT_ROW0 + i)] }; }, c.code);
  assert.ok(got.i >= 0); assert.strictEqual(String(got.v).toUpperCase(), c.code.toUpperCase());
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
