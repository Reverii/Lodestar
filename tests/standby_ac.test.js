// AC tag on standby (P1 / P2 / BU) in the Pilot plan, and standby checked against the MAS OPS rows of the Crew Matrix (z191).
// Build first: python3 .lodestar_build.py dashboard. Run: node tests/standby_ac.test.js [filter]
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const DAY = "2026-10-14";
const PIL = { mine: "Flight_Ops_Planner_Pilot", today: DAY, fresh: true };

// two pilots on P1 on DAY (in memory), the senior one first: { iso, mi, d, a: {i, r, id}, b: {...} }
const setup = page => page.evaluate(day => {
  const mi = +day.slice(5, 7) - 1, d = +day.slice(8) - 1, M = S.m[mi]; cur.m = mi;
  const ppl = S.roster.map((p, i) => ({ p, i })).filter(x => x.p.id && !/inactive/i.test(x.p.status || ""));
  ppl.sort((x, y) => ROLE_RANK(x.p.role) - ROLE_RANK(y.p.role) || CAT_RANK(x.p.cat) - CAT_RANK(y.p.cat));
  // clear P1 / P2 / BU of the day, then put the most senior and the most junior pilot on P1 (AM row)
  S.roster.forEach((p, i) => { for (let s = 0; s < 3; s++) { const g = M.grid[gridRow(i, s)]; if (g && isSb(String(g[d] || "").trim())) g[d] = ""; } });
  const A = ppl[0], B = ppl[ppl.length - 1];
  [A, B].forEach(x => { for (let s = 0; s < 3; s++) M.grid[gridRow(x.i, s)][d] = ""; M.grid[gridRow(x.i, 0)][d] = "P1"; });
  return { mi, d, a: { i: A.i, r: gridRow(A.i, 0), id: A.p.id }, b: { i: B.i, r: gridRow(B.i, 0), id: B.p.id } };
}, DAY);
const p1Row = (page, iso) => page.evaluate(iso => { cmMemo.clear(); const D = opsDay(iso), r = opsSbList(D, D.sb).find(z => /^P1/.test(z.lab || z.x.code)); return r ? r.seats.slice(0, 2).map(c => c && c.id) : null; }, iso);

test("popup_offers_none_and_ac_on_a_standby_cell", async ({ page }) => {
  const x = await setup(page);
  const h = await page.evaluate(x => { popRoleDraw({ r: x.b.r, d: x.d }); const el = document.getElementById("popRole"); return { shown: el.style.display, btn: [...el.querySelectorAll("button")].map(b => b.textContent), t: el.textContent }; }, x);
  assert.strictEqual(h.shown, "block"); assert.deepStrictEqual(h.btn, ["None", "AC"]); assert.ok(/standby/.test(h.t), h.t);
}, PIL);

test("no_tag_keeps_the_senior_pilot_as_ac", async ({ page }) => {
  const x = await setup(page);
  const seats = await p1Row(page, DAY);
  assert.deepStrictEqual(seats, [x.a.id, x.b.id]);
}, PIL);

test("ac_tag_puts_the_tagged_pilot_in_the_ac_seat", async ({ page }) => {
  const x = await setup(page);
  await page.evaluate(x => { roleSet(x.mi, x.b.r, x.d, "AC"); }, x);
  assert.strictEqual(await page.evaluate(x => roleOf(S, x.mi, x.b.r, x.d), x), "AC");
  const seats = await p1Row(page, DAY);
  assert.deepStrictEqual(seats, [x.b.id, x.a.id]);
  const afp = await page.evaluate(day => { const A = afpData(day); const sb = A.sb.find(z => /^P1/.test(z.code)); return sb && sb.seat.Pilot; }, DAY);
  assert.ok(afp && afp.length === 2, JSON.stringify(afp));
}, PIL);

test("standby_checked_as_mas_ops", async ({ page }) => {
  await setup(page);
  const r = await page.evaluate(day => {
    const mb = masterBook(); mb.S.cm = { cats: ["A", "B", "C", "D"], rows: [{ m: "MAS OPS", sh: "", ac: "A", pilot: "A", lm: "A", tacco: "A", s1: "A", s2: "A", note: "" }], errors: [], src: "sheet", all: [] };
    cmMemo.clear(); const D = opsDay(day), row = opsSbList(D, D.sb).find(z => /^P1/.test(z.lab || z.x.code)), res = cmRow(row);
    OPS = true; cur.opsDay = day; document.querySelector("nav.tabs button[data-v='ops']").click(); renderOps();
    const chip = [...document.querySelectorAll("#opsMain tr.sb td.sbc .mxm")].length;
    mb.S.cm = { cats: ["A", "B", "C", "D"], rows: [{ m: "MAS TRG", sh: "", ac: "A", pilot: "", lm: "", tacco: "", s1: "", s2: "", note: "" }], errors: [], src: "sheet", all: [] };
    cmMemo.clear(); const none = cmRow(row);
    return { mission: res && res.mission, ok: res && res.ok, chip, none };
  }, DAY);
  assert.strictEqual(r.mission, "MAS OPS"); assert.strictEqual(r.ok, false); assert.ok(r.chip >= 1, "chip on the standby row"); assert.strictEqual(r.none, null, "no MAS OPS rows = no check");
}, PIL);

test("planner_standby_cell_warns", async ({ page }) => {
  const x = await setup(page);
  const r = await page.evaluate(x => {
    masterBook().S.cm = { cats: ["A", "B", "C", "D"], rows: [{ m: "MAS OPS", sh: "", ac: "A", pilot: "A", lm: "", tacco: "", s1: "", s2: "", note: "" }], errors: [], src: "sheet", all: [] };
    document.querySelector("#plMenu button[data-v='plan']").click(); renderPlanner();
    const td = document.querySelector("#plan td[data-k='g:" + x.b.r + ":" + x.d + "']"); return td ? td.title : null; }, x);
  assert.ok(r && /Standby does not meet the crew matrix/.test(r), r);
}, PIL);

(async () => {
  const only = process.argv[2]; let pass = 0, ran = 0, S = null;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue; ran++;
    try { if (!S || (t.opts && t.opts.fresh)) { if (S) await S.close(); S = await boot(Object.assign({}, t.opts)); } await t.fn(S); if (S.errs.length) throw new Error(S.errs.join(" | ")); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 300)); if (S) { await S.close(); S = null; } }
  }
  if (S) await S.close(); console.log(pass + "/" + ran + " pass"); process.exit(pass === ran ? 0 : 1);
})();
