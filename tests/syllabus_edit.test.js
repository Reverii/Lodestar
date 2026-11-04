// Syllabus editor (z154): the Syllabus Items sheet edited on the dashboard. Build the dashboard first.
// Uses the repo's demo set (or LODE_FILES); nothing is saved to disk: the saved bytes are re-read in the page.
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const openEd = async (page, stage) => {
  await page.evaluate(() => document.querySelector("nav.tabs button[data-v='syl']").click());
  await page.click("[data-syeopen]");
  if (stage) await page.click("[data-syestg='" + stage + "']");
};
const items = page => page.evaluate(() => S.sylDef.items.map(i => ({ st: i.stage, tr: i.track, o: i.order, c: i.code, d: i.desc, ty: i.type, r: i._r })));
const dirtyItems = page => page.evaluate(() => [...dirty.entries()].filter(([k]) => /^Syllabus Items!/.test(k)).map(([k, v]) => k.split("!")[1] + "=" + v.val));
// save in memory and re-read the file the way a fresh open would
const roundTrip = page => page.evaluate(() => { const bk = books[cur.b], bytes = logBuild(bk, new Map(bk.dirty)).bytes; bk.dirty = new Map(); reparseBook(cur.b, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)); useBook(cur.b);
  return S.sylDef.items.map(i => ({ st: i.stage, tr: i.track, o: i.order, c: i.code, d: i.desc, ty: i.type, ch: i.ch, r: i._r })); });

