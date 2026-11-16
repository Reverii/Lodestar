// Down-chit / up-chit, Day Status and the Duty Crew lists: flows no other suite saved and read back (bug testing round, 16 Nov).
// Build the dashboard first: python3 .lodestar_build.py dashboard
// Run: node tests/chits_duty_status.test.js [name-filter]      (LODE_FILES=<folder> for another set)
const assert = require("assert");
const path = require("path");
const { boot } = require("./lode_lib");
const FILES = process.env.LODE_FILES ? path.resolve(process.env.LODE_FILES) : path.resolve(__dirname, "..");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });

// save book bi in memory (inside withBook, like a real save) and read it back as a fresh open
const roundTrip = (page, bi) => page.evaluate(bi => { const bk = books[bi], bytes = withBook(bi, () => logBuild(bk, new Map(bk.dirty)).bytes);
  bk.dirty = new Map(); reparseBook(bi, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)); }, bi);
// a cell straight from the saved sheet XML of book bi
const sheetCell = (page, bi, sheet, ref) => page.evaluate(([bi, sheet, ref]) => { const W = books[bi].WB; return readCellsOf(W.files, W.paths[sheet], W.sst || parseSST(W.files))[ref]; }, [bi, sheet, ref]);
const noErrors = errs => assert.deepStrictEqual(errs.filter(e => /PAGEERROR|console\.error/.test(e)), []);

// ---- down-chit and up-chit from the Ops Room
const opsWithSup2 = async page => {   // boot() opens the Ops Room and the shared files; SUP 2 is added the way ops_room.test.js does
  await page.evaluate(() => { OPS = true; });   // Ops Room mode, as the department screen's Ops Room card sets it: every open file editable
  await page.setInputFiles("#fileInputMore", path.join(FILES, "Flight_Ops_Planner_SUP2.xlsx"));
  await page.waitForFunction(() => books.some(b => b.S.dept === "SUP 2"));
  return page.evaluate(() => { const bi = books.findIndex(b => b.S.dept === "SUP 2"), st = books[bi].S;
    const i = st.roster.findIndex(p => p.id && p.name); return { bi, i, id: st.roster[i].id, own: st.hasChit, ops: books.findIndex(b => b.S.kind === "ops") }; });
};

test("down_chit_then_up_chit_is_saved", async ({ page, errs }) => {
  const p = await opsWithSup2(page);
  // down-chit from 5 Nov
  await page.evaluate(([bi, i]) => { downOpen("2026-11-05"); $("chitWho").value = bi + ":" + i; $("chitDate").value = "2026-11-05"; $("chitNote").value = "flu"; $("chitGo").click(); }, [p.bi, p.i]);
  const dn = await page.evaluate(id => [downOn("SUP 2", id, "2026-11-04"), downOn("SUP 2", id, "2026-11-05"), downOn("SUP 2", id, "2026-12-20")].map(x => !!x), p.id);
  assert.deepStrictEqual(dn, [false, true, true], "down from 5 Nov until up-chitted");
  // up-chit: fit to fly from 12 Nov
  await page.evaluate(([bi, i]) => { chitOpen(bi, i, "2026-11-08"); $("chitDate").value = "2026-11-12"; $("chitDate").dispatchEvent(new Event("input")); $("chitNote").value = "Cleared by MO"; $("chitGo").click(); }, [p.bi, p.i]);
  const up = await page.evaluate(id => [downOn("SUP 2", id, "2026-11-11"), downOn("SUP 2", id, "2026-11-12"), downOn("SUP 2", id, "2026-12-20")].map(x => !!x), p.id);
  assert.deepStrictEqual(up, [true, false, false], "fit from 12 Nov");
  // both files saved and read back: the chit is still there, in whichever file holds it
  await roundTrip(page, p.bi); await roundTrip(page, p.ops);
  const after = await page.evaluate(id => [downOn("SUP 2", id, "2026-11-05"), downOn("SUP 2", id, "2026-11-11"), downOn("SUP 2", id, "2026-11-12")].map(x => !!x), p.id);
  assert.deepStrictEqual(after, [true, true, false], "read back after saving");
  noErrors(errs);
}, { mine: "Ops_Room" });

