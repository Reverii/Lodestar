// ATOM currency tests (synthetic exports only). Build the dashboard first: python3 .lodestar_build.py dashboard
// Run: node tests/atom.test.js [name-filter]   (prints "N/M pass"; exit code 1 if any fail)
const assert = require("assert");
const fs = require("fs");
const { boot, atomFixture } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const FULL = () => atomFixture();
const A = () => ({ atom: [FULL()] });

// ---- Task 1: fixture, harness, tab skeleton
test("fixture_builds", async () => {
  const f = atomFixture();
  assert.ok(fs.statSync(f).size > 3000);
  const names = require("child_process").execFileSync("python3", ["-c", "import openpyxl,sys;print(','.join(openpyxl.load_workbook(sys.argv[1]).sheetnames))", f]).toString().trim();
  assert.strictEqual(names, "PILOT,ACS,TACCO,SUP1,SUP2");
});
test("atom_state_exists", async ({ page }) => {
  assert.ok(await page.evaluate(() => Array.isArray(ATOMS) && typeof renderAtom === "function"));
});
test("currency_tab_has_atom_box", async ({ page }) => {
  assert.ok(await page.evaluate(() => !!document.querySelector("#v-cur #atomBox")));
});

// ---- Task 2: parser and intake
const MOVED = () => ({ atom: [atomFixture({ variant: "moved" })], others: false, fresh: true });
const PART = () => ({ atom: [atomFixture({ variant: "partial" })], others: false, fresh: true });
const F0 = page => page.evaluate(() => JSON.parse(JSON.stringify(ATOMS[0])));
test("parse_reads_headers_not_positions", async ({ page }) => {
  const f = await F0(page);
  assert.deepStrictEqual(f.sheets.Pilot.map(r => r.name), ["A NGO", "HO KM", "S LIM JH", "SAMY", "TEO WK"]);
  const flight = f.groups.find(g => g.group === "Flight Currencies");
  assert.strictEqual(flight.cols[0], "NVG Curr");
  const order = f.groups.map(g => g.group);
  assert.ok(order.indexOf("Mission Currencies") < order.indexOf("SIM Currencies"), order.join());
  assert.strictEqual(f.sheets.Pilot[0].cells["NVG Curr"].iso, "2027-01-22");
}, MOVED());
test("parse_ignores_satr_and_hours", async ({ page }) => {
  const f = await F0(page);
  assert.deepStrictEqual(f.groups.map(g => g.group).sort(), ["Flight Currencies", "LSS Currencies", "Mission Currencies", "SIM Currencies"]);
  const all = f.groups.flatMap(g => g.cols);
  for (const bad of ["Level", "Remarks", "SIM Package", "Current Month"]) assert.ok(!all.includes(bad), bad);
  assert.ok(!JSON.stringify(f).includes("FAKE personal remark"));
}, { atom: [FULL()], others: false, fresh: true });
test("parse_value_kinds", async ({ page }) => {
  const c = (await F0(page)).sheets.Pilot[0].cells;
  const k = n => [c[n].k, c[n].iso, c[n].raw];
  assert.deepStrictEqual(k("Day Curr"), ["date", "2026-11-16", "16 Nov 26"]);
  assert.strictEqual(c["IRT"].k, "none");
  assert.strictEqual(c["Instructor Check"].k, "na");
  assert.strictEqual(c["ACE"].k, "blank");
  assert.deepStrictEqual([c["APT"].k, c["APT"].iso, c["APT"].raw], ["text", null, "soon"]);
  assert.deepStrictEqual([c["SVT"].k, c["SVT"].iso], ["date", "2027-01-22"]);
});
test("parse_skips_band_rows", async ({ page }) => {
  const f = await F0(page);
  for (const d in f.sheets) for (const r of f.sheets[d]) assert.ok(r.name && !/^\s*->/.test(r.name), d + ":" + r.name);
  assert.deepStrictEqual(Object.keys(f.sheets), ["Pilot", "Loadmaster", "TACCO", "SUP 1", "SUP 2"]);
  assert.strictEqual(f.sheets.Pilot.find(r => r.name === "TEO WK").status, "NSmen");
});
test("parse_created_time", async ({ page }) => {
  const r = await page.evaluate(() => { const d = new Date("2026-10-25T12:41:33Z"), p = n => String(n).padStart(2, "0"); return [ATOMS[0].created, d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes())]; });
  assert.strictEqual(r[0], r[1]);
});
test("partial_file_lists_missing", async ({ page }) => {
  assert.deepStrictEqual((await F0(page)).missing, ["Loadmaster", "TACCO", "SUP 1"]);
}, PART());
test("loading_an_atom_file_does_not_touch_books", async ({ page }) => {
  const r = await page.evaluate(() => ({ n: books.length, atoms: ATOMS.length, same: WB === books[cur.b].WB, names: books.map(b => b.S.dept || b.S.kind) }));
  assert.strictEqual(r.n, 8, JSON.stringify(r)); assert.strictEqual(r.atoms, 1); assert.ok(r.same);
}, { atom: [FULL()], fresh: true });
test("atom_first_then_planner", async ({ page, errs }) => {
  assert.strictEqual(await page.evaluate(() => [ATOMS.length, books.length]).then(String), "1,0");
  assert.ok(/ATOM export loaded/.test(await page.innerText("#toast")));
  assert.ok(await page.evaluate(() => getComputedStyle(document.getElementById("welcome")).display !== "none"));
  assert.deepStrictEqual(errs, []);
}, { atomFirst: FULL(), fresh: true });
test("as_of_override_is_remembered", async ({ page }) => {
  const r = await page.evaluate(() => { const f = ATOMS[0], d0 = atomAsOf(f); atomSetAsOf(f, "2026-10-20 09:00"); return [d0, atomAsOf(f), spRecall("atom_asof_" + f.name)]; });
  assert.strictEqual(r[1], "2026-10-20 09:00"); assert.strictEqual(r[2], "2026-10-20 09:00"); assert.notStrictEqual(r[0], r[1]);
}, { atom: [FULL()], others: false, fresh: true });
test("folder_picker_routes_atom_file", async ({ page }) => {
  const f = atomFixture({ name: "ATOM_second", created: "2026-10-20 08:00:00" });
  await page.setInputFiles("#fileInputMore", [f]);
  await page.waitForFunction(() => ATOMS.length === 2);
  assert.strictEqual(await page.evaluate(() => books.length), 8);
}, { atom: [FULL()], fresh: true });

