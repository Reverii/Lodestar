// Start new year end to end on the SharePoint mock: plans in December and on the Jan (next year) tab of several files, the
// Ops Room runs Start new year, then the archive, the new files (year, carried January, cleared December, valid for Excel)
// and a fresh dashboard on them are checked. Also: someone saving or editing while it runs.
// Build first: python3 .lodestar_build.py dashboard     Run: node tests/new_year.test.js [name-filter]
const assert = require("assert");
const fs = require("fs"), os = require("os"), path = require("path");
const { execFileSync } = require("child_process");
const { cells, person, code, edit, saved, sleep, runTests } = require("./sp_lib");
const SUP2 = "Flight_Ops_Planner_SUP2.xlsx", PILOT = "Flight_Ops_Planner_Pilot.xlsx", MP = "Master_Planner.xlsx", DR = "Duty_Roster.xlsx";
const ALL = ["Duty_Roster", "Master_Planner", "Ops_Room", "Flight_Ops_Planner_SUP1", "Flight_Ops_Planner_SUP2", "Flight_Ops_Planner_TACCO", "Flight_Ops_Planner_Loadmaster", "Flight_Ops_Planner_Pilot"].map(n => n + ".xlsx");
const ARCH = "/sites/121SQN/Program/Archive 2026";
const DEC31 = { today: "2026-12-31" };
const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const check = bytes => { const f = path.join(os.tmpdir(), "lodestar_ny_" + process.pid + ".xlsx"); fs.writeFileSync(f, bytes); try { execFileSync("python3", [path.join(__dirname, "xlsx_check.py"), f], { stdio: "pipe" }); return []; } catch (e) { return String(e.stdout).trim().split("\n").slice(0, -1); } };
// a crew cell of an open department file: month index mi (12 = Jan (next year)), person i, shift s, day d
const crewCell = (page, file, mi, i, s, d) => page.evaluate(([file, mi, i, s, d]) => withBook(books.findIndex(b => b.WB.name === file), () => ({ sheet: monSheet(mi), ref: colL(DAY_COL0 + d) + (g0() + gridRow(i, s)) })), [file, mi, i, s, d]);
const ref = (page, expr, args) => page.evaluate(new Function("a", "return " + expr), args);
const runRoll = page => page.evaluate(async () => { window.confirm = () => true; rollOpen(); const prob = rollCheck().prob; if (prob.length) return { prob }; await rollGo(); return { prob, body: document.getElementById("rollBody").innerText }; });

// the plans typed before the year ends (saved through the mock by the Ops Room), returns the cells to look at
async function plan2026(m, errs) {
  const p = await person(m, "Planner", "Ops Room", errs, DEC31), v = await code(p);
  const c = {
    dec: await crewCell(p, SUP2, 11, 0, 0, 14), nx: await crewCell(p, SUP2, 12, 0, 0, 4), pnx: await crewCell(p, PILOT, 12, 1, 1, 6),
    flDec: ["Flights", "A906"], flNx: ["Flights", "A907"],
    sdoDec: await ref(p, "sdoRef(2026, 11, 3)"), sdoNx: await ref(p, "sdoRef(2026, NX_MI, 5)"), sdoNew: await ref(p, "sdoRef(2027, 0, 5)"),
  };
  for (const [f, x] of [[SUP2, c.dec], [SUP2, c.nx], [PILOT, c.pnx]]) await edit(p, f, x, v);
  const ser = await ref(p, "[dateSerial(2026, 11, 20), dateSerial(2027, 0, 10)]");
  for (const [r, s, sh, cd] of [[906, ser[0], "AM", "FLT-2.0"], [907, ser[1], "PM", "FLT-1.5"]]) {
    await edit(p, MP, { sheet: "Flights", ref: "A" + r }, s); await edit(p, MP, { sheet: "Flights", ref: "B" + r }, sh); await edit(p, MP, { sheet: "Flights", ref: "C" + r }, cd); }
  await edit(p, DR, { sheet: "SDO Plan", ref: c.sdoDec }, "SUP 2"); await edit(p, DR, { sheet: "SDO Plan", ref: c.sdoNx }, "Pilot");
  for (const f of [SUP2, PILOT, MP, DR]) await saved(p, f, 30000);
  await p.ctx.close();
  return { c, v };
}

