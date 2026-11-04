// Crew matrix (warn only). Build first: python3 .lodestar_build.py dashboard
// Run: node tests/crew_matrix.test.js [name-filter]
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const chk = (page, mission, shift, G) => page.evaluate(([m, s, g]) => { const r = cmCheck(m, s, Object.assign({ ac: [], pilot: [], lm: [], tacco: [], sup: [] }, g)); return r && { ok: r.ok, fails: r.fails }; }, [mission, shift, G]);

// ---- the rule
test("trg_row_one_passes", async ({ page }) => { assert.deepStrictEqual(await chk(page, "MAS TRG", 0, { ac: ["A"], pilot: ["D"], lm: ["C"], tacco: ["C"], sup: ["C", "C"] }), { ok: true, fails: [] }); });
test("trg_ac_b_needs_better_copilot", async ({ page }) => {
  const r = await chk(page, "MAS TRG", 0, { ac: ["B"], pilot: ["C"], lm: ["C"], tacco: ["C"], sup: ["B", "C"] }); assert.strictEqual(r.ok, true, "row 4 (B, C, C, C, B+C)");
  const q = await chk(page, "MAS TRG", 0, { ac: ["B"], pilot: ["D"], lm: ["C"], tacco: ["C"], sup: ["B", "C"] }); assert.strictEqual(q.ok, false); assert.strictEqual(q.fails.length, 1, "closest row misses by one seat: " + q.fails);
});
test("copilot_c_or_d_means_d_is_fine", async ({ page }) => {
  assert.strictEqual((await chk(page, "MAS OPS", 1, { ac: ["A"], pilot: ["D"], lm: ["C"], tacco: ["D"], sup: ["B", "C"] })).ok, true);
});
test("sups_either_way_round", async ({ page }) => {
  const a = await chk(page, "MAS OPS", 0, { ac: ["A"], pilot: ["C"], lm: ["C"], tacco: ["D"], sup: ["B", "C"] }), b = await chk(page, "MAS OPS", 0, { ac: ["A"], pilot: ["C"], lm: ["C"], tacco: ["D"], sup: ["C", "B"] });
  assert.strictEqual(a.ok, true); assert.strictEqual(b.ok, true);
  const c = await chk(page, "MAS OPS", 0, { ac: ["A"], pilot: ["C"], lm: ["C"], tacco: ["D"], sup: ["C", "C"] }); assert.strictEqual(c.ok, false); assert.ok(c.fails.includes("Sups"));
});
test("sup_d_ok_when_the_other_is_c", async ({ page }) => {   // the matrix note: either SUP can be D provided the other is C
  assert.strictEqual((await chk(page, "MAS TRG", 0, { ac: ["A"], pilot: ["C"], lm: ["C"], tacco: ["B"], sup: ["D", "C"] })).ok, true);
  assert.strictEqual((await chk(page, "MAS TRG", 0, { ac: ["A"], pilot: ["C"], lm: ["C"], tacco: ["B"], sup: ["D", "D"] })).ok, false);
});
test("empty_seats_are_not_counted_against", async ({ page }) => {
  assert.strictEqual((await chk(page, "MAS TRG", 0, { ac: ["B"] })).ok, true);
  assert.strictEqual((await chk(page, "MAS TRG", 0, { ac: ["D"] })).ok, false);
  assert.strictEqual((await chk(page, "MAS TRG", 0, { sup: ["D"] })).ok, true, "one SUP planned: C would be needed on the weaker seat, D is not enough");
});
test("one_sup_must_fit_the_weaker_slot", async ({ page }) => {
  assert.strictEqual((await chk(page, "MAS TRG", 0, { ac: ["A"], sup: ["C"] })).ok, true);
  assert.strictEqual((await chk(page, "MAS TRG", 0, { ac: ["A"], sup: ["D"] })).ok, true, "row 3 allows C and D");
  assert.strictEqual((await chk(page, "MAS TACT", 0, { ac: ["A"], sup: ["C"] })).ok, true);
  assert.strictEqual((await chk(page, "MAS TACT", 0, { ac: ["A"], sup: ["D"] })).ok, false);
});
test("trainee_is_below_the_last_cat", async ({ page }) => { assert.strictEqual((await chk(page, "MAS TRG", 0, { ac: ["A"], lm: ["TRAINEE"] })).ok, false); assert.strictEqual((await chk(page, "MAS TRG", 0, { ac: ["A"], lm: [""] })).ok, false); });
test("tact_night_uses_its_own_row", async ({ page }) => {
  const G = { ac: ["A"], pilot: ["C"], lm: ["C"], tacco: ["C"], sup: ["B", "C"] };
  assert.strictEqual((await chk(page, "MAS TACT", 0, G)).ok, true, "day row 1");
  assert.strictEqual((await chk(page, "MAS TACT", 2, G)).ok, false, "night needs TACCO B and Sups B and B");
  assert.strictEqual((await chk(page, "MAS TACT", 2, { ac: ["A"], pilot: ["C"], lm: ["C"], tacco: ["B"], sup: ["B", "B"] })).ok, true);
});
test("other_missions_are_not_checked", async ({ page }) => { assert.strictEqual(await chk(page, "GEN", 0, { ac: ["D"] }), null); assert.strictEqual(await chk(page, "", 0, { ac: ["D"] }), null); });
test("mission_name_ignores_case_and_spaces", async ({ page }) => { assert.strictEqual((await chk(page, " mas  trg ", 0, { ac: ["D"] })).ok, false); });
test("cat_parsing", async ({ page }) => {
  assert.deepStrictEqual(await page.evaluate(() => ["CAT B", "cat c", "A", "TRAINEE", "", "CAT D "].map(cmCat)), ["B", "C", "A", "", "", "D"]);
});

