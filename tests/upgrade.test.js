// z183: Upgrade a department file from layout 4 (15 SANS / NSMEN rows) to layout 5 (30). Build the dashboard first.
// Needs a layout-5 set: python3 .lodestar_build.py excel <folder>, then LODE_NEW=<folder> node tests/upgrade.test.js
// The old files are the repo's layout-4 demo set (or LODE_FILES); nothing is written to disk except the temp copy for openpyxl.
const assert = require("assert");
const fs = require("fs"), path = require("path"), os = require("os");
const { execFileSync } = require("child_process");
const { boot } = require("./lode_lib");
const NEW = process.env.LODE_NEW; if (!NEW) { console.log("Set LODE_NEW=<folder with a layout-5 set>"); process.exit(1); }
const b64 = f => fs.readFileSync(path.join(NEW, f)).toString("base64");
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// typed data in the open SUP 2 file (made-up), saved to bytes in the page as the "old file"
async function makeOld(page) {
  return page.evaluate(() => {
    const L = DAY_COL0;
    put("Oct", colL(L + 4) + (g0() + gridRow(3, 1)), "LEAVE"); S.m[9].grid[gridRow(3, 1)][4] = "LEAVE";
    const k = REG_N + 2; Object.assign(S.roster[k], { id: "LAST15", name: "ME2 Old Row", status: "NSMEN" });   // a SANS / NSMEN person
    const rc = rosterCols(S); put("Roster", rc.id + (ROSTER_ROW0 + k), "LAST15"); put("Roster", rc.name + (ROSTER_ROW0 + k), "ME2 Old Row"); put("Roster", rc.status + (ROSTER_ROW0 + k), "NSMEN");
    put("Nov", colL(L + 9) + (g0() + gridRow(k, 3)), "ADMIN"); S.m[10].grid[gridRow(k, 3)][9] = "ADMIN";
    setNote(9, gridRow(3, 1), 4, "Upgrade note");
    put(MN_SHEET, "A1", "Misc text"); put(MN_SHEET, "AA1", "A:b");
    put(RK_SHEET, "A2", "ME4"); put(RK_SHEET, "B2", "");
    const bk = books[cur.b], r = logBuild(bk, new Map(bk.dirty));
    window._old = r.bytes; window._before = { roster: S.roster.map(p => [p.id, p.name, p.status].join("|")), grids: S.m.map(M => M && M.grid ? M.grid.map(x => x.join(",")).join(";") : "") };
    return r.bytes.length;
  });
}

