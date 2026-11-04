// z175: a running change (a Master Planner flight with 2 or 3 sorties) in the department Planner and the Ops Room. The planner marks each
// person Crew / Pax / Not on per flight (Flight 1/2, Flight 2/2); hours are the flight's time range shared out; each flight needs someone
// from the department; the Ops Room seats each row by it. Build the dashboard first. Run: node tests/running_change.test.js
const assert = require("assert");
const { boot } = require("./lode_lib");
(async () => {
  let fails = 0; const ok = (n, f) => { try { f(); console.log("ok  ", n); } catch (e) { fails++; console.log("FAIL", n, e.message); } };
  const b = await boot({ mine: "Flight_Ops_Planner_SUP2", today: "2026-11-04" }), p = b.page;
  await p.evaluate(() => { document.querySelector("#plMenu button[data-v='plan']").click(); });
  const setup = await p.evaluate(() => {
    cur.m = 10; cur.mfold = false; const M = S.m[10], d = 4, P = masterBook().S;
    // a fresh 2-sortie flight on Thu 5 Nov AM; nothing else in that shift
    P.fl.filter(f => f.mi === 10 && f.d === d && f.s === 0).forEach(f => { f.code = ""; });
    const f0 = P.fl.find(f => f.code), f = Object.assign({}, f0, { row: 9999, mi: 10, d, s: 0, code: "FLT-3.0", time: "1000-1300", sort: 2, crew: "", note: "" }); P.fl.push(f);
    for (let r = 0; r < 6; r++) { M.master[r][d] = ""; M.mtime[r][d] = ""; M.mnote[r][d] = ""; }
    M.master[0][d] = "FLT-3.0"; M.mtime[0][d] = "1000-1300";
    for (let i = 0; i < S.roster.length; i++) for (let s = 0; s < 4; s++) if (M.grid[gridRow(i, s)]) M.grid[gridRow(i, s)][d] = "";
    const ix = id => S.roster.findIndex(x => x.id === id);
    window.RC = { d, r: id => gridRow(ix(id), 0) };
    return { n: cellSorties(S, 10, 0, d, "FLT-3.0"), hasSup2Seat: OPS_SEATS.some(z => z[1] === "SUP 2") };
  });
  ok("the Planner knows the flight has 2 sorties", () => assert.strictEqual(setup.n, 2));
  const st = () => p.evaluate(() => { renderPlanner(); const s0 = monthStats(10, actIndex()); const D = s0.day[RC.d];
    const td = document.querySelector("#plan td[data-k='m:0:" + RC.d + "']");
    return { status: D.status[0], gap: D.gap[0], planned: D.planned[0], fl: D.fl[0], hrs: D.hrs, master: td ? td.textContent : "", tip: td ? td.title : "" }; }).catch(e => ({ err: e.message }));
  // same crew on both: VIPER alone
  await p.evaluate(() => { S.m[10].grid[RC.r("VIPER")][RC.d] = "FLT-3.0"; });
  let r = await st();
  if (r.err) { console.log("stats helper:", r.err); }
  ok("MASTER cell shows 2 SORTIES", () => assert.ok(/2 SORTIES/.test(r.master), r.master));
  ok("one person on both flights covers it", () => { assert.strictEqual(r.planned, 2); assert.strictEqual(r.fl, 2); assert.strictEqual(r.status, "ok"); });
  ok("on both flights: the whole 3 hours", () => assert.strictEqual(r.hrs, 3));
  // HAWK: Pax on Flight 1/2, crew on 2/2
  const h = await p.evaluate(() => { S.m[10].grid[RC.r("HAWK")][RC.d] = "FLT-3.0"; const ok = sorSet(10, RC.r("HAWK"), RC.d, ["P", "C"]); renderPlanner();
    const td = document.querySelector("#plan td[data-k='g:" + RC.r("HAWK") + ":" + RC.d + "']");
    return { ok, role: roleOf(S, 10, RC.r("HAWK"), RC.d), sor: sorOf(S, 10, RC.r("HAWK"), RC.d), chip: td ? [...td.querySelectorAll("i.rtag")].map(x => x.textContent) : null }; });
  ok("Pax on Flight 1/2 is saved", () => { assert.ok(h.ok); assert.deepStrictEqual(h.sor, ["P", "C"]); assert.strictEqual(h.role, ""); });
  ok("the cell shows PAX FLIGHT 1/2", () => assert.deepStrictEqual(h.chip, ["PAX FLIGHT 1/2"]));
  r = await st();
  ok("hours: VIPER 3 + HAWK 1.5", () => assert.strictEqual(r.hrs, 4.5));
  // the file: Role Tags E holds P,C
  const file = await p.evaluate(() => { const files = buildXlsx().files, sh = WB.paths["Role Tags"], c = readCellsOf(files, sh, WB.sst); const rows = []; for (let i = 1; i < 30; i++) if (c["C" + i] || c["E" + i]) rows.push([c["C" + i], c["D" + i] || "", c["E" + i] || ""]); return rows; });
  ok("Role Tags sheet: Flights column", () => { assert.deepStrictEqual(file[0], ["Callsign", "Tag", "Flights"]); assert.ok(file.some(x => x[0] === "HAWK" && x[2] === "P,C"), JSON.stringify(file)); });
  // the Ops Room rows
  const ops = await p.evaluate(() => { const D = opsDay("2026-11-05"), k = OPS_SEATS.findIndex(z => z[1] === "SUP 2");
    return D.rows.filter(z => z.x.code === "FLT-3.0" && z.x.s === 0).map(z => ({ seat: z.seats[k] && z.seats[k].id, pax: z.pax, xtra: Object.values(z.auto).flat().filter(c => c.tag !== "PAX").map(c => c.id), etd: z.etd, eta: z.eta, pdur: z.pdur })); });
  ok("Ops Room: one row per flight with its share of the time", () => { assert.strictEqual(ops.length, 2); assert.deepStrictEqual(ops.map(o => [o.etd, o.eta, o.pdur]), [["1000H", "1130H", 1.5], ["1130H", "1300H", 1.5]]); });
  ok("Ops Room: VIPER seated on 1/2 with HAWK as Pax", () => { assert.strictEqual(ops[0].seat, "VIPER"); assert.deepStrictEqual(ops[0].pax, ["HAWK"]); });
  ok("Ops Room: HAWK seated on 2/2, VIPER rides along", () => { assert.strictEqual(ops[1].seat, "HAWK"); assert.deepStrictEqual(ops[1].xtra, ["VIPER"]); });
  // only one person, on Flight 1/2 only: 2/2 is short
  await p.evaluate(() => { const g = S.m[10].grid; g[RC.r("VIPER")][RC.d] = ""; g[RC.r("HAWK")][RC.d] = ""; g[RC.r("FALCON")][RC.d] = "FLT-3.0"; sorSet(10, RC.r("FALCON"), RC.d, ["C", "N"]); });
  r = await st();
  ok("Flight 2/2 with nobody: short", () => { assert.strictEqual(r.status, "short"); assert.deepStrictEqual(r.gap, ["FLT-3.0 Flight 2/2"]); assert.ok(/Flight 2\/2 has nobody from SUP 2/.test(r.tip), r.tip); });
  ok("Flight 1/2 only: 1.5 hours", () => assert.strictEqual(r.hrs, 1.5));
  const same = await p.evaluate(() => { const D = opsDay("2026-11-05"), k = OPS_SEATS.findIndex(z => z[1] === "SUP 2"); return D.rows.filter(z => z.x.code === "FLT-3.0" && z.x.s === 0).map(z => z.seats[k] && z.seats[k].id || ""); });
  ok("Ops Room: FALCON on 1/2 only", () => assert.deepStrictEqual(same, ["FALCON", ""]));
  // the popup: right-click FALCON's cell, set Flight 2/2 to Crew
  await p.evaluate(() => renderPlanner());
  await p.click("#plan td[data-k='g:" + (await p.evaluate(() => RC.r("FALCON"))) + ":4']", { button: "right" });
  const pop = await p.evaluate(() => { const el = document.getElementById("popRole"); return { shown: el.style.display !== "none", txt: el.textContent, n: el.querySelectorAll("button[data-sor]").length }; });
  ok("popup lists Flight 1/2 and 2/2 with their times", () => { assert.ok(pop.shown); assert.strictEqual(pop.n, 6); assert.ok(/Flight 1\/2\s*1000H-1130H/.test(pop.txt) && /Flight 2\/2\s*1130H-1300H/.test(pop.txt), pop.txt); assert.ok(/1\.5 of 3 hrs/.test(pop.txt), pop.txt); });
  await p.click("#popRole button[data-sor='1'][data-sv='C']");
  const after = await p.evaluate(() => ({ sor: sorOf(S, 10, RC.r("FALCON"), RC.d), e: S.roleSor.get("10:" + RC.r("FALCON") + ":" + RC.d) || null, status: monthStats(10, actIndex()).day[RC.d].status[0] }));
  ok("crew on both again clears the choice", () => { assert.deepStrictEqual(after.sor, ["C", "C"]); assert.strictEqual(after.e, null); assert.strictEqual(after.status, "ok"); });
  const allPax = await p.evaluate(() => { sorSet(10, RC.r("FALCON"), RC.d, ["P", "P"]); return { role: roleOf(S, 10, RC.r("FALCON"), RC.d), e: S.roleSor.get("10:" + RC.r("FALCON") + ":" + RC.d) || null }; });
  ok("Pax on every flight is the PAX tag", () => assert.deepStrictEqual(allPax, { role: "PAX", e: null }));
  // an ordinary flight is unchanged
  const one = await p.evaluate(() => { const M = S.m[10]; return { n: cellSorties(S, 10, 1, 5, M.master[2][5]), sor: sorOf(S, 10, RC.r("VIPER"), 5) }; });
  ok("ordinary flights have no per-flight choice", () => { assert.strictEqual(one.n, 1); assert.strictEqual(one.sor, null); });
  // reopened from the saved file: the Flights column reads back
  const b64 = await p.evaluate(() => { sorSet(10, RC.r("HAWK"), RC.d, ["P", "C"]); S.m[10].grid[RC.r("HAWK")][RC.d] = "FLT-3.0";
    const u = buildXlsx().bytes; let x = ""; for (let i = 0; i < u.length; i += 0x8000) x += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return { b: btoa(x), k: "10:" + RC.r("HAWK") + ":" + RC.d }; });
  const fs = require("fs"), os = require("os"), path = require("path"), dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc_")), fp = path.join(dir, "Flight_Ops_Planner_SUP2.xlsx");
  fs.writeFileSync(fp, Buffer.from(b64.b, "base64"));
  const b2 = await boot({ blank: true, today: "2026-11-04" }); await b2.page.setInputFiles("#fileInput", fp);
  await b2.page.waitForFunction(() => typeof books !== "undefined" && books.length >= 1, null, { timeout: 20000 });
  const back = { sor: await b2.page.evaluate(k => books[0].S.roleSor.get(k) || null, b64.k) }; await b2.close();
  ok("the Flights column reads back from the saved file", () => assert.deepStrictEqual(back.sor, ["P", "C"]));
  ok("no page errors", () => assert.deepStrictEqual(b.errs, []));
  await b.close(); console.log(fails ? fails + " failed" : "all pass"); process.exit(fails ? 1 : 0);
})();
