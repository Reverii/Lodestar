// Planner crew filter tests (status chips). Build the dashboard first: python3 .lodestar_build.py dashboard
// Run: node tests/planner_filter.test.js [name-filter]
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const F = { fresh: true };

// give the first four people of the open (own) roster these statuses, then draw the Planner
const setup = page => page.evaluate(() => { useBook(0); const idx = S.roster.map((p, i) => (p.name || p.id) ? i : -1).filter(i => i >= 0);
  ["Active", "SANS", "NSMEN", "Inactive"].forEach((st, k) => { S.roster[idx[k]].status = st; });
  renderAll(); document.querySelector("nav.tabs button[data-v='plan']").click();
  return { ids: idx.slice(0, 4).map(i => S.roster[i].id), total: idx.length }; });
const shown = page => page.evaluate(() => [...document.querySelectorAll("#plan td.idc")].map(x => x.textContent.trim()));
const chip = (page, st) => page.evaluate(st => { document.querySelector("#crewChips button[data-st='" + st + "']").click(); }, st);
const count = page => page.evaluate(() => document.getElementById("crewCount").textContent.trim());

test("chips_default_all_shown", async ({ page }) => {
  const s = await setup(page);
  const on = await page.evaluate(() => [...document.querySelectorAll("#crewChips button")].map(b => [b.dataset.st, b.classList.contains("on")]));
  assert.deepStrictEqual(on, [["active", true], ["sans", true], ["nsmen", true], ["inactive", true]]);
  assert.strictEqual(await count(page), "Showing " + s.total + " of " + s.total + " crew");
  assert.ok(s.ids.every(async id => (await shown(page)).includes(id)));
  assert.strictEqual(await page.evaluate(() => !!document.getElementById("hideInactive")), false);
}, F);
test("hide_sans_and_nsmen", async ({ page }) => {
  const s = await setup(page);
  await chip(page, "sans");
  let rows = await shown(page); assert.ok(!rows.includes(s.ids[1]) && rows.includes(s.ids[2]) && rows.includes(s.ids[0]) && rows.includes(s.ids[3]), rows.join());
  assert.ok(await page.evaluate(() => /SANS \/ NSMEN/.test(document.getElementById("plan").innerText)), "the divider stays while NSMEN shows");
  await chip(page, "nsmen");
  rows = await shown(page); assert.ok(!rows.includes(s.ids[1]) && !rows.includes(s.ids[2]));
  assert.ok(await page.evaluate(() => !/SANS \/ NSMEN/.test(document.getElementById("plan").innerText)), "no divider when both are hidden");
  const hidden = await page.evaluate(() => S.roster.filter(p => (p.name || p.id) && /^(sans|nsmen)$/i.test(p.status || "")).length);   // the demo roster has other SANS / NSMEN people too
  assert.strictEqual(await count(page), "Showing " + (s.total - hidden) + " of " + s.total + " crew");
}, F);
test("inactive_chip_replaces_hide_inactive", async ({ page }) => {
  const s = await setup(page);
  await chip(page, "inactive"); const rows = await shown(page);
  assert.ok(!rows.includes(s.ids[3]) && rows.includes(s.ids[0]));
}, F);
test("remembered_per_department", async ({ page }) => {
  const s = await setup(page);
  await chip(page, "sans");
  const r = await page.evaluate(() => { const dept = S.dept, saved = spRecall("crew_show_" + dept); renderPlanner(); return [saved, [...document.querySelectorAll("#crewChips button")].map(b => b.classList.contains("on")), spRecall("crew_show_Some other dept", "default")]; });
  assert.deepStrictEqual(r[0], ["active", "nsmen", "inactive"]); assert.deepStrictEqual(r[1], [true, false, true, true]); assert.strictEqual(r[2], "default");
}, F);
test("text_filter_still_works_with_chips", async ({ page }) => {
  const s = await setup(page);
  await page.evaluate(id => { const f = document.getElementById("search"); f.value = id; f.dispatchEvent(new Event("input")); }, s.ids[0]);
  const rows = await shown(page); assert.deepStrictEqual(rows, [s.ids[0]]);
}, F);
test("totals_count_everyone_even_when_hidden", async ({ page }) => {
  const s = await setup(page);
  const sum = () => page.evaluate(() => [...document.querySelectorAll("#plan tr.sum")].map(r => r.innerText.replace(/\s+/g, " ")).join("|"));
  const before = await sum(); await chip(page, "sans"); await chip(page, "nsmen"); await chip(page, "inactive");
  assert.strictEqual(await sum(), before);
}, F);

(async () => {
  const only = process.argv[2];
  let pass = 0, ran = 0;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue;
    ran++; let S = null;
    try { S = await boot(Object.assign({ others: false }, t.opts)); await t.fn(S); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 300)); }
    if (S) await S.close();
  }
  console.log(pass + "/" + ran + " pass");
  process.exit(pass === ran ? 0 : 1);
})();
