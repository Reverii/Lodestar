// z177: BDO is a person from the Duty Roster's BDO crew list (blank day = no BDO needed); the department's copy puts BDO on their WD row.
// Needs a set built after z177 (BDO days hold callsigns): python3 .lodestar_build.py excel <folder>, then LODE_FILES=<folder> node tests/bdo_person.test.js
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const RB = { mine: "Duty_Roster", today: "2026-10-14" }, PIL = { mine: "Flight_Ops_Planner_Pilot", today: "2026-10-14" };
const goDuty = (page, D = "BDO") => page.evaluate(D => { cur.m = 9; document.querySelector("nav.tabs button[data-v='sdo']").click(); document.querySelector("#dutySeg button[data-d='" + D + "']").click(); }, D);
// a Pilot BDO day in October on the roster, with its person
const pilotDay = page => page.evaluate(() => { const rb = rosterBook(); for (let d = 0; d < 31; d++) { const ref = sdoRef(2026, 9, d), r = dutyAt(rb.S, "BDO", ref); if (r && r.id && same(r.dept, "Pilot")) return { d, ref, id: r.id }; } return null; });

test("roster_days_hold_people", async ({ page }) => {
  await goDuty(page);
  const r = await page.evaluate(() => { const cal = [...document.querySelectorAll("#sdoCal .calm")][9], sel = [...cal.querySelectorAll("select[data-sdo]")];
    const picked = sel.filter(s => s.value), crew = rosterBook().S.crew.BDO.map(p => p.id);
    return { n: picked.length, allCrew: picked.every(s => crew.includes(s.value)), groups: [...sel[0].querySelectorAll("optgroup")].map(g => g.label), head: cal.querySelector("h3 small").textContent,
      coloured: picked.every(s => /\bd\d\b/.test(s.className)), dept: cal.querySelector(".bdod") && cal.querySelector(".bdod").textContent, notSet: [...document.querySelectorAll("#sdoSum th")].some(t => /Not set/.test(t.textContent)) }; });
  assert.ok(r.n > 20 && r.allCrew, JSON.stringify(r));
  assert.ok(r.groups.includes("Pilot") && r.groups.includes("SUP 2"), r.groups.join());
  assert.ok(/BDO days?$/.test(r.head), r.head); assert.ok(r.coloured && r.dept, JSON.stringify(r));
  assert.ok(!r.notSet, "no Not set column for BDO: a blank day means no BDO needed");
  await goDuty(page, "SDO");
  assert.ok(await page.evaluate(() => [...document.querySelectorAll("#sdoSum th")].some(t => /Not set/.test(t.textContent))), "SDO keeps Not set");
}, RB);
test("roster_pick_writes_the_callsign", async ({ page }) => {
  await goDuty(page);
  const r = await page.evaluate(() => { const ref = sdoRef(2026, 9, 1), s = document.querySelector("#sdoCal select[data-sdo='" + ref + "']"); s.value = "MAMBA"; s.dispatchEvent(new Event("change", { bubbles: true }));
    const s2 = document.querySelector("#sdoCal select[data-sdo='" + ref + "']"); return { v: plan(books[dutyBi()].S, "BDO")[ref], sel: s2.value, at: dutyAt(books[dutyBi()].S, "BDO", ref) }; });
  assert.strictEqual(r.v, "MAMBA"); assert.strictEqual(r.sel, "MAMBA"); assert.strictEqual(r.at.dept, "Pilot");
}, RB);
test("older_day_with_a_department_still_reads", async ({ page }) => {
  const r = await page.evaluate(() => { const st = rosterBook().S, ref = sdoRef(2026, 9, 1); st.duty.BDO[ref] = "Pilot"; return dutyAt(st, "BDO", ref); });
  assert.deepStrictEqual(r, { dept: "Pilot", id: "", name: "" });
  await goDuty(page);
  const t = await page.evaluate(() => { const td = document.querySelector("#sdoCal select[data-sdo='" + sdoRef(2026, 9, 1) + "']").closest("td"); return td.innerText; });
  assert.ok(/nobody picked yet/.test(t), t);
}, RB);

