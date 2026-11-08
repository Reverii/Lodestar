// Drag (z203): the Planner fill handle and Crew Roster drag to reorder. Build the dashboard first.
// node tests/drag.test.js [name-filter]. Uses the repo's demo set (or LODE_FILES); nothing is saved to disk.
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const NOV = 10;
const toPlan = page => page.evaluate(m => { document.querySelector("nav.tabs button[data-v='plan']").click(); cur.m = m; renderPlanner(); }, NOV);
const g = (page, r, d) => page.evaluate(([r, d]) => S.m[cur.m].grid[r][d] || "", [r, d]);
const setG = async (page, r, d, v) => { await page.evaluate(([r, d, v]) => { setVal("g:" + r + ":" + d, v, true); renderPlanner(); }, [r, d, v]); await page.waitForTimeout(5); };   // through put(), so Undo has a step for it
const flightCode = page => page.evaluate(() => [...actIndex().values()].find(a => a.ci === CAT_FLIGHT).code);
const groundCode = page => page.evaluate(() => [...actIndex().values()].find(a => a.ci === CAT_ADMIN).code);   // demo: Meeting (its ground duties are only the standby codes)
const leaveCode = page => page.evaluate(() => [...actIndex().values()].filter(a => a.ci === CAT_LEAVE).pop().code);
const centre = (page, sel) => page.evaluate(sel => { const e = document.querySelector(sel); e.scrollIntoView({ block: "center", inline: "center" }); const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, sel);
const cell = (r, d) => "#plan td[data-k='g:" + r + ":" + d + "']";
// select a cell, then drag its handle to another cell
async function fill(page, r, d, r1, d1, opts = {}) {
  await page.click(cell(r, d)); await page.keyboard.press("Escape");
  const h = await centre(page, cell(r, d) + " .fillh");
  await page.mouse.move(h.x, h.y); await page.mouse.down();
  const t = await page.evaluate(sel => { const b = document.querySelector(sel).getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, cell(r1, d1));
  await page.mouse.move(t.x, t.y, { steps: 6 });
  const tip = await page.evaluate(() => { const t = document.getElementById("fillTip"); return t && t.style.display !== "none" ? t.textContent : ""; });
  const box = await page.evaluate(() => document.querySelectorAll("#plan td.fillin").length);
  if (opts.esc) await page.keyboard.press("Escape");
  await page.mouse.up();
  return { tip, box };
}

test("handle_on_a_ground_cell_not_on_a_flight_or_empty_cell", async ({ page }) => {
  await toPlan(page); const fc = await flightCode(page), gc = await groundCode(page);
  await setG(page, 0, 20, gc); await setG(page, 0, 21, fc); await setG(page, 0, 22, "");
  await page.click(cell(0, 20)); assert.strictEqual(await page.locator(cell(0, 20) + " .fillh").count(), 1, "ground cell has the handle");
  await page.click(cell(0, 21)); assert.strictEqual(await page.locator("#plan .fillh").count(), 0, "a flight cell has none");
  await page.click(cell(0, 22)); assert.strictEqual(await page.locator("#plan .fillh").count(), 0, "an empty cell has none");
}, { today: "2026-11-04" });

test("drag_along_the_row_fills_the_days_and_undo_takes_it_back", async ({ page }) => {
  await toPlan(page); const gc = await groundCode(page);
  for (let d = 20; d <= 24; d++) await setG(page, 0, d, "");
  await setG(page, 0, 20, gc);
  const r = await fill(page, 0, 20, 0, 23);
  assert.ok(/Copy .* to 3 cells/.test(r.tip), "tip: " + r.tip); assert.strictEqual(r.box, 3);
  for (let d = 21; d <= 23; d++) assert.strictEqual(await g(page, 0, d), gc, "day " + (d + 1));
  assert.strictEqual(await g(page, 0, 24), "", "stops where the drag stopped");
  const saved = await page.evaluate(() => [...books[cur.b].dirty.values()].filter(e => /^Nov$/.test(e.sheet)).length);
  assert.ok(saved >= 3, "written to the Nov sheet: " + saved);
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll("#plan td.fillin").length + !!document.getElementById("fillTip")), 0, "box and tip gone");
  assert.strictEqual(await page.evaluate(() => getComputedStyle(document.getElementById("cellCard") || document.body).display === "block" && document.getElementById("cellCard") ? "card" : ""), "", "no flight card opened by the drag");
  await page.waitForTimeout(50); await page.keyboard.press("Control+z"); await page.waitForTimeout(50);
  assert.strictEqual(await g(page, 0, 22), "", "one Ctrl+Z undoes the whole fill");
}, { today: "2026-11-04" });

