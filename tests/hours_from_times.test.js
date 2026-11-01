// Planned hours from the Master Planner time range (z126 on). Build first: python3 .lodestar_build.py dashboard
// Run: LODE_FILES=<fresh demo set> node tests/hours_from_times.test.js [name-filter]
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const ED = { mine: "Ops_Room", fresh: true };
const hrs = (page, time) => page.evaluate(t => mpFlHrs(masterBook().S, { code: "FLT-2.0", time: t }), time);

test("range_gives_hours", async ({ page }) => {
  for (const [t, h] of [["0830-1030", 2], ["1000-1130", 1.5], ["0830H-1030H", 2], ["08:30-10:30", 2], ["0830 - 1030", 2], ["0600-1800", 12]]) assert.deepStrictEqual(await hrs(page, t), { h, bad: "" }, t);
}, ED);
test("midnight_crossing_adds_a_day", async ({ page }) => { assert.deepStrictEqual(await hrs(page, "2200-0100"), { h: 3, bad: "" }); assert.deepStrictEqual(await hrs(page, "2330-0030"), { h: 1, bad: "" }); }, ED);
test("no_usable_range_counts_zero_with_a_warning", async ({ page }) => {
  assert.deepStrictEqual(await hrs(page, "0830"), { h: 0, bad: "No end time" }); assert.deepStrictEqual(await hrs(page, ""), { h: 0, bad: "No time" });
  for (const t of ["0830-0830", "0830-0730", "0600-1801"]) assert.deepStrictEqual(await hrs(page, t), { h: 0, bad: "Check time" }, t);
}, ED);
test("sorties_default_to_one", async ({ page }) => {
  const r = await page.evaluate(() => [flSort({}), flSort({ sort: undefined }), flSort({ sort: 3 }), flSort({ sort: 0 })]); assert.deepStrictEqual(r, [1, 1, 3, 1]);
}, ED);
test("flights_parse_their_sorties", async ({ page }) => {
  const r = await page.evaluate(() => { const P = masterBook().S, two = P.fl.filter(f => f.sort === 2), all = P.fl.every(f => f.sort >= 1 && f.sort <= 9); return { n: two.length, all, layout: P.fcOld }; });
  assert.ok(r.n >= 1 && r.all && r.layout === false, JSON.stringify(r));
}, ED);
test("flight_codes_parse_new_columns", async ({ page }) => {
  const r = await page.evaluate(() => { const P = masterBook().S, k = P.codes.find(c => c.code === "MSN-3.0"); return { crew: k.crew, mtype: k.mtype, eis: P.codes.find(c => c.code === "EIS").stag, hasStag: P.hasStag }; });
  assert.deepStrictEqual(r, { crew: "P T S2", mtype: "MSN", eis: "EIS", hasStag: true });
}, ED);
test("layout_stamp_for_master_is_three", async ({ page }) => { assert.strictEqual(await page.evaluate(() => LAYOUT.master), 3); }, ED);

// ---- Task 4: the Master Planner screens use the flight's hours and sorties
const mpDay = (page, iso) => page.evaluate(iso => { const P = masterBook().S, { mi, d } = ymd(iso, P.year); document.querySelector("nav.tabs button[data-v='mp']").click(); cur.mpM = mi; cur.mpDay = d; renderMp(); return { mi, d }; }, iso);
test("two_sortie_flight_counts_two_on_the_day_and_shows_on_the_card", async ({ page }) => {
  await mpDay(page, "2026-10-01");   // demo: FLT-2.0 0830-1230 with Sorties 2, FLT-1.5 0900-1030, three PM flights
  const r = await page.evaluate(() => { const P = masterBook().S, fs = P.fl.filter(f => f.mi === 9 && f.d === 0); return { so: fs.reduce((n, f) => n + flSort(f), 0), card: document.getElementById("mpSide").textContent, cell: document.querySelector("#mpCal .mday[data-day='0']").textContent }; });
  assert.ok(/2 sorties/.test(r.card) && /4\.0 H/.test(r.card), r.card.slice(0, 400)); assert.ok(new RegExp(r.so + " sorties").test(r.cell), r.so + " / " + r.cell);
}, ED);
test("month_hours_card_is_the_sum_of_the_flight_ranges", async ({ page }) => {
  await mpDay(page, "2026-10-01");
  const r = await page.evaluate(() => { const P = masterBook().S, live = P.fl.filter(f => f.mi === 9 && f.code && !P.mp[9].status[f.d]); return { sum: live.reduce((n, f) => n + mpFlHrs(P, f).h, 0), kpi: document.getElementById("mpKpis").textContent }; });
  assert.ok(r.kpi.includes((Math.round(r.sum * 10) / 10).toFixed(1)), r.sum + " vs " + r.kpi);
}, ED);
test("sorties_box_writes_the_flights_sheet", async ({ page }) => {
  await mpDay(page, "2026-10-02");
  await page.evaluate(() => { devFull = true; OPS = true; renderMp(); });
  const row = await page.evaluate(() => { const P = masterBook().S, f = P.fl.find(f => f.mi === 9 && f.d === 1); return f.row; });
  await page.fill("#mpSide input[data-row='" + row + "'][data-f='sort']", "3"); await page.dispatchEvent("#mpSide input[data-row='" + row + "'][data-f='sort']", "change");
  const r = await page.evaluate(row => { const P = masterBook().S, f = P.fl.find(f => f.row === row), e = books[mpIdx()].dirty.get("Flights!G" + row); return { sort: f.sort, val: e && e.val }; }, row);
  assert.deepStrictEqual(r, { sort: 3, val: 3 });
}, ED);
test("flight_codes_page_has_no_hours_or_sorties_columns", async ({ page }) => {
  await page.evaluate(() => { document.querySelector("nav.tabs button[data-v='codes']").click(); renderCodes(); });
  const h = await page.evaluate(() => [...document.querySelectorAll("#codeTable th")].map(x => x.textContent.trim())); assert.ok(!h.some(x => /Sorties|Hrs/.test(x)) && h.includes("Crew") && h.includes("Mission Type"), h.join());
}, ED);

(async () => {
  const only = process.argv[2]; let pass = 0, ran = 0, S = null;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue; ran++;
    try { if (!S || (t.opts && t.opts.fresh)) { if (S) await S.close(); S = await boot(Object.assign({}, t.opts)); } await t.fn(S); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 300)); if (S) { await S.close(); S = null; } }
  }
  if (S) await S.close(); console.log(pass + "/" + ran + " pass"); process.exit(pass === ran ? 0 : 1);
})();