test("button_opens_the_editor", async ({ page }) => {
  await openEd(page, "CAT D");
  const t = await page.evaluate(() => document.querySelector(".syecard").innerText);
  assert.ok(/CAT D stage/.test(t) && /TTX/.test(t) && /Flight/.test(t), t.slice(0, 200));
  const n = await page.evaluate(() => document.querySelectorAll(".syetab tr:not(.trk):not(.add)").length - 1);
  assert.strictEqual(n, 14);
});
test("rename_description_writes_one_cell", async ({ page }) => {
  await openEd(page, "CAT D");
  const r = await page.evaluate(() => S.sylDef.items.find(i => i.code === "S2-C-FLT2")._r);
  const el = await page.$("tr:has(input[value='S2-C-FLT2']) input[data-syef='desc']");
  await el.fill("Flight 2 (night)"); await el.press("Tab"); await page.waitForTimeout(50);
  assert.deepStrictEqual(await dirtyItems(page), ["E" + r + "=Flight 2 (night)"]);
  assert.strictEqual(await page.evaluate(() => document.activeElement.dataset.syef), "type", "focus moved on to the next field");
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll(".syetab tr.chg").length), 1);
});
test("add_item_takes_the_next_free_row_and_suggests_a_code", async ({ page }) => {
  await openEd(page, "CAT D");
  const next = await page.evaluate(() => S.sylDef.next);
  await page.click("[data-syeadd='Flight']");
  await page.keyboard.type("Night flight 4"); await page.keyboard.press("Enter"); await page.waitForTimeout(50);
  const it = (await items(page)).find(i => i.d === "Night flight 4");
  assert.deepStrictEqual([it.st, it.tr, it.o, it.c, it.ty, it.r], ["CAT D", "Flight", 5, "S2-C-FLT4", "Flight", next], JSON.stringify([it, next]));
  const after = await roundTrip(page);
  assert.ok(after.some(i => i.c === "S2-C-FLT4" && i.d === "Night flight 4" && i.st === "CAT D" && i.o === 5), "saved and read back");
});
test("duplicate_code_is_red_and_not_written", async ({ page }) => {
  await openEd(page, "CAT D");
  await page.click("[data-syeadd='Flight']"); await page.keyboard.type("Night flight 4"); await page.keyboard.press("Enter"); await page.waitForTimeout(50);
  const c = await page.$("tr.new input[data-syef='code']"); await c.fill("s2-c-flt3"); await c.press("Enter"); await page.waitForTimeout(50);
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll(".syetab tr.bad").length), 1);
  assert.ok(/not saved until fixed/.test(await page.evaluate(() => document.querySelector(".syefoot").innerText)));
  const after = await roundTrip(page);
  assert.strictEqual(after.filter(i => /^s2-c-flt3$/i.test(i.c)).length, 1, "only the original S2-C-FLT3 is in the file");
  assert.ok(!after.some(i => i.d === "Night flight 4"));
});
test("locked_code_has_no_input_and_cannot_be_removed", async ({ page }) => {
  await openEd(page, "CAT D");
  const r = await page.evaluate(() => { const used = S.syl.map(x => x.code); const it = S.sylDef.items.find(i => used.includes(i.code) && i.stage === "CAT D"); const tr = [...document.querySelectorAll(".syetab tr")].find(t => t.innerText.includes(it.code));
    return { code: it.code, input: !!tr.querySelector("input[data-syef='code']"), lock: !!tr.querySelector(".syelk"), del: tr.querySelector("[data-syedel]").disabled }; });
  assert.deepStrictEqual([r.input, r.lock, r.del], [false, true, true], r.code);
});
test("remove_clears_the_row_and_renumbers", async ({ page }) => {
  await openEd(page, "CAT D");
  const r = await page.evaluate(() => S.sylDef.items.find(i => i.code === "S2-C-FLT2")._r);
  await page.click("tr:has(input[value='S2-C-FLT2']) [data-syedel]");
  const fl = (await items(page)).filter(i => i.st === "CAT D" && i.tr === "Flight").sort((a, b) => a.o - b.o).map(i => i.c + ":" + i.o);
  assert.deepStrictEqual(fl, ["S2-C-FLT1:1", "S2-C-FLT3:2", "S2-C-FLTCHK:3"]);
  const after = await roundTrip(page);
  assert.ok(!after.some(i => i.c === "S2-C-FLT2"), "removed"); assert.ok(!after.some(i => i.r === r), "row left empty");
  assert.ok(after.some(i => i.c === "S2-C-FLTCHK" && i.o === 3), "orders saved");
  assert.ok(after.some(i => i.st === "CAT C"), "items after the empty row are still read");
});
test("move_down_swaps_order", async ({ page }) => {
  await openEd(page, "CAT D");
  await page.click("tr:has(input[value='S2-C-SIM3']) [data-syemv='1']");
  const s = (await items(page)).filter(i => i.st === "CAT D" && i.tr === "Sims").sort((a, b) => a.o - b.o).map(i => i.c);
  assert.deepStrictEqual(s, ["S2-C-SIM1", "S2-C-SIM2", "S2-C-SIMCHK", "S2-C-SIM3"]);
  assert.strictEqual((await dirtyItems(page)).length, 2, "two order cells");
});
test("new_track_in_the_empty_cat_a_stage", async ({ page }) => {
  await openEd(page, "CAT A");
  assert.ok(/no items yet/i.test(await page.evaluate(() => document.querySelector(".syecard").innerText)));
  await page.click("[data-syetrack]");
  await page.keyboard.type("Ground school"); await page.keyboard.press("Enter"); await page.waitForTimeout(50);
  const it = (await items(page)).find(i => i.st === "CAT A");
  assert.deepStrictEqual([it.tr, it.c, it.ty], ["Ground school", "S2-A-GND1", "Ground"]);
  await page.click("[data-syeadd='Ground school']"); await page.keyboard.type("Briefing"); await page.keyboard.press("Enter"); await page.waitForTimeout(50);
  const after = await roundTrip(page);
  assert.deepStrictEqual(after.filter(i => i.st === "CAT A").map(i => i.c + ":" + i.o), ["S2-A-GND1:1", "S2-A-GND2:2"]);
});
test("undo_brings_the_item_back", async ({ page }) => {
  await openEd(page, "CAT D");
  const n = (await items(page)).length;
  await page.click("tr:has(input[value='S2-C-FLT2']) [data-syedel]");
  await page.waitForTimeout(300);
  await page.evaluate(() => undo());
  assert.strictEqual((await items(page)).length, n);
  assert.ok(await page.evaluate(() => !!document.querySelector(".syetab input[value='S2-C-FLT2']")), "editor redrawn");
});
test("default_chances_writes_settings_b6", async ({ page }) => {
  await openEd(page, "CAT D");
  const el = await page.$("[data-syeset='B6']"); await el.fill("4"); await el.press("Enter"); await page.waitForTimeout(50);
  const v = await page.evaluate(() => [S.sylDef.defCh, (dirty.get("Syllabus Settings!B6") || {}).val]);
  assert.deepStrictEqual(v, [4, 4]);
});
test("view_only_file_has_no_button", async ({ page }) => {
  await page.evaluate(() => { books[cur.b].noEdit = true; document.querySelector("nav.tabs button[data-v='syl']").click(); });
  assert.strictEqual(await page.evaluate(() => !!document.querySelector("[data-syeopen]")), false);
});
test("done_goes_back_to_the_tree", async ({ page }) => {
  await openEd(page, "CAT D");
  await page.click("[data-syedone]");
  assert.ok(await page.evaluate(() => !!document.getElementById("sylTree")));
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
