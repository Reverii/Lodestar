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


// the planner on October with the new layout (run with LODE_FILES pointing at the layout-3 demo set)
const go = page => page.evaluate(() => { document.querySelector("nav.tabs button[data-v='plan']").click(); cur.m = 9; renderPlanner(); });
const FIXTURE = require("path").join(__dirname, "fixtures", "SUP2_layout2.xlsx");   // a layout-2 SUP 2 file (three rows per person)

test("rows_per_is_four_and_stamp_three", async ({ page }) => {
  const r = await page.evaluate(() => ({ rp: ROWS_PER, srp: books[0].S.rp, lay: LAYOUT.dept, older: books.filter(b => !b.S.kind).map(b => b.S.lay.older) }));
  assert.strictEqual(r.rp, 4); assert.strictEqual(r.srp, 4); assert.strictEqual(r.lay, 3); assert.ok(r.older.every(x => x === false), "no layout warning on the fresh set: " + r.older.join());
});
test("wd_row_renders_teal", async ({ page }) => {
  await go(page);
  const r = await page.evaluate(() => { const wd = [...document.querySelectorAll("#plan td.shWD")], am = [...document.querySelectorAll("#plan td.shAM")].filter(td => td.closest("tr").querySelector("td[data-k^='g:']"));
    return { wd: wd.length, am: am.length, bg: wd[0] && getComputedStyle(wd[0]).backgroundColor, cells: document.querySelectorAll("#plan td[data-k='g:" + gridRow(0, 3) + ":13']").length }; });
  assert.ok(r.wd > 0 && r.wd === r.am, "a WD row per person: " + JSON.stringify(r)); assert.strictEqual(r.bg, "rgb(204, 251, 241)"); assert.strictEqual(r.cells, 1);
});
test("wd_popup_lists_only_allowed", async ({ page }) => {
  await go(page);
  const r = await page.evaluate(() => { cellEl("g:" + gridRow(0, 3) + ":13").dispatchEvent(new MouseEvent("click", { bubbles: true })); const A = actIndex();
    const its = [...document.querySelectorAll("#popList .it")].map(e => e.dataset.code).filter(Boolean);
    return { n: its.length, bad: its.filter(c => !wdAllowed(A.get(c.toUpperCase()))), role: getComputedStyle($("popRole")).display }; });
  assert.ok(r.n > 0, "some allowed items"); assert.deepStrictEqual(r.bad, []); assert.strictEqual(r.role, "none");
});
test("wd_edit_saves_to_right_cell", async ({ page }) => {
  await go(page);
  const r = await page.evaluate(() => { const A = actIndex(), code = S.acts.find(a => a.code && wdAllowed(A.get(a.code.toUpperCase()))).code;
    cellEl("g:" + gridRow(0, 3) + ":13").dispatchEvent(new MouseEvent("click", { bubbles: true })); [...document.querySelectorAll("#popList .it")].find(e => e.dataset.code === code).click();
    const ref = colL(DAY_COL0 + 13) + (g0() + gridRow(0, 3));
    return { hit: [...dirty.values()].some(e => e.sheet === monSheet(9) && e.ref === ref && e.val === code), grid: S.m[9].grid[gridRow(0, 3)][13], code }; });
  assert.ok(r.hit, "dirty cell on the WD row"); assert.strictEqual(r.grid, r.code);
});
test("wd_counts_ground_once", async ({ page }) => {
  const r = await page.evaluate(() => { const A = actIndex(), gd = S.acts.find(a => a.code && (A.get(a.code.toUpperCase()) || {}).ci === CAT_GD).code, g = () => monthStats(9, A).crew[0].gd, M = S.m[9];
    let d = 0; while (d < 30 && [0, 1, 2, 3].some(s => M.grid[gridRow(0, s)][d])) d++;   // a day with nothing planned for the first person
    const base = g(); M.grid[gridRow(0, 0)][d] = gd; const am = g(); M.grid[gridRow(0, 3)][d] = gd; const both = g(); M.grid[gridRow(0, 0)][d] = ""; const wdOnly = g();
    return { base, am, both, wdOnly }; });
  assert.strictEqual(r.am, r.base + 1); assert.strictEqual(r.both, r.am, "AM and WD on one day count once"); assert.strictEqual(r.wdOnly, r.base + 1, "WD alone counts");
});
test("pasted_flight_in_wd_not_counted", async ({ page }) => {
  const r = await page.evaluate(() => { const A = actIndex(), fl = S.acts.find(a => a.code && (A.get(a.code.toUpperCase()) || {}).ci === CAT_FLIGHT).code, M = S.m[9];
    const t0 = monthStats(9, A).crew[0], base = { fl: t0.fl, hrs: t0.hrs }, doy = dayOfYear(S.year, 9, 20), rest0 = computeRest()[0].fly[doy];
    M.grid[gridRow(0, 3)][20] = fl; const t1 = monthStats(9, A).crew[0];
    const n = () => opsCrewOn(S.year, 9, 20).flat().filter(c => c.i === 0).length; M.grid[gridRow(0, 3)][20] = ""; const c0 = n(); M.grid[gridRow(0, 3)][20] = fl;
    return { same: t1.fl === base.fl && t1.hrs === base.hrs, rest: computeRest()[0].fly[doy] === rest0, crew: n() - c0 }; });
  assert.ok(r.same, "flights and hours unchanged"); assert.ok(r.rest, "crew rest unchanged"); assert.strictEqual(r.crew, 0, "not on the Ops Room crew list");
});
test("older_layout_still_opens", async ({ page }) => {
  await page.setInputFiles("#fileInput", FIXTURE); await page.waitForFunction(() => typeof books !== "undefined" && books.length >= 1);
  await go(page);
  const r = await page.evaluate(() => ({ rp: books[0].S.rp, older: books[0].S.lay.older, rows: S.m[9].grid.length, n: N, g: gridRow(1, 2), wd: document.querySelectorAll("#plan td.shWD").length, am: document.querySelectorAll("#plan td.shAM").length }));
  assert.strictEqual(r.rp, 3); assert.strictEqual(r.older, true); assert.strictEqual(r.rows, r.n * 3); assert.strictEqual(r.g, 5); assert.strictEqual(r.wd, 0); assert.ok(r.am > 0);
}, { blank: true });

