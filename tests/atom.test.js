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

// ---- runner
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
