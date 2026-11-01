// Flight card (left click on a flight cell) and the MASTER lock. Build first: python3 .lodestar_build.py dashboard
// Run: LODE_FILES=<folder with the layout-3 demo set> node tests/flight_card.test.js [name-filter]
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });

const go = page => page.evaluate(() => { document.querySelector("nav.tabs button[data-v='plan']").click(); cur.m = 9; renderPlanner(); });
// the crew cell on October with a flight code that has the most departments on the same flight; also a plain cell, a WD cell and a MASTER cell
const findCells = page => page.evaluate(() => {
  const A = actIndex(), M = S.m[9]; let best = null, nonfl = null, wd = null;
  for (let i = 0; i < S.roster.length; i++) for (let s = 0; s < 3; s++) for (let d = 0; d < 31; d++) {
    const v = M.grid[gridRow(i, s)] && M.grid[gridRow(i, s)][d], a = v && A.get(String(v).toUpperCase());
    if (a && a.ci === CAT_FLIGHT) { const n = new Set(opsCrewOn(S.year, 9, d)[s].filter(c => sameCode(c.code, v)).map(c => c.dept)).size; if (!best || n > best.n) best = { k: "g:" + gridRow(i, s) + ":" + d, n, code: v, s, d }; }
    else if (!nonfl && !isWdRow(gridRow(i, s))) nonfl = "g:" + gridRow(i, s) + ":" + d;
  }
  wd = "g:" + gridRow(0, 3) + ":13";
  const mk = "m:0:" + (() => { for (let d = 0; d < 31; d++) if (M.master[0][d]) return d; return 0; })();
  return { best, nonfl, wd, mk };
});
const cardOn = page => page.evaluate(() => { const c = document.getElementById("cellCard"); return !!c && getComputedStyle(c).display !== "none"; });

test("left_click_flight_cell_opens_card", async ({ page }) => {
  await go(page); const c = await findCells(page);
  await page.click("#plan td[data-k='" + c.best.k + "']");
  assert.ok(await cardOn(page), "card visible");
  const r = await page.evaluate(() => { const c = document.getElementById("cellCard"); return { txt: c.textContent, heads: [...c.querySelectorAll(".csh span")].map(x => x.textContent), pop: getComputedStyle(document.getElementById("pop")).display }; });
  assert.ok(r.txt.includes(c.best.code), "code in the card: " + r.txt.slice(0, 80));
  assert.deepStrictEqual(r.heads, ["AC", "Pilot", "LM", "TACCO", "SUP 1", "SUP 2"]);
  assert.strictEqual(r.pop, "none", "the picker stays closed on a left click");
});
test("card_lists_other_departments", async ({ page }) => {
  await go(page); const c = await findCells(page);
  assert.ok(c.best.n >= 2, "demo data should have a flight with two departments: " + c.best.n);
  await page.click("#plan td[data-k='" + c.best.k + "']");
  const r = await page.evaluate(() => { const cols = [...document.querySelectorAll("#cellCard .csn:nth-child(2) span")]; return cols.map(x => x.textContent.trim()).filter(x => x && x !== "-"); });
  assert.ok(r.length >= 2, "names in at least two seat columns: " + JSON.stringify(r));
});
test("card_marks_the_clicked_person", async ({ page }) => {
  await go(page); const c = await findCells(page);
  await page.click("#plan td[data-k='" + c.best.k + "']");
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll("#cellCard .you").length), 1);
});
test("other_cells_open_no_card", async ({ page }) => {
  await go(page); const c = await findCells(page); await page.evaluate(() => { if (cur.mfold) { cur.mfold = false; renderPlanner(); } });
  for (const k of [c.nonfl, c.wd, c.mk]) {
    await page.evaluate(() => { const e = document.getElementById("cellCard"); if (e) e.style.display = "none"; });
    await page.click("#plan td[data-k='" + k + "']");
    assert.ok(!(await cardOn(page)), "no card on " + k);
  }
});
test("right_click_opens_picker_and_closes_card", async ({ page }) => {
  await go(page); const c = await findCells(page);
  await page.click("#plan td[data-k='" + c.best.k + "']"); assert.ok(await cardOn(page));
  await page.click("#plan td[data-k='" + c.best.k + "']", { button: "right" });
  assert.ok(!(await cardOn(page))); assert.strictEqual(await page.evaluate(() => getComputedStyle(document.getElementById("pop")).display), "flex");
});
test("escape_and_outside_click_close_card", async ({ page }) => {
  await go(page); const c = await findCells(page);
  await page.click("#plan td[data-k='" + c.best.k + "']"); await page.keyboard.press("Escape"); assert.ok(!(await cardOn(page)), "Escape");
  await page.click("#plan td[data-k='" + c.best.k + "']"); assert.ok(await cardOn(page));
  await page.mouse.click(5, 700); assert.ok(!(await cardOn(page)), "outside click");
});
test("card_opens_in_view_only_file", async ({ page }) => {
  await go(page); const c = await findCells(page);
  await page.evaluate(() => { window.mayEdit = () => false; });
  await page.click("#plan td[data-k='" + c.best.k + "']"); assert.ok(await cardOn(page));
});