// ---- Task 3: matching by Initials
const MT = { atom: [FULL()], fresh: true };
const rowOf = (page, bi, i) => page.evaluate(([bi, i]) => { const r = atomFor(bi, i); return r && r.name; }, [bi, i]);
test("match_exact_case_and_spaces", async ({ page }) => {
  const [b1, i1] = await setIni(page, "SUP 2", 0, "v  tan"), [b2, i2] = await setIni(page, "Pilot", 0, "s lim jh");
  assert.strictEqual(await rowOf(page, b1, i1), "V TAN"); assert.strictEqual(await rowOf(page, b2, i2), "S LIM JH");
}, MT);
test("match_blank_initials_never_matches", async ({ page }) => {
  const [b, i] = await setIni(page, "SUP 2", 0, "   ");
  const r = await page.evaluate(([b, i]) => { const m = atomMatch(ATOMS[0]); return [atomFor(b, i), m.fix.rosterOnly.some(x => x.dept === "SUP 2" && x.id === books[b].S.roster[i].id)]; }, [b, i]);
  assert.deepStrictEqual(r, [null, false]);
});
test("match_duplicates_listed_not_chosen", async ({ page }) => {
  const [b, i] = await setIni(page, "SUP 2", 0, "V TAN"), [, j] = await setIni(page, "SUP 2", 1, "v tan");
  const r = await page.evaluate(([b, i, j]) => { const m = atomMatch(ATOMS[0]); return { d: m.fix.dupes.map(x => [x.dept, x.ini.toLowerCase(), x.ids.length]), a: atomFor(b, i), c: atomFor(b, j) }; }, [b, i, j]);
  assert.deepStrictEqual(r, { d: [["SUP 2", "v tan", 2]], a: null, c: null });
});
test("match_atom_only_and_roster_only_listed", async ({ page }) => {
  const [b, i] = await setIni(page, "SUP 2", 0, "V TAN");
  const r = await page.evaluate(() => { const m = atomMatch(ATOMS[0]); return { ao: m.fix.atomOnly.filter(x => x.dept === "SUP 2").map(x => x.name), ro: m.fix.rosterOnly.filter(x => x.dept === "SUP 2").length, pilotAo: m.fix.atomOnly.filter(x => x.dept === "Pilot").length }; });
  assert.deepStrictEqual(r.ao, ["H LIM", "O NG"]); assert.ok(r.ro >= 4, "roster-only SUP 2: " + r.ro); assert.strictEqual(r.pilotAo, 5 - 0);
}, MT);
test("match_cat_difference_listed", async ({ page }) => {
  await setIni(page, "SUP 2", 0, "V TAN", "CAT B");    // ATOM CAT A
  await setIni(page, "SUP 2", 1, "H LIM", "CAT B");    // ATOM CAT B, same
  const r = await page.evaluate(() => atomMatch(ATOMS[0]).fix.cat.map(x => [x.dept, x.atom, x.roster]));
  assert.deepStrictEqual(r, [["SUP 2", "A", "CAT B"]]);
});
test("closed_department_is_not_an_error", async ({ page }) => {
  const r = await page.evaluate(() => { books = books.filter(b => b.S.kind || b.S.dept !== "SUP 1"); const m = atomMatch(ATOMS[0]); return { closed: m.fix.closed, ao: m.fix.atomOnly.filter(x => x.dept === "SUP 1").length }; });
  assert.deepStrictEqual(r, { closed: ["SUP 1"], ao: 0 });
}, { atom: [FULL()] });
test("match_within_department_only", async ({ page }) => {
  const [b, i] = await setIni(page, "SUP 1", 0, "V TAN");   // V TAN is a SUP 2 name in ATOM
  const r = await page.evaluate(([b, i]) => ({ row: atomFor(b, i), ao: atomMatch(ATOMS[0]).fix.atomOnly.some(x => x.name === "V TAN" && x.dept === "SUP 2") }), [b, i]);
  assert.deepStrictEqual(r, { row: null, ao: true });
});