test("flights_in_the_box_are_kept_other_cells_replaced", async ({ page }) => {
  await toPlan(page); const fc = await flightCode(page), gc = await groundCode(page), lv = await leaveCode(page);
  await setG(page, 0, 20, lv); await setG(page, 0, 21, fc); await setG(page, 0, 22, gc); await setG(page, 0, 23, "");
  const r = await fill(page, 0, 20, 0, 23);
  assert.ok(/1 replaced/.test(r.tip) && /1 flight kept/.test(r.tip), r.tip);
  assert.deepStrictEqual([await g(page, 0, 21), await g(page, 0, 22), await g(page, 0, 23)], [fc, lv, lv]);
}, { today: "2026-11-04" });

test("down_across_shifts_and_crew", async ({ page }) => {
  await toPlan(page); const gc = await groundCode(page);
  const rows = await page.evaluate(() => [gridRow(0, 0), gridRow(0, 1), gridRow(0, 2), gridRow(1, 0), gridRow(1, 1)]);
  for (const r of rows) for (let d = 20; d <= 21; d++) await setG(page, r, d, "");
  await setG(page, rows[0], 20, gc);
  const r = await fill(page, rows[0], 20, rows[4], 21);
  assert.ok(/2 crew/.test(r.tip), r.tip);
  for (const rr of rows) for (let d = 20; d <= 21; d++) assert.strictEqual(await g(page, rr, d), gc, "row " + rr + " day " + (d + 1));
  const wd = await page.evaluate(() => gridRow(0, 3)); if (wd !== rows[1] && wd !== rows[2]) assert.strictEqual(await g(page, wd, 21), await g(page, wd, 21));   // the WD row follows wdAllowed (checked below)
}, { today: "2026-11-04" });

test("wd_row_only_takes_what_it_allows", async ({ page }) => {
  await toPlan(page); const lv = await leaveCode(page);
  const [am, wd] = await page.evaluate(() => [gridRow(0, 2), gridRow(0, 3)]);
  if (wd === undefined || !(await page.evaluate(() => rp() > 3))) return;
  await setG(page, am, 25, lv); await setG(page, wd, 25, "");
  const r = await fill(page, am, 25, wd, 25);
  assert.strictEqual(await g(page, wd, 25), "", "leave is not put on the WD row");
  assert.ok(/WD row|Nothing/.test(r.tip), r.tip);
}, { today: "2026-11-04" });

test("escape_cancels", async ({ page }) => {
  await toPlan(page); const gc = await groundCode(page);
  await setG(page, 0, 26, gc); await setG(page, 0, 27, "");
  await fill(page, 0, 26, 0, 27, { esc: true });
  assert.strictEqual(await g(page, 0, 27), "");
}, { today: "2026-11-04" });

test("no_handle_in_a_view_only_file", async ({ page }) => {
  await page.evaluate(() => { useBook(books.findIndex(b => isDept(b) && b.S.dept === "TACCO")); renderAll(); });
  await toPlan(page);
  const k = await page.evaluate(() => { const G = S.m[cur.m].grid; for (let r = 0; r < G.length; r++) for (let d = 0; d < 28; d++) if (G[r][d]) { const a = actIndex().get(String(G[r][d]).toUpperCase()); if (a && a.ci !== CAT_FLIGHT) return "g:" + r + ":" + d; } return null; });
  if (!k) return; await page.evaluate(k => select(k), k);
  assert.strictEqual(await page.locator("#plan .fillh").count(), 0);
}, { today: "2026-11-04" });

