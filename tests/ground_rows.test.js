// Ops Room ground programme: the Ground Rows sheet (edits, hidden rows, manual rows). Build first: python3 .lodestar_build.py dashboard
// Run: node tests/ground_rows.test.js [name-filter]
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const RO = { mine: "Flight_Ops_Planner_SUP2" };   // a department view (Ops Room file read-only)
const ED = { mine: "Ops_Room" };                    // the Ops Room view (everything editable)
const DAY = "2026-10-14";
const SQ_ADD = (page, o) => page.evaluate(([iso, o]) => { const mb = masterBook(), D = opsDay(iso); mb.S.gr.push(Object.assign({ row: 950, mi: D.mi, d: D.d, time: "", act: "X", crew: "", note: "" }, o)); mb.S.grUsed.add(950); cur.opsDay = iso; renderOps(); }, [DAY, o]);
const ROWS = page => page.evaluate(() => [...document.querySelectorAll("#opsSide .gtab tbody tr")].map(r => ({ time: r.cells[0].textContent.trim(), act: (c => { c.querySelectorAll(".gbt").forEach(x => x.remove()); return c.textContent.trim(); })(r.cells[1].cloneNode(true)), loc: r.cells[2].textContent.trim(), who: r.cells[3].textContent.trim(), text: r.innerText })));
const ROW = async (page, act) => (await ROWS(page)).find(r => r.act.includes(act));
const ID = (page, act) => page.evaluate(([iso, act]) => opsGround(opsDay(iso)).find(r => r.act === act).id, [DAY, act]);
const SAVE = (page, id, kind, f) => page.evaluate(([iso, id, kind, f]) => { const ok = grrSave(iso, id, kind, f); cur.opsDay = iso; renderOps(); return ok; }, [DAY, id, kind, f]);
const CELL = (page, ref) => page.evaluate(ref => { const e = dirty.get("Ground Rows!" + ref) || [...books.map(b => b.dirty.get("Ground Rows!" + ref))].find(Boolean); return e ? e.val : undefined; }, ref);

test("edit_saves_only_changed_fields", async ({ page }) => {
  await SQ_ADD(page, { act: "Safety Brief", time: "0730-0800", note: "Room A", crew: "S1" });
  const id = await ID(page, "Safety Brief"); assert.strictEqual(await SAVE(page, id, "edit", { note: "Room B" }), true);
  const r = await ROW(page, "Safety Brief"); assert.strictEqual(r.loc, "Room B"); assert.strictEqual(r.time, "0730H-0800H"); assert.ok(r.who.includes("SUP 1"), r.who);
  assert.strictEqual(await CELL(page, "F2"), "Room B"); assert.strictEqual(await CELL(page, "D2"), ""); assert.strictEqual(await CELL(page, "E2"), ""); assert.strictEqual(await CELL(page, "G2"), ""); assert.strictEqual(await CELL(page, "C2"), "edit");
}, ED);
test("edit_survives_reload", async ({ page }) => {
  await SQ_ADD(page, { act: "Safety Brief", time: "0730-0800", note: "Room A", crew: "S1" });
  await SAVE(page, await ID(page, "Safety Brief"), "edit", { note: "Room B" });
  await page.evaluate(() => { const oi = opsIdx(); let bytes; withBook(oi, () => { bytes = buildXlsx().bytes; }); reparseBook(oi, bytes); renderOps(); });
  assert.strictEqual((await ROW(page, "Safety Brief")).loc, "Room B");
}, ED);
test("hide_and_unhide", async ({ page }) => {
  await SQ_ADD(page, { act: "Safety Brief", time: "0730-0800", crew: "S1" });
  const id = await ID(page, "Safety Brief"); await SAVE(page, id, "hide", {});
  assert.strictEqual(await ROW(page, "Safety Brief"), undefined);
  assert.strictEqual(await page.evaluate(iso => opsGround(opsDay(iso)).hidden.length, DAY), 1);
  await page.evaluate(([iso, id]) => { grrUnhide(iso, id); renderOps(); }, [DAY, id]);
  assert.ok(await ROW(page, "Safety Brief"), "back after unhide");
}, ED);
test("manual_row_requires_fields", async ({ page }) => {
  const bad = await SAVE(page, "m1", "manual", { time: "0900", act: "Fire drill", note: "", who: "" });
  assert.strictEqual(bad, false); assert.strictEqual(await CELL(page, "B2"), undefined, "nothing written");
  assert.strictEqual(await SAVE(page, "m1", "manual", { time: "0900", act: "Fire drill", note: "Hangar", who: "ALL" }), true);
  const r = await ROW(page, "Fire drill"); assert.ok(r && r.who.includes("ALL RELEVANT PERSONNEL") && r.loc === "Hangar" && r.time === "0900H", JSON.stringify(r) + JSON.stringify(await ROWS(page)));
}, ED);
test("manual_row_with_names", async ({ page }) => {
  const who = await page.evaluate(() => { const p = books.find(b => isDept(b) && same(b.S.dept, "Pilot")).S.roster.find(p => p.name || p.id); return p.ini || p.id; });
  await SAVE(page, "m2", "manual", { time: "1000", act: "Brief", note: "", who });
  const r = await ROW(page, "Brief"); assert.ok(r.who.includes(who) && r.who.includes("Pilot"), r.who);
}, ED);
test("orphan_shows_as_manual", async ({ page }) => {
  await SQ_ADD(page, { act: "Safety Brief", time: "0730-0800", note: "Room A", crew: "S1" });
  await SAVE(page, await ID(page, "Safety Brief"), "edit", { note: "Room B" });
  await page.evaluate(() => { masterBook().S.gr.find(g => g.row === 950).act = "Safety Stand-down"; renderOps(); });
  const rows = await ROWS(page), o = rows.find(r => r.loc === "Room B");
  assert.ok(o && /was linked/.test(o.text), JSON.stringify(rows));
  assert.strictEqual(await CELL(page, "F2"), "Room B", "the override is still in the sheet");
}, ED);
test("change_log_gets_the_sheet", async ({ page }) => {
  await SAVE(page, "m3", "manual", { time: "1100", act: "Drill", note: "", who: "ALL" });
  const t = await page.evaluate(() => { let z; withBook(opsIdx(), () => { const f = fflate.unzipSync(buildXlsx().bytes), td = new TextDecoder(); z = Object.keys(f).filter(k => /worksheets\/sheet\d+\.xml$/.test(k)).map(k => td.decode(f[k])).join("\n"); z += td.decode(f["xl/workbook.xml"]); }); return z; });
  assert.ok(t.includes("Ground Rows"), "the Ground Rows sheet is in the saved workbook");
}, ED);

