// Planner notes vs Ops Room lines (z188): the planner's flight card has two boxes, Planner note (planners only) and For the Ops Room
// (shown in that flight's Ops Room Remarks and on the AFP); the Master Planner flight comment is not shown in the Ops Room.
// Build first: python3 .lodestar_build.py dashboard. Run: node tests/ops_notes.test.js [name-filter]
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const DAY = "2026-10-14";
const ED = { mine: "Flight_Ops_Planner_SUP2", today: DAY, fresh: true };

// a SUP 2 crew flight cell on DAY: { k, r, d, id, code, s }
const flightCell = page => page.evaluate(day => {
  cur.m = +day.slice(5, 7) - 1; const A = actIndex(), M = S.m[cur.m], d = +day.slice(8) - 1;
  for (let i = 0; i < S.roster.length; i++) for (let s = 0; s < 3; s++) {
    const r = gridRow(i, s), v = String(M.grid[r] && M.grid[r][d] || ""), a = v && A.get(v.toUpperCase());
    if (a && a.ci === CAT_FLIGHT) return { k: "g:" + r + ":" + d, r, d, id: S.roster[i].id, code: v, s }; }
  return null;
}, DAY);
const toOps = page => page.evaluate(day => { OPS = true; cur.opsDay = day; document.querySelector("nav.tabs button[data-v='ops']").click(); renderOps(); }, DAY);

test("card_has_planner_note_and_ops_room_boxes", async ({ page }) => {
  const c = await flightCell(page); assert.ok(c, "a flight cell on " + DAY);
  await page.evaluate(() => { document.querySelector("#plMenu button[data-v='plan']").click(); renderPlanner(); });
  const r = await page.evaluate(c => { openCard(c.k); const t = document.getElementById("cellCard").textContent; return { pn: !!document.getElementById("ccIn"), op: !!document.getElementById("ccOps"), t }; }, c);
  assert.ok(r.pn && r.op, "two boxes"); assert.ok(/Planner note/.test(r.t) && /For the Ops Room/.test(r.t), r.t);
}, ED);

test("ops_line_saved_in_column_h_and_reread", async ({ page }) => {
  const c = await flightCell(page);
  const r = await page.evaluate(c => {
    setNote(cur.m, c.r, c.d, "Internal swap idea", false); setNote(cur.m, c.r, c.d, "Back by 1500H", true);
    const out = buildXlsx(), x = td.decode(out.files[WB.paths["Cell Notes"]]), row = S.noteRow.get(cur.m + ":" + c.r + ":" + c.d);
    const cells = readCellsOf(out.files, WB.paths["Cell Notes"], WB.sst || []);
    reparseBook(0, out.bytes);
    return { row, e: cells["E" + row], h: cells["H" + row], back: S.opsNotes.get(cur.m + ":" + c.r + ":" + c.d), pn: S.notes.get(cur.m + ":" + c.r + ":" + c.d), raw: x.includes("Back by 1500H") };
  }, c);
  assert.ok(r.raw, "text in the sheet");
  assert.strictEqual(r.back, "Back by 1500H"); assert.strictEqual(r.pn, "Internal swap idea");
}, ED);

test("clearing_one_keeps_the_other_then_both_clear_the_row", async ({ page }) => {
  const c = await flightCell(page);
  const r = await page.evaluate(c => { const k = cur.m + ":" + c.r + ":" + c.d;
    setNote(cur.m, c.r, c.d, "PN", false); setNote(cur.m, c.r, c.d, "OPS", true); const row = S.noteRow.get(k);
    setNote(cur.m, c.r, c.d, "", false); const a = { row: S.noteRow.get(k), ops: S.opsNotes.get(k), pn: S.notes.get(k) || "" };
    setNote(cur.m, c.r, c.d, "", true); return { row, a, after: S.noteRow.get(k) || null, used: S.noteUsed.has(row) }; }, c);
  assert.strictEqual(r.a.row, r.row); assert.strictEqual(r.a.ops, "OPS"); assert.strictEqual(r.a.pn, "");
  assert.strictEqual(r.after, null); assert.strictEqual(r.used, false);
}, ED);

test("grid_blue_corner_and_tooltip", async ({ page }) => {
  const c = await flightCell(page);
  await page.evaluate(() => { document.querySelector("#plMenu button[data-v='plan']").click(); });
  const r = await page.evaluate(c => { setNote(cur.m, c.r, c.d, "Back by 1500H", true); renderPlanner(); const td = document.querySelector("#plan td[data-k='" + c.k + "']"); return { ops: td.classList.contains("hasops"), note: td.classList.contains("hasnote"), tip: td.title }; }, c);
  assert.ok(r.ops && !r.note, JSON.stringify(r)); assert.ok(/For the Ops Room: Back by 1500H/.test(r.tip), r.tip);
}, ED);

test("ops_room_remarks_show_the_line_not_the_planner_note", async ({ page }) => {
  const c = await flightCell(page);
  await page.evaluate(c => { setNote(cur.m, c.r, c.d, "SECRET planner idea", false); setNote(cur.m, c.r, c.d, "Back by 1500H", true); }, c);
  await toOps(page);
  const r = await page.evaluate(() => { const m = document.getElementById("opsMain"); return { t: m.textContent, lines: [...m.querySelectorAll("td.orem .onoter")].map(x => x.textContent), ocn: [...m.querySelectorAll("td.oc .ocn")].map(x => x.textContent) }; });
  assert.ok(r.lines.some(l => /Back by 1500H/.test(l)), JSON.stringify(r.lines));
  assert.ok(!/SECRET planner idea/.test(r.t), "planner note never on the board");
  assert.ok(!r.ocn.some(t => /Back by|SECRET/.test(t)), "nothing under the name in the seat");
}, ED);

test("master_planner_comment_not_in_the_ops_room_or_afp", async ({ page }) => {
  await toOps(page);
  const r = await page.evaluate(() => { const D = opsDay(cur.opsDay), f = D.rows[0].x.f; f.note = "MPCOMMENT XYZ"; renderOps();
    const A = afpData(cur.opsDay); return { board: document.getElementById("opsMain").innerHTML.includes("MPCOMMENT"), afp: JSON.stringify(A.fl).includes("MPCOMMENT") }; });
  assert.ok(!r.board, "not on the board"); assert.ok(!r.afp, "not on the AFP");
}, ED);

test("afp_remarks_carry_no_planner_lines", async ({ page }) => {
  const c = await flightCell(page);
  await page.evaluate(c => { setNote(cur.m, c.r, c.d, "SECRET planner idea", false); setNote(cur.m, c.r, c.d, "Back by 1500H", true); }, c);
  await toOps(page);
  const r = await page.evaluate(() => JSON.stringify(afpData(cur.opsDay)));
  assert.ok(!/Back by 1500H/.test(r), "no For the Ops Room line on the AFP (z197)"); assert.ok(!/SECRET planner idea/.test(r), "no planner note on the AFP");
}, ED);

(async () => {
  const only = process.argv[2]; let pass = 0, ran = 0, S = null;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue; ran++;
    try { if (!S || (t.opts && t.opts.fresh)) { if (S) await S.close(); S = await boot(Object.assign({}, t.opts)); } await t.fn(S); if (S.errs.length) throw new Error(S.errs.join(" | ")); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 300)); if (S) { await S.close(); S = null; } }
  }
  if (S) await S.close(); console.log(pass + "/" + ran + " pass"); process.exit(pass === ran ? 0 : 1);
})();
