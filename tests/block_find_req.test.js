// Block of days, Find and Requests: three planner features no other suite covered (bug testing round, 16 Nov).
// Build the dashboard first: python3 .lodestar_build.py dashboard
// Run: node tests/block_find_req.test.js [name-filter]      (LODE_FILES=<folder> for another set)
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });

// a person on the own roster with a callsign, and a leave code from the file's Activities
const pick = page => page.evaluate(() => { useBook(0);
  const i = S.roster.findIndex(p => p.id && p.name), A = actIndex();
  const leave = S.acts.find(a => a.code && (A.get(a.code.toUpperCase()) || {}).ci === CAT_LEAVE);
  const other = S.acts.find(a => a.code && a !== leave && ![CAT_FLIGHT, CAT_LEAVE].includes((A.get(a.code.toUpperCase()) || {}).ci));
  return { i, id: S.roster[i].id, leave: leave.code, other: other.code }; });
// open the Block of days dialog on person i, month mi, day d (0-based), then set its fields
const block = (page, o) => page.evaluate(o => { useBook(0);
  document.querySelector("nav.tabs button[data-v='plan']").click(); cur.m = o.mi; renderControls(); renderPlanner();
  blkOpen("g:" + gridRow(o.i, 0) + ":" + o.d);
  $("blkCode").value = o.code; $("blkFrom").value = o.from; $("blkTo").value = o.to;
  [0, 1, 2].forEach(s => $("blkS" + s).checked = (o.shifts || [0, 1, 2]).includes(s));
  $("blkWe").checked = !!o.skipWe; $("blkHol").checked = !!o.skipHol; $("blkOver").checked = !!o.over;
  blkPreview(); return { prev: $("blkPrev").innerText, go: !$("blkGo").disabled }; }, o);
