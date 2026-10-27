// Ops Room redesign tests. Build the dashboard first: python3 .lodestar_build.py dashboard
// Run: node tests/ops_room.test.js [name-filter]
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const RO = { mine: "Flight_Ops_Planner_SUP2" };   // a department view (Ops Room file read-only)
const ED = { mine: "Ops_Room" };                    // the Ops Room view (everything editable)
const DAY = "2026-10-14";                           // a demo day with flights
const goOps = (page, iso) => page.evaluate(iso => { cur.opsDay = iso; document.querySelector("nav.tabs button[data-v='ops']").click(); renderOps(); }, iso);

test("chips_no_seats_or_downchit", async ({ page }) => {
  await goOps(page, DAY);
  const labs = await page.evaluate(() => [...document.querySelectorAll("#opsStats .opsk small")].map(x => x.textContent.trim()));
  for (const l of ["Flights", "Sorties", "Flown", "Cancelled"]) assert.ok(labs.includes(l), l + " missing: " + labs.join());
  assert.ok(!labs.includes("Seats filled") && !labs.includes("Down-chit"), labs.join());
}, ED);
test("no_timeline", async ({ page }) => {
  await goOps(page, DAY);
  assert.strictEqual(await page.evaluate(() => document.getElementById("opsView")), null);
  assert.strictEqual(await page.evaluate(() => typeof opsTimeline), "undefined");
  assert.strictEqual(await page.evaluate(() => document.querySelector("#v-ops button[data-vw]")), null);
}, RO);

// the Day Board cells of an Area line / Codes for the open day: ref and value helpers run in the page
const AREA_SET = (page, vals) => page.evaluate(vals => { const st = books[opsIdx()].S, row = 6 + dayOfYear(...Object.values((({ y, mi, d }) => ({ y, mi, d }))(opsDay(cur.opsDay))));
  OPS_DB_CELLS.filter(c => c.stack >= 0).forEach(c => { st.db[c.col + row] = vals[c.sub] || ""; }); renderOps(); }, vals);

test("side_cards_below_table", async ({ page }) => {
  await goOps(page, DAY);
  const g = await page.evaluate(() => { const s = document.getElementById("opsSide").getBoundingClientRect(), m = document.getElementById("opsMain").getBoundingClientRect(), w = document.getElementById("opsWrap").getBoundingClientRect();
    return { sideTop: s.top, mainBottom: m.bottom, mainW: m.width, wrapW: w.width, txt: document.getElementById("opsSide").innerText }; });
  assert.ok(g.sideTop >= g.mainBottom - 1, "side " + g.sideTop + " main bottom " + g.mainBottom);
  assert.ok(g.mainW >= 0.9 * g.wrapW, g.mainW + " of " + g.wrapW);
  for (const h of ["Ground programme", "Down-chit", "Remarks"]) assert.ok(g.txt.includes(h), h);
  assert.ok(/Movement|Leave and MC/.test(g.txt));
}, ED);
test("codes_card_next_to_dob", async ({ page }) => {
  await goOps(page, DAY);
  const g = await page.evaluate(() => { const c = document.querySelector("#opsBoard .odi.codes"), d = document.querySelector("#opsBoard .odi.dob"); return { has: !!c, cl: c && c.getBoundingClientRect().left, dl: d && d.getBoundingClientRect().left, side: document.getElementById("opsSide").innerText }; });
  assert.ok(g.has && g.cl > g.dl, JSON.stringify(g));
  assert.ok(!/Codes/i.test(g.side), "Codes still in the side cards");
}, ED);
test("area_hidden_when_empty", async ({ page }) => {
  await goOps(page, DAY);
  await AREA_SET(page, {});
  assert.strictEqual(await page.evaluate(() => document.querySelector("#opsSide .opsac")), null);
  await AREA_SET(page, { Echo: "VIPER" });
  const t = await page.evaluate(() => { const a = document.querySelector("#opsSide .opsac"); return a ? a.innerText : null; });
  assert.ok(t && /echo/i.test(t) && /VIPER/.test(t) && !/oscar/i.test(t), String(t));
}, ED);
test("area_add_button", async ({ page }) => {
  await goOps(page, DAY); await AREA_SET(page, {});
  assert.ok(await page.evaluate(() => !!document.getElementById("opsAreaAdd")), "button in the Ops Room view");
  await page.click("#opsAreaAdd");
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll("#opsSide .opsac .v.oe").length), 3);
  await page.evaluate(iso => opsGo(iso), "2026-10-15");
  assert.strictEqual(await page.evaluate(() => document.querySelector("#opsSide .opsac")), null, "closed on a new day");
  await page.evaluate(() => { document.body.classList.add("opsfs"); renderOps(); });
  assert.ok(await page.evaluate(() => !document.getElementById("opsAreaAdd")), "no button in projector mode");
}, ED);
test("area_add_button_absent_read_only", async ({ page }) => {
  await goOps(page, DAY);
  assert.ok(await page.evaluate(() => !document.getElementById("opsAreaAdd")));
}, RO);