test("new_year_end_to_end", async ({ m, errs }) => {
  const { c, v } = await plan2026(m, errs);
  const before = Object.fromEntries(ALL.map(n => [n, Buffer.from(m.file(n))]));
  const ops = await person(m, "Ops Officer", "Ops Room", errs, DEC31);
  const r = await runRoll(ops);
  assert.deepStrictEqual(r.prob, [], "ready to run"); assert.ok(/now 2027/.test(r.body), r.body);
  // archive: the 2026 files as they were
  for (const n of ALL) assert.ok(m.other.has(ARCH + "/" + n) && m.other.get(ARCH + "/" + n).length > 1000, "archived " + n);
  for (const n of ALL) { const a = cells(m.other.get(ARCH + "/" + n), [["Dashboard", "A5"]]); assert.strictEqual(a[0], "2026", n + " archive is 2026"); }
  assert.ok(before[SUP2].length > 0);
  // new files: year 2027, valid for Excel
  for (const n of ALL) { assert.strictEqual(cells(m.file(n), [["Dashboard", "A5"]])[0], "2027", n + " year"); const pr = check(m.file(n)); assert.deepStrictEqual(pr, [], n + ": " + pr.slice(0, 2).join(" | ")); }
  // the Jan (next year) plans are the new January; December and the next-year tab start empty
  const jan = (x) => ({ sheet: "Jan", ref: x.ref });
  const [s1, s2, s3] = cells(m.file(SUP2), [[c.dec.sheet, c.dec.ref], ["Jan", c.nx.ref], [c.nx.sheet, c.nx.ref]]);
  assert.deepStrictEqual([s1, s2, s3], ["", v, ""], "SUP 2: Dec cleared, Jan carried, next-year tab cleared");
  assert.strictEqual(cells(m.file(PILOT), [["Jan", jan(c.pnx).ref]])[0], v, "Pilot January carried");
  const fl = cells(m.file(MP), [["Flights", "C906"], ["Flights", "C907"]]);
  assert.deepStrictEqual(fl, ["", "FLT-1.5"], "Master Planner: December flight gone, January 2027 flight kept");
  const sd = cells(m.file(DR), [["SDO Plan", c.sdoNew], ["SDO Plan", c.sdoNx]]);
  assert.strictEqual(sd[0], "Pilot", "SDO day on 6 Jan 2027 carried to the new January block");
  assert.ok(sd[1] === "" || c.sdoNx === c.sdoNew, "13th block cleared");
  const log = cells(m.file(SUP2), [["Change Log", "*"]])[0]; assert.ok(!log || log.slice(1).every(r => !r.replace(/\|/g, "")), "Change Log emptied: " + JSON.stringify(log && log.slice(1, 3)));
  // a fresh dashboard on the new files
  const nu = await person(m, "Ops Officer", "Ops Room", errs, { today: "2027-01-02" });
  const st = await nu.evaluate(file => ({ years: books.map(b => b.S.year), jan: (() => { const b = books.find(b => b.WB.name === file); return b.S.m[0].grid.flat().filter(Boolean).length; })(), lay: books.filter(b => b.S.lay && (b.S.lay.older || b.S.lay.newer)).map(b => b.WB.name) }), SUP2);
  assert.ok(st.years.every(y => y === 2027), "all files open as 2027: " + st.years);
  assert.ok(st.jan >= 1, "January plan shows");
});

test("new_year_stops_when_someone_saved_meanwhile", async ({ m, errs }) => {
  const ops = await person(m, "Ops Officer", "Ops Room", errs, DEC31);
  const b = await person(m, "Sarah Lim", "SUP 2", errs, DEC31), v = await code(b), x = await crewCell(b, SUP2, 11, 2, 0, 20);
  await edit(b, SUP2, x, v); await saved(b, SUP2);   // saved after the Ops Room last read SUP 2
  const after = Buffer.from(m.file(SUP2)); const n0 = m.saves().length;
  const r = await runRoll(ops);
  assert.strictEqual(cells(m.file(SUP2), [["Dashboard", "A5"]])[0], "2026", "Start new year did not run");
  assert.strictEqual(m.saves().length, n0, "nothing written"); assert.strictEqual(m.other.size, 0, "no archive written");
  assert.ok(Buffer.compare(after, m.file(SUP2)) === 0, "Sarah's save is still there");
  assert.ok(errs.some(e => /DIALOG/.test(e) && /SUP2/.test(e) && /Refresh/.test(e)), "says which file and to refresh: " + errs.join(" | "));
  // after a refresh it runs, and Sarah's edit is in the archive
  errs.length = 0; await ops.evaluate(() => liveCheck(true)); const r2 = await runRoll(ops); assert.deepStrictEqual(r2.prob, []);
  assert.strictEqual(cells(m.file(SUP2), [["Dashboard", "A5"]])[0], "2027");
  assert.strictEqual(cells(m.other.get(ARCH + "/" + SUP2), [[x.sheet, x.ref]])[0], v, "Sarah's last save is in the archive copy");
});

