// Master Planner calendar view tests. Build the dashboard first: python3 .lodestar_build.py dashboard
// Run: node tests/master_calendar.test.js [name-filter]
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const openMp = (page, mi) => page.evaluate(mi => { document.querySelector("nav.tabs button[data-v='mp']").click(); cur.mpM = mi; cur.mpDay = null; renderMp(); }, mi);
const chips = page => page.evaluate(() => [...document.querySelectorAll(".mday .chip")].map(c => ({ t: c.querySelector(".t").textContent.trim(), txt: c.textContent.replace(/\s+/g, " ").trim(), title: c.title })));

test("chips_show_the_full_time_range", async ({ page }) => {
  await openMp(page, 9);
  const L = await chips(page);
  assert.ok(L.length > 20, "chips drawn: " + L.length);
  // the chip shows the typed range (the end is no longer worked out from the flight code's hours)
  assert.ok(L.some(c => c.t === "0830H-1030H" && /FLT-2\.0/.test(c.txt)), "0830H-1030H not found: " + L.slice(0, 6).map(c => c.t).join());
  assert.ok(L.some(c => c.t === "0830H-1000H" || c.t === "1000H-1130H"), "a 1.5 hour sortie shows its range: " + L.map(c => c.t).join());
  // every chip is either a range with H, a lone start with H, a ground label, or the no-time placeholder
  const bad = L.filter(c => !/^(\d{4}H(-\d{4}H)?|time\?|GND|TBC)$/.test(c.t)); assert.deepStrictEqual(bad.map(c => c.t), []);
});
test("a_lone_start_shows_only_its_start", async ({ page }) => {
  assert.strictEqual(await page.evaluate(() => mpRange("0900", 0)), "0900H"); assert.strictEqual(await page.evaluate(() => mpRange("0830-1030", 0)), "0830H-1030H");
});

// ---- squadron events: ALL tag, a blank crew is a mistake (never "everyone")
const MP = { mine: "Master_Planner" };
const openDay = (page, mi, d) => page.evaluate(([mi, d]) => { document.querySelector("nav.tabs button[data-v='mp']").click(); cur.mpM = mi; cur.mpDay = d; renderMp(); }, [mi, d]);
const setGr = (page, crew) => page.evaluate(crew => { const P = masterBook().S; P.gr = P.gr.filter(g => !(g.mi === 9 && g.d === 14)); P.gr.push({ row: 900, mi: 9, d: 14, time: "1400-1600", act: "PSM", crew, note: "121 CR" }); P.grUsed.add(900); renderMp(); }, crew);
const side = page => page.evaluate(() => document.getElementById("mpSide").innerText + "\n" + document.getElementById("mpSide").innerHTML);
test("ground_blank_crew_is_flagged", async ({ page }) => {
  await openDay(page, 9, 14); await setGr(page, "");
  const t = await side(page); assert.ok(t.includes("NO CREW"), "no flag"); assert.ok(!/everyone/i.test(t), "still says everyone");
}, MP);
test("ground_all_and_tags_clear_flag", async ({ page }) => {
  await openDay(page, 9, 14);
  for (const c of ["ALL", "S1 S2"]) { await setGr(page, c); assert.ok(!(await side(page)).includes("NO CREW"), c + " still flagged"); }
}, MP);
test("ground_new_event_starts_empty", async ({ page }) => {
  await openDay(page, 9, 20); await page.click("[data-gadd]");
  const r = await page.evaluate(() => { const g = masterBook().S.gr.find(x => x.mi === 9 && x.d === 20 && !x.act); return g && g.crew; });
  assert.strictEqual(r, ""); assert.ok((await side(page)).includes("NO CREW"));
}, MP);
test("ground_all_is_exclusive", async ({ page }) => {
  await openDay(page, 9, 14); await setGr(page, "S1");
  await page.click(".gtag[data-t='ALL']"); assert.strictEqual(await page.evaluate(() => masterBook().S.gr.find(g => g.row === 900).crew), "ALL");
  await page.click(".gtag[data-t='P']"); assert.strictEqual(await page.evaluate(() => masterBook().S.gr.find(g => g.row === 900).crew), "P");
}, MP);
test("dept_copy_follows_tags", async ({ page }) => {
  const r = await page.evaluate(() => { const P = masterBook().S, out = {}; for (const c of ["ALL", "S2", "", "T"]) { P.gr = P.gr.filter(g => g.row !== 900); P.gr.push({ row: 900, mi: 9, d: 14, time: "", act: "PSM", crew: c, note: "" }); out[c] = deptGround(P, 9, 14, "SUP 2"); } return out; });
  assert.deepStrictEqual(r, { ALL: "PSM", S2: "PSM", "": "", T: "" });
});
test("flight_blank_crew_unchanged", async ({ page }) => {
  assert.strictEqual(await page.evaluate(() => needsDept("", "SUP 2")), true);
});

(async () => {
  const only = process.argv[2];
  let pass = 0, ran = 0;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue;
    ran++; let S = null;
    try { S = await boot(Object.assign({}, t.opts)); await t.fn(S); if (S.errs.length) throw new Error("page errors: " + S.errs.join(" | ").slice(0, 300)); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 300)); }
    if (S) await S.close();
  }
  console.log(pass + "/" + ran + " pass");
  process.exit(pass === ran ? 0 : 1);
})();