// Ops Room / My Lodestar / Change Log: plant WD ground and admin items for the first two Pilot people on 14 Oct (month 9, day 13)
const OPSDAY = "2026-10-14";
const PLANT = `(() => { const bi = books.findIndex(b => b.S.dept === "Pilot"); return withBook(bi, () => { const A = actIndex(), by = c => S.acts.find(a => a.code && (A.get(a.code.toUpperCase()) || {}).ci === c).code, gd = by(CAT_GD), ad = by(CAT_ADMIN);
  S.m[9].grid[gridRow(0, 3)][13] = gd; S.m[9].grid[gridRow(1, 3)][13] = ad; return [gd, ad]; }); })()`;
const goOps = page => page.evaluate(iso => { cur.opsDay = iso; document.querySelector("nav.tabs button[data-v='ops']").click(); renderOps(); }, OPSDAY);
const OPS = { mine: "Ops_Room" };

test("ops_whole_day_rows", async ({ page }) => {
  const codes = await page.evaluate(PLANT); await goOps(page);
  const rows = await page.evaluate(() => [...document.querySelectorAll(".card.gp .gtab tbody tr")].map(r => ({ time: r.cells[0].textContent.trim(), act: r.cells[1].textContent.trim() })));
  for (const c of codes) assert.ok(rows.some(x => x.time === "WD" && x.act.includes(c)), c + " listed as WD: " + JSON.stringify(rows));
}, OPS);
test("ops_no_whole_day_rows_when_empty", async ({ page }) => {
  await goOps(page);
  const r = await page.evaluate(() => [...document.querySelectorAll(".card.gp .gtab tbody tr td:first-child")].map(td => td.textContent.trim()));
  assert.ok(!r.includes("WD"), JSON.stringify(r));
}, OPS);
test("ops_seats_unchanged_by_wd", async ({ page }) => {
  const r = await page.evaluate(([iso, plant]) => { const snap = () => JSON.stringify([opsDay(iso).rows.map(x => x.seats.map(c => c && c.id)), [...opsFlown()]]); const a = snap(); eval(plant); return [a, snap()]; }, [OPSDAY, PLANT]);
  assert.strictEqual(r[0], r[1]);
}, OPS);
test("ops_whole_day_wraps", async ({ page }) => {
  await page.evaluate(() => { const og = opsGround; window.opsGround = D => og(D).concat(Array.from({ length: 40 }, (_, i) => ({ sh: 3, grp: 3, key: "9", k: "2" + i, when: "", until: "until 30 Oct", act: "Safety brief " + i, desc: "", who: "<b>ABCDEFGH" + i + "</b>", note: "" }))); });
  await goOps(page);
  const r = await page.evaluate(() => { const c = document.querySelector(".card.gp"), t = c.querySelector(".gtab"); return { fits: c.scrollWidth <= c.clientWidth + 1 && t.scrollWidth <= t.clientWidth + 1, rows: t.tBodies[0].rows.length }; });
  assert.ok(r.fits, "card does not overflow sideways"); assert.ok(r.rows >= 40, r.rows);
}, OPS);
test("lode_shows_wd_item", async ({ page }) => {
  const r = await page.evaluate(([plant, iso]) => { const bi = 0; const A = actIndex(), ad = S.acts.find(a => a.code && (A.get(a.code.toUpperCase()) || {}).ci === CAT_ADMIN).code; S.m[9].grid[gridRow(0, 3)][13] = ad;
    const who = { bi, i: 0, p: S.roster[0], dept: S.dept }, D = lodeDay(who, iso); const x = D.items.find(z => z.kind === "wd");
    return { has: !!x, code: x && x.code, ad, html: lodeTodayHtml(who, D, false, iso) }; }, [PLANT, OPSDAY]);
  assert.ok(r.has && r.code === r.ad, JSON.stringify([r.has, r.code, r.ad])); assert.ok(/WHOLE DAY/.test(r.html) && r.html.includes(r.ad), "the day card lists it as a whole-day item");
});
test("log_names_wd", async ({ page }) => {
  const r = await page.evaluate(() => { const A = actIndex(), gd = S.acts.find(a => a.code && (A.get(a.code.toUpperCase()) || {}).ci === CAT_GD).code; go_();
    function go_() { document.querySelector("nav.tabs button[data-v='plan']").click(); cur.m = 9; renderPlanner(); }
    const ref = colL(DAY_COL0 + 13) + (g0() + gridRow(0, 3)); put(monSheet(9), ref, gd); const L = logLines(books[cur.b], dirty); return L.map(l => l[4]); });
  assert.ok(r.length === 1 && /WD$/.test(r[0]), JSON.stringify(r));
});

