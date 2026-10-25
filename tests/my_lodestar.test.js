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

// ---- Task 2: who am I, and View as
const P = { fresh: true, title: "Sarah Lim" };
test("key_ignores_rank_order_case", async ({ page }) => {
  const r = await page.evaluate(() => [lodeKey("CPT Tan Wei Ming"), lodeKey("tan wei ming cpt"), lodeKey("CPT (NS) Lee Kok Wai")]);
  assert.deepStrictEqual(r[0], r[1]);
  assert.deepStrictEqual(r[2], ["kok", "lee", "wai"]);
}, P);
test("match_unique", async ({ page }) => {
  assert.strictEqual(await page.evaluate(() => lodeMatch("Sarah Lim").p.id), "HAWK");
  assert.strictEqual(await page.evaluate(() => lodeMatch("lim sarah").p.id), "HAWK");
});
test("match_none_for_email", async ({ page }) => {
  assert.strictEqual(await page.evaluate(() => lodeMatch("sarah.lim@x.mil")), null);
});
test("empty_title_matches_nothing", async ({ page }) => {
  assert.strictEqual(await page.evaluate(() => [lodeMatch(""), lodeMatch(undefined), lodeMatch("CPT")].join("|")), "||");
});
test("match_ambiguous_returns_null", async ({ page }) => {
  const r = await page.evaluate(() => {
    const x = mePeople().find(z => z.p.id !== "HAWK"), keep = x.p.name; x.p.name = "CPT Sarah Lim";
    try { return lodeMatch("Sarah Lim"); } finally { x.p.name = keep; }
  });
  assert.strictEqual(r, null);
});
test("auto_match_shows_chip", async ({ page }) => {
  await page.evaluate(() => { SP.user = { Title: "Sarah Lim", Email: "" }; cur.lodeAs = null; renderLode(); });
  const t = await page.innerText("#lodeChip");
  assert.ok(/HAWK/.test(t) && /signed in/i.test(t), t);
});
test("no_match_shows_who_are_you", async ({ page }) => {
  await page.evaluate(() => { SP.user = { Title: "nobody@x.mil" }; spRemember("lode_me", null); cur.lodeAs = null; renderLode(); });
  assert.ok(await page.isVisible("#lodePick"));
  assert.strictEqual(await page.evaluate(() => lodeWho()), null);
});
test("pick_is_remembered", async ({ page }) => {
  await page.evaluate(() => { SP.user = { Title: "nobody@x.mil" }; const w = mePeople().find(z => z.p.id === "RAPTOR"); lodeSetWho(w); cur.lodeAs = null; });
  assert.strictEqual(await page.evaluate(() => lodeWho().p.id), "RAPTOR");
  assert.deepStrictEqual(await page.evaluate(() => spRecall("lode_me")), { dept: "SUP 2", id: "RAPTOR" });
  await page.evaluate(() => { renderLode(); });
  assert.ok(/picked/i.test(await page.innerText("#lodeChip")));
  await page.click("#lodeNotMe");
  assert.strictEqual(await page.evaluate(() => lodeWho()), null);
  assert.ok(await page.isVisible("#lodePick"));
});
test("view_as_banner", async ({ page }) => {
  await page.evaluate(() => { SP.user = { Title: "Sarah Lim" }; spRemember("lode_me", null); cur.lodeAs = null; renderLode(); });
  await page.click("#lodeChip .lodeAsBtn");
  await page.click("#lodeList [data-who='SUP 2|VIPER']");
  const b = await page.innerText("#lodeBanner");
  assert.ok(/Viewing VIPER/.test(b) && /not you/i.test(b), b);
  assert.strictEqual(await page.evaluate(() => lodeWho().p.id), "VIPER");
  await page.click("#lodeBack");
  assert.strictEqual(await page.evaluate(() => lodeWho().p.id), "HAWK");
  assert.ok(!(await page.isVisible("#lodeBanner")));
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