// ---- the controls on the card
const OPEN = page => page.evaluate(iso => { cur.opsDay = iso; document.querySelector("nav.tabs button[data-v='ops']").click(); renderOps(); }, DAY);
const rowLoc = (page, act) => page.locator("#opsSide .gtab tbody tr", { hasText: act });
test("pencil_edit_flow", async ({ page }) => {
  await SQ_ADD(page, { act: "Safety Brief", time: "0730-0800", note: "Room A", crew: "S1" }); await OPEN(page);
  await rowLoc(page, "Safety Brief").hover(); await rowLoc(page, "Safety Brief").locator(".gedit").click();
  await page.fill("#grLoc", "Room C"); await page.click("#grGo");
  assert.strictEqual((await ROW(page, "Safety Brief")).loc, "Room C"); assert.strictEqual(await CELL(page, "F2"), "Room C"); assert.strictEqual(await CELL(page, "D2"), "");
}, ED);
test("hide_flow", async ({ page }) => {
  await SQ_ADD(page, { act: "Safety Brief", time: "0730-0800", crew: "S1" }); await OPEN(page);
  await rowLoc(page, "Safety Brief").hover(); await rowLoc(page, "Safety Brief").locator(".ghide").click();
  assert.strictEqual(await ROW(page, "Safety Brief"), undefined);
  assert.strictEqual((await page.locator(".ghidlink").textContent()).trim(), "hidden (1)");
  await page.click(".ghidlink"); await page.click(".gunhide"); assert.ok(await ROW(page, "Safety Brief"), "back after Unhide");
}, ED);
test("add_manual_flow", async ({ page }) => {
  await OPEN(page); await page.click("#grAddBtn");
  await page.fill("#grTime", "0900"); await page.fill("#grAct", "Fire drill"); await page.click("#grGo");
  assert.ok((await page.textContent("#grMsg")).includes("Choose who"), "asks for people"); assert.strictEqual(await page.isVisible("#grPop"), true, "dialog stays open");
  await page.locator("#grWho input[data-gp]").nth(0).check(); await page.locator("#grWho input[data-gp]").nth(1).check(); await page.click("#grGo");
  const r = await ROW(page, "Fire drill"); assert.ok(r && r.time === "0900H" && r.who.includes("/"), JSON.stringify(r));
  await rowLoc(page, "Fire drill").hover(); await rowLoc(page, "Fire drill").locator(".ghide").click();
  assert.strictEqual(await ROW(page, "Fire drill"), undefined, "a manual row is deleted, not hidden"); assert.strictEqual(await page.locator(".ghidlink").count(), 0);
}, ED);
test("all_option_manual", async ({ page }) => {
  await OPEN(page); await page.click("#grAddBtn"); await page.fill("#grTime", "1000"); await page.fill("#grAct", "PSM"); await page.check("#grAll"); await page.click("#grGo");
  assert.ok((await ROW(page, "PSM")).who.includes("ALL RELEVANT PERSONNEL"));
}, ED);
test("read_only_has_no_controls", async ({ page }) => {
  await SQ_ADD(page, { act: "Safety Brief", crew: "" }); await OPEN(page);
  assert.ok((await ROW(page, "Safety Brief")).who.includes("NO PERSONNEL"), "the red mark is still there");
  assert.strictEqual(await page.locator(".gedit, .ghide, #grAddBtn").count(), 0);
}, RO);

(async () => {
  const only = process.argv[2];
  let pass = 0, ran = 0;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue;
    ran++; let S = null;
    try { S = await boot(Object.assign({}, t.opts)); await t.fn(S); if (S.errs.length) throw new Error("page errors: " + S.errs.join(" | ").slice(0, 300)); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 400)); }
    if (S) await S.close();
  }
  console.log(pass + "/" + ran + " pass");
  process.exit(pass === ran ? 0 : 1);
})();