// ---- the surfaces. opsCrewOn and cmMission are stubbed so the crew can be exactly what a test needs.
const STUB = `(() => {
  window.__mission = "MAS TRG"; window.cmMission = () => window.__mission;
  const P = (dept, i, cat, tag) => ({ dept, i, id: dept + i, name: dept + i, ini: dept.slice(0, 2) + i, cat, status: "", role: "", code: window.__code, tag: tag || "" });
  window.__crew = [P("Pilot", 0, "CAT B", "AC"), P("Pilot", 1, "CAT C"), P("Loadmaster", 0, "CAT C"), P("TACCO", 0, "CAT C"), P("SUP 1", 0, "CAT B"), P("SUP 2", 0, "CAT C")];
  window.opsCrewOn = () => { const o = [[], [], []]; o.sb = [[], [], []]; o[0] = window.__crew; return o; };
})()`;
test("flight_result_pass_and_fail", async ({ page }) => {
  const r = await page.evaluate(stub => { window.__code = "FLT-2.0"; eval(stub); cmMemo.clear(); const a = cmFlight(9, 13, 0, "FLT-2.0"); window.__crew[1].cat = "CAT D"; cmMemo.clear(); const b = cmFlight(9, 13, 0, "FLT-2.0");
    window.__mission = "GEN"; cmMemo.clear(); return [a.ok, b.ok, b.fails.length, cmFlight(9, 13, 0, "FLT-2.0")]; }, STUB);
  assert.deepStrictEqual(r, [true, false, 1, null]);
});
test("ties_list_every_closest_row", async ({ page }) => {   // z169: Brandon's MAS TACT row (A A A A A D) and a built-in row both miss by one seat
  const r = await page.evaluate(() => {
    const R = { cats: ["A", "B", "C", "D"], rows: CM_DEFAULT.rows.concat([{ m: "MAS TACT", sh: "", ac: "A", pilot: "A", lm: "A", tacco: "A", s1: "A", s2: "D", note: "" }]) };
    const x = cmCheck("MAS TACT", 0, { ac: ["CAT A"], pilot: ["CAT A"], lm: ["CAT A"], tacco: ["CAT B"], sup: ["CAT D", "CAT A"] }, R);
    return { ok: x.ok, n: x.near.length, t: cmText(x) };
  });
  assert.strictEqual(r.ok, false); assert.ok(r.n >= 2, r.t);
  assert.ok(r.t.includes("TACCO A, Sups A and D (misses TACCO)"), r.t); assert.ok(/\(misses Sups\)/.test(r.t), r.t);
});
test("pax_is_ignored", async ({ page }) => {
  const r = await page.evaluate(stub => { window.__code = "FLT-2.0"; eval(stub); window.__crew.push({ dept: "Pilot", i: 9, id: "P9", name: "P9", ini: "P9", cat: "TRAINEE", code: "FLT-2.0", tag: "PAX" }); cmMemo.clear(); return cmFlight(9, 13, 0, "FLT-2.0").ok; }, STUB);
  assert.strictEqual(r, true);
});
test("no_ac_tag_best_cat_is_the_captain", async ({ page }) => {
  const r = await page.evaluate(stub => { window.__code = "FLT-2.0"; eval(stub); window.__crew[0].tag = ""; window.__crew[0].cat = "CAT D"; window.__crew[1].cat = "CAT A"; cmMemo.clear(); return cmFlight(9, 13, 0, "FLT-2.0").ok; }, STUB);
  assert.strictEqual(r, true, "A is the Captain, D is the co-pilot: row 1 needs AC A, co-pilot D, LM C, TACCO C, Sups C and C... Sup 1 is B so it fits");
});
test("card_shows_the_matrix_line_and_cat_letters", async ({ page, errs }) => {
  const r = await page.evaluate(stub => { window.__code = "FLT-2.0"; eval(stub); window.__crew[1].cat = "CAT D"; const h = cardSeatsHtml(9, 13, 0, "FLT-2.0", "Pilot", 1); const d = document.createElement("div"); d.innerHTML = h; return { no: !!d.querySelector(".cmx.no"), cats: [...d.querySelectorAll(".ccat")].map(x => x.textContent).join(""), t: d.querySelector(".cmx").textContent }; }, STUB);
  assert.ok(r.no, r.t); assert.strictEqual(r.cats, "BDCCBC"); assert.ok(/Closest rows?\b/.test(r.t), r.t);
  const g = await page.evaluate(stub => { window.__mission = "GEN"; return cardSeatsHtml(9, 13, 0, "FLT-2.0", "Pilot", 1).includes("cmx"); }, STUB);
  assert.strictEqual(g, false, "a code outside the matrix shows no line");
  assert.deepStrictEqual(errs, []);
});
test("planner_cell_warns_only_on_a_failing_flight", async ({ page, errs }) => {
  const r = await page.evaluate(stub => { const A = actIndex(), fl = S.acts.find(a => a.code && (A.get(a.code.toUpperCase()) || {}).ci === CAT_FLIGHT); window.__code = fl.code; S.m[9].grid[0][13] = fl.code; cur.m = 9; eval(stub);
    renderPlanner(); const ok = cellEl("g:0:13").querySelector(".cw"); window.__crew[1].cat = "CAT D"; renderPlanner(); const el = cellEl("g:0:13"), w = el.querySelector(".cw");
    return { before: !!ok && /MATRIX/.test(ok.textContent), after: w && w.textContent, tip: el.title }; }, STUB);
  assert.ok(!r.before, "a passing crew shows no matrix warning"); assert.ok(/CREW MATRIX/.test(r.after), r.after); assert.ok(/Does not meet the crew matrix/.test(r.tip), r.tip);
  assert.deepStrictEqual(errs, []);
});
test("ops_room_row_check", async ({ page }) => {
  const r = await page.evaluate(() => { window.cmMission = () => "MAS TRG"; const p = (cat) => ({ cat }), row = (ac, co) => ({ x: { code: "X", s: 0 }, seats: [p(ac), p(co), p("CAT C"), p("CAT C"), p("CAT B"), p("CAT C")] });
    return [cmRow(row("CAT B", "CAT C")).ok, cmRow(row("CAT B", "CAT D")).ok, cmRow({ x: { code: "X", s: 0, sb: true }, seats: [] })]; });
  assert.deepStrictEqual(r, [true, false, null]);
});
test("ops_room_shows_the_mark", async ({ page, errs }) => {
  const r = await page.evaluate(() => { window.cmMission = () => "MAS TRG"; window.cmRow = () => ({ ok: false, mission: "MAS TRG", fails: ["AC"], closest: "AC A" });
    document.querySelector("nav.tabs button[data-v='ops']") && document.querySelector("nav.tabs button[data-v='ops']").click(); renderOps(); return document.querySelectorAll(".mxm").length; });
  assert.ok(r >= 0); assert.deepStrictEqual(errs, []);
}, { today: "2026-10-14" });


