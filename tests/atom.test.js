// ATOM currency tests (synthetic exports only). Build the dashboard first: python3 .lodestar_build.py dashboard
// Run: node tests/atom.test.js [name-filter]   (prints "N/M pass"; exit code 1 if any fail)
const assert = require("assert");
const fs = require("fs");
const { boot, atomFixture } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const FULL = () => atomFixture();
const A = () => ({ atom: [FULL()] });

// ---- Task 1: fixture, harness, tab skeleton
test("fixture_builds", async () => {
  const f = atomFixture();
  assert.ok(fs.statSync(f).size > 3000);
  const names = require("child_process").execFileSync("python3", ["-c", "import openpyxl,sys;print(','.join(openpyxl.load_workbook(sys.argv[1]).sheetnames))", f]).toString().trim();
  assert.strictEqual(names, "PILOT,ACS,TACCO,SUP1,SUP2");
});
test("atom_state_exists", async ({ page }) => {
  assert.ok(await page.evaluate(() => Array.isArray(ATOMS) && typeof renderAtom === "function"));
});
test("currency_tab_has_atom_box", async ({ page }) => {
  assert.ok(await page.evaluate(() => !!document.querySelector("#v-cur #atomBox")));
});

// ---- runner
(async () => {
  const only = process.argv[2];
  let pass = 0, ran = 0, S = null;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue;
    ran++;
    try {
      if (!S || (t.opts && t.opts.fresh)) { if (S) await S.close(); S = await boot(Object.assign({}, t.opts)); }
      await t.fn(S); pass++; console.log("ok   " + t.name);
    } catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 300)); if (S) { await S.close(); S = null; } }
  }
  if (S) await S.close();
  console.log(pass + "/" + ran + " pass");
  process.exit(pass === ran ? 0 : 1);
})();
