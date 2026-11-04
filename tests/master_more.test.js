// z171: a 3rd (and 4th...) flight in one shift is stored in slot 2's comment as "+N more: CODE TIME, ...". The Planner MASTER cell
// now shows each extra flight as its own code and time instead of a cut-off comment. Build the dashboard first.
// Run: node tests/master_more.test.js
const assert = require("assert");
const { boot } = require("./lode_lib");
(async () => {
  const b = await boot({ mine: "Flight_Ops_Planner_SUP2", others: false, today: "2026-11-04" }), p = b.page; let fails = 0;
  const ok = (n, f) => { try { f(); console.log("ok  ", n); } catch (e) { fails++; console.log("FAIL", n, e.message); } };
  await p.evaluate(() => { document.querySelector("#plMenu button[data-v='plan']").click(); });
  const r = await p.evaluate(() => {
    cur.mfold = false;
    const M = S.m[cur.m], d = 3;
    M.master[0][d] = "FLT-2.0"; M.mtime[0][d] = "0830-1030"; M.mnote[0][d] = "";
    M.master[1][d] = "FLT-1.5"; M.mtime[1][d] = "1000-1130"; M.mnote[1][d] = "+2 more: FLT-2.0 1100-1300, FLT-1.5 1130-1300";
    M.master[3][d] = "MAS TRG"; M.mtime[3][d] = "1300-1600"; M.mnote[3][d] = "MAS tactical · +1 more: FLT-1.5 1430-1600";
    renderPlanner();
    const cell = k => { const t = document.querySelector("#plan td[data-k='m:" + k + ":" + d + "']"); return t && { mx: [...t.querySelectorAll(".mx")].map(x => x.textContent), tm: [...t.querySelectorAll(".tm")].map(x => x.textContent), nt: t.querySelector(".nt").textContent, title: t.title }; };
    return { am2: cell(1), pm2: cell(3) };
  });
  ok("AM 2 shows both extra flights", () => assert.deepStrictEqual(r.am2.mx.map(x => x.replace(/^[!⚠] /, "")), ["FLT-2.0", "FLT-1.5"]));
  ok("AM 2 shows their times", () => assert.deepStrictEqual(r.am2.tm, ["1000-1130", "1100-1300", "1130-1300"]));
  ok("AM 2 comment line no longer holds the list", () => assert.strictEqual(r.am2.nt, ""));
  ok("the full list stays in the tooltip", () => assert.ok(r.am2.title.includes("+2 more: FLT-2.0 1100-1300"), r.am2.title));
  ok("PM 2 keeps its own comment", () => { assert.strictEqual(r.pm2.nt, "MAS tactical"); assert.strictEqual(r.pm2.mx.length, 1); });
  await p.evaluate(() => { document.getElementById("gridwrap").scrollLeft = 0; });
  await p.screenshot({ path: "previews/master_more.png" });
  ok("no page errors", () => assert.deepStrictEqual(b.errs, []));
  await b.close(); console.log(fails ? fails + " failed" : "all pass"); process.exit(fails ? 1 : 0);
})();
