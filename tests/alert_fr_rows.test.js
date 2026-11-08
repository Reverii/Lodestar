// Planner rows (z184 / z185): SQUADRON PROGRAMME label, ALERT row = the alert state the Master Planner sets (Alert States sheet),
// FLYING RESTRICTION row from the Ops Room, and the slim rows. Build first: python3 .lodestar_build.py dashboard
// Run: node tests/alert_fr_rows.test.js [--shot]
const assert = require("assert");
const path = require("path");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const planNov = page => page.evaluate(() => { useBook(Math.max(books.findIndex(b => b.S.dept === "SUP 2"), books.findIndex(b => isDept(b)))); cur.m = 10; renderControls(); document.querySelector("nav.tabs button[data-v='plan']").click(); renderPlanner(); });
const alertRow = page => page.evaluate(() => [...document.querySelectorAll("tr.alrow td.c")].map(c => c.textContent));

test("squadron_programme_label_and_row_order", async ({ page }) => {
  await planNov(page);
  assert.strictEqual(await page.textContent("tr.gndrow td.gndlab"), "SQUADRON PROGRAMME");
  assert.deepStrictEqual(await page.evaluate(() => [...document.querySelectorAll("tr.gndrow, tr.alrow, tr.frrow, tr.sdorow")].map(r => r.className)), ["gndrow", "alrow", "frrow", "sdorow"]);
});
test("rows_are_slim", async ({ page }) => {
  await planNov(page);
  const h = await page.evaluate(() => ["gndrow", "alrow", "frrow", "sdorow"].map(c => document.querySelector("tr." + c).getBoundingClientRect().height));
  const tot = h.reduce((a, b) => a + b, 0); console.log("     row heights " + h.map(x => x.toFixed(1)).join(" + ") + " = " + tot.toFixed(1));
  assert.ok(tot <= 80, "the four rows take " + tot + " px");
});
test("alert_state_set_from_the_master_planner_shows_on_the_planner", async ({ page }) => {
  await page.evaluate(() => { document.querySelector("nav.tabs button[data-v='mp']").click(); cur.mpM = 10; cur.mpDay = 4; renderMp(); });   // Thu 5 Nov
  assert.strictEqual(await page.inputValue("#alFrom"), "2026-11-02"); assert.strictEqual(await page.inputValue("#alTo"), "2026-11-08");
  await page.fill("#alLevel", "al90"); await page.click("[data-alset]");
  assert.ok(/AL90/.test(await page.textContent("#mpSide")));
  await page.evaluate(() => { cur.mpDay = 9; renderMp(); });   // Tue 10 Nov: the next week
  await page.fill("#alLevel", "AL2"); await page.click("[data-alset]");
  await planNov(page);
  const r = await alertRow(page);
  assert.deepStrictEqual(r.slice(0, 16), ["", "AL90", "AL90", "AL90", "AL90", "AL90", "AL90", "AL90", "AL2", "AL2", "AL2", "AL2", "AL2", "AL2", "AL2", ""]);
  const x = await page.evaluate(() => withBook(mpIdx(), () => { const out = buildXlsx(), t = td.decode(out.files[WB.paths[AL_SHEET]]); return t.includes("AL90") && t.includes("AL2") && t.includes("Level"); }));
  assert.ok(x, "saved in the Alert States sheet");
}, { mine: "Master_Planner", fresh: true });
test("a_shorter_entry_overrides_and_remove_works", async ({ page }) => {
  await page.evaluate(() => { document.querySelector("nav.tabs button[data-v='mp']").click(); cur.mpM = 10; cur.mpDay = 4; renderMp(); });
  await page.fill("#alLevel", "AL90"); await page.click("[data-alset]");
  await page.click("[data-alq='d']"); await page.fill("#alFrom", "2026-11-05"); await page.fill("#alTo", "2026-11-05"); await page.fill("#alLevel", "AL2"); await page.click("[data-alset]");
  await planNov(page); let r = await alertRow(page); assert.deepStrictEqual(r.slice(1, 8), ["AL90", "AL90", "AL90", "AL2", "AL90", "AL90", "AL90"]);
  await page.evaluate(() => { window.confirm = () => true; document.querySelector("nav.tabs button[data-v='mp']").click(); cur.mpDay = 4; renderMp(); });
  await page.click("[data-alx]"); await planNov(page); r = await alertRow(page); assert.strictEqual(r[4], "AL90");
}, { mine: "Master_Planner", fresh: true });
test("start_new_year_clears_alert_states", async ({ page }) => {   // z202: old entries go, one running into the new year stays
  const t = await page.evaluate(() => { alSave({ level: "AL90", from: "2026-11-02", to: "2026-11-08" }); alSave({ level: "AL2", from: "2026-12-28", to: "2027-01-03" });
    const bi = mpIdx(); let bytes; withBook(bi, () => { bytes = buildXlsx().bytes; }); reparseBook(bi, bytes);
    const rows = books[bi].S.al.map(e => e.level + "@" + e.row), r = rollBook(bi, books[bi].S.year, []);
    return { rows, xml: td.decode(r.files[books[bi].WB.paths[AL_SHEET]]), notes: r.notes }; });
  assert.deepStrictEqual(t.rows, ["AL90@2", "AL2@3"], "both saved");
  assert.ok(/<c r="C2"[^>]*\/>/.test(t.xml) && !/AL90/.test(t.xml), "the old year's entry is cleared");
  assert.ok(/AL2/.test(t.xml) && /Level/.test(t.xml), "the entry running into 2027 and the heading stay");
  assert.ok(t.notes.some(n => /1 alert state running into 2027 kept/.test(n)), t.notes.join(" | "));
}, { mine: "Master_Planner", fresh: true });
test("department_view_cannot_set_it", async ({ page }) => {
  await page.evaluate(() => { books[mpIdx()].S.al = [{ row: 2, from: "2026-11-02", to: "2026-11-08", level: "AL90", by: "" }]; document.querySelector("nav.tabs button[data-v='mp']").click(); cur.mpM = 10; cur.mpDay = 4; renderMp(); });
  assert.strictEqual(await page.locator("#alLevel").count(), 0); assert.ok(/AL90/.test(await page.textContent("#mpSide")));
  assert.strictEqual(await page.evaluate(() => alSave({ level: "AL2", from: "2026-11-05" })), false);
  await planNov(page); assert.strictEqual((await alertRow(page))[5], "AL90");
}, { mine: "Flight_Ops_Planner_SUP2", fresh: true });
test("restriction_row_covers_its_days", async ({ page }) => {
  await page.evaluate(() => { books[opsIdx()].S.fr = [{ row: 2, from: "2026-11-05", to: "2026-11-07", text: "Eastern area closed", by: "" }]; });
  await planNov(page);
  const r = await page.evaluate(() => [...document.querySelectorAll("tr.frrow td.c")].map(c => c.classList.contains("on")));
  assert.deepStrictEqual([3, 4, 5, 6, 7].map(i => r[i]), [false, true, true, true, false]);
  assert.ok(/Eastern area closed/.test(await page.textContent("tr.frrow td.c.on")));
});
test("shot", async ({ page }) => {
  if (!process.argv.includes("--shot")) return;
  await page.evaluate(() => { books[mpIdx()].S.al = [{ row: 2, from: "2026-11-02", to: "2026-11-08", level: "AL90", by: "" }, { row: 3, from: "2026-11-09", to: "2026-11-15", level: "AL2", by: "" }]; books[opsIdx()].S.fr = [{ row: 2, from: "2026-11-05", to: "2026-11-07", text: "Eastern area closed", by: "" }]; });
  await planNov(page); await page.screenshot({ path: path.join(__dirname, "..", "previews", "alert_fr_rows.png") });
  await page.evaluate(() => { document.querySelector("nav.tabs button[data-v='mp']").click(); cur.mpM = 10; cur.mpDay = 4; renderMp(); });
}, { mine: "Flight_Ops_Planner_SUP2", today: "2026-11-06" });
(async () => {
  const only = process.argv.slice(2).find(a => !a.startsWith("--")); let pass = 0, fail = 0;
  for (const t of tests) { if (only && !t.name.includes(only)) continue;
    const o = Object.assign({ today: "2026-11-06" }, t.opts || {}); const b = await boot(o);
    if (o.mine === "Master_Planner") await b.page.evaluate(() => { devFull = true; });
    try { await t.fn(b); const e = b.errs.filter(x => !/DIALOG/.test(x)); assert.deepStrictEqual(e, []); pass++; console.log("ok   " + t.name); } catch (e) { fail++; console.log("FAIL " + t.name + ": " + e.message); }
    await b.close(); }
  console.log(pass + "/" + (pass + fail) + " pass"); process.exit(fail ? 1 : 0);
})();
