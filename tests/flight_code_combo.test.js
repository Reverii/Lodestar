// Flight code typed on the Master Planner card (z130): existing code matched ignoring case and spaces, a new code asks for crew and Mission Type and joins Flight Codes.
// Build first: python3 .lodestar_build.py dashboard. Run: node tests/flight_code_combo.test.js [name-filter]
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const ED = { mine: "Master_Planner", fresh: true };
// open a day with one new flight and return its row
const setup = page => page.evaluate(() => {
  document.querySelector("nav.tabs button[data-v='mp']").click(); cur.mpM = 10; cur.mpDay = 24; renderMp();
  document.querySelector("#mpSide [data-add]").click(); renderMp();
  return [...document.querySelectorAll("#mpSide input[data-f='code']")].find(i => !i.value).dataset.row;
});
const typeCode = (page, row, v) => page.evaluate(([row, v]) => { const el = document.querySelector("#mpSide input[data-f='code'][data-row='" + row + "']"); el.value = v; el.dispatchEvent(new Event("change", { bubbles: true })); }, [row, v]);
const fl = (page, row) => page.evaluate(row => { const f = masterBook().S.fl.find(x => x.row === +row); return f && f.code; }, row);

test("existing_code_ignores_case_and_spaces", async ({ page }) => {
  const k = await page.evaluate(() => masterBook().S.codes.find(c => c.code.length > 3 && /[\s-]/.test(c.code)) || masterBook().S.codes[0]);
  const row = await setup(page); await typeCode(page, row, k.code.toLowerCase().replace(/\s+/g, ""));
  assert.strictEqual(await fl(page, row), k.code);
  assert.strictEqual(await page.evaluate(() => !!document.querySelector("#mpSide .ncp")), false, "no new-code panel");
}, ED);
test("new_code_opens_panel_then_adds_to_flight_codes", async ({ page }) => {
  const row = await setup(page), n0 = await page.evaluate(() => masterBook().S.codes.length);
  await typeCode(page, row, "ZZNEW");
  assert.ok(await page.evaluate(() => !!document.querySelector("#mpSide .ncp")), "panel shown");
  assert.notStrictEqual(await fl(page, row), "ZZNEW", "not saved before Add code");
  await page.evaluate(() => { document.querySelector("#mpSide .ncp [data-nct='P']").click(); });
  await page.evaluate(() => { document.querySelector("#mpSide .ncp [data-nct='T']").click(); });
  await page.evaluate(() => { const i = document.querySelector("#mpSide .ncp [data-ncf='mtype']"); i.value = "OPS"; i.dispatchEvent(new Event("change", { bubbles: true })); const d = document.querySelector("#mpSide .ncp [data-ncf='desc']"); d.value = "Test exercise"; d.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.evaluate(() => document.querySelector("#mpSide [data-ncok]").click());
  const r = await page.evaluate(row => { const S = masterBook().S, k = S.codes.find(c => c.code === "ZZNEW"); return { k, n: S.codes.length, f: S.fl.find(x => x.row === +row).code, panel: !!document.querySelector("#mpSide .ncp") }; }, row);
  assert.strictEqual(r.n, n0 + 1); assert.strictEqual(r.f, "ZZNEW"); assert.ok(!r.panel);
  assert.strictEqual(r.k.crew, "P T"); assert.strictEqual(r.k.mtype, "OPS"); assert.strictEqual(r.k.desc, "Test exercise");
  // a second flight typing the same code in other case uses it, no new panel
  const row2 = await setup(page); await typeCode(page, row2, "zznew"); assert.strictEqual(await fl(page, row2), "ZZNEW");
}, ED);
test("cancel_leaves_code_list_alone", async ({ page }) => {
  const row = await setup(page), n0 = await page.evaluate(() => masterBook().S.codes.length);
  await typeCode(page, row, "ZZCANCEL"); await page.evaluate(() => document.querySelector("#mpSide [data-nccancel]").click());
  assert.strictEqual(await page.evaluate(() => masterBook().S.codes.length), n0); assert.ok(!(await fl(page, row)), "code " + await fl(page, row));
  assert.strictEqual(await page.evaluate(() => !!document.querySelector("#mpSide .ncp")), false, "panel closed");
}, ED);
test("clearing_the_box_clears_the_flight_code", async ({ page }) => {
  const row = await setup(page), k = await page.evaluate(() => masterBook().S.codes[0].code);
  await typeCode(page, row, k); assert.strictEqual(await fl(page, row), k); await typeCode(page, row, ""); assert.ok(!(await fl(page, row)));
}, ED);

(async () => {
  const only = process.argv[2]; let pass = 0, ran = 0, S = null;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue; ran++;
    try { if (!S || (t.opts && t.opts.fresh)) { if (S) await S.close(); S = await boot(Object.assign({}, t.opts)); } await t.fn(S); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 300)); if (S) { await S.close(); S = null; } }
  }
  if (S) await S.close(); console.log(pass + "/" + ran + " pass"); process.exit(pass === ran ? 0 : 1);
})();
