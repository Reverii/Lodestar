// Change Log: runs of cells become one line, MASTER copies are skipped, repeats merge, old rows are trimmed (z123). Build first: python3 .lodestar_build.py dashboard
// Run: node tests/changelog.test.js [name-filter]
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const O = { fresh: true, mine: "Flight_Ops_Planner_SUP2", others: false };
const plan = page => page.evaluate(() => { document.querySelector("nav.tabs button[data-v='plan']").click(); cur.m = 9; renderPlanner(); });
const act = page => page.evaluate(() => S.acts.find(a => a.code && /leave/i.test(a.code)) ? S.acts.find(a => /leave/i.test(a.code)).code : S.acts.find(a => a.code).code);

test("block_of_days_is_one_line", async ({ page }) => {
  await plan(page); const code = await act(page);
  const r = await page.evaluate(c => { const row = g0() + gridRow(0, 0); for (let d = 2; d <= 13; d++) put(monSheet(9), colL(DAY_COL0 + d) + row, c); return logLines(books[cur.b], dirty); }, code);
  assert.strictEqual(r.length, 1, JSON.stringify(r)); assert.ok(/, 3-14 Oct AM \(12 days\)$/.test(r[0][4]), r[0][4]); assert.ok(/:/.test(r[0][7]), r[0][7]); assert.strictEqual(r[0][6], code); assert.ok(r[0][5] === "various" || r[0][5] === "", r[0][5]);
}, O);
test("gaps_are_listed_or_counted", async ({ page }) => {
  await plan(page); const code = await act(page);
  const r = await page.evaluate(c => { const row = g0() + gridRow(0, 1); for (const d of [0, 2, 4]) put(monSheet(9), colL(DAY_COL0 + d) + row, c); return logLines(books[cur.b], dirty)[0][4]; }, code);
  assert.ok(/, 1, 3, 5 Oct PM \(3 days\)$/.test(r), r);
}, O);
test("one_cell_keeps_the_old_wording", async ({ page }) => {
  await plan(page); const code = await act(page);
  const r = await page.evaluate(c => { put(monSheet(9), colL(DAY_COL0 + 5) + (g0() + gridRow(0, 2)), c); return logLines(books[cur.b], dirty).map(l => [l[4], l[7]]); }, code);
  assert.ok(r.length === 1 && /, 6 Oct NIGHT$/.test(r[0][0]) && !/:/.test(r[0][1]), JSON.stringify(r));
}, O);
test("different_people_or_values_stay_apart", async ({ page }) => {
  await plan(page); const code = await act(page);
  const r = await page.evaluate(c => { const a = g0() + gridRow(0, 0), b = g0() + gridRow(1, 0); put(monSheet(9), colL(DAY_COL0 + 1) + a, c); put(monSheet(9), colL(DAY_COL0 + 2) + a, c); put(monSheet(9), colL(DAY_COL0 + 1) + b, c); return logLines(books[cur.b], dirty).length; }, code);
  assert.strictEqual(r, 2);
}, O);
test("master_rows_are_not_logged", async ({ page }) => {
  await plan(page);
  const r = await page.evaluate(() => { for (let d = 0; d < 5; d++) put(monSheet(9), colL(DAY_COL0 + d) + MASTER_ROW0, "ZZTEST"); return logLines(books[cur.b], dirty).length; });
  assert.strictEqual(r, 0);
}, O);

const APPLY = `window.__apply = (lines) => { const b = books[0], W = logApply(b, lines); if (W) { b.WB.files = W.files; b.WB.paths = W.paths; } return logRead().filter(x => true).map(x => [x.t, x.what, x.a, x.z, x.cell]); };
  window.__L = (t, cell, a, z, who) => [t, who || "Pat", "", "SUP 2", "Test " + cell, a, z, cell];`;
test("repeat_edit_merges_and_undo_removes", async ({ page }) => {
  await page.evaluate(APPLY);
  const r = await page.evaluate(() => { const now = logTime(), soon = logTime(Date.now() + 60000), a = __apply([__L(now, "Oct!K30", "", "A")]), b = __apply([__L(soon, "Oct!K30", "A", "B")]), c = __apply([__L(soon, "Oct!K30", "B", "")]); return { a: a.length, b: b.map(x => [x[2], x[3]]), c: c.length }; });
  assert.strictEqual(r.a, 1); assert.deepStrictEqual(r.b, [["", "B"]]); assert.strictEqual(r.c, 0, "going back to the start removes the line");
}, O);
test("other_person_or_later_edit_is_a_new_line", async ({ page }) => {
  await page.evaluate(APPLY);
  const r = await page.evaluate(() => { const now = logTime(); __apply([__L(now, "Oct!K30", "", "A")]); __apply([__L(logTime(Date.now() + 1000), "Oct!K30", "A", "B", "Sam")]); return __apply([__L(logTime(Date.now() + 3600000), "Oct!K30", "B", "C")]).length; });
  assert.strictEqual(r, 3);
}, O);
test("rows_older_than_90_days_are_dropped", async ({ page }) => {
  await page.evaluate(APPLY);
  const r = await page.evaluate(() => { __apply([__L(logTime(Date.now() - 100 * 86400000), "Oct!A1", "", "old"), __L(logTime(Date.now() - 80 * 86400000), "Oct!A2", "", "mid")]); return __apply([__L(logTime(), "Oct!A3", "", "new")]).map(x => x[3]).sort(); });
  assert.deepStrictEqual(r, ["mid", "new"].sort());
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