test("open_dashboard_does_not_write_last_year_into_the_new_files", async ({ m, errs }) => {
  const b = await person(m, "Sarah Lim", "SUP 2", errs, DEC31), v = await code(b), x = await crewCell(b, SUP2, 11, 3, 0, 22);
  await b.evaluate(() => { window.AUTO_HOLD = autoRun; window.autoRun = async () => {}; });   // her edit is typed, not saved yet
  await edit(b, SUP2, x, v);
  const ops = await person(m, "Ops Officer", "Ops Room", errs, DEC31);
  const r = await runRoll(ops); assert.deepStrictEqual(r.prob, []);
  assert.strictEqual(cells(m.file(SUP2), [["Dashboard", "A5"]])[0], "2027");
  await b.evaluate(() => { window.autoRun = window.AUTO_HOLD; return autoRun(); }); await sleep(1500);
  const [yr, dec] = cells(m.file(SUP2), [["Dashboard", "A5"], [x.sheet, x.ref]]);
  assert.strictEqual(yr, "2027", "still 2027");
  assert.strictEqual(dec, "", "her December 2026 plan did not land in December 2027");
  const msg = await b.evaluate(() => autoMsg + " " + books.map(b => b.autoStop || "").join(" ") + " " + document.body.innerText.slice(0, 4000));
  assert.ok(/2027|new year|reload/i.test(msg), "she is told the file moved on: " + msg.slice(0, 200));
});

test("roll_keeps_crew_and_their_ids_in_every_file", async ({ m, errs }) => {
  const ops = await person(m, "Ops Officer", "Ops Room", errs, DEC31);
  const before = await ops.evaluate(() => books.map(b => [b.WB.name, b.S.roster ? b.S.roster.map(p => p.id + "|" + p.name).join(",") : ""]));
  const r = await runRoll(ops); assert.deepStrictEqual(r.prob, []);
  const nu = await person(m, "Ops Officer", "Ops Room", errs, { today: "2027-01-02" });
  const after = await nu.evaluate(() => books.map(b => [b.WB.name, b.S.roster ? b.S.roster.map(p => p.id + "|" + p.name).join(",") : ""]));
  const A = Object.fromEntries(after); for (const [n, ro] of before) assert.strictEqual(A[n], ro, n + " roster unchanged");
});

test("save_button_after_new_year_refuses_last_years_file", async ({ m, errs }) => {
  const b = await person(m, "Sarah Lim", "SUP 2", errs, DEC31), v = await code(b), x = await crewCell(b, SUP2, 11, 4, 0, 23);
  await b.evaluate(() => { window.AUTO_HOLD = autoRun; window.autoRun = async () => {}; });
  await edit(b, SUP2, x, v);
  const ops = await person(m, "Ops Officer", "Ops Room", errs, DEC31); assert.deepStrictEqual((await runRoll(ops)).prob, []);
  const n0 = m.saves(SUP2).length;
  await b.evaluate(() => { window.confirm = () => true; return save(); });   // she clicks Save (and would click OK on any question)
  assert.strictEqual(m.saves(SUP2).length, n0, "nothing written");
  assert.strictEqual(cells(m.file(SUP2), [["Dashboard", "A5"]])[0], "2027");
  assert.ok(errs.some(e => /DIALOG/.test(e) && /moved to 2027/.test(e)), errs.join(" | "));
});

test("idle_dashboard_picks_up_the_new_year_on_refresh", async ({ m, errs }) => {
  const b = await person(m, "Mei Lee", "Pilot", errs, DEC31);
  const ops = await person(m, "Ops Officer", "Ops Room", errs, DEC31); assert.deepStrictEqual((await runRoll(ops)).prob, []);
  const r = await b.evaluate(() => liveCheck(true));
  const ys = await b.evaluate(() => books.map(b => b.S.year));
  assert.ok(r.n >= 4 && ys.every(y => y === 2027), "every open file re-read as 2027: " + ys + " n=" + r.n);
  assert.strictEqual((await b.evaluate(() => books[0].autoStop || "")), "");
});

runTests(tests, "new_year");
