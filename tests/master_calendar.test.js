// Master Planner calendar view tests. Build the dashboard first: python3 .lodestar_build.py dashboard
// Run: node tests/master_calendar.test.js [name-filter]
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const openMp = (page, mi) => page.evaluate(mi => { document.querySelector("nav.tabs button[data-v='mp']").click(); cur.mpM = mi; cur.mpDay = null; renderMp(); }, mi);
const chips = page => page.evaluate(() => [...document.querySelectorAll(".mday .chip")].map(c => ({ t: c.querySelector(".t").textContent.trim(), txt: c.textContent.replace(/\s+/g, " ").trim(), title: c.title })));

test("chips_show_the_full_time_range", async ({ page }) => {
  await openMp(page, 9);
  const L = await chips(page);
  assert.ok(L.length > 20, "chips drawn: " + L.length);
  // 8 Oct 0900 FLT-2.0 and 5 Oct 0830 FLT-2.0 on the demo plan: the end is the start plus the flight code's hours
  const hrs = await page.evaluate(() => { const P = masterBook().S, k = P.codes.find(c => c.code === "FLT-2.0"); return k && k.hrs; });
  assert.strictEqual(hrs, 2);
  assert.ok(L.some(c => c.t === "0830H-1030H" && /FLT-2\.0/.test(c.txt)), "0830H-1030H not found: " + L.slice(0, 6).map(c => c.t).join());
  assert.ok(L.some(c => c.t === "0830H-1000H" || c.t === "1000H-1130H"), "a 1.5 hour sortie shows its range: " + L.map(c => c.t).join());
  // every chip is either a range with H, a lone start with H, a ground label, or the no-time placeholder
  const bad = L.filter(c => !/^(\d{4}H(-\d{4}H)?|time\?|GND|TBC)$/.test(c.t)); assert.deepStrictEqual(bad.map(c => c.t), []);
});
test("a_flight_with_no_hours_shows_only_its_start", async ({ page }) => {
  await openMp(page, 9);
  const r = await page.evaluate(() => { const P = masterBook().S, k = P.codes.find(c => !(c.hrs > 0) && P.fl.some(f => f.mi === 9 && f.code === c.code && f.time)); if (!k) return null;
    const f = P.fl.find(f => f.mi === 9 && f.code === k.code && f.time); return { code: k.code, time: f.time.slice(0, 4) }; });
  if (!r) return;   // the demo plan has none: nothing to check
  const L = await chips(page); assert.ok(L.some(c => c.t === r.time + "H" && c.txt.includes(r.code)), JSON.stringify(r));
});

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