// plan a dept's first crew member on an Admin ("admin") or Leave ("leave") activity for the given day offsets in one shift of the open day, then redraw
const PLAN_SET = (page, dept, kind, iso, offs, shift) => page.evaluate(([dept, kind, iso, offs, shift]) => {
  const bi = books.findIndex(b => isDept(b) && same(b.S.dept, dept)); let r = null;
  withBook(bi, () => { const all = [...actIndex().values()].filter(a => a.ci === (kind === "admin" ? CAT_ADMIN : CAT_LEAVE)), A = all[all.length - 1], D = opsDay(iso), i = S.roster.findIndex(p => p.name || p.id);
    offs.forEach(o => { S.m[D.mi].grid[i * 3 + shift][D.d + o] = A.code; }); r = { code: A.code, who: S.roster[i].ini || S.roster[i].id }; });
  cur.opsDay = iso; renderOps(); return r; }, [dept, kind, iso, offs, shift]);
const COLS = page => page.evaluate(() => [...document.querySelectorAll("#opsSide .gp3 .gcol")].map(c => ({ head: c.querySelector(".opssh").textContent.trim(), text: c.innerText })));

test("ground_columns_am_pm_night", async ({ page }) => {
  const r = await PLAN_SET(page, "Pilot", "admin", DAY, [0, 1, 2], 1);
  const cols = await COLS(page);
  assert.deepStrictEqual(cols.map(c => c.head), ["AM", "PM", "NIGHT"]);
  assert.ok(cols[1].text.includes(r.code) && /until 16 Oct/.test(cols[1].text), cols[1].text);
  assert.ok(!/until 16 Oct/.test(cols[0].text) && !/until 16 Oct/.test(cols[2].text));
}, ED);
test("ground_one_day_no_until", async ({ page }) => {
  const r = await PLAN_SET(page, "Pilot", "admin", DAY, [0], 1);
  const cols = await COLS(page);
  assert.ok(cols[1].text.includes(r.code) && !/until/.test(cols[1].text), cols[1].text);
}, ED);
test("ground_until_stops_at_month_end", async ({ page }) => {
  const r = await PLAN_SET(page, "Pilot", "admin", "2026-10-30", [0, 1], 1);
  const cols = await COLS(page);
  assert.ok(cols[1].text.includes(r.code) && /until 31 Oct/.test(cols[1].text), cols[1].text);
}, ED);
test("leave_and_mc_by_department", async ({ page }) => {
  const r = await PLAN_SET(page, "Pilot", "leave", DAY, [0], 0);
  const rows = await page.evaluate(() => [...document.querySelectorAll("#opsSide .olv .dep")].map(d => ({ dept: d.querySelector("b").textContent.trim(), text: d.textContent })));
  assert.deepStrictEqual(rows.map(x => x.dept), ["Pilot", "Loadmaster", "TACCO", "SUP 1", "SUP 2"]);
  assert.ok(rows[0].text.includes(r.who) && rows[0].text.includes(r.code), rows[0].text);
  assert.ok(rows.slice(1).some(x => /–/.test(x.text)), "a department with nobody shows a dash");
}, ED);
test("empty_day_still_renders", async ({ page }) => {
  await goOps(page, "2026-12-27");
  const t = await page.evaluate(() => document.getElementById("opsSide").innerText);
  for (const h of ["Ground programme", "Leave and MC", "Down-chit", "Remarks"]) assert.ok(t.includes(h), h + " missing: " + t);
}, ED);

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