test("card_details_are_this_cell_only", async ({ page }) => {
  await go(page); const c = await findCells(page);
  await page.click("#plan td[data-k='" + c.best.k + "']");
  const txt = await page.evaluate(() => document.querySelector("#cellCard .cdet").textContent);
  assert.ok(!/programme:|nobody on it yet|day with/i.test(txt), "no day-level lines: " + txt);
  assert.ok(/^(Planned:|Not on the Master)/.test(txt), txt);
});

// ---- MASTER lock
const masterVal = (page, k) => page.evaluate(k => { const p = keyParts(k); return [S.m[9].master[p.r][p.d], S.m[9].mtime[p.r][p.d], S.m[9].mnote[p.r][p.d]]; }, k);
test("master_right_click_opens_no_picker", async ({ page }) => {
  await go(page); const c = await findCells(page); await page.evaluate(() => { if (cur.mfold) { cur.mfold = false; renderPlanner(); } });
  await page.click("#plan td[data-k='" + c.mk + "']", { button: "right" });
  assert.strictEqual(await page.evaluate(() => getComputedStyle(document.getElementById("pop")).display), "none");
  assert.ok(/Master Planner/.test(await page.evaluate(() => document.getElementById("toast").textContent)), "toast");
});
test("master_delete_paste_type_do_nothing", async ({ page }) => {
  await go(page); const c = await findCells(page); await page.evaluate(() => { if (cur.mfold) { cur.mfold = false; renderPlanner(); } });
  const before = await masterVal(page, c.mk);
  await page.click("#plan td[data-k='" + c.mk + "']");
  await page.evaluate(() => { cur.clip = "ZZZ"; });
  for (const key of ["Delete", "Backspace", "Enter", "Control+v", "x"]) { await page.keyboard.press(key); }
  assert.deepStrictEqual(await masterVal(page, c.mk), before);
  assert.strictEqual(await page.evaluate(() => getComputedStyle(document.getElementById("pop")).display), "none");
});
test("master_copy_and_find_still_allowed", async ({ page }) => {
  await go(page); const c = await findCells(page); await page.evaluate(() => { if (cur.mfold) { cur.mfold = false; renderPlanner(); } });
  await page.click("#plan td[data-k='" + c.mk + "']"); await page.keyboard.press("Control+c");
  assert.strictEqual(await page.evaluate(() => cur.clip), (await masterVal(page, c.mk))[0]);
  await page.keyboard.press("ArrowRight"); assert.notStrictEqual(await page.evaluate(() => cur.sel), c.mk);
});
test("master_rows_show_lock_label", async ({ page }) => {
  await go(page);
  const r = await page.evaluate(() => { cur.mfold = false; renderPlanner(); const a = document.querySelector("#plan td.mlabel").textContent; cur.mfold = true; renderPlanner(); return [a, document.querySelector("#plan td.mlabel").textContent]; });
  assert.ok(r[0].includes("🔒") && r[1].includes("🔒"), JSON.stringify(r));
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
