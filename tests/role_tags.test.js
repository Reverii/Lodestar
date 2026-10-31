// AC and Pax tags. Build first: python3 .lodestar_build.py dashboard
// Run: node tests/role_tags.test.js [name-filter]
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });

// plant a flight code in the first crew row of October day 14 (month index 9, day index 13) of the open book
const PLANT = `(() => { const A = actIndex(); const fl = S.acts.find(a => a.code && (A.get(a.code.toUpperCase()) || {}).ci === CAT_FLIGHT); S.m[9].grid[0][13] = fl.code; return fl.code; })()`;

test("data_layer_round_trip", async ({ page }) => {
  const r = await page.evaluate(code => {
    eval(code); const out = {};
    out.ok = roleSet(9, 0, 13, "PAX"); out.tag = roleOf(S, 9, 0, 13); out.size = S.roleTags.size;
    out.sheets = [...dirty.values()].map(e => e.sheet).filter(s => s === "Role Tags").length;
    roleSet(9, 0, 13, ""); out.cleared = S.roleTags.size; out.after = roleOf(S, 9, 0, 13); return out; }, PLANT);
  assert.strictEqual(r.ok, true); assert.strictEqual(r.tag, "PAX"); assert.strictEqual(r.size, 1);
  assert.ok(r.sheets >= 4, "four cells written on the Role Tags sheet: " + r.sheets);
  assert.strictEqual(r.cleared, 0); assert.strictEqual(r.after, "");
});
test("stale_tag_ignored", async ({ page }) => {
  const r = await page.evaluate(code => {
    eval(code); roleSet(9, 0, 13, "AC"); S.m[9].grid[0][13] = "";
    const a = roleOf(S, 9, 0, 13); S.m[9].grid[0][13] = "LEAVE"; return [a, roleOf(S, 9, 0, 13)]; }, PLANT);
  assert.deepStrictEqual(r, ["", ""]);
});
test("sheet_full_message", async ({ page }) => {
  const r = await page.evaluate(code => {
    eval(code); roleSet(9, 0, 13, "PAX"); S.roleUsed = new Set(Array.from({ length: ROLE_N }, (_, i) => ROLE_ROW0 + i)); S.roleRow.clear(); S.roleTags.clear();
    const ok = roleSet(9, 0, 13, "AC"); return [ok, $("toast").textContent]; }, PLANT);
  assert.strictEqual(r[0], false); assert.ok(/full/i.test(r[1]), r[1]);
});

test("saved_file_holds_the_tag", async ({ page }) => {
  const r = await page.evaluate(code => {
    eval(code); roleSet(9, 0, 13, "PAX"); const z = fflate.unzipSync(buildXlsx().bytes), td = new TextDecoder();
    const wb = td.decode(z["xl/workbook.xml"]); const hit = Object.keys(z).filter(k => /worksheets\/sheet\d+\.xml$/.test(k)).map(k => td.decode(z[k])).find(x => x.includes(">PAX<") || x.includes("PAX"));
    return [wb.includes("Role Tags"), !!hit]; }, PLANT);
  assert.deepStrictEqual(r, [true, true]);
});

// open the planner on October, plant a flight on day 14 for crew row 0 of the open book, and click that cell
const CLICK = `(() => { const code = ${PLANT}; cur.m = 9; renderPlanner(); const el = cellEl("g:0:13"); el.dispatchEvent(new MouseEvent("click", { bubbles: true })); return code; })()`;
const visible = id => `(() => { const e = $("${id}"); return !!e && getComputedStyle(e).display !== "none"; })()`;
test("popup_shows_role_row", async ({ page }) => {
  const r = await page.evaluate(([click, vis]) => { eval(click); return { shown: eval(vis), btns: [...$("popRole").querySelectorAll("button")].map(b => b.dataset.role) }; }, [CLICK, visible("popRole")]);
  assert.ok(r.shown); assert.deepStrictEqual(r.btns, ["", "PAX"], "SUP 2 gets None and Pax only");
});
test("popup_offers_ac_in_the_pilot_file", async ({ page }) => {
  const r = await page.evaluate(([click]) => { eval(click); return [S.dept, ...[...$("popRole").querySelectorAll("button")].map(b => b.dataset.role)]; }, [CLICK]);
  assert.deepStrictEqual(r, ["Pilot", "", "AC", "PAX"]);
}, { mine: "Flight_Ops_Planner_Pilot" });
test("popup_hidden_on_a_non_flight_cell", async ({ page }) => {
  const r = await page.evaluate(([vis]) => { cur.m = 9; S.m[9].grid[0][13] = "LEAVE"; renderPlanner(); cellEl("g:0:13").dispatchEvent(new MouseEvent("click", { bubbles: true })); return eval(vis); }, [visible("popRole")]);
  assert.strictEqual(r, false);
});
test("click_sets_tag_and_chip", async ({ page }) => {
  const r = await page.evaluate(([click]) => { eval(click); $("popRole").querySelector("button[data-role='PAX']").click();
    const a = !!cellEl("g:0:13").querySelector("i.rtag.pax"); $("popRole").querySelector("button[data-role='']").click();
    return [a, !!cellEl("g:0:13").querySelector("i.rtag"), roleOf(S, 9, 0, 13)]; }, [CLICK]);
  assert.deepStrictEqual(r, [true, false, ""]);
});
test("view_only_cannot_tag", async ({ page }) => {
  const r = await page.evaluate(([click, vis]) => { books[cur.b].noEdit = true; eval(click); return [eval(vis), roleSet(9, 0, 13, "PAX"), S.roleTags.size]; }, [CLICK, visible("popRole")]);
  assert.deepStrictEqual(r, [false, false, 0]);
});

