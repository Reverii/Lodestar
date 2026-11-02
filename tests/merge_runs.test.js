// Merge runs (z144): identical non-flight cells read as one block, display only. Build the dashboard first.
const assert = require("assert");
const { boot } = require("./lode_lib");
(async () => {
  const b = await boot({ mine: "Flight_Ops_Planner_SUP2", today: "2026-10-14" }), p = b.page; let fails = 0;
  const ok = (n, f) => { try { f(); console.log("ok  ", n); } catch (e) { fails++; console.log("FAIL", n, e.message); } };
  await p.evaluate(() => { document.querySelector("#plMenu button[data-v='plan']").click(); });
  const info = await p.evaluate(() => {
    const A = actIndex(), code = [...A.values()].find(a => a.ci !== CAT_FLIGHT && a.code && a.code.length > 3 && !/SDO|BDO/i.test(a.code)), c = code.code, M = S.m[cur.m], i = S.roster.findIndex(x => x.name), fl = [...A.values()].find(a => a.ci === CAT_FLIGHT).code;
    for (let s = 0; s < 3; s++) for (let d = 12; d <= 16; d++) M.grid[gridRow(i, s)][d] = c;
    for (let d = 18; d <= 20; d++) M.grid[gridRow(i, 0)][d] = c;      // one row only: horizontal run
    M.grid[gridRow(i, 1)][22] = fl; M.grid[gridRow(i, 1)][23] = fl;   // flights never merge
    M.grid[gridRow(i, 2)][20] = c;
    renderPlanner(); return { c, i, fl };
  });
  const q = () => p.evaluate(i => { const mine = td => { const r = +td.dataset.k.split(":")[1]; return r >= gridRow(i, 0) && r <= gridRow(i, 3); }; return { mg: [...document.querySelectorAll("#plan td.mg")].filter(mine).length, labs: [...document.querySelectorAll("#plan .mlab")].filter(x => mine(x.parentNode)).map(x => x.textContent) }; }, info.i);
  let r = await q();
  ok("block labels", () => { assert.ok(r.labs.some(t => t.includes("5 days")), JSON.stringify(r.labs)); assert.ok(r.labs.some(t => t.includes("3 days")), JSON.stringify(r.labs)); assert.strictEqual(r.labs.filter(t => t.startsWith(info.c)).length, 2, JSON.stringify(r.labs)); });
  const mg0 = r.mg; ok("the 18 planned cells are marked", () => assert.ok(mg0 >= 18, mg0));
  const keep = await p.evaluate(() => { const t = document.querySelector("#plan td.mg"); return { k: t.dataset.k, txt: [...t.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join("") }; });
  ok("cells keep their own value and key", () => assert.ok(keep.k.startsWith("g:") && keep.txt.length > 2, JSON.stringify(keep)));
  await p.evaluate(() => { document.getElementById("gridwrap").scrollLeft = 520; }); await p.waitForTimeout(700); await p.screenshot({ path: "previews/merge_runs_real.png" });
  await p.click("#mergeTog"); r = await q();
  ok("off: nothing merged", () => { assert.strictEqual(r.mg, 0); assert.strictEqual(r.labs.length, 0); });
  await p.click("#mergeTog"); r = await q(); ok("on again", () => assert.strictEqual(r.mg, mg0));
  ok("no page errors", () => assert.deepStrictEqual(b.errs, []));
  await b.close(); console.log(fails ? fails + " failed" : "all pass"); process.exit(fails ? 1 : 0);
})();
