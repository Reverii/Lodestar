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

test("syllabus_tags_are_click_tags_several_per_code", async ({ page }) => {   // z200: EIS MS SAL Airlift General, several per code, stored as a comma list
  await page.evaluate(() => { document.querySelector("nav.tabs button[data-v='codes']").click(); renderCodes(); });
  const i = await page.evaluate(() => masterBook().S.codeAll.findIndex(k => k.code && !k.stag));
  const st = () => page.evaluate(i => { const box = document.querySelector("#codeTable .fcstag [data-fci='" + i + "']").parentElement;
    return { stag: masterBook().S.codeAll[i].stag, tags: [...box.querySelectorAll(".tag")].map(x => x.textContent), on: [...box.querySelectorAll(".tag.on")].map(x => x.textContent), all: !!box.querySelector(".all"), sel: document.querySelectorAll("#codeTable select[data-f='stag']").length }; }, i);
  let r = await st(); assert.deepStrictEqual([r.tags, r.on, r.all, r.sel], [["EIS", "MS", "SAL", "Airlift", "General"], [], false, 0], JSON.stringify(r));
  const click = t => page.click("#codeTable .fcstag [data-fci='" + i + "'][data-fst='" + t + "']");
  await click("Flight"); await click("SAL"); r = await st(); assert.deepStrictEqual([r.stag, r.on], ["SAL, Flight", ["SAL", "General"]], JSON.stringify(r));
  assert.ok(await page.evaluate(() => [...masterBook().dirty].some(k => /Flight Codes!E/.test(String(k)))), "written to Flight Codes column E");
  await click("SAL"); r = await st(); assert.strictEqual(r.stag, "Flight");
  const odd = await page.evaluate(() => { const k = masterBook().S.codeAll.findIndex(c => c.stag === "MAS Tact"); return [...document.querySelectorAll("#codeTable .fcstag [data-fci='" + k + "'].tX")].map(x => x.textContent); });
  assert.deepStrictEqual(odd, ["MAS Tact"]);
}, ED);
test("tagged_flight_offers_flight_items_of_that_track_only", async ({ page }) => {   // z198: no TTX (Ground) or sim items on a tagged flight cell
  const r = await page.evaluate(() => { const Y = S.sylDef;
    const it = t => ({ it: Object.assign({}, t), pass: false, plan: [] }), all = Y.items.map(it);
    const stg = { stg: { name: "T" }, names: [...new Set(all.map(x => x.it.track))], tracks: {}, all };
    all.forEach(x => (stg.tracks[x.it.track] = stg.tracks[x.it.track] || []).push(x));
    const P = { stages: [stg], wk: 0 }, out = t => sylOpen(P, CAT_FLIGHT, "2026-11-10", t).cur.flatMap(g => g.items.map(i => sylTr(i.x.it.track) + "/" + i.x.it.type));
    return { eis: out("EIS"), fl: out("Flight"), gf: out("General Flight"), both: out("SAL, Flight") }; });
  assert.ok(r.eis.length && r.eis.every(x => x === "EIS/Flight"), JSON.stringify(r.eis));
  assert.ok(r.fl.length && r.fl.every(x => x === "Flight/Flight"), JSON.stringify(r.fl)); assert.deepStrictEqual(r.gf, r.fl);
  assert.ok(r.both.some(x => x === "SAL/Flight") && r.both.some(x => x === "Flight/Flight") && r.both.every(x => /^(SAL|Flight)\/Flight$/.test(x)), JSON.stringify(r.both));
}, { fresh: true });
test("crew_column_is_click_tags", async ({ page }) => {   // z199: P L T S1 S2 tags; none on = everyone (blank)
  await page.evaluate(() => { document.querySelector("nav.tabs button[data-v='codes']").click(); renderCodes(); });
  const i = await page.evaluate(() => masterBook().S.codeAll.findIndex(k => k.code && !k.crew));
  const st = () => page.evaluate(i => { const k = masterBook().S.codeAll[i], el = document.querySelector("#codeTable [data-fci='" + i + "']").parentElement;
    return { crew: k.crew, on: [...el.querySelectorAll(".tag.on")].map(x => x.textContent), every: !!el.querySelector(".all"), input: !!document.querySelector("#codeTable input[data-f='crew']") }; }, i);
  let r = await st(); assert.deepStrictEqual([r.crew, r.on, r.every, r.input], ["", [], true, false], JSON.stringify(r));
  const click = t => page.click("#codeTable [data-fci='" + i + "'][data-fct='" + t + "']");
  await click("T"); await click("P"); r = await st(); assert.deepStrictEqual([r.crew, r.on, r.every], ["P T", ["P", "T"], false], JSON.stringify(r));
  assert.ok(await page.evaluate(() => [...masterBook().dirty].some(k => /Flight Codes!C/.test(String(k)))), "written to Flight Codes column C");
  await click("P"); await click("T"); r = await st(); assert.deepStrictEqual([r.crew, r.on, r.every], ["", [], true], JSON.stringify(r));
}, ED);
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
