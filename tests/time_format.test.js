// z173: every clock time reads 24-hour with an H at the back (0830H-1030H). Typed times are saved that way, older times are shown
// that way, and the hours still come out right. Build the dashboard first. Run: node tests/time_format.test.js
const assert = require("assert");
const { boot } = require("./lode_lib");
(async () => {
  let fails = 0; const ok = (n, f) => { try { f(); console.log("ok  ", n); } catch (e) { fails++; console.log("FAIL", n, e.message); } };
  const b = await boot({ mine: "Master_Planner", today: "2026-11-04" }), p = b.page;
  const r = await p.evaluate(() => {
    const T = ["0830-1030", "0830H-1030H", "8:30 to 10:30", "0830–1030", "0830 — 1030", "0830h - 1030h", "1400", "2200-2400", "TBC", "TILL 5 Nov", "AM", "2500-2600", ""];
    const n = T.map(normTime);
    const hrs = T.map(t => mpFlHrs(null, { time: normTime(t) }).h);
    const ops = opsTimes("0830-1030", 0), ops1 = opsTimes("1400", 2);
    return { n, hrs, ops, ops1, hh: [hhmm("0830H"), hhmm("0830"), hhmm("2400"), hhmm("2460")] };
  });
  ok("ranges get an H on each time", () => assert.deepStrictEqual(r.n.slice(0, 6), Array(6).fill("0830H-1030H")));
  ok("a single time gets an H", () => assert.strictEqual(r.n[6], "1400H"));
  ok("midnight stays 2400H", () => assert.strictEqual(r.n[7], "2200H-2400H"));
  ok("other text is left alone", () => assert.deepStrictEqual(r.n.slice(8), ["TBC", "TILL 5 Nov", "AM", "2500-2600", ""]));
  ok("hours still come out right", () => assert.deepStrictEqual(r.hrs.slice(0, 8), [2, 2, 2, 2, 2, 2, 0, 2]));
  ok("Ops Room ETD / ETA carry the H", () => { assert.deepStrictEqual(r.ops, ["0830H", "1030H"]); assert.deepStrictEqual(r.ops1, ["1400H", "1600H"]); });
  ok("time parser takes an H", () => assert.deepStrictEqual(r.hh, [510, 510, 1440, null]));
  // typing a time on a Master Planner flight saves it with the H
  const s = await p.evaluate(() => {
    const S0 = books[mpIdx()].S, f = S0.fl.find(x => x.code && x.time);
    const el = document.createElement("input"); el.dataset.f = "time"; el.dataset.row = f.row; el.value = "0900 to 1100";
    document.getElementById("mpWrap").appendChild(el);
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return { t: f.time, hrs: mpFlHrs(S0, f).h };
  });
  ok("a typed time is saved as 0900H-1100H", () => { assert.strictEqual(s.t, "0900H-1100H"); assert.strictEqual(s.hrs, 2); });
  ok("no page errors", () => assert.deepStrictEqual(b.errs, []));
  await b.close(); console.log(fails ? fails + " failed" : "all pass"); process.exit(fails ? 1 : 0);
})();
