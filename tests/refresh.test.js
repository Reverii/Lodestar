// Refresh (button, F5, Ctrl+R) and the remembered department after a page reload (z120). Build first: python3 .lodestar_build.py dashboard
// Run: node tests/refresh.test.js [name-filter]   (no SharePoint here: spJson / spFetch / spList are stubbed in the page)
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const O = { fresh: true, mine: "Flight_Ops_Planner_SUP2" };
const key = (page, init) => page.evaluate(i => { window.__n = 0; window.softRefresh = async () => { window.__n++; }; const e = new KeyboardEvent("keydown", Object.assign({ bubbles: true, cancelable: true }, i)); document.dispatchEvent(e); return { n: window.__n, prevented: e.defaultPrevented }; }, init);

test("button_hidden_without_sharepoint", async ({ page }) => { assert.strictEqual(await page.evaluate(() => $("btnRefresh").style.display), "none"); }, O);
test("f5_and_ctrl_r_refresh_on_sharepoint", async ({ page }) => {
  await page.evaluate(() => { SP.on = true; });
  for (const i of [{ key: "F5" }, { key: "r", ctrlKey: true }, { key: "R", ctrlKey: true }]) assert.deepStrictEqual(await key(page, i), { n: 1, prevented: true }, JSON.stringify(i));
}, O);
test("full_reload_keys_left_alone", async ({ page }) => {
  await page.evaluate(() => { SP.on = true; });
  for (const i of [{ key: "R", ctrlKey: true, shiftKey: true }, { key: "F5", ctrlKey: true }, { key: "F5", shiftKey: true }, { key: "r" }]) assert.deepStrictEqual(await key(page, i), { n: 0, prevented: false }, JSON.stringify(i));
}, O);
test("keys_left_alone_without_sharepoint", async ({ page }) => { assert.deepStrictEqual(await key(page, { key: "F5" }), { n: 0, prevented: false }); }, O);

const SETUP = `SP.on = true; SP.web = "https://x"; window.__t = "t1"; const b = books[0]; b.WB.handle = { sp: 1, url: "/x/a.xlsx", name: "a.xlsx", modified: "t1" };
  window.spJson = async () => ({ d: { TimeLastModified: window.__t } }); window.spFetch = async () => { window.__fetched = (window.__fetched || 0) + 1; return new ArrayBuffer(0); }; window.reparseBook = () => {}; window.liveHeal = () => {};
  window.liveRedraw = () => {}; window.liveDone = () => {};`;
const msg = page => page.evaluate(() => $("toast").textContent);
test("up_to_date_says_so", async ({ page }) => {
  await page.evaluate(SETUP); await page.evaluate(() => softRefresh()); assert.strictEqual(await msg(page), "Already up to date");
  assert.strictEqual(await page.evaluate(() => $("btnRefresh").textContent), "⟳ Refresh");
}, O);
test("changed_file_is_read_again_without_reload", async ({ page }) => {
  await page.evaluate(SETUP); await page.evaluate(() => { window.__t = "t2"; window.__mark = 1; });
  await page.evaluate(() => softRefresh());
  assert.strictEqual(await page.evaluate(() => window.__fetched), 1); assert.strictEqual(await page.evaluate(() => window.__mark), 1, "the page was not reloaded");
  assert.ok(/^Updated from SharePoint/.test(await msg(page)), await msg(page));
}, O);
test("own_unsaved_changes_are_kept", async ({ page }) => {
  await page.evaluate(SETUP); await page.evaluate(() => { window.__t = "t2"; books[0].dirty.set("Jan!A1", { sheet: "Jan", ref: "A1", val: "x" }); });
  await page.evaluate(() => softRefresh());
  assert.strictEqual(await page.evaluate(() => window.__fetched || 0), 0, "a file with unsaved changes is not overwritten"); assert.ok(/still saving/.test(await msg(page)), await msg(page));
  assert.strictEqual(await page.evaluate(() => books[0].dirty.size), 1);
}, O);
test("not_on_sharepoint_explains", async ({ page }) => { await page.evaluate(() => softRefresh()); assert.ok(/SharePoint/.test(await msg(page))); }, O);

test("session_is_saved_and_cleared", async ({ page }) => {
  const r = await page.evaluate(async () => { sessClear(); const a = sessGet(); sessSave({ dept: "Pilot" }); sessSave({ v: "ops" }); const b = sessGet(); window.spList = async () => { SP.files = []; SP.folder = "/x/P"; }; await spShowDepts(); return { a, b, c: sessGet() }; });
  assert.strictEqual(r.a, null); assert.deepStrictEqual(r.b, { dept: "Pilot", v: "ops" }); assert.strictEqual(r.c, null, "choosing another department starts clean");
}, O);
test("tab_click_remembered", async ({ page }) => {
  const r = await page.evaluate(() => { sessClear(); document.querySelector("nav.tabs button[data-v='cmx']").click(); return sessGet(); }); assert.strictEqual(r.v, "cmx");
}, O);
test("resume_opens_department_and_tab", async ({ page }) => {
  const r = await page.evaluate(async () => { sessSave({ dept: "Pilot", v: "cmx" }); let got = ""; window.spOpenDept = async l => { got = l; }; const ok = await sessResume();
    return { ok, got, on: document.querySelector("nav.tabs button[data-v='cmx']").classList.contains("on") }; });
  assert.deepStrictEqual(r, { ok: true, got: "Pilot", on: true });
}, O);
test("resume_ops_room_and_unknown", async ({ page }) => {
  const r = await page.evaluate(async () => { let got = ""; window.spOpenOps = async () => { got = "ops"; }; sessSave({ dept: "Ops Room" }); const a = await sessResume(); sessSave({ dept: "Nobody" }); const b = await sessResume(); return { a, got, b }; });
  assert.deepStrictEqual(r, { a: true, got: "ops", b: false });
}, O);
test("resume_without_a_file_falls_back_to_the_department_screen", async ({ page }) => {
  const r = await page.evaluate(async () => { books.length = 0; sessSave({ dept: "Pilot" }); window.spOpenDept = async () => {}; return await sessResume(); }); assert.strictEqual(r, false);
}, O);

(async () => {
  const only = process.argv[2]; let pass = 0, ran = 0, S = null;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue; ran++;
    try { if (!S || (t.opts && t.opts.fresh)) { if (S) await S.close(); S = await boot(Object.assign({}, t.opts)); } await t.fn(S); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 300)); if (S) { await S.close(); S = null; } }
  }
  if (S) await S.close(); console.log(pass + "/" + ran + " pass"); process.exit(pass === ran ? 0 : 1);
})();
