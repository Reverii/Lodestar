// ATOM mission currencies (z151) and the past flights check. Build the dashboard first.
// Fixture: tests/make_atom_fixture.py (A NGO: Airlift 28 Oct, EIS 3 Sep, MAS 2031, SAL "-", SGH 30 Oct; TACCO T LEE: Airlift (ignored), EIS 3 Nov).
const assert = require("assert");
const { boot, atomFixture } = require("./lode_lib");
(async () => {
  const b = await boot({ today: "2026-10-26", mine: "Flight_Ops_Planner_Pilot", atom: [atomFixture()] }), p = b.page; let fails = 0;
  const ok = (n, f) => { try { f(); console.log("ok  ", n); } catch (e) { fails++; console.log("FAIL", n, e.message); } };
  // match the fixture names to roster Initials: Pilot rows 0-4, TACCO row 0
  await p.evaluate(() => { ["A NGO", "HO KM", "S LIM JH", "SAMY", "TEO WK"].forEach((n, i) => { books[0].S.roster[i].ini = n; }); const t = books.find(k => k.S.dept === "TACCO"); t.S.roster[0].ini = "T LEE"; atomMemo = null; });
  await p.click("button[data-v=cur]"); await p.waitForTimeout(400);
  const g = await p.evaluate(() => {
    const ths = [...document.querySelectorAll("#atomGrid thead tr:nth-child(2) th")].map(t => t.textContent), row = nm => [...document.querySelectorAll("#atomGrid tbody tr")].find(tr => tr.querySelector("td.nm b").textContent === nm);
    const cells = tr => [...tr.querySelectorAll("td")].map(td => td.className.replace(" gs", "") + "|" + td.textContent);
    const cobra = books[0].S.roster[0].id, tlee = books.find(k => k.S.dept === "TACCO").S.roster[0].id;
    return { ths, mis: document.querySelector("#atomGrid th.g.mis") && document.querySelector("#atomGrid th.g.mis").textContent, a: cells(row(cobra)), t: cells(row(tlee)), pill: (document.querySelector(".atombar .c.m") || {}).textContent, red: document.querySelector(".atombar .c.r").textContent };
  });
  ok("Mission group with the mission columns, no MAI/MCAS", () => { assert.strictEqual(g.mis, "Mission"); for (const c of ["Airlift", "EIS", "MAS", "SAL", "SGH"]) assert.ok(g.ths.includes(c), c); assert.ok(!g.ths.includes("MAI/MCAS")); });
  const col = (cells, name) => cells[g.ths.indexOf(name) + 1];
  ok("expiring within the window is purple, expired is quiet, '-' is a dash", () => {
    assert.strictEqual(col(g.a, "Airlift"), "mdue|28 Oct"); assert.strictEqual(col(g.a, "SGH"), "mdue|30 Oct");
    assert.strictEqual(col(g.a, "EIS"), "mexp|exp 3 Sep"); assert.strictEqual(col(g.a, "SAL"), "nh|–"); assert.ok(col(g.a, "MAS").startsWith("ok|"), col(g.a, "MAS"));
  });
  ok("TACCO: Airlift and SGH not needed (blank), EIS shown", () => { assert.strictEqual(col(g.t, "Airlift"), "nn|"); assert.strictEqual(col(g.t, "SGH"), "nn|"); assert.strictEqual(col(g.t, "EIS"), "mdue|3 Nov"); });
  ok("mission count on its own, not in the expired count", () => { assert.ok(/^3 mission/.test(g.pill), g.pill); assert.ok(!/mission/.test(g.red)); });
  // Planner: the expiry day on the WD row
  await p.evaluate(() => { document.querySelector("#plMenu button[data-v=plan]").click(); cur.m = 9; renderAll(); });
  const pl = await p.evaluate(() => { const r = gridRow(0, 3), c = d => document.querySelector("#plan td[data-k='g:" + r + ":" + d + "']"), am = document.querySelector("#plan td[data-k='g:" + gridRow(0, 0) + ":27']");
    return { d28: c(27).className.includes("misx") && c(27).querySelector(".mislab").textContent, d30: c(29).querySelector(".mislab") && c(29).querySelector(".mislab").textContent, d29: c(28).className.includes("misx"), am: am.className.includes("misx"), tip: c(27).title, chip: !!document.querySelector(".chip.mischip") }; });
  ok("WD row marked on 28 Oct (Airlift) and 30 Oct (SGH), nothing between, AM untouched", () => { assert.strictEqual(pl.d28, "Airlift expires"); assert.strictEqual(pl.d30, "SGH expires"); assert.ok(!pl.d29); assert.ok(!pl.am); assert.ok(/mission currency/.test(pl.tip)); assert.ok(pl.chip, "legend chip"); });
  // My Lodestar card
  const ml = await p.evaluate(() => { const w = { bi: 0, i: 0, p: books[0].S.roster[0], dept: books[0].S.dept }; return lodeCards(w, "2026-10-26"); });
  ok("My Lodestar mission card", () => { assert.ok(ml.mis, "card"); assert.strictEqual(ml.mis.level, "m"); assert.strictEqual(ml.mis.text, "Airlift expires 28 Oct"); assert.ok(/SGH 30 Oct/.test(ml.mis.sub) && /expired: EIS/.test(ml.mis.sub), ml.mis.sub); });
  // shared through the Ops Room: publish, read back
  const sh = await p.evaluate(() => { OPS = true; atomPublish(ATOMS[0]); const f = atomShared(), r = f.sheets.Pilot.find(x => x.name === "A NGO"), t = f.sheets.TACCO.find(x => x.name === "T LEE"); return { a: Object.keys(r.mis), air: r.mis.Airlift.iso, t: Object.keys(t.mis) }; });
  ok("published sheet carries the mission dates", () => { assert.deepStrictEqual(sh.a, ["Airlift", "EIS", "MAS", "SAL", "SGH"]); assert.strictEqual(sh.air, "2026-10-28"); assert.deepStrictEqual(sh.t, ["EIS", "MAS", "SAL"]); });
  // ---- past flights check
  const n0 = await p.evaluate(() => { nclMemo = null; const x = notClosed(0); return { on: x.on, why: x.why }; });
  ok("off until the Ops Room closes a flight", () => { assert.ok(!n0.on); assert.ok(/first flight/.test(n0.why), n0.why); });
  const n1 = await p.evaluate(() => {
    // close one of COBRA's flights in the Ops Room: from then on, his other past flights are listed
    const who = { dept: books[0].S.dept, i: 0, p: books[0].S.roster[0] }; let first = null, cs = -1;
    for (let d = 1; d <= 25 && !first; d++) { const iso = "2026-10-" + String(d).padStart(2, "0"), D = opsDay(iso); const r = D && D.rows && D.rows.find(x => x.seats.concat(Object.values(x.auto || {}).flat()).some(c => lodeIsMe(who, c))); if (r) { first = iso; cs = r.x.s; cur.opsDay = iso; opsWrite(r.key, o => { o.atd = "0900"; o.ata = "1030"; }); } }
    nclMemo = null; const x = notClosed(0); return { first, cs, on: x.on, n: x.list.length, mine: x.list.filter(z => z.i === 0).map(z => z.iso + " " + z.s), before: x.list.some(z => z.iso < first) };
  });
  ok("lists the past flights not closed, none before the first closed day, not the closed one", () => { assert.ok(n1.first, "found a flight to close"); assert.ok(n1.on); assert.ok(n1.n > 0, "some not closed"); assert.ok(!n1.before); assert.ok(!n1.mine.includes(n1.first + " " + n1.cs), "the closed flight is not listed"); });
  const n2 = await p.evaluate(() => { const x = notClosed(0), z = x.list[0]; return { z, html: nclHtml(x) }; });
  ok("Currency tab box", () => { assert.ok(/not closed in the Ops Room/.test(n2.html)); });
  await p.evaluate(() => { document.querySelector("button[data-v=cur]").click(); });
  const box = await p.evaluate(() => $("nclBox").textContent);
  ok("box text", () => assert.ok(/past flight/.test(box), box.slice(0, 120)));
  const cell = await p.evaluate(z => { cur.m = +z.iso.slice(5, 7) - 1; document.querySelector("#plMenu button[data-v=plan]").click(); renderAll(); const td = document.querySelector("#plan td[data-k='g:" + gridRow(z.i, z.s) + ":" + (+z.iso.slice(8, 10) - 1) + "']"); return td ? td.className + "|" + td.title.split("\n")[0] : "none"; }, n2.z);
  ok("the Planner cell is underlined amber with a tooltip", () => { assert.ok(/\bncl\b/.test(cell) && /Not closed in the Ops Room/.test(cell), cell); });
  const n3 = await p.evaluate(z => { const who = { dept: books[0].S.dept, i: z.i, p: books[0].S.roster[z.i] }, D = opsDay(z.iso), r = D.rows.find(x => x.x.s === z.s && x.seats.concat(Object.values(x.auto || {}).flat()).some(c => lodeIsMe(who, c))); if (!r) return "no row";
    cur.opsDay = z.iso; opsWrite(r.key, o => { o.st = "Cancelled"; o.why = "Weather"; }); nclMemo = null; return notClosed(0).list.some(y => y.iso === z.iso && y.i === z.i && y.s === z.s); }, n2.z);
  ok("cancelling it in the Ops Room takes it off the list", () => assert.strictEqual(n3, false));
  ok("no page errors", () => assert.deepStrictEqual(b.errs.filter(e => !/DIALOG/.test(e)), []));
  await b.close(); console.log(fails ? fails + " FAILED" : "all pass"); process.exit(fails ? 1 : 0);
})();
