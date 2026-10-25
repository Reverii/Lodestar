// My Lodestar tests. Build the dashboard first: python3 .lodestar_build.py dashboard
// Run: node tests/my_lodestar.test.js   (prints "N/M pass"; exit code 1 if any fail)
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });

// ---- Task 1: tab skeleton, My schedule removed
test("tab_order", async ({ page }) => {
  const first = await page.evaluate(() => [...document.querySelectorAll("nav.tabs > button, nav.tabs > .tdd > button")].filter(b => b.offsetParent)[0].textContent.trim());
  assert.strictEqual(first, "My Lodestar");
});
test("my_schedule_gone", async ({ page }) => {
  const r = await page.evaluate(() => ({ btn: !!document.querySelector("button[data-v='me']"), view: !!document.getElementById("v-me"), fn: typeof renderMe }));
  assert.deepStrictEqual(r, { btn: false, view: false, fn: "undefined" });
});
test("opens_without_errors", async ({ page, errs }) => {
  await page.evaluate(() => document.querySelector("nav.tabs button[data-v='lode']").click());
  await page.waitForTimeout(500);
  assert.ok(await page.evaluate(() => document.getElementById("v-lode").classList.contains("on")));
  assert.deepStrictEqual(errs, []);
});

test("lands_on_my_lodestar", async ({ page }) => {
  await page.evaluate(() => { cur.lodeProbe = 1; });
  const on = await page.evaluate(() => document.querySelector(".view.on").id);
  assert.strictEqual(on, "v-lode");
}, { fresh: true });
test("planner_still_works", async ({ page, errs }) => {
  await page.evaluate(() => { document.querySelector("nav.tabs button[data-v='plan']").click(); });
  await page.waitForTimeout(400);
  const n = await page.evaluate(() => document.querySelectorAll("#plan td[data-k^='g:']").length);
  assert.ok(n > 100, "crew cells: " + n);
  assert.deepStrictEqual(errs, []);
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
