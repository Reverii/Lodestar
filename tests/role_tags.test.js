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
