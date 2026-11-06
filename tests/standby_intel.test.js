// Ops Room standby rows reorganised and the Intel tick list (z192). Build first: python3 .lodestar_build.py dashboard.
// Run: node tests/standby_intel.test.js [filter]
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const DAY = "2026-10-14";
const OR = { mine: "Ops_Room", today: DAY, fresh: true };
const toOps = page => page.evaluate(day => { window.confirm = () => true; OPS = true; cur.opsDay = day; document.querySelector("nav.tabs button[data-v='ops']").click(); renderOps(); }, DAY);

test("standby_rows_have_brief_and_one_alert_box", async ({ page }) => {
  await toOps(page);
  const r = await page.evaluate(() => { const rows = [...document.querySelectorAll("#opsMain tr.sb")], al = document.querySelector("#opsMain td.sbal");
    return { n: rows.length, brf: rows.filter(tr => tr.querySelector("td.obrf")).length, al: al ? [al.colSpan, al.rowSpan] : null, block: !!document.querySelector("#opsMain td.osbx"), na: rows.filter(tr => tr.querySelector("td.sbna")).length,
      cols: rows.map(tr => [...tr.children].reduce((n, td) => n + (td.colSpan || 1), 0)) }; });
  assert.ok(r.n >= 1); assert.strictEqual(r.brf, r.n, "a Brief Timing cell on every standby row"); assert.strictEqual(r.na, r.n);
  assert.deepStrictEqual(r.al, [5, r.n]); assert.ok(!r.block, "the empty block is gone");
  assert.strictEqual(r.cols[0], 17, "17 columns on the first row");
}, OR);

test("alert_lines_level_big_time_small", async ({ page }) => {
  await toOps(page);
  const r = await page.evaluate(() => { const D = opsDay(cur.opsDay), sb = D.sb[0]; opsWrite(sb.key, o => { o.alert = "AL45 0900H-1200H\nAL90 1200H-1800H"; }); renderOps();
    return [...document.querySelectorAll("#opsMain td.sbal .all")].map(x => [x.querySelector("b").textContent, (x.querySelector("small") || {}).textContent]); });
  assert.deepStrictEqual(r, [["AL45", "0900H-1200H"], ["AL90", "1200H-1800H"]]);
}, OR);

test("plus_alert_time_opens_a_new_line", async ({ page }) => {
  await toOps(page);
  await page.evaluate(() => { const D = opsDay(cur.opsDay); opsWrite(D.sb[0].key, o => { o.alert = "AL45 0900H-1200H"; }); renderOps(); });
  await page.click("#opsMain td.sbal .alAdd");
  const v = await page.evaluate(() => { const t = document.querySelector("#opsMain td.sbal textarea"); return t && t.value; });
  assert.strictEqual(v, "AL45 0900H-1200H\n");
}, OR);

test("brief_timing_saves_on_the_standby_row", async ({ page }) => {
  await toOps(page);
  await page.click("#opsMain tr.sb td.obrf");
  await page.fill("#opsMain tr.sb td.obrf input", "0845"); await page.press("#opsMain tr.sb td.obrf input", "Enter");
  const r = await page.evaluate(() => { const D = opsDay(cur.opsDay); return { brf: D.sb.map(z => z.o && z.o.brf).find(Boolean), afp: (afpData(cur.opsDay).sb[0] || {}).brf }; });
  assert.ok(/0845/.test(r.brf), JSON.stringify(r)); assert.ok(/0845/.test(r.afp), JSON.stringify(r));
}, OR);

test("intel_starts_empty_and_ticks_flights", async ({ page }) => {
  await toOps(page);
  const t0 = await page.evaluate(() => document.querySelector("[data-intel]").textContent);
  assert.ok(!/\d{4}H/.test(t0), "no flights listed by itself: " + t0);
  await page.click("[data-intel]");
  const n = await page.evaluate(() => document.querySelectorAll("#intelPop input[type=checkbox]").length);
  const fl = await page.evaluate(() => { const D = opsDay(cur.opsDay); return D.rows.filter(r => opsOutcome(r, D.iso) !== "cxl").map(intelLine); });
  assert.strictEqual(n, fl.length); assert.ok(n >= 2, "demo day has flights");
  await page.check("#intelPop [data-il='1']"); await page.fill("#intelOther", "Brief at 0700H"); await page.click("#intelDone");
  const r = await page.evaluate(() => { const st = books[opsIdx()].S, ref = document.querySelector("[data-intel]").dataset.intel; return { v: st.db[ref], shown: document.querySelector("[data-intel]").textContent }; });
  assert.strictEqual(r.v, fl[1] + "\nBrief at 0700H"); assert.ok(r.shown.includes(fl[1]));
  await page.click("[data-intel]");
  const k = await page.evaluate(() => [...document.querySelectorAll("#intelPop input[type=checkbox]")].map(c => c.checked));
  assert.deepStrictEqual(k, fl.map((f, j) => j === 1)); assert.strictEqual(await page.inputValue("#intelOther"), "Brief at 0700H");
}, OR);

(async () => {
  const only = process.argv[2]; let pass = 0, ran = 0, S = null;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue; ran++;
    try { if (!S || (t.opts && t.opts.fresh)) { if (S) await S.close(); S = await boot(Object.assign({}, t.opts)); } await t.fn(S); if (S.errs.length) throw new Error(S.errs.join(" | ")); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 300)); if (S) { await S.close(); S = null; } }
  }
  if (S) await S.close(); console.log(pass + "/" + ran + " pass"); process.exit(pass === ran ? 0 : 1);
})();
