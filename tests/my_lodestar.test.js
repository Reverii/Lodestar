// My Lodestar tests. Build the dashboard first: python3 .lodestar_build.py dashboard
// Run: node tests/my_lodestar.test.js   (prints "N/M pass"; exit code 1 if any fail)
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });

// ---- Task 1: tab skeleton, My schedule removed
test("tab_order", async ({ page }) => {
  const first = await page.evaluate(() => [...document.querySelectorAll("nav.tabs > button, nav.tabs > .tdd > button")].filter(b => b.offsetParent)[0].textContent.trim());
  assert.strictEqual(first, "My Lodestar");
});
test("my_schedule_gone", async ({ page }) => {
  const r = await page.evaluate(() => ({ btn: !!document.querySelector("button[data-v='me']"), view: !!document.getElementById("v-me"), fn: typeof renderMe }));
  assert.deepStrictEqual(r, { btn: false, view: false, fn: "undefined" });
});
test("opens_without_errors", async ({ page, errs }) => {
  await page.evaluate(() => document.querySelector("nav.tabs button[data-v='lode']").click());
  await page.waitForTimeout(500);
  assert.ok(await page.evaluate(() => document.getElementById("v-lode").classList.contains("on")));
  assert.deepStrictEqual(errs, []);
});

test("lands_on_my_lodestar", async ({ page }) => {
  await page.evaluate(() => { cur.lodeProbe = 1; });
  const on = await page.evaluate(() => document.querySelector(".view.on").id);
  assert.strictEqual(on, "v-lode");
}, { fresh: true });
test("planner_still_works", async ({ page, errs }) => {
  await page.evaluate(() => { document.querySelector("nav.tabs button[data-v='plan']").click(); });
  await page.waitForTimeout(400);
  const n = await page.evaluate(() => document.querySelectorAll("#plan td[data-k^='g:']").length);
  assert.ok(n > 100, "crew cells: " + n);
  assert.deepStrictEqual(errs, []);
});

// ---- Task 2: who am I, and View as
const P = { fresh: true, title: "Sarah Lim" };
test("key_ignores_rank_order_case", async ({ page }) => {
  const r = await page.evaluate(() => [lodeKey("CPT Tan Wei Ming"), lodeKey("tan wei ming cpt"), lodeKey("CPT (NS) Lee Kok Wai")]);
  assert.deepStrictEqual(r[0], r[1]);
  assert.deepStrictEqual(r[2], ["kok", "lee", "wai"]);
}, P);
test("match_unique", async ({ page }) => {
  assert.strictEqual(await page.evaluate(() => lodeMatch("Sarah Lim").p.id), "HAWK");
  assert.strictEqual(await page.evaluate(() => lodeMatch("lim sarah").p.id), "HAWK");
});
test("match_none_for_email", async ({ page }) => {
  assert.strictEqual(await page.evaluate(() => lodeMatch("sarah.lim@x.mil")), null);
});
test("empty_title_matches_nothing", async ({ page }) => {
  assert.strictEqual(await page.evaluate(() => [lodeMatch(""), lodeMatch(undefined), lodeMatch("CPT")].join("|")), "||");
});
test("match_ambiguous_returns_null", async ({ page }) => {
  const r = await page.evaluate(() => {
    const x = mePeople().find(z => z.p.id !== "HAWK"), keep = x.p.name; x.p.name = "CPT Sarah Lim";
    try { return lodeMatch("Sarah Lim"); } finally { x.p.name = keep; }
  });
  assert.strictEqual(r, null);
});
test("auto_match_shows_chip", async ({ page }) => {
  await page.evaluate(() => { SP.user = { Title: "Sarah Lim", Email: "" }; cur.lodeAs = null; renderLode(); });
  const t = await page.innerText("#lodeChip");
  assert.ok(/HAWK/.test(t) && /signed in/i.test(t), t);
});
test("no_match_shows_who_are_you", async ({ page }) => {
  await page.evaluate(() => { SP.user = { Title: "nobody@x.mil" }; spRemember("lode_me", null); cur.lodeAs = null; renderLode(); });
  assert.ok(await page.isVisible("#lodePick"));
  assert.strictEqual(await page.evaluate(() => lodeWho()), null);
});
test("pick_is_remembered", async ({ page }) => {
  await page.evaluate(() => { SP.user = { Title: "nobody@x.mil" }; const w = mePeople().find(z => z.p.id === "RAPTOR"); lodeSetWho(w); cur.lodeAs = null; });
  assert.strictEqual(await page.evaluate(() => lodeWho().p.id), "RAPTOR");
  assert.deepStrictEqual(await page.evaluate(() => spRecall("lode_me")), { dept: "SUP 2", id: "RAPTOR" });
  await page.evaluate(() => { renderLode(); });
  assert.ok(/picked/i.test(await page.innerText("#lodeChip")));
  await page.click("#lodeNotMe");
  assert.strictEqual(await page.evaluate(() => lodeWho()), null);
  assert.ok(await page.isVisible("#lodePick"));
});
test("view_as_banner", async ({ page }) => {
  await page.evaluate(() => { SP.user = { Title: "Sarah Lim" }; spRemember("lode_me", null); cur.lodeAs = null; renderLode(); });
  await page.click("#lodeChip .lodeAsBtn");
  await page.click("#lodeList [data-who='SUP 2|VIPER']");
  const b = await page.innerText("#lodeBanner");
  assert.ok(/Viewing VIPER/.test(b) && /not you/i.test(b), b);
  assert.strictEqual(await page.evaluate(() => lodeWho().p.id), "VIPER");
  await page.click("#lodeBack");
  assert.strictEqual(await page.evaluate(() => lodeWho().p.id), "HAWK");
  assert.ok(!(await page.isVisible("#lodeBanner")));
});