test("dept_view_shows_the_person_no_tickbox", async ({ page }) => {
  await goDuty(page);
  const day = await pilotDay(page);
  const r = await page.evaluate(day => { const cal = [...document.querySelectorAll("#sdoCal .calm")][9]; return { boxes: cal.querySelectorAll("input[data-sdo]").length, txt: [...cal.querySelectorAll("td")].find(td => td.querySelector(".dn") && td.querySelector(".dn").textContent === String(day.d + 1)).innerText, btn: !!$("sdoSync") }; }, day);
  assert.strictEqual(r.boxes, 0); assert.ok(r.txt.includes(day.id), JSON.stringify(r)); assert.ok(r.btn, "copy button");
}, PIL);
test("copy_puts_bdo_on_the_wd_row", async ({ page }) => {
  await goDuty(page);
  const day = await pilotDay(page);
  // someone else in Pilot has BDO typed on that day's AM row: the copy takes it off them
  const other = await page.evaluate(day => { const i = S.roster.findIndex(p => p.id && !same(p.id, day.id)); S.m[9].grid[gridRow(i, 0)][day.d] = "BDO"; renderSdo(); return S.roster[i].id; }, day);
  await page.click("#sdoSync");
  const r = await page.evaluate(([day, other]) => { const i = S.roster.findIndex(p => same(p.id, day.id)), j = S.roster.findIndex(p => same(p.id, other));
    return { wd: S.m[9].grid[gridRow(i, 3)][day.d], am: S.m[9].grid[gridRow(i, 0)][day.d], other: S.m[9].grid[gridRow(j, 0)][day.d], left: sdoDiffs(books[0], rosterBook()).length, plan: plan(S, "BDO")[day.ref],
      nB: monthStats(9, actIndex()).day[day.d].nB, miss: monthStats(9, actIndex()).day[day.d].miss, wdAll: S.m[9].grid.filter((row, rr) => rowShift(rr) === 3 && dutyKey(row[day.d]) === "BDO").length }; }, [day, other]);
  assert.strictEqual(r.wd, "BDO"); assert.strictEqual(r.other, ""); assert.strictEqual(r.left, 0, "nothing left to copy");
  assert.strictEqual(r.plan, "Pilot", "the department's own BDO Plan keeps its name"); assert.strictEqual(r.nB, 1); assert.deepStrictEqual(r.miss, []); assert.strictEqual(r.wdAll, 1);
  const t = await page.evaluate(day => [...[...document.querySelectorAll("#sdoCal .calm")][9].querySelectorAll("td")].find(td => td.querySelector(".dn") && td.querySelector(".dn").textContent === String(day.d + 1)).innerText, day);
  assert.ok(/WD row ✓/.test(t), t);
}, PIL);
test("moved_to_another_person_and_away", async ({ page }) => {
  await goDuty(page);
  const day = await pilotDay(page);
  await page.click("#sdoSync");
  const nx = await page.evaluate(day => { const rb = rosterBook(), p = rb.S.crew.BDO.find(q => same(q.dept, "Pilot") && !same(q.id, day.id)); rb.S.duty.BDO[day.ref] = p.id; renderSdo(); return p.id; }, day);
  await page.click("#sdoSync");
  let r = await page.evaluate(([day, nx]) => { const g = id => S.m[9].grid[gridRow(S.roster.findIndex(p => same(p.id, id)), 3)][day.d]; return [g(day.id), g(nx)]; }, [day, nx]);
  assert.deepStrictEqual(r, ["", "BDO"]);
  // the day goes to another department: Pilot's BDO Plan day and the BDO cell go
  await page.evaluate(day => { const rb = rosterBook(); rb.S.duty.BDO[day.ref] = rb.S.crew.BDO.find(q => same(q.dept, "SUP 2")).id; renderSdo(); }, day);
  await page.click("#sdoSync");
  r = await page.evaluate(([day, nx]) => [S.m[9].grid[gridRow(S.roster.findIndex(p => same(p.id, nx)), 3)][day.d], plan(S, "BDO")[day.ref] || ""], [day, nx]);
  assert.deepStrictEqual(r, ["", ""]);
  // blank on the roster = no BDO that day: nothing to copy, not uncovered
  await page.evaluate(day => { delete rosterBook().S.duty.BDO[day.ref]; renderSdo(); }, day);
  assert.strictEqual(await page.evaluate(day => sdoDiffs(books[0], rosterBook()).filter(x => x.ref === day.ref).length, day), 0);
}, PIL);
test("copy_asks_before_replacing_the_wd_cell", async (S) => {
  const { page } = S;
  await goDuty(page);
  const day = await pilotDay(page);
  await page.evaluate(day => { const i = S.roster.findIndex(p => same(p.id, day.id)); S.m[9].grid[gridRow(i, 3)][day.d] = "ADMIN"; renderSdo(); }, day);
  await page.click("#sdoSync");   // the test helper dismisses the question: the cell stays
  const r = await page.evaluate(day => S.m[9].grid[gridRow(S.roster.findIndex(p => same(p.id, day.id)), 3)][day.d], day);
  assert.strictEqual(r, "ADMIN");
  assert.ok(S.errs.some(e => /Replace it with BDO/.test(e)), S.errs.join());
  S.errs.length = 0;
}, PIL);
test("ops_room_shows_the_bdo_person", async ({ page }) => {
  const day = await pilotDay(page);
  const iso = "2026-10-" + String(day.d + 1).padStart(2, "0");
  // the demo file may already have someone on BDO that day: clear it, so the roster's person shows until the copy
  const before = await page.evaluate(([iso, d]) => { S.m[9].grid.forEach(row => { if (dutyKey(row[d]) === "BDO") row[d] = ""; }); return opsDutyPerson(iso, "BDO", null); }, [iso, day.d]);
  assert.ok(typeof before === "string" && before.startsWith(day.id + " (Pilot)"), JSON.stringify(before));
  await goDuty(page); await page.click("#sdoSync");
  const after = await page.evaluate(iso => opsDutyPerson(iso, "BDO", null), iso);
  const ini = await page.evaluate(id => { const p = S.roster.find(p => same(p.id, id)); return p.ini || p.id; }, day.id);
  assert.ok(Array.isArray(after) && after.length === 1 && after[0].n === ini && after[0].from === 0 && after[0].to === 2, JSON.stringify(after));
}, PIL);

(async () => {
  const only = process.argv[2];
  let pass = 0, ran = 0;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue;
    ran++; let S = null;
    try { S = await boot(Object.assign({}, t.opts)); await t.fn(S); if (S.errs.length) throw new Error("page errors: " + S.errs.join(" | ").slice(0, 3000)); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 3000)); }
    if (S) await S.close();
  }
  console.log(pass + "/" + ran + " pass");
  process.exit(pass === ran ? 0 : 1);
})();