test("upgrade_copies_everything_and_gives_75_slots", async ({ page }) => {
  await makeOld(page);
  const res = await page.evaluate(B => { const nb = new Function("B", "const u = Uint8Array.from(atob(B), c => c.charCodeAt(0)); return u.buffer;")(B);
    const r = upgDeptFile(window._old.buffer.slice(window._old.byteOffset, window._old.byteOffset + window._old.byteLength), nb); window._up = r.bytes;
    return { cells: r.cells, made: r.made, named: r.named }; }, b64("Flight_Ops_Planner_SUP2.xlsx"));
  assert.ok(res.made.includes("Misc Notes") && res.made.includes("Ranks") && res.made.includes("Change Log"), res.made.join(","));
  // read the upgraded file back as the open book
  const r = await page.evaluate(() => { const u = window._up; reparseBook(cur.b, u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength)); useBook(cur.b); renderAll();
    const B = window._before, n = S.n, ro = S.roster.slice(0, 60).map(p => [p.id, p.name, p.status].join("|")), extra = S.roster.slice(60).filter(p => !rosEmpty(p)).length;
    const grids = S.m.map(M => M && M.grid ? M.grid.slice(0, 60 * ROWS_PER).map(x => x.join(",")).join(";") : "");
    return { n, len: S.roster.length, roster: JSON.stringify(ro) === JSON.stringify(B.roster), grids: grids.map((g, i) => g === B.grids[i]).every(Boolean), extra,
      note: S.notes.get("9:" + gridRow(3, 1) + ":4"), rk: S.rk.map(x => x.rank).join(), lay: S.lay.stamp, older: S.lay.older,
      mn: str(readCells(MN_SHEET).A1), log: Object.keys(readCells(LOG_SHEET)).length > 8, year: S.year, dept: S.dept };
  });
  assert.deepStrictEqual(r, { n: 75, len: 75, roster: true, grids: true, extra: 0, note: "Upgrade note", rk: "ME4", lay: 5, older: false, mn: "Misc text", log: true, year: 2026, dept: "SUP 2" });
});
test("new_rows_take_sans_and_nsmen_people", async ({ page }) => {
  await makeOld(page);
  await page.evaluate(B => { const nb = new Function("B", "const u = Uint8Array.from(atob(B), c => c.charCodeAt(0)); return u.buffer;")(B), o = window._old;
    const r = upgDeptFile(o.buffer.slice(o.byteOffset, o.byteOffset + o.byteLength), nb).bytes; reparseBook(cur.b, r.buffer.slice(r.byteOffset, r.byteOffset + r.byteLength)); useBook(cur.b); renderAll(); }, b64("Flight_Ops_Planner_SUP2.xlsx"));
  // fill every SANS / NSMEN row, then the 16th to 30th go into rows 61 to 75 and keep their plans
  const r = await page.evaluate(() => { const rc = rosterCols(S);
    for (let i = REG_N; i < S.n; i++) if (rosEmpty(S.roster[i])) { const v = "NS" + i; S.roster[i].id = v; S.roster[i].name = "ME1 Person " + i; S.roster[i].status = "NSMEN"; put("Roster", rc.id + (ROSTER_ROW0 + i), v); put("Roster", rc.name + (ROSTER_ROW0 + i), S.roster[i].name); put("Roster", rc.status + (ROSTER_ROW0 + i), "NSMEN"); }
    const k = S.n - 1; put("Oct", colL(DAY_COL0 + 2) + (g0() + gridRow(k, 0)), "SIM"); S.m[9].grid[gridRow(k, 0)][2] = "SIM";
    const bk = books[cur.b], b = logBuild(bk, new Map(bk.dirty)).bytes; bk.dirty = new Map(); reparseBook(cur.b, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); useBook(cur.b); renderAll();
    return [S.roster.slice(REG_N).filter(p => !rosEmpty(p)).length, S.roster[k].id, S.m[9].grid[gridRow(k, 0)][2], document.querySelectorAll("#rosterTable tr.sans").length >= 30]; });
  assert.deepStrictEqual(r, [30, "NS74", "SIM", true]);
});
test("refuses_wrong_files", async ({ page }) => {
  await makeOld(page);
  const r = await page.evaluate(([B5, B4o, Bt]) => { const f = B => new Function("B", "const u = Uint8Array.from(atob(B), c => c.charCodeAt(0)); return u.buffer;")(B), o = window._old, ob = o.buffer.slice(o.byteOffset, o.byteOffset + o.byteLength);
    const m = fn => { try { fn(); return "ok"; } catch (e) { return e.message; } };
    return [m(() => upgDeptFile(ob, f(Bt))), m(() => upgDeptFile(ob, ob)), m(() => upgDeptFile(f(B5), f(B5)))]; },
    [b64("Flight_Ops_Planner_SUP2.xlsx"), "", b64("Flight_Ops_Planner_TACCO.xlsx")]);
  assert.ok(/is SUP 2, but the new file is TACCO/.test(r[0]), r[0]);
  assert.ok(/not a layout 5 file/.test(r[1]), r[1]);
  assert.ok(/already layout 5/.test(r[2]), r[2]);
});
test("upgraded_file_reads_in_openpyxl", async ({ page }) => {
  await makeOld(page);
  const out = await page.evaluate(B => { const nb = new Function("B", "const u = Uint8Array.from(atob(B), c => c.charCodeAt(0)); return u.buffer;")(B), o = window._old;
    const r = upgDeptFile(o.buffer.slice(o.byteOffset, o.byteOffset + o.byteLength), nb).bytes; let s = ""; for (let i = 0; i < r.length; i += 32768) s += String.fromCharCode.apply(null, r.subarray(i, i + 32768)); return btoa(s); }, b64("Flight_Ops_Planner_SUP2.xlsx"));
  const f = path.join(os.tmpdir(), "lodestar_upgrade_test.xlsx"); fs.writeFileSync(f, Buffer.from(out, "base64"));
  const py = `import openpyxl,sys\nwb=openpyxl.load_workbook(sys.argv[1])\nr=wb['Roster']\nprint(wb['Dashboard']['Z2'].value, r['C53'].value, wb['Oct']['H40'].value, wb['Misc Notes'].sheet_state, wb['Ranks']['A2'].value)`;
  const res = execFileSync("python3", ["-c", py, f]).toString().trim();
  assert.strictEqual(res, "LODESTAR dept layout 5 ME2 Old Row LEAVE hidden ME4");
});