// zoom control and crew divider
const bodyZoom = page => page.evaluate(() => document.body.style.zoom);
test("zoom_default_85_on_planner", async ({ page }) => {
  await go(page);
  assert.strictEqual(await bodyZoom(page), "0.85"); assert.strictEqual(await page.evaluate(() => $("zoomLvl").textContent), "85%");
  await page.evaluate(() => document.querySelector("nav.tabs button[data-v='ov']").click());
  assert.strictEqual(await bodyZoom(page), "1", "100% outside the planner until a level is chosen");
});
test("zoom_steps_and_remembered", async ({ page }) => {
  await go(page);
  await page.click("#zoomOut"); await page.click("#zoomOut");
  assert.strictEqual(await page.evaluate(() => $("zoomLvl").textContent), "75%"); assert.strictEqual(await bodyZoom(page), "0.75");
  assert.strictEqual(await page.evaluate(() => $("zoomOut").disabled), true, "the floor holds at 75%");
  await page.click("#zoomIn"); assert.strictEqual(await page.evaluate(() => $("zoomLvl").textContent), "80%");
  await page.click("#zoomOut");
  await page.reload();
  assert.strictEqual(await page.evaluate(() => savedZoom()), 75);
});
test("zoom_ops_room_is_100", async ({ page }) => {
  await go(page); await page.click("#zoomOut");
  await page.evaluate(() => document.querySelector("nav.tabs button[data-v='ops']").click());
  assert.strictEqual(await bodyZoom(page), "1");
  await page.evaluate(() => document.querySelector("nav.tabs button[data-v='plan']").click());
  assert.strictEqual(await bodyZoom(page), "0.8");
});
test("zoom_bad_saved_value_falls_back", async ({ page }) => {
  const r = await page.evaluate(() => { const out = []; for (const v of ["abc", "50", "", "85.5"]) { localStorage.setItem("lodeZoom", v); out.push(savedZoom()); } localStorage.removeItem("lodeZoom"); out.push(savedZoom()); return out; });
  assert.deepStrictEqual(r, [null, null, null, null, null]);
});
test("divider_between_crew", async ({ page }) => {
  await go(page);
  const r = await page.evaluate(() => { document.body.style.zoom = "1";   // read the rule at 100%
    const first = [...document.querySelectorAll("#plan tbody tr.pfirst")], c = first[1] && first[1].querySelector("td.c"), id = first[0] && first[0].querySelector("td.idc");
    const n = [...document.querySelectorAll("#plan td.shAM")].filter(td => td.closest("tr").querySelector("td[data-k^='g:']")).length;
    return { n: first.length, crew: n, w: c && getComputedStyle(c).borderTopWidth, col: c && getComputedStyle(c).borderTopColor, idStyle: id && id.getAttribute("style") }; });
  assert.strictEqual(r.n, r.crew, JSON.stringify(r)); assert.strictEqual(r.w, "3px"); assert.strictEqual(r.col, "rgb(15, 23, 42)"); assert.ok(!r.idStyle, "no tint on the identity cells");
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