// ---------- Crew Roster
const openRoster = page => page.evaluate(() => document.querySelector("nav.tabs button[data-v='roster']").click());
const ids = (page, n) => page.evaluate(n => S.roster.slice(0, n).map(p => p.id), n);
const plan = (page, i) => page.evaluate(i => S.m.map(M => M.grid.slice(gridRow(i, 0), gridRow(i, rp())).map(r => r.join(",")).join("|")).join("#"), i);
async function dragRow(page, from, to, half) {
  const a = await centre(page, "#rosterTable tr[data-ri='" + from + "'] td.n");
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  const b = await page.evaluate(([to, half]) => { const r = document.querySelector("#rosterTable tr[data-ri='" + to + "']").getBoundingClientRect(); return { x: r.x + 60, y: r.y + r.height * (half === "top" ? 0.25 : 0.75) }; }, [to, half]);
  await page.mouse.move(b.x, b.y, { steps: 6 });
  const tip = await page.evaluate(() => { const t = document.getElementById("rdTip"); return t ? t.textContent : ""; });
  await page.mouse.up(); return tip;
}
test("roster_drag_down_moves_the_person_with_their_plans", async ({ page }) => {
  await openRoster(page);
  assert.deepStrictEqual(await ids(page, 6), ["VIPER", "HAWK", "RAPTOR", "FALCON", "EAGLE", "OWL"]);
  const ph = await plan(page, 1), pr = await plan(page, 2);
  const tip = await dragRow(page, 1, 4, "bottom");
  assert.ok(/Move HAWK below EAGLE/.test(tip), tip);
  assert.deepStrictEqual(await ids(page, 6), ["VIPER", "RAPTOR", "FALCON", "EAGLE", "HAWK", "OWL"]);
  assert.strictEqual(await plan(page, 4), ph, "HAWK's plans moved with them"); assert.strictEqual(await plan(page, 1), pr, "RAPTOR's plans moved up");
  assert.ok(await page.evaluate(() => [...books[cur.b].dirty.values()].some(e => /HAWK moved below EAGLE/.test(e.quiet || ""))), "Change Log line");
  await page.keyboard.press("Control+z"); await page.waitForTimeout(50);
  assert.deepStrictEqual(await ids(page, 6), ["VIPER", "HAWK", "RAPTOR", "FALCON", "EAGLE", "OWL"], "Ctrl+Z");
});
test("roster_drag_up_above_a_person", async ({ page }) => {
  await openRoster(page);
  const tip = await dragRow(page, 4, 1, "top");
  assert.ok(/Move EAGLE above HAWK/.test(tip), tip);
  assert.deepStrictEqual(await ids(page, 6), ["VIPER", "EAGLE", "HAWK", "RAPTOR", "FALCON", "OWL"]);
});
test("roster_drag_does_not_cross_groups", async ({ page }) => {
  await openRoster(page);
  const sans = await page.evaluate(() => S.roster.findIndex((p, j) => j >= REG_N && !rosEmpty(p)));
  if (sans < 0) return;
  const before = await page.evaluate(() => S.roster.map(p => p.id).join());
  const tip = await dragRow(page, 1, sans, "bottom");
  assert.ok(/same group/.test(tip), tip);
  assert.strictEqual(await page.evaluate(() => S.roster.map(p => p.id).join()), before, "nothing moved");
});
test("roster_no_grip_in_a_view_only_file", async ({ page }) => {
  await page.evaluate(() => { useBook(books.findIndex(b => isDept(b) && b.S.dept === "TACCO")); renderAll(); });
  await openRoster(page);
  assert.ok(await page.evaluate(() => !document.getElementById("rosterTable").classList.contains("rdok")));
  const before = await page.evaluate(() => S.roster.map(p => p.id).join());
  await dragRow(page, 1, 3, "bottom");
  assert.strictEqual(await page.evaluate(() => S.roster.map(p => p.id).join()), before);
});

(async () => {
  const only = process.argv[2];
  let pass = 0, ran = 0;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue;
    ran++; let S = null;
    try { S = await boot(Object.assign({}, t.opts)); await t.fn(S); if (S.errs.length) throw new Error("page errors: " + S.errs.join(" | ").slice(0, 1500)); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n").slice(0, 3).join(" ").slice(0, 1500)); }
    if (S) await S.close();
  }
  console.log(pass + "/" + ran + " pass");
  process.exit(pass === ran ? 0 : 1);
})();
