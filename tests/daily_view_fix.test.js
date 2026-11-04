// z167: department files built before z167 carry broken Daily View summary formulas (row 8 holds "{ref}" / "{sdoref}" as text, so
// Excel says "We found a problem with some content ... Removed Records: Formula from /xl/worksheets/sheet3.xml"). A dashboard save
// rewrites them. Build the dashboard first. Run: node tests/daily_view_fix.test.js
const assert = require("assert");
const { boot } = require("./lode_lib");
(async () => {
  let fails = 0; const ok = (n, f) => { try { f(); console.log("ok  ", n); } catch (e) { fails++; console.log("FAIL", n, e.message); } };
  for (const mine of ["Flight_Ops_Planner_Loadmaster", "Flight_Ops_Planner_Pilot"]) {
    const b = await boot({ mine, others: false, today: "2026-11-04" }), p = b.page;
    const r = await p.evaluate(() => {
      const dp = WB.paths["Daily View"];
      // make sure the file is in the broken state (a file built after z167 is not): put the placeholders back
      let x = td.decode(WB.files[dp]);
      x = x.replace(/(<c r="([A-G])8"[^>]*><f>)([^<]*)(<\/f>)/g, (m0, pre, col, f, post) => pre + f.replace(/CHOOSE\(IF\(YEAR\(\$A\$5\)&gt;PlanYear,13,MONTH\(\$A\$5\)\),[^)]*\)/g, col === "G" ? "{sdoref}" : "{ref}") + post);
      WB.files[dp] = te.encode(x);
      const before = (x.match(/\{(?:ref|sdoref)\}/g) || []).length;
      put("Roster", "H40", "x");
      const files = buildXlsx().files, y = td.decode(files[dp]), J = readCellsOf(files, WB.paths.Jan, WB.sst);
      const f8 = {}; for (const m of y.matchAll(/<c r="([A-G])8"[^>]*><f>([^<]*)<\/f>/g)) f8[m[1]] = m[2];
      const rows = {}; for (const c in f8) { const m = /'Jan'!\$D\$(\d+):\$AH\$\1/.exec(f8[c]); rows[c] = m ? [+m[1], J["B" + m[1]] || J["A" + m[1]]] : null; }
      let xmlOk = true; try { if (new DOMParser().parseFromString(y, "application/xml").getElementsByTagName("parsererror").length) xmlOk = false; } catch (e) { xmlOk = false; }
      return { before, left: (y.match(/\{(?:ref|sdoref)\}/g) || []).length, rows, xmlOk, g0: g0() };
    });
    ok(mine + " had broken formulas to fix", () => assert.ok(r.before >= 6, r.before));
    ok(mine + " no placeholder left after save", () => assert.strictEqual(r.left, 0));
    ok(mine + " each card reads its own summary row", () => {
      assert.deepStrictEqual(Object.fromEntries(Object.entries(r.rows).filter(([c]) => c !== "G").map(([c, v]) => [c, v && v[1]])),
        { A: "Total flights", C: "Fly hrs", D: "SDO on duty", E: "On leave (crew)", F: "Available crew" });
      assert.ok(r.rows.G && r.rows.G[0] === r.g0 - 2 && /DAYS/i.test(r.rows.G[1]), JSON.stringify(r.rows.G));
    });
    ok(mine + " Daily View XML valid", () => assert.ok(r.xmlOk));
    ok(mine + " no page errors", () => assert.deepStrictEqual(b.errs, []));
    await b.close();
  }
  console.log(fails ? fails + " failed" : "all pass"); process.exit(fails ? 1 : 0);
})();