// A shared session is reused between tests; snapshot once, restore before each following test
const snap = () => { window.__bk = books.slice(); window.__ros = books.map(b => b.S.kind ? null : b.S.roster.map(p => [p.ini, p.cat, p.id, p.name])); window.__at = ATOMS.slice(); };
const restore = () => { books = window.__bk.slice(); books.forEach((b, i) => { if (window.__ros[i]) b.S.roster.forEach((p, j) => { [p.ini, p.cat, p.id, p.name] = window.__ros[i][j]; }); }); ATOMS = window.__at.slice(); cur.atom = 0; useBook(0); Object.keys(localStorage).filter(k => k.startsWith("fop_sp_atom")).forEach(k => localStorage.removeItem(k)); };
// setIni("SUP 2", n, "V TAN") sets the Initials of the nth person on that roster (empty slots skipped); returns [bookIndex, rosterIndex]
const setIni = (page, dept, n, ini, cat) => page.evaluate(([dept, n, ini, cat]) => { const bi = books.findIndex(b => !b.S.kind && b.S.dept === dept); const ix = books[bi].S.roster.map((p, i) => (p.name || p.id) ? i : -1).filter(i => i >= 0)[n]; books[bi].S.roster[ix].ini = ini; if (cat) books[bi].S.roster[ix].cat = cat; return [bi, ix]; }, [dept, n, ini, cat]);
const ID = (page, dept, n) => page.evaluate(([dept, n]) => { const b = books.find(b => !b.S.kind && b.S.dept === dept); return b.S.roster.filter(p => p.name || p.id)[n].id; }, [dept, n]);

// ---- runner
(async () => {
  const only = process.argv[2];
  let pass = 0, ran = 0, S = null;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue;
    ran++;
    try {
      if (!S || (t.opts && t.opts.fresh)) { if (S) await S.close(); S = await boot(Object.assign({}, t.opts)); await S.page.evaluate(snap); }
      else await S.page.evaluate(restore);
      await t.fn(S); pass++; console.log("ok   " + t.name);
    } catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 300)); if (S) { await S.close(); S = null; } }
  }
  if (S) await S.close();
  console.log(pass + "/" + ran + " pass");
  process.exit(pass === ran ? 0 : 1);
})();
