// AFP export from the Ops Room (z179): the squadron AFP format filled from the day on the board. Build first: python3 .lodestar_build.py dashboard
// Run: node tests/afp_export.test.js [name-filter]
const assert = require("assert");
const path = require("path");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const ED = { mine: "Ops_Room", fresh: true };   // the Ops Room view (Ops Room file editable)
const DAY = "2026-10-14";
const FILES = process.env.LODE_FILES || path.join(__dirname, "..");
// the Ops Room view of the harness opens every file except SUP 2: add it, switch on Ops Room mode, go to the day
async function goOps(page, iso) {
  if (!(await page.evaluate(() => books.some(b => b.S.dept === "SUP 2")))) {
    const n = await page.evaluate(() => books.length);
    await page.setInputFiles("#fileInputMore", path.join(FILES, "Flight_Ops_Planner_SUP2.xlsx"));
    await page.waitForFunction(n => books.length > n, n, { timeout: 20000 });
  }
  await page.evaluate(iso => { OPS = true; cur.opsDay = iso; document.querySelector("nav.tabs button[data-v='ops']").click(); renderOps(); }, iso);
}
// the filled sheet "121" as cells (inline strings and numbers), rows with their heights, merges, and checks on the parts
const sheetOf = (page, A) => page.evaluate(A => {
  const data = A ? A : afpData(cur.opsDay), files = fflate.unzipSync(afpBytes(data)), p = sheetPaths(files)["121"], x = td.decode(files[p]);
  const sst = parseSST(files), cells = {};
  for (const m of x.matchAll(/<c r="([A-Z]+\d+)"[^>]*?(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const inner = m[2] || "", t = /<t[^>]*>([\s\S]*?)<\/t>/.exec(inner), v = /<v>([^<]*)<\/v>/.exec(inner), s = /t="s"/.test(m[0]);
    if (t) cells[m[1]] = t[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"); else if (v) cells[m[1]] = s ? sst[+v[1]] : +v[1];
  }
  const ok = new DOMParser().parseFromString(x, "application/xml").getElementsByTagName("parsererror").length === 0;
  const st = new DOMParser().parseFromString(td.decode(files["xl/styles.xml"]), "application/xml").getElementsByTagName("parsererror").length === 0;
  const hts = {}; for (const m of x.matchAll(/<row r="(\d+)"[^>]*?ht="([\d.]+)"/g)) hts[+m[1]] = +m[2];
  const merges = [...x.matchAll(/<mergeCell ref="([^"]+)"/g)].map(m => m[1]);
  const all = Object.keys(files).map(k => td.decode(files[k])).join("\n");
  return { cells, ok, st, hts, merges, parts: Object.keys(files), private: /LTC YING|9634/.test(all), data };
}, A);

test("button_and_dialog", async ({ page }) => {
  await goOps(page, DAY);
  assert.ok(await page.isVisible("#opsAfpBtn"));
  await page.click("#opsAfpBtn");
  assert.strictEqual(await page.evaluate(() => document.getElementById("afpPop").style.display), "flex");
  assert.ok(/Export AFP for Wednesday/.test(await page.textContent("#afpTitle")));
  assert.ok(/flight/.test(await page.textContent("#afpInfo")));
  assert.ok(/CO's name/.test(await page.textContent("#afpWarn")), "asks for the CO the first time");
  const dl = page.waitForEvent("download"); await page.click("#afpGo"); const d = await dl;
  assert.strictEqual(d.suggestedFilename(), "121 SQN AFP 14 Oct 2026.xlsx");
}, ED);
test("flights_from_the_board_names_rank_name_cat", async ({ page }) => {
  await goOps(page, DAY);
  const r = await page.evaluate(() => { const A = afpData(cur.opsDay), D = opsDay(cur.opsDay); return { n: A.fl.length, board: D.rows.filter(z => opsOutcome(z, D.iso) !== "cxl").length, f: A.fl[0], all: A.fl.flatMap(f => Object.values(f.seat).flat()) }; });
  assert.ok(r.n >= 1 && r.n === r.board, JSON.stringify([r.n, r.board]));
  assert.ok(r.all.length > 0);
  r.all.forEach(n => assert.ok(/^\S+ .+ \((A|B|C|D|OCU)\)$/.test(n), n));   // e.g. "MAJ Faizal Rahman (A)"
  assert.ok(/H$/.test(r.f.etd), r.f.etd);
}, ED);
test("pax_brief_in_remarks_no_mc_crmo", async ({ page }) => {
  await goOps(page, DAY);
  const r = await page.evaluate(() => {
    const D = opsDay(cur.opsDay), row = D.rows[0], c = row.seats.find(Boolean);
    opsWrite(row.key, o => { o.brf = "0730"; o.mc = c.id; o.crmo = c.id; o.rem = "Weather check"; });
    const A = afpData(cur.opsDay); return { rem: A.fl[0].rem };
  });
  assert.ok(/^BRF 0730H\nWeather check/.test(r.rem), r.rem);
  assert.ok(!/MC|CRMO/.test(r.rem), r.rem);
}, ED);
test("cancelled_flights_left_out_tasked_vs_planned", async ({ page }) => {
  await goOps(page, DAY);
  const r = await page.evaluate(() => {
    const A0 = afpData(cur.opsDay), D = opsDay(cur.opsDay);
    opsWrite(D.rows[0].key, o => { o.st = "Cancelled"; o.why = "Weather"; });
    const A1 = afpData(cur.opsDay); return { n0: A0.fl.length, n1: A1.fl.length, p0: A0.planned, p1: A1.planned, t0: A0.tasked, t1: A1.tasked };
  });
  assert.strictEqual(r.n1, r.n0 - 1);
  assert.deepStrictEqual(r.p1, r.p0, "planned comes from the Master Planner");
  assert.strictEqual(r.t1.s, r.t0.s - 1, "tasked follows the board");
  assert.strictEqual(r.t0.s, r.n0);
}, ED);
test("duty_box_lines_by_shift", async ({ page }) => {
  await goOps(page, DAY);
  const r = await page.evaluate(() => {
    const ob = books[opsIdx()].S, row = 6 + dayOfYear(2026, 9, 13), col = L => OPS_DB_CELLS.find(z => z.lab === L).col;
    ob.db[col("SXO") + row] = "MAJ A\nMAJ B\nMAJ C"; ob.db[col("OPS O") + row] = "CPT O"; ob.db[col("SDO") + row] = "ME2 S\nME1 T";
    const A = afpData(cur.opsDay); return { sxo: A.sxo, opsSdo: A.opsSdo, prep: A.prepared, vet: A.vetted };
  });
  assert.deepStrictEqual(r.sxo, ["MAJ A", "MAJ B", "MAJ C"]);
  assert.deepStrictEqual(r.opsSdo, ["CPT O / ME2 S", "CPT O / ME1 T", "CPT O / ME1 T"]);
  assert.strictEqual(r.prep, "ME2 S"); assert.strictEqual(r.vet, "CPT O");
}, ED);
test("sheet_is_filled_and_valid", async ({ page }) => {
  await goOps(page, DAY);
  const s = await sheetOf(page);
  assert.ok(s.ok && s.st, "valid XML");
  assert.ok(!s.private, "no CO details from the original file");
  assert.ok(!s.parts.some(p => /calcChain|chartsheet|drawing/.test(p)), s.parts.join(","));
  assert.strictEqual(s.cells.I1, (Date.UTC(2026, 9, 14) - Date.UTC(1899, 11, 30)) / 86400000);
  assert.strictEqual(s.cells.C7, "0900H");
  assert.strictEqual(s.cells.A11, "S/N"); assert.strictEqual(s.cells.E11, "PILOT");
  const f = s.data.fl[0];
  assert.strictEqual(s.cells.A13, 1); assert.strictEqual(s.cells.B13, f.etd); assert.strictEqual(s.cells.J13, f.mission);
  assert.strictEqual(s.cells.E13 || "", f.seat.Pilot.join("\n"));
  assert.strictEqual(s.cells.L6, s.data.planned.s); assert.strictEqual(s.cells.L7, s.data.tasked.s);
  assert.strictEqual(s.cells.A16, "STANDBY\n CREW", "format below the flights unchanged");
}, ED);
test("standby_rows_p1_am_p2_pm_no_alert", async ({ page }) => {
  await goOps(page, DAY);
  const A = await page.evaluate(() => { const A = afpData(cur.opsDay); A.fl = []; A.gr = []; A.sims = [];
    A.sb = [{ code: "P1", tail: "716", seat: { Pilot: ["CPT X (A)"], Loadmaster: [], TACCO: [], "SUP 1": [], "SUP 2": [] }, brf: "0700H", rem: "" },
            { code: "P2", tail: "717", seat: { Pilot: ["CPT Y (B)"], Loadmaster: [], TACCO: [], "SUP 1": [], "SUP 2": [] }, brf: "", rem: "" },
            { code: "BU", tail: "", seat: { Pilot: ["CPT Z (C)"], Loadmaster: ["ME1 Q (D)"], TACCO: [], "SUP 1": [], "SUP 2": [] }, brf: "", rem: "" }]; return A; });
  const s = await sheetOf(page, A);
  assert.strictEqual(s.cells.C18, "CPT X (A)"); assert.strictEqual(s.cells.B18, "716"); assert.strictEqual(s.cells.I18, "0700H");
  assert.strictEqual(s.cells.C20, "CPT Y (B)"); assert.strictEqual(s.cells.C22, "CPT Z (C)"); assert.strictEqual(s.cells.E22, "ME1 Q (D)");
  const one = await page.evaluate(() => { const D = opsDay(cur.opsDay); D.sb.forEach(r => { if (r.o) r.o.alert = "Alert 0800H"; }); return JSON.stringify(afpData(cur.opsDay).sb); });
  assert.ok(!/Alert 0800H/.test(one), "no alert timing");
}, ED);
test("extra_rows_added_below_move_everything_down", async ({ page }) => {
  await goOps(page, DAY);
  const A = await page.evaluate(() => { const A = afpData(cur.opsDay), f0 = { sn: 0, etd: "0800H", eta: "0900H", cs: "CS", seat: { Pilot: ["P (A)"] }, mission: "MAS", area: "", rem: "", tail: "710" };
    A.fl = Array.from({ length: 6 }, (_, k) => Object.assign({}, f0, { sn: k + 1, cs: "CS " + (k + 1) }));
    A.gr = Array.from({ length: 6 }, (_, k) => ({ time: "AM", act: "Act " + (k + 1), who: "W", venue: "V" }));
    A.sims = Array.from({ length: 3 }, (_, k) => ({ loc: "SIM", when: "AM", s: 0, who: ["N " + (k + 1)] }));
    A.sb = [{ code: "P1", tail: "716", seat: { Pilot: ["SB (A)"] }, brf: "", rem: "" }]; A.co = "LTC CO"; A.prepared = "ME2 S"; return A; });
  const s = await sheetOf(page, A);
  assert.ok(s.ok);
  for (let k = 0; k < 6; k++) assert.strictEqual(s.cells["D" + (13 + k)], "CS " + (k + 1));
  assert.strictEqual(s.cells.A19, "STANDBY\n CREW", "standby header moved down by 3");
  assert.strictEqual(s.cells.C21, "SB (A)", "AM SAL row moved down by 3");
  for (let k = 0; k < 6; k++) assert.strictEqual(s.cells["C" + (28 + k)], "Act " + (k + 1), "ground rows from 25 + 3");
  assert.ok(s.merges.includes("C33:E33"), "new ground rows carry the C:E merge");
  assert.strictEqual(s.cells["C" + (33 + 5)], "LTC CO", "CO row moved down by 3 + 2");
  assert.strictEqual(s.cells["L" + (31 + 5)], "ME2 S", "Prepared by moved too");
  for (let k = 0; k < 3; k++) assert.strictEqual(s.cells["E" + (39 + 5 + k)], "N " + (k + 1), "simulator lines");
  assert.strictEqual(s.hts[16], 91.8, "new flight rows copy the row height");
}, ED);
test("several_lines_wrap_and_grow_the_row", async ({ page }) => {
  await goOps(page, DAY);
  const A = await page.evaluate(() => { const A = afpData(cur.opsDay); A.fl = [{ sn: 1, etd: "", eta: "", cs: "", seat: { Pilot: ["MAJ One Two (A)", "CPT Three Four (B)", "CPT Five Six (B)", "LTA Seven (C)"] }, mission: "", area: "", rem: "", tail: "" }]; return A; });
  const r = await page.evaluate(A => { const files = fflate.unzipSync(afpBytes(A)), x = td.decode(files[sheetPaths(files)["121"]]), st = td.decode(files["xl/styles.xml"]);
    const s = +/<c r="E13"[^>]*\ss="(\d+)"/.exec(x)[1], xfs = st.match(/<cellXfs\b[^>]*>[\s\S]*?<\/cellXfs>/)[0].match(/<xf\b[^>]*\/>|<xf\b[^>]*>[\s\S]*?<\/xf>/g);
    return { wrap: /wrapText="1"/.test(xfs[s]), ht: +/<row r="13"[^>]*\sht="([\d.]+)"/.exec(x)[1] }; }, A);
  assert.ok(r.wrap, "wrapping style"); assert.ok(r.ht > 91.8, "row grew: " + r.ht);
}, ED);
test("co_details_kept_in_the_ops_room_file", async ({ page }) => {
  await goOps(page, DAY);
  const r = await page.evaluate(() => { afpSaveSet("LTC Test", "6123 4567"); const oi = opsIdx();
    return withBook(oi, () => { const out = buildXlsx(), x = td.decode(out.files[WB.paths[AFP_SHEET]]); return { name: x.includes("LTC Test"), tel: x.includes("6123 4567"), set: afpSet(), co: afpData(cur.opsDay).co }; }); });
  assert.ok(r.name && r.tel); assert.deepStrictEqual(r.set, { co: "LTC Test", tel: "6123 4567" }); assert.strictEqual(r.co, "LTC Test");
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