// z206: every department, plans in every month (regular and SANS / NSMEN crew, all four rows), notes and currency dates.
// Each old file is filled, saved to bytes, read back as "before", upgraded, read back as "after"; the two must match
// for the first 60 people, the 15 new rows must be empty, and the upgraded file must pass tests/xlsx_check.py.
test("every_department_full_plans_upgrade_cleanly", async ({ page }) => {
  await page.evaluate(() => { OPS = true; });
  const depts = await page.evaluate(() => books.map((b, i) => [i, b.WB.name, !b.S.kind]).filter(x => x[2]).map(x => [x[0], x[1]]));
  assert.strictEqual(depts.length, 5, "5 department files open");
  for (const [bi, name] of depts) {
    const res = await page.evaluate(([bi, B]) => withBook(bi, () => {
      const codes = S.acts.filter(a => a.code).map(a => a.code), n0 = S.n, who = [0, 7, 44, 45, 52, n0 - 1];
      let k = 0;
      for (let mi = 0; mi < 13; mi++) { if (mi === NX_MI && !S.nx) continue; const sh = monSheet(mi);
        for (const i of who) for (let s = 0; s < ROWS_PER; s++) for (let d = (i + s + mi) % 4; d < 28; d += 4) put(sh, colL(DAY_COL0 + d) + (g0() + gridRow(i, s)), codes[k++ % codes.length]); }
      const rc = rosterCols(S); who.forEach(i => { put("Roster", rc.id + (ROSTER_ROW0 + i), "UP" + i); put("Roster", rc.name + (ROSTER_ROW0 + i), "ME2 Person " + i); if (i >= REG_N && S.catCol) put("Roster", rc.status + (ROSTER_ROW0 + i), i % 2 ? "SANS" : "NSMEN"); });
      if (S.hasNotes) [[9, 0, 3], [10, 52, 8]].forEach(([mi, i, d]) => setNote(mi, gridRow(i, 1), d, "note " + mi + "/" + i));
      if (S.hasCur) who.forEach(i => put("Currency", "D" + (CUR_ROW0 + i), dateSerial(2026, 5, 1 + (i % 20))));
      const bk = books[bi], ob = logBuild(bk, new Map(bk.dirty)).bytes; bk.dirty.clear();
      const snap = () => ({ n: S.n, roster: S.roster.slice(0, n0).map(p => [p.id, p.name, p.status, p.cat, p.ini, p.role].join("|")),
        grids: S.m.map(M => M && M.grid ? M.grid.slice(0, n0 * ROWS_PER).map(x => x.join(",")).join(";") : ""),
        newRows: S.roster.slice(n0).filter(p => !rosEmpty(p)).length + S.m.reduce((t, M) => t + (M && M.grid ? M.grid.slice(n0 * ROWS_PER).flat().filter(Boolean).length : 0), 0),
        notes: [...(S.notes || new Map())].map(([k, v]) => k + "=" + v).sort().join(";"), cur: (S.curBase || []).slice(0, n0).map(r => (r || []).join(",")).join(";") });
      reparseBook(bi, ob.buffer.slice(ob.byteOffset, ob.byteOffset + ob.byteLength)); useBook(bi); const before = snap();
      const nb = Uint8Array.from(atob(B), c => c.charCodeAt(0)).buffer, up = upgDeptFile(ob.buffer.slice(ob.byteOffset, ob.byteOffset + ob.byteLength), nb).bytes;
      reparseBook(bi, up.buffer.slice(up.byteOffset, up.byteOffset + up.byteLength)); useBook(bi); const after = snap();
      let s = ""; for (let i = 0; i < up.length; i += 32768) s += String.fromCharCode.apply(null, up.subarray(i, i + 32768));
      return { before, after, b64: btoa(s), filled: before.grids.join("").replace(/[,;]/g, "").length };
    }), [bi, b64(name)]);
    const B = res.before, A = res.after;
    assert.ok(res.filled > 1000, name + ": plans were typed");
    assert.strictEqual(A.n, 75, name + " has 75 slots");
    assert.deepStrictEqual(A.roster, B.roster, name + " roster");
    B.grids.forEach((g, mi) => assert.ok(g === A.grids[mi], name + " month " + mi + " plans differ"));
    assert.strictEqual(A.newRows, 0, name + ": the 15 new rows are empty");
    assert.strictEqual(A.notes, B.notes, name + " notes"); assert.strictEqual(A.cur, B.cur, name + " currency dates");
    const f = path.join(os.tmpdir(), "lodestar_upgrade_" + name); fs.writeFileSync(f, Buffer.from(res.b64, "base64"));
    let pr = ""; try { execFileSync("python3", [path.join(__dirname, "xlsx_check.py"), f], { stdio: "pipe" }); } catch (e) { pr = String(e.stdout); }
    assert.strictEqual(pr, "", name + " upgraded file: " + pr.split("\n").slice(0, 3).join(" | "));
  }
});

(async () => {
  const only = process.argv[2]; let pass = 0, ran = 0;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue;
    ran++; let S = null;
    try { S = await boot({ today: "2026-10-26", others: t.name.startsWith("every_department") }); await t.fn(S); if (S.errs.length) throw new Error("page errors: " + S.errs.join(" | ").slice(0, 300)); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).slice(0, 600)); }
    if (S) await S.close();
  }
  console.log(pass + "/" + ran + " pass"); process.exit(pass === ran ? 0 : 1);
})();