const go = page => page.evaluate(() => { $("blkGo").click(); });
const at = (page, i, s, mi, d) => page.evaluate(([i, s, mi, d]) => { useBook(0); return String(S.m[mi].grid[gridRow(i, s)][d] || ""); }, [i, s, mi, d]);
// build the saved file in memory and read it back as a fresh open
// (inside withBook, as a real save does: logBuild builds the book that is in use)
// (LODE_DUMP=<folder>: each saved file is also written there, for tests/xlsx_check.py)
let dumpN = 0;
const roundTrip = async (page, bi = 0) => {
  const r = await page.evaluate(bi => { const bk = books[bi], bytes = withBook(bi, () => logBuild(bk, new Map(bk.dirty)).bytes);
    bk.dirty = new Map(); reparseBook(bi, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    return window.__dump ? { name: bk.WB.name, b64: btoa(Array.from(bytes, c => String.fromCharCode(c)).join("")) } : null; }, bi);
  if (r && process.env.LODE_DUMP) { const fs = require("fs"), path = require("path"); fs.mkdirSync(process.env.LODE_DUMP, { recursive: true });
    fs.writeFileSync(path.join(process.env.LODE_DUMP, path.basename(__filename, ".test.js") + "_saved_" + process.pid + "_" + (++dumpN) + "_" + r.name), Buffer.from(r.b64, "base64")); }
};
const clear = (page, i, mis) => page.evaluate(([i, mis]) => { useBook(0); for (const mi of mis) for (let s = 0; s < 3; s++) S.m[mi].grid[gridRow(i, s)].fill(""); }, [i, mis]);

test("block_across_two_months_skipping_weekends_is_saved", async ({ page, errs }) => {
  const p = await pick(page); await clear(page, p.i, [9, 10]);
  // Thu 29 Oct 2026 to Tue 3 Nov 2026, weekends off: 29, 30 Oct, 2, 3 Nov = 4 days x 3 shifts
  const r = await block(page, { i: p.i, mi: 9, d: 28, code: p.leave, from: "2026-10-29", to: "2026-11-03", skipWe: true });
  assert.ok(r.go && /on 4 days/.test(r.prev) && /fills 12 cells/.test(r.prev), r.prev);
  await go(page);
  for (const [mi, d] of [[9, 28], [9, 29], [10, 1], [10, 2]]) for (const s of [0, 1, 2]) assert.strictEqual(await at(page, p.i, s, mi, d), p.leave, "day " + (d + 1) + " month " + mi + " shift " + s);
  for (const [mi, d] of [[9, 30], [10, 0]]) assert.strictEqual(await at(page, p.i, 0, mi, d), "", "weekend left empty");
  assert.strictEqual(await at(page, p.i, 3, 9, 28), "", "the WD row is not part of a block");
  await roundTrip(page);
  assert.strictEqual(await at(page, p.i, 1, 10, 2), p.leave, "saved and read back");
  assert.strictEqual(await at(page, p.i, 0, 9, 30), "");
  assert.deepStrictEqual(errs.filter(e => /PAGEERROR/.test(e)), []);
});

test("block_keeps_filled_cells_unless_replace_is_ticked", async ({ page }) => {
  const p = await pick(page); await clear(page, p.i, [10]);
  await page.evaluate(([i, c]) => { useBook(0); S.m[10].grid[gridRow(i, 1)][9] = c; }, [p.i, p.other]);   // PM on 10 Nov already has something
  let r = await block(page, { i: p.i, mi: 10, d: 8, code: p.leave, from: "2026-11-09", to: "2026-11-11" });
  assert.ok(/fills 8 cells/.test(r.prev) && /1 cell already has something and is kept/.test(r.prev), r.prev);
  await go(page);
  assert.strictEqual(await at(page, p.i, 1, 10, 9), p.other, "kept");
  assert.strictEqual(await at(page, p.i, 0, 10, 9), p.leave);
  r = await block(page, { i: p.i, mi: 10, d: 8, code: p.leave, from: "2026-11-09", to: "2026-11-11", over: true });
  assert.ok(/fills 1 cell\b/.test(r.prev) && /Replaces 1 cell/.test(r.prev), r.prev);
  await go(page);
  assert.strictEqual(await at(page, p.i, 1, 10, 9), p.leave, "replaced");
});

test("block_is_one_undo_step", async ({ page }) => {
  const p = await pick(page); await clear(page, p.i, [11]);
  await page.evaluate(() => { undoReset(); });
  await page.waitForFunction(() => !undoPend);
  await block(page, { i: p.i, mi: 11, d: 13, code: p.leave, from: "2026-12-14", to: "2026-12-18" });
  await go(page); await page.waitForTimeout(50);
  assert.strictEqual(await at(page, p.i, 2, 11, 17), p.leave);
  await page.evaluate(() => undo());
  for (let d = 13; d <= 17; d++) for (const s of [0, 1, 2]) assert.strictEqual(await at(page, p.i, s, 11, d), "", "undone " + (d + 1) + " Dec shift " + s);
  await page.evaluate(() => undo(false));
  assert.strictEqual(await at(page, p.i, 0, 11, 13), p.leave, "redo puts it back");
});

test("block_runs_into_january_next_year", async ({ page }) => {
  const p = await pick(page);
  const nx = await page.evaluate(() => { useBook(0); return !!S.nx; });
  if (!nx) { console.log("skip block_runs_into_january_next_year: this file has no Jan (next year) tab"); return; }
  await clear(page, p.i, [11, 12]);
  const r = await block(page, { i: p.i, mi: 11, d: 29, code: p.leave, from: "2026-12-30", to: "2027-01-02", shifts: [0] });
  assert.ok(r.go && /on 4 days/.test(r.prev), r.prev);
  await go(page);
  assert.strictEqual(await at(page, p.i, 0, 11, 30), p.leave, "31 Dec");
  assert.strictEqual(await at(page, p.i, 0, 12, 1), p.leave, "2 Jan next year, on the Jan (next year) tab");
  assert.strictEqual(await at(page, p.i, 0, 0, 1), "", "not on this year's January");
  await roundTrip(page);
  assert.strictEqual(await at(page, p.i, 0, 12, 0), p.leave, "saved on Jan (next year)");
});

test("block_refuses_bad_dates", async ({ page }) => {
  const p = await pick(page);
  let r = await block(page, { i: p.i, mi: 9, d: 0, code: p.leave, from: "2026-10-10", to: "2026-10-05" });
  assert.ok(!r.go && /before the first day/.test(r.prev), r.prev);
  r = await block(page, { i: p.i, mi: 9, d: 0, code: p.leave, from: "2025-12-30", to: "2026-01-02" });
  assert.ok(!r.go && /must be in 2026/.test(r.prev), r.prev);
  r = await block(page, { i: p.i, mi: 9, d: 0, code: p.leave, from: "2026-10-05", to: "2026-10-06", shifts: [] });
  assert.ok(!r.go && /at least one shift/.test(r.prev), r.prev);
});

test("find_outlines_matching_cells_and_names", async ({ page }) => {
  const p = await pick(page); await clear(page, p.i, [9]);
  await page.evaluate(([i, c]) => { useBook(0); [3, 4, 5].forEach(d => S.m[9].grid[gridRow(i, 0)][d] = c); }, [p.i, p.leave]);
  const find = q => page.evaluate(q => { document.querySelector("nav.tabs button[data-v='plan']").click(); cur.m = 9; renderControls(); const f = $("find"); f.value = q; f.dispatchEvent(new Event("input"));
    return { info: $("findInfo").textContent, hits: cur.hits.length, mine: cur.hits.filter(k => k.startsWith("g:")).length, names: document.querySelectorAll("#plan td.hitw").length }; }, q);
  let r = await find(p.leave);
  assert.ok(r.mine >= 3 && /cells/.test(r.info), JSON.stringify(r));
  r = await find(p.id);
  assert.ok(r.names >= 1 && /name/.test(r.info), JSON.stringify(r));
  r = await find("ZZQXJ");
  assert.strictEqual(r.info, "Not found this month");
  // Enter walks the hits
  await find(p.leave);
  await page.focus("#find"); await page.keyboard.press("Enter");
  const sel = await page.evaluate(() => [cur.hitI, cur.sel, document.querySelectorAll("#plan td.hit.cur").length]);
  assert.ok(sel[0] === 0 && sel[1] && sel[2] === 1, JSON.stringify(sel));
});

test("request_raised_answered_and_read_back", async ({ page }) => {
  // the department raises it, the Master Planner answers: Ops Room mode, where every open file may be edited
  await page.evaluate(() => { OPS = true; });
  const has = await page.evaluate(() => books[0].S.hasReq && mpIdx() >= 0 && books[mpIdx()].S.rep != null);
  if (!has) { console.log("skip request_raised_answered_and_read_back: no Requests sheet in this set"); return; }
  const n0 = await page.evaluate(() => reqAll().length);
  await page.evaluate(() => reqAdd("Need a sim slot for VIPER, week 47"));
  let q = await page.evaluate(() => reqAll().find(x => x.note === "Need a sim slot for VIPER, week 47"));
  assert.ok(q && !q.ans, JSON.stringify(q));
  assert.strictEqual(await page.evaluate(() => reqAll().length), n0 + 1);
  await page.evaluate(id => { const q = reqAll().find(x => x.id === id); reqAnswer(q, "Done", "Booked Tue AM"); }, q.id);
  // both files saved and read back
  await roundTrip(page, 0); await roundTrip(page, await page.evaluate(() => mpIdx()));
  q = await page.evaluate(id => reqAll().find(x => x.id === id), q.id);
  assert.ok(q && q.ans && q.ans.st === "Done" && q.ans.reply === "Booked Tue AM", JSON.stringify(q));
  // withdraw it
  await page.evaluate(id => { const q = reqAll().find(x => x.id === id); reqWithdraw(q.bi, q.row); }, q.id);
  await roundTrip(page, 0);
  assert.strictEqual(await page.evaluate(id => reqAll().some(x => x.id === id), q.id), false, "withdrawn and gone after a save");
});

test("view_only_master_planner_offers_no_edits", async ({ page }) => {
  // z209: the Master Planner opened with view access only (SharePoint permission): no answer buttons, no edits that would never be saved
  const r = await page.evaluate(() => { const before = mpEditable(); books[0].noEdit = true; const after = mpEditable();
    const bi = books.findIndex(b => isDept(b) && b.S.hasReq); if (bi >= 0) books[bi].S.req.push({ row: 99, id: "TST-1", iso: "", s: -1, type: "", code: "", note: "test", raised: "2026-10-20" });
    cur.rqShow = true; document.querySelector("nav.tabs button[data-v='mp']") && document.querySelector("nav.tabs button[data-v='mp']").click(); renderMp();
    return { before, after, answer: document.querySelectorAll("[data-rqa]").length, req: bi >= 0 }; });
  assert.strictEqual(r.before, true, "the Master Planner's own file is editable");
  assert.strictEqual(r.after, false, "not with view access only");
  assert.strictEqual(r.answer, 0, "no Done / Decline buttons");
}, { mine: "Master_Planner" });

(async () => {
  const only = process.argv[2];
  let pass = 0, ran = 0;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue;
    ran++; let S = null;
    try { S = await boot(Object.assign({}, t.opts)); if (process.env.LODE_DUMP) await S.page.evaluate(() => { window.__dump = true; }); await t.fn(S);
      const bad = S.errs.filter(e => /PAGEERROR/.test(e)); if (bad.length) throw new Error(bad.join(" | "));
      pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 400)); }
    if (S) await S.close();
  }
  console.log(pass + "/" + ran + " pass");
  process.exit(pass === ran ? 0 : 1);
})();
