// Flying Restriction banner (z124): Ops Room banner, add / edit / remove, Master Planner day panel and calendar tag. Build first: python3 .lodestar_build.py dashboard
// Run: node tests/flying_restriction.test.js [name-filter]
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const RO = { mine: "Flight_Ops_Planner_SUP2" };   // a department view (Ops Room file read-only)
const ED = { mine: "Ops_Room", fresh: true };     // the Ops Room view (everything editable)
const DAY = "2026-10-14";
const goOps = (page, iso) => page.evaluate(iso => { cur.opsDay = iso; document.querySelector("nav.tabs button[data-v='ops']").click(); renderOps(); }, iso);
const banner = page => page.evaluate(() => [...document.querySelectorAll("#opsFr .frb")].map(x => x.querySelector(".fm").textContent));
const add = (page, o) => page.evaluate(o => frSave(o), o);

test("no_banner_without_restriction", async ({ page }) => { await goOps(page, DAY); assert.deepStrictEqual(await banner(page), []); assert.strictEqual(await page.evaluate(() => getComputedStyle(document.getElementById("opsFr")).display), "none"); }, ED);
test("shows_only_inside_the_date_range", async ({ page }) => {
  assert.ok(await add(page, { from: "2026-10-13", to: "2026-10-15", text: "No low flying" }));
  for (const [d, n] of [["2026-10-12", 0], ["2026-10-13", 1], ["2026-10-14", 1], ["2026-10-15", 1], ["2026-10-16", 0]]) { await goOps(page, d); assert.strictEqual((await banner(page)).length, n, d); }
}, ED);
test("empty_to_means_one_day_and_banners_stack", async ({ page }) => {
  await add(page, { from: "2026-10-14", text: "Night flying cancelled" }); await add(page, { from: "2026-10-14", to: "2026-10-20", text: "No low flying" });
  await goOps(page, "2026-10-14"); assert.deepStrictEqual(await banner(page), ["Night flying cancelled", "No low flying"]);
  await goOps(page, "2026-10-15"); assert.deepStrictEqual(await banner(page), ["No low flying"]);
  assert.ok(/this day only/.test(await page.evaluate(() => { cur.opsDay = "2026-10-14"; renderOps(); return document.getElementById("opsFr").textContent; })));
}, ED);
test("bad_input_is_refused", async ({ page }) => {
  assert.strictEqual(await add(page, { from: "2026-10-14", text: "  " }), false); assert.strictEqual(await add(page, { from: "2026-10-14", to: "2026-10-10", text: "x" }), false); assert.strictEqual(await add(page, { text: "x" }), false);
}, ED);
test("dialog_adds_from_the_ops_room", async ({ page }) => {
  await goOps(page, DAY); await page.click("#opsFrBtn");
  assert.strictEqual(await page.inputValue("#frFrom"), DAY);
  await page.fill("#frText", "Runway works"); await page.click("#frQ b[data-n='1']"); assert.strictEqual(await page.inputValue("#frTo"), "2026-10-15");
  await page.click("#frGo"); assert.deepStrictEqual(await banner(page), ["Runway works"]);
  assert.strictEqual(await page.evaluate(() => document.getElementById("frPop").style.display), "none");
}, ED);
test("dialog_asks_for_text", async ({ page }) => {
  await goOps(page, DAY); await page.click("#opsFrBtn"); await page.click("#frGo");
  assert.ok(/Type the restriction/.test(await page.textContent("#frMsg"))); assert.strictEqual(await page.evaluate(() => document.getElementById("frPop").style.display), "flex");
}, ED);
test("edit_and_remove_from_the_banner", async ({ page }) => {
  await add(page, { from: DAY, text: "First" }); await goOps(page, DAY);
  await page.click("#opsFr button[data-fre]"); assert.strictEqual(await page.inputValue("#frText"), "First");
  await page.fill("#frText", "Changed"); await page.click("#frGo"); assert.deepStrictEqual(await banner(page), ["Changed"]);
  await page.evaluate(() => { window.confirm = () => true; }); await page.click("#opsFr button[data-frx]"); assert.deepStrictEqual(await banner(page), []);
}, ED);
test("save_writes_the_sheet", async ({ page }) => {
  await add(page, { from: DAY, to: "2026-10-16", text: "Saved text" });
  const r = await page.evaluate(() => { const oi = opsIdx(); return withBook(oi, () => { const out = buildXlsx(), x = td.decode(out.files[WB.paths[FR_SHEET]]); return { has: !!WB.paths[FR_SHEET], text: x.includes("Saved text"), head: x.includes("Added by"), rows: (x.match(/<row r="\d+"/g) || []).length }; }); });
  assert.ok(r.has && r.text && r.head && r.rows === 2, JSON.stringify(r));
}, ED);
test("read_only_view_shows_banner_without_buttons", async ({ page }) => {
  await page.evaluate(() => { const ob = books[opsIdx()]; ob.S.fr = [{ row: 2, from: "2026-10-14", to: "2026-10-14", text: "Read only", by: "" }]; });
  await goOps(page, DAY); assert.deepStrictEqual(await banner(page), ["Read only"]); assert.strictEqual(await page.locator("#opsFr button").count(), 0);
  assert.strictEqual(await page.evaluate(() => frSave({ from: "2026-10-14", text: "x" })), false);
}, Object.assign({ fresh: true }, RO));
const goMp = (page, mi, d) => page.evaluate(([mi, d]) => { document.querySelector("nav.tabs button[data-v='mp']").click(); cur.mpM = mi; cur.mpDay = d; renderMp(); }, [mi, d]);
test("master_planner_panel_and_calendar_tag", async ({ page }) => {
  await add(page, { from: "2026-10-14", to: "2026-10-15", text: "Eastern area closed" });
  await goMp(page, 9, 13);
  assert.ok(/Eastern area closed/.test(await page.textContent("#mpSide .fri")), "listed in the day panel");
  assert.strictEqual(await page.locator("#mpCal .frtag").count(), 2, "tag on both days");
  assert.strictEqual(await page.locator("#mpSide button[data-fradd]").count(), 1);
  await page.click("#mpSide button[data-fradd]"); assert.strictEqual(await page.inputValue("#frFrom"), "2026-10-14");
  await page.fill("#frText", "From the Master Planner"); await page.click("#frGo");
  assert.strictEqual(await page.locator("#mpSide .fri").count(), 2);
}, ED);
test("master_planner_read_only_note", async ({ page }) => {
  await page.evaluate(() => { books[opsIdx()].S.fr = [{ row: 2, from: "2026-10-14", to: "2026-10-14", text: "Seen", by: "" }]; });
  await goMp(page, 9, 13); assert.ok(/Seen/.test(await page.textContent("#mpSide .fri")));
  assert.strictEqual(await page.locator("#mpSide button[data-fradd]").count(), 0); assert.ok(/Ops Room/.test(await page.textContent("#mpSide")));
}, Object.assign({ fresh: true }, RO));

(async () => {
  const only = process.argv[2]; let pass = 0, ran = 0, S = null;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue; ran++;
    try { if (!S || (t.opts && t.opts.fresh)) { if (S) await S.close(); S = await boot(Object.assign({}, t.opts)); } await t.fn(S); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 300)); if (S) { await S.close(); S = null; } }
  }
  if (S) await S.close(); console.log(pass + "/" + ran + " pass"); process.exit(pass === ran ? 0 : 1);
})();