test("mc_on_the_plan_down_chits_until_up_chit", async ({ page, errs }) => {
  const p = await opsWithSup2(page);
  // MC typed on 3 Nov PM in SUP 2's plan
  await page.evaluate(([bi, i]) => withBook(bi, () => { S.m[10].grid[gridRow(i, 1)][2] = MC_CODE; put(monSheet(10), colL(DAY_COL0 + 2) + (g0() + gridRow(i, 1)), MC_CODE); }), [p.bi, p.i]);
  let r = await page.evaluate(id => [downOn("SUP 2", id, "2026-11-02"), downOn("SUP 2", id, "2026-11-03"), downOn("SUP 2", id, "2026-11-30")].map(x => !!x), p.id);
  assert.deepStrictEqual(r, [false, true, true], "MC starts a down-chit");
  // up-chit dialog warns when MC is still planned after the chosen day
  const warn = await page.evaluate(([bi, i]) => { withBook(bi, () => { S.m[10].grid[gridRow(i, 0)][19] = MC_CODE; }); CHIT_GEN++; chitOpen(bi, i, "2026-11-04"); $("chitDate").value = "2026-11-10"; $("chitDate").dispatchEvent(new Event("input")); return $("chitWarn").textContent; }, [p.bi, p.i]);
  assert.ok(/MC is still planned on 20 Nov/.test(warn), warn);
  await page.evaluate(() => { $("chitGo").click(); });
  r = await page.evaluate(id => [downOn("SUP 2", id, "2026-11-09"), downOn("SUP 2", id, "2026-11-10"), downOn("SUP 2", id, "2026-11-20")].map(x => !!x), p.id);
  assert.deepStrictEqual(r, [true, false, true], "fit from 10 Nov, down again from the MC on 20 Nov");
  noErrors(errs);
}, { mine: "Ops_Room" });

test("mc_found_in_a_file_with_three_rows_per_person", async ({ page, errs }) => {
  // z210: computeChit read rows with the layout of the file on screen (here the Ops Room) instead of the department file it checks.
  // An older department file (3 rows per person, no WD row) next to a newer one put the MC on someone else's row.
  const p = await opsWithSup2(page);
  const r = await page.evaluate(([bi, i]) => { const st = books[bi].S;
    // the same people laid out 3 rows each (AM, PM, NIGHT), as an older file reads
    st.m.forEach(M => { if (!M) return; const g = []; st.roster.forEach((x, j) => { for (let s = 0; s < 3; s++) g.push((M.grid[j * 4 + s] || []).slice()); }); M.grid = g; });
    st.rp = 3; st._chit = null; CHIT_GEN++;
    st.m[10].grid[i * 3 + 1][2] = MC_CODE; CHIT_GEN++;
    return [downOn("SUP 2", st.roster[i].id, "2026-11-02"), downOn("SUP 2", st.roster[i].id, "2026-11-03"), downOn("SUP 2", st.roster[i + 1] && st.roster[i + 1].id || "-", "2026-11-03")].map(x => !!x); }, [p.bi, p.i]);
  assert.deepStrictEqual(r, [false, true, false], "the MC person is down, the next person is not");
  noErrors(errs);
}, { mine: "Ops_Room" });

