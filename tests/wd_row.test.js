// WD (whole day) fourth row, zoom and crew divider. Build first: python3 .lodestar_build.py dashboard
// Run: LODE_FILES=<folder with the layout-3 demo set> node tests/wd_row.test.js [name-filter]
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });

test("row_helpers_exist", async ({ page }) => {
  const r = await page.evaluate(() => [typeof gridRow, gridRow(2, 1), rowPerson(gridRow(2, 1)), rowShift(gridRow(2, 1)), ROWS_PER, isWdRow(5), typeof ROW_LABELS]);
  const n = r[4]; assert.strictEqual(r[0], "function"); assert.strictEqual(r[1], 2 * n + 1); assert.strictEqual(r[2], 2); assert.strictEqual(r[3], 1);
  assert.ok(n === 3 || n === 4); assert.strictEqual(r[5], false); assert.strictEqual(r[6], "object");
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