// ---- Task 3: one person's day and the next 7 days
const day = (page, id, iso) => page.evaluate(([id, iso]) => lodeDay(mePeople().find(z => z.p.id === id), iso), [id, iso]);
const T3 = { fresh: true, today: "2026-10-26" };
test("day_flight_has_time_and_comment", async ({ page }) => {
  const D = await day(page, "HAWK", "2026-10-05");
  assert.strictEqual(D.known, true);
  const f = D.items.filter(x => x.kind === "flight");
  assert.deepStrictEqual(f.map(x => [x.s, x.code, x.time]), [[0, "FLT-2.0", "0830"], [2, "NVG-2.0", "1930-2130"]]);
  assert.strictEqual(f[0].note, "Lead, brief 0730");
  assert.strictEqual(f[0].cancelled, "");
}, T3);
test("day_cancelled_flag", async ({ page }) => {
  await page.evaluate(() => {
    const D = opsDay("2026-10-14"), r = D.rows.find(z => z.seats.some(c => c && c.id === "HAWK"));
    books[opsIdx()].S.fc.set(r.key, { st: "Cancelled", why: "Weather", seat: ["", "", "", "", "", ""], atd: "", ata: "", etd: "", eta: "", tail: "", stb: "", ao: "", brf: "", xtra: "", pax: "" });
  });
  const D = await day(page, "HAWK", "2026-10-14");
  assert.strictEqual(D.items.find(x => x.kind === "flight").cancelled, "Weather");
  assert.strictEqual(D.ops[0].status, "Cancelled");
});
test("day_ops_row_details", async ({ page }) => {
  const D = await day(page, "RAPTOR", "2026-10-14");
  assert.strictEqual(D.ops.length, 1);
  const r = D.ops[0];
  assert.ok(/FLT-1\.5/.test(r.code) && r.etd === "0800" && r.eta === "1100", JSON.stringify(r));
  assert.strictEqual(r.status, "Not closed");
  assert.ok(/aircraft 2\/2/.test(r.sortie), r.sortie);
  assert.ok(r.seats.some(z => z.role === "SUP 2" && z.id === "RAPTOR") && r.seats.some(z => z.role === "TACCO" && z.id === "TUNA"));
});
test("day_ground_and_duty", async ({ page }) => {
  const g = await day(page, "VIPER", "2026-10-07");
  assert.deepStrictEqual(g.items.filter(x => x.kind === "ground").map(x => [x.text, x.time, x.s]), [["CRM Lecture", "1400-1600", -1]]);
  const f = await page.evaluate(() => { const st = books[0].S; for (let i = 0; i < st.roster.length; i++) for (let d = 0; d < 31; d++) for (let s = 0; s < 3; s++) if (/^SDO$/i.test(st.m[9].grid[i*3+s][d] || "")) return { id: st.roster[i].id, iso: isoOf(2026, 9, d) }; });
  const D = await day(page, f.id, f.iso);
  assert.strictEqual(D.duty, "SDO");
  assert.ok(D.items.some(x => x.kind === "duty" && x.code === "SDO"));
  const prev = await page.evaluate(([id, iso]) => { const w = mePeople().find(z => z.p.id === id), t = new Date(iso + "T00:00:00"); t.setDate(t.getDate() - 1); return lodeDay(w, isoOf(t.getFullYear(), t.getMonth(), t.getDate() - 1)).nextDuty; }, [f.id, f.iso]);
  assert.ok(/SDO/.test(prev), "nextDuty: " + prev);
});
test("day_leave_is_away", async ({ page }) => {
  const f = await page.evaluate(() => { const st = books[0].S; for (let i = 0; i < st.roster.length; i++) for (let d = 0; d < 31; d++) if (/^LL$/i.test(st.m[9].grid[i*3][d] || "")) return { id: st.roster[i].id, iso: isoOf(2026, 9, d) }; });
  const D = await day(page, f.id, f.iso);
  assert.ok(D.items.some(x => x.kind === "away" && x.code === "LL"), JSON.stringify(D.items));
});
test("day_empty_plan_is_free", async ({ page }) => {
  const f = await page.evaluate(() => { const st = books[0].S, mb = masterBook(); for (let i = 0; i < st.roster.length; i++) for (let d = 0; d < 31; d++) { if ([0,1,2].every(s => !st.m[9].grid[i*3+s][d]) && !grDay(mb.S, 9, d).some(g => g.act) && !st.m[9].gnd[d]) return { id: st.roster[i].id, iso: isoOf(2026, 9, d) }; } });
  const D = await day(page, f.id, f.iso);
  assert.strictEqual(D.known, true);
  assert.deepStrictEqual(D.items, []);
});
test("day_outside_year_unknown", async ({ page }) => {
  const a = await day(page, "HAWK", "2028-01-05"), b = await day(page, "HAWK", "2027-01-05");
  assert.deepStrictEqual([a.known, a.items.length, b.known], [false, 0, true]);
});
test("week_has_seven_days_across_month_end", async ({ page }) => {
  const W = await page.evaluate(() => lodeWeek(mePeople().find(z => z.p.id === "HAWK"), "2026-10-28").map(x => [x.iso, x.known]));
  assert.deepStrictEqual(W, [["2026-10-29", true], ["2026-10-30", true], ["2026-10-31", true], ["2026-11-01", true], ["2026-11-02", true], ["2026-11-03", true], ["2026-11-04", true]]);
});
test("night_flight_eta_after_midnight", async ({ page }) => {
  await page.evaluate(() => { const P = masterBook().S, f = P.fl.find(z => z.mi === 9 && z.d === 1 && z.s === 2); f.time = "2300-0100"; });
  const D = await day(page, "VIPER", "2026-10-02"), N = await day(page, "VIPER", "2026-10-03");
  const r = D.ops.find(z => /NVG/.test(z.code));
  assert.ok(r && r.etd === "2300" && r.eta === "0100", JSON.stringify(D.ops));
  assert.ok(!N.ops.some(z => /NVG/.test(z.code)));
}, T3);
test("missing_master_names_parts", async ({ page }) => {
  const D = await day(page, "HAWK", "2026-10-05");
  assert.deepStrictEqual(D.missing, ["Master Planner", "Ops Room", "Duty Roster"]);
  assert.ok(D.items.some(x => x.kind === "flight" && x.code === "FLT-2.0"));
  assert.ok(D.ops.length >= 1 && D.ops.every(r => r.fromPlan === true && r.status === "Planned"), JSON.stringify(D.ops));
}, { fresh: true, others: false, today: "2026-10-26" });

// ---- runner
(async () => {
  const only = process.argv[2];
  let pass = 0, ran = 0, S = null;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue;
    ran++;
    try {
      if (!S || (t.opts && t.opts.fresh)) { if (S) await S.close(); S = await boot(Object.assign({}, t.opts)); }
      await t.fn(S); pass++; console.log("ok   " + t.name);
    } catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 300)); if (S) { await S.close(); S = null; } }
  }
  if (S) await S.close();
  console.log(pass + "/" + ran + " pass");
  process.exit(pass === ran ? 0 : 1);
})();