// ---- Day Status (Master Planner): a no-flying day, this year and next January
test("day_status_saved_on_the_right_row", async ({ page, errs }) => {
  const r = await page.evaluate(() => { const bi = mpIdx(); return { bi, ed: mpEditable(), nx: books[bi].S.nx }; });
  assert.ok(r.ed, "the Master Planner's own file");
  const setDs = (mi, d, v) => page.evaluate(([mi, d, v]) => { document.querySelector("nav.tabs button[data-v='mp']").click(); cur.mpM = mi;
    const el = document.createElement("input"); el.dataset.st = d; el.value = v; $("mpWrap").appendChild(el); el.dispatchEvent(new Event("change", { bubbles: true })); el.remove(); }, [mi, d, v]);
  await setDs(11, 24, "NO FLYING");   // 25 Dec 2026
  if (r.nx) await setDs(12, 4, "STAND DOWN");   // 5 Jan 2027, on the next-January rows
  await roundTrip(page, r.bi);
  const got = await page.evaluate(nx => { const st = books[mpIdx()].S; return [st.mp[11].status[24], nx ? st.mp[12].status[4] : null, st.mp[11].status[23]]; }, r.nx);
  assert.deepStrictEqual(got, ["NO FLYING", r.nx ? "STAND DOWN" : null, got[2]]);
  assert.notStrictEqual(got[2], "NO FLYING", "24 Dec untouched");
  // the row in the sheet is the one whose date is 25 Dec (column A), not an off-by-one
  const row = await page.evaluate(() => dsRef(2026, 11, 24).slice(1));
  const a = await sheetCell(page, r.bi, "Day Status", "A" + row);
  const iso = await page.evaluate(v => typeof v === "number" ? serialToISO(v) : String(v), a);
  assert.ok(/2026-12-25/.test(iso) || a === undefined, "Day Status A" + row + " is " + iso);
  if (r.nx) { const row2 = await page.evaluate(() => dsRef(2026, 12, 4).slice(1)), a2 = await sheetCell(page, r.bi, "Day Status", "A" + row2);
    const iso2 = await page.evaluate(v => typeof v === "number" ? serialToISO(v) : String(v), a2);
    assert.ok(/2027-01-05/.test(iso2) || a2 === undefined, "next January row " + row2 + " is " + iso2); }
  noErrors(errs);
}, { mine: "Master_Planner" });

// ---- Duty Crew lists (Duty Roster): add, no duplicates, remove closes the gap
test("duty_crew_add_and_remove_are_saved", async ({ page, errs }) => {
  const r0 = await page.evaluate(() => { document.querySelector("nav.tabs button[data-v='sdo']") && document.querySelector("nav.tabs button[data-v='sdo']").click(); renderSdo();
    return { D: DUTY, n: books[dutyBi()].S.crew[DUTY].length, ids: books[dutyBi()].S.crew[DUTY].map(p => p.id) }; });
  await page.evaluate(() => { addDutyCrew({ id: "ZTEST1", name: "LTA Test One", dept: "SUP 2" }); addDutyCrew({ id: "ZTEST2", name: "", dept: "SUP 1" }); addDutyCrew({ id: "ZTEST1", name: "again", dept: "SUP 2" }); });
  let ids = await page.evaluate(() => books[dutyBi()].S.crew[DUTY].map(p => p.id));
  assert.deepStrictEqual(ids, r0.ids.concat(["ZTEST1", "ZTEST2"]), "added once each");
  // remove the first ZTEST through its × button
  await page.evaluate(() => { renderSdo(); const k = books[dutyBi()].S.crew[DUTY].findIndex(p => p.id === "ZTEST1"); document.querySelector("#dutyCrew button[data-dcrm='" + k + "']").click(); });
  await roundTrip(page, 0);
  ids = await page.evaluate(() => books[dutyBi()].S.crew[DUTY].map(p => p.id));
  assert.deepStrictEqual(ids, r0.ids.concat(["ZTEST2"]), "removed and read back, no gap");
  noErrors(errs);
}, { mine: "Duty_Roster" });

// ---- Overview and Changelog tabs draw without errors on every file kind
for (const mine of ["Flight_Ops_Planner_SUP2", "Master_Planner", "Ops_Room"]) {
  test("every_tab_draws_" + mine, async ({ page, errs }) => {
    const shown = await page.evaluate(async () => { const out = [];
      for (const b of [...document.querySelectorAll("nav.tabs button[data-v]")].filter(b => b.offsetParent !== null)) { b.click(); await new Promise(z => setTimeout(z, 30)); out.push(b.dataset.v); }
      for (const m of [...document.querySelectorAll("#plMenu [data-v], nav.tabs .menu [data-v]")]) { try { m.click(); await new Promise(z => setTimeout(z, 30)); out.push(m.dataset.v); } catch (e) { } }
      return out; });
    assert.ok(shown.length >= 3, shown.join());
    noErrors(errs);
  }, { mine });
}

(async () => {
  const only = process.argv[2];
  let pass = 0, ran = 0;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue;
    ran++; let S = null;
    try { S = await boot(Object.assign({}, t.opts)); await t.fn(S);
      const bad = S.errs.filter(e => /PAGEERROR/.test(e)); if (bad.length) throw new Error(bad.join(" | "));
      pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 400)); }
    if (S) await S.close();
  }
  console.log(pass + "/" + ran + " pass");
  process.exit(pass === ran ? 0 : 1);
})();