// ---- the Crew Matrix sheet and its page
const CELLS = `({ K2: "A, B, C", A2: "X MISSION", B2: "night", C2: "a", D2: "c", G2: "b", H2: "c", I2: "note", A3: "BAD CAT", C3: "E", A4: "BAD SHIFT", B4: "dusk", C4: "A", A5: "NO SEATS", A6: "", I6: "", A7: "ok2", E7: "b" })`;
test("parse_reads_rows_and_lists_the_bad_ones", async ({ page }) => {
  const r = await page.evaluate(c => cmParse(eval(c)), CELLS);
  assert.deepStrictEqual(r.cats, ["A", "B", "C"]); assert.strictEqual(r.rows.length, 2);
  assert.deepStrictEqual({ m: r.rows[0].m, sh: r.rows[0].sh, ac: r.rows[0].ac, pilot: r.rows[0].pilot, s1: r.rows[0].s1, s2: r.rows[0].s2, note: r.rows[0].note }, { m: "X MISSION", sh: "Night", ac: "A", pilot: "C", s1: "B", s2: "C", note: "note" });
  assert.strictEqual(r.errors.length, 3, r.errors.join(" | ")); assert.ok(/not in the CAT order/.test(r.errors[0]) && /Shift/.test(r.errors[1]) && /no seat/.test(r.errors[2]), r.errors.join(" | "));
});
test("a_sheet_changes_the_rules", async ({ page }) => {
  const r = await page.evaluate(c => { const mb = masterBook(), keep = mb.S.cm; mb.S.cm = cmParse(eval(c)); try { return [cmCheck("X MISSION", 2, { ac: ["B"] }).ok, cmCheck("X MISSION", 2, { ac: ["A"], sup: ["C", "B"] }).ok, cmCheck("X MISSION", 0, { ac: ["C"] }), cmCheck("MAS TRG", 0, { ac: ["D"] })]; } finally { mb.S.cm = keep; } }, CELLS);
  assert.deepStrictEqual(r, [false, true, null, null], "the sheet replaces the built-in matrix: MAS TRG is no longer checked");
});
test("page_shows_the_default_and_offers_the_sheet", async ({ page, errs }) => {
  const r = await page.evaluate(() => { document.querySelector("nav.tabs button[data-v='cmx']").click(); return { on: document.getElementById("v-cmx").classList.contains("on"), rows: document.querySelectorAll("#cmxWrap .cmxt tr").length, t: document.getElementById("cmxWrap").innerText, btn: !!document.getElementById("cmxMake") }; });
  assert.ok(r.on); assert.strictEqual(r.rows, 10, "header and nine rows"); assert.ok(/built-in matrix/.test(r.t), r.t.slice(0, 200)); assert.ok(r.btn, "make-the-sheet button");
  assert.deepStrictEqual(errs, []);
});
test("make_the_sheet_and_save_it", async ({ page, errs }) => {
  const r = await page.evaluate(() => { document.querySelector("nav.tabs button[data-v='cmx']").click(); document.getElementById("cmxMake").click();
    const bi = books.findIndex(b => b.S.kind === "master"), mb = books[bi], z = withBook(bi, () => fflate.unzipSync(buildXlsx().bytes)), td = new TextDecoder();
    const wb = td.decode(z["xl/workbook.xml"]), sheets = Object.keys(z).filter(k => /worksheets\/sheet\d+\.xml$/.test(k)).map(k => td.decode(z[k])), hit = sheets.find(x => x.includes("MAS TACT") && x.includes("Sup 1"));
    return { src: mb.S.cm.src, n: mb.S.cm.rows.length, wb: wb.includes("Crew Matrix"), hit: !!hit, btn: !!document.getElementById("cmxMake"), t: document.getElementById("cmxWrap").innerText }; });
  assert.strictEqual(r.src, "sheet"); assert.strictEqual(r.n, 9); assert.ok(r.wb && r.hit, "sheet written into the saved file"); assert.ok(!r.btn); assert.ok(/Crew Matrix\s+sheet of the Master Planner file/i.test(r.t), r.t.slice(0, 200));
  assert.deepStrictEqual(errs, []);
}, { fresh: true, mine: "Master_Planner" });
test("page_lists_ignored_rows", async ({ page }) => {
  const t = await page.evaluate(c => { masterBook().S.cm = cmParse(eval(c)); renderCmx(); return document.querySelector("#cmxWrap .cmxerr").innerText; }, CELLS);
  assert.ok(/Row 3 left out/.test(t) && /Row 4 left out/.test(t) && /Row 5 left out/.test(t), t);
}, { fresh: true });

(async () => {
  const only = process.argv[2];
  let pass = 0, ran = 0, S = null;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue;
    ran++;
    try {
      if (!S || (t.opts && t.opts.fresh)) { if (S) await S.close(); S = await boot(Object.assign({}, t.opts)); }
      await t.fn(S); pass++; console.log("ok   " + t.name);
    } catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 300)); if (S) { await S.close(); S = null; } }
  }
  if (S) await S.close();
  console.log(pass + "/" + ran + " pass");
  process.exit(pass === ran ? 0 : 1);
})();