test("pax_cell_not_counted", async ({ page }) => {
  const r = await page.evaluate(code => {
    eval(code); const A = actIndex(), n = () => monthStats(9, A).crew[0].fl, f0 = n(), doy = dayOfYear(S.year, 9, 13);
    const rest0 = computeRest()[0].fly[doy], my0 = lodeMonth({ bi: cur.b, i: 0, p: S.roster[0] }, 9).flights;
    roleSet(9, 0, 13, "PAX");
    return { f0, f1: n(), rest0, rest1: computeRest()[0].fly[doy], my0, my1: lodeMonth({ bi: cur.b, i: 0, p: S.roster[0] }, 9).flights, ac: (roleSet(9, 0, 13, "AC"), n()) }; }, PLANT);
  assert.ok(r.f1 < r.f0, "monthly flights drop: " + r.f0 + " -> " + r.f1); assert.strictEqual(r.rest0, true); assert.strictEqual(r.rest1, false);
  assert.ok(r.my1 < r.my0, "My Lodestar flights drop"); assert.strictEqual(r.ac, r.f0, "an AC tag still counts");
});


// Ops Room: the demo set has a two-aircraft formation on 14 Oct (AM). Planner tags go straight into the Pilot book's map.
const OPS = { mine: "Ops_Room" }, DAYI = "2026-10-14";
const TAG = `(id, tag) => { const bi = books.findIndex(b => b.S.dept === "Pilot"); withBook(bi, () => { const i = S.roster.findIndex(p => p.id === id), M = S.m[9]; let s = 0; for (; s < 3; s++) if (M.grid[gridRow(i, s)][13]) break; S.roleTags.set("9:" + gridRow(i, s) + ":13", tag); }); }`;
const seatIds = r => r.seats.slice(0, 2).map(c => c && c.id);
test("ac_tag_makes_captain", async ({ page }) => {
  const r = await page.evaluate(([TAG, iso]) => { const tag = eval(TAG), base = opsDay(iso).rows.map(x => seatIds(x));
    function seatIds(r) { return r.seats.slice(0, 2).map(c => c && c.id); }
    tag("ADDER", "AC"); const D = opsDay(iso); return { base, a: seatIds(D.rows[0]), b: seatIds(D.rows[1]) }; }, [TAG, DAYI]);
  assert.deepStrictEqual(r.base[0], ["MAMBA", "ADDER"]);
  assert.deepStrictEqual(r.a, ["ADDER", "MAMBA"]); assert.deepStrictEqual(r.b, r.base[1], "an untagged aircraft keeps today's seating");
}, OPS);
test("two_ac_formation_pairs_in_roster_order", async ({ page }) => {
  const r = await page.evaluate(([TAG, iso]) => { const tag = eval(TAG); tag("ADDER", "AC"); tag("KING", "AC"); const D = opsDay(iso), f = x => x.seats.slice(0, 2).map(c => c && c.id); return [f(D.rows[0]), f(D.rows[1])]; }, [TAG, DAYI]);
  assert.deepStrictEqual(r, [["ADDER", "MAMBA"], ["KING", "TAIPAN"]]);
}, OPS);
test("planner_pax_not_seated", async ({ page }) => {
  const r = await page.evaluate(([TAG, iso]) => { const tag = eval(TAG); tag("TAIPAN", "PAX"); const D = opsDay(iso), x = D.rows.find(q => q.pax.length);   // the planner's Pax rides along on one of the two aircraft
    return { seated: D.rows.flatMap(q => q.seats.filter(Boolean).map(c => c.id)), extra: Object.values(x.auto).flat().map(c => c.id), pax: x.pax }; }, [TAG, DAYI]);
  assert.ok(!r.seated.includes("TAIPAN"), r.seated.join()); assert.ok(r.extra.includes("TAIPAN"), r.extra.join()); assert.deepStrictEqual(r.pax, ["TAIPAN"]);
}, OPS);
test("ops_removal_sticks", async ({ page }) => {
  const r = await page.evaluate(([TAG, iso]) => { const tag = eval(TAG); tag("TAIPAN", "PAX"); cur.opsDay = iso; const a = opsDay(iso).rows.findIndex(q => q.pax.length), key = opsDay(iso).rows[a].key;
    opsWrite(key, (o, row) => opsTogglePax(o, row, "TAIPAN")); const o = books[opsIdx()].S.fc.get(key), x = opsDay(iso).rows[a];
    return { pax: o.pax, now: x.pax }; }, [TAG, DAYI]);
  assert.strictEqual(r.pax, "-"); assert.deepStrictEqual(r.now, []);
}, OPS);
test("ops_seat_beats_pax_tag", async ({ page }) => {
  const r = await page.evaluate(([TAG, iso]) => { const tag = eval(TAG); tag("MAMBA", "PAX"); cur.opsDay = iso; const key = opsDay(iso).rows[0].key;
    opsWrite(key, o => { o.seat[0] = "MAMBA"; }); const x = opsDay(iso).rows[0]; return { seat: x.seats[0] && x.seats[0].id, pax: x.pax }; }, [TAG, DAYI]);
  assert.strictEqual(r.seat, "MAMBA"); assert.deepStrictEqual(r.pax, []);
}, OPS);

module.exports.tests = tests;
(async () => {
  const only = process.argv[2];
  let pass = 0, ran = 0;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue;
    ran++; let S = null;
    try { S = await boot(Object.assign({}, t.opts)); await t.fn(S); if (S.errs.length) throw new Error("page errors: " + S.errs.join(" | ").slice(0, 300)); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 300)); }
    if (S) await S.close();
  }
  console.log(pass + "/" + ran + " pass");
  process.exit(pass === ran ? 0 : 1);
})();
