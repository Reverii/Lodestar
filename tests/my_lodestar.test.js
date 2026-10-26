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

// ---- Task 4: the four status cards
const cards = (page, id, iso, dept) => page.evaluate(([id, iso, dept]) => lodeCards(mePeople().find(z => z.p.id === id && (!dept || z.dept === dept)), iso), [id, iso, dept]);
const T4 = { fresh: true, today: "2026-10-26" };
test("medical_down_chit", async ({ page }) => {
  const c = await cards(page, "KESTREL", "2026-10-26");
  assert.deepStrictEqual([c.medical.ok, c.medical.text, c.medical.sub], [false, "Down-chit", "since Thu 1 Oct"]);
}, T4);
test("medical_fit_default", async ({ page }) => {
  const c = await cards(page, "HAWK", "2026-10-26");
  assert.deepStrictEqual([c.medical.ok, c.medical.text, c.medical.sub], [true, "Fit to fly", "No down-chit"]);
});
test("rest_counts_run_to_day", async ({ page }) => {
  const c = await cards(page, "VIPER", "2026-10-02");
  assert.deepStrictEqual([c.rest.run, c.rest.text, c.rest.sub, c.rest.flagged], [2, "2 days in a row", "Flying Sat would make 3", false]);
  assert.strictEqual((await cards(page, "HAWK", "2026-10-26")).rest.text, "Rested");
});
test("rest_flags_at_five", async ({ page }) => {
  await page.evaluate(() => { const st = books[0].S, i = st.roster.findIndex(p => p.id === "VIPER"); [2, 3, 4].forEach(d => { st.m[9].grid[i * 3][d] = "FLT-2.0"; }); });
  const c = await cards(page, "VIPER", "2026-10-05");
  assert.deepStrictEqual([c.rest.run, c.rest.flagged], [5, true]);
});
test("currency_soonest_rule", async ({ page }) => {
  const v = await cards(page, "VIPER", "2026-10-26");
  assert.deepStrictEqual([v.cur.level, v.cur.text, v.cur.sub], ["bad", "Night flying lapsed", "1 of 3 rules current"]);
  const e = await cards(page, "OWL", "2026-10-26");
  assert.deepStrictEqual([e.cur.level, e.cur.text], ["ok", "All current"]);
  await page.evaluate(() => { const st = books[0].S; st.rules.find(r => r.name === "Mission currency").warn = 200; });   // widen the warning window so HAWK's rule is "due"
  const h = await cards(page, "HAWK", "2026-10-26");
  assert.deepStrictEqual([h.cur.level, h.cur.text, h.cur.sub], ["due", "Mission currency due 17 Dec", "1 of 2 rules current"]);
});
test("currency_none_when_no_rules", async ({ page }) => {
  const id = await page.evaluate(() => { const x = mePeople().find(z => z.dept === "SUP 1"); books[x.bi].S.hasCur = false; return x.p.id; });   // a file without currency rules
  const c = await cards(page, id, "2026-10-26", "SUP 1");
  assert.deepStrictEqual([c.cur.level, c.cur.text], ["na", "No currency rules"]);
});
test("syl_progress_and_next", async ({ page }) => {
  const e = await cards(page, "EAGLE", "2026-10-26");
  assert.deepStrictEqual([e.syl.label, e.syl.text, e.syl.sub], ["Syllabus · CAT C", "TTX 2", "5 of 14 passed"]);
  const o = await cards(page, "OWL", "2026-10-26");
  assert.deepStrictEqual([o.syl.label, o.syl.text, o.syl.sub], ["Syllabus · OCU", "Flight 2", "Planned Tue 27 Oct NIGHT · 8 of 13 passed"]);
  assert.strictEqual((await cards(page, "HAWK", "2026-10-26")).syl.text, "Path complete");
});
test("syl_card_for_every_department_since_scale_up", async ({ page }) => {
  const id = await page.evaluate(() => mePeople().find(z => z.dept === "SUP 1").p.id);
  assert.notStrictEqual((await cards(page, id, "2026-10-26", "SUP 1")).syl, null);
});

// ---- Task 5: the page
const T5 = { fresh: true, today: "2026-10-26", title: "Sarah Lim" };
const shown = async (page, iso) => { await page.evaluate(iso => { cur.lodeIso = iso || null; cur.lodeAs = null; spRemember("lode_me", null); document.querySelector("nav.tabs button[data-v='lode']").click(); renderLode(); }, iso); await page.waitForTimeout(150); return page.innerText("#v-lode"); };
test("day_flight_carries_planned_syllabus", async ({ page }) => {
  const D = await day(page, "OWL", "2026-10-27");
  assert.strictEqual(D.items.find(x => x.kind === "flight").syl, "Flight 2");
  assert.strictEqual((await day(page, "HAWK", "2026-10-05")).items.find(x => x.kind === "flight").syl, "");
}, T5);
test("renders_greeting_and_cards", async ({ page }) => {
  const t = await shown(page);
  assert.ok(/Good (morning|afternoon|evening), HAWK/.test(t), t.slice(0, 200));
  assert.ok(/Monday 26 Oct 2026/.test(t));
  for (const w of ["MEDICAL", "CREW REST", "CURRENCY"]) assert.ok(t.toUpperCase().includes(w), w);
  assert.ok(await page.isVisible("#lodePrev") && await page.isVisible("#lodeNext"));
});
test("today_panel_shows_flight_details", async ({ page }) => {
  await page.evaluate(() => { SP.user = { Title: "Kumaravel S." }; });
  const t = await shown(page, "2026-10-14");
  for (const w of ["FLT-1.5", "0800", "1100", "NOT CLOSED", "SUP 2", "TUNA"]) assert.ok(t.toUpperCase().includes(w.toUpperCase()), w + " in: " + t);
});
test("next_days_table_rows", async ({ page }) => {
  await page.evaluate(() => { SP.user = { Title: "Sarah Lim" }; });
  await shown(page);
  const rows = await page.evaluate(() => [...document.querySelectorAll("#lodeWeek tr.d")].map(r => r.cells[0].innerText.replace(/\s+/g, " ").trim()));
  assert.deepStrictEqual(rows, ["Tue 27 Oct", "Wed 28 Oct", "Thu 29 Oct", "Fri 30 Oct", "Sat 31 Oct", "Sun 1 Nov", "Mon 2 Nov"]);
});
test("prev_next_day_moves_focus", async ({ page }) => {
  await shown(page);
  await page.click("#lodeNext"); assert.ok(/Tuesday 27 Oct 2026/.test(await page.innerText("#v-lode")));
  await page.click("#lodePrev"); await page.click("#lodePrev"); assert.ok(/Sunday 25 Oct 2026/.test(await page.innerText("#v-lode")));
});
test("fits_1280x720_without_scroll", async ({ page }) => {
  await shown(page);
  const r = await page.evaluate(() => { const v = document.getElementById("v-lode"); return { over: v.scrollHeight - v.clientHeight, page: document.documentElement.scrollHeight }; });
  assert.ok(r.over <= 1 && r.page <= 720, JSON.stringify(r));
});
test("unknown_day_message", async ({ page }) => {
  const t = await shown(page, "2028-01-05");
  assert.ok(/Not in this file yet/.test(t), t.slice(0, 300));
});
test("no_put_calls", async ({ page }) => {
  await page.evaluate(() => { window.__puts = 0; const o = window.put; window.put = function () { window.__puts++; return o.apply(this, arguments); }; });
  await shown(page);
  await page.click("#lodeNext"); await page.click("#lodePrev"); await page.click("#lodeChip .lodeAsBtn"); await page.click("#lodeList [data-who='SUP 2|VIPER']"); await page.click("#lodeBack");
  const r = await page.evaluate(() => ({ puts: window.__puts, dirty: books.reduce((n, b) => n + b.dirty.size, 0) }));
  assert.deepStrictEqual(r, { puts: 0, dirty: 0 });
});

// ---- Task 6: what changed (Change Log rows are injected by replacing logRead; real rows come from saved files)
const T6 = { fresh: true, today: "2026-10-26", title: "Sarah Lim" };
const inject = (page, rows) => page.evaluate(r => { window.logRead = () => r.slice().sort((x, y) => x.t < y.t ? 1 : -1); }, rows);
const chg = (page, id, since) => page.evaluate(([id, since]) => lodeChanges(mePeople().find(z => z.p.id === id), since, "2026-10-26"), [id, since]);
const row = (o) => Object.assign({ t: "2026-10-25 09:00:00", who: "A. Planner", file: "SUP 2", what: "", a: "", z: "", cell: "" }, o);
test("changes_include_own_cell_edit", async ({ page }) => {
  await inject(page, [row({ what: "HAWK, 2 Nov AM", z: "Meeting", cell: "Nov!D27" }), row({ t: "2026-10-25 10:00:00", what: "HAWK, 3 Nov PM", z: "", a: "SIM", cell: "Nov!E28" })]);
  const c = await chg(page, "HAWK", "2026-10-20 00:00:00");
  assert.deepStrictEqual(c.map(x => [x.kind, x.text]), [["mine", "Your 3 Nov PM was cleared"], ["mine", "Your 2 Nov AM is now Meeting"]]);
  assert.ok(/A\. Planner/.test(c[0].sub));
}, T6);
test("changes_ignore_other_people", async ({ page }) => {
  await inject(page, [row({ what: "VIPER, 2 Nov AM", z: "Meeting", cell: "Nov!D27" }), row({ file: "SUP 1", what: "HAWK, 2 Nov AM", z: "Meeting", cell: "Nov!D27" })]);
  assert.deepStrictEqual(await chg(page, "HAWK", null), []);
});
test("changes_include_cancelled_flight", async ({ page }) => {
  const f = await page.evaluate(() => { for (let k = 0; k <= 7; k++) { const iso = lodeAddDays("2026-10-26", k), D = opsDay(iso); const r = D && D.rows && D.rows.find(z => z.seats.some(c => c && c.dept === "SUP 2")); if (r) { const c = r.seats.find(c => c && c.dept === "SUP 2"); return { iso, id: c.id, key: r.key, s: r.x.s }; } } });
  assert.ok(f, "no SUP 2 flight in the window");
  await page.evaluate(([k]) => { books[opsIdx()].S.fc.set(k, { row: 99, st: "Cancelled", why: "Weather", seat: ["", "", "", "", "", ""], atd: "", ata: "", etd: "", eta: "", tail: "", stb: "", ao: "", brf: "", xtra: "", pax: "" }); }, [f.key]);
  await inject(page, [row({ file: "Ops Room", who: "Ops Duty", what: "Flight Crew, x", z: "Cancelled", cell: "Flight Crew!" + (await page.evaluate(() => OPS_TXT.st)) + "99" })]);
  const c = await chg(page, f.id, null);
  assert.deepStrictEqual(c.map(x => x.kind), ["cancelled"]);
  assert.ok(/cancelled/i.test(c[0].text) && /Weather/.test(c[0].sub), JSON.stringify(c[0]));
});
test("changes_include_master_move_and_duty", async ({ page }) => {
  const f = await page.evaluate(() => { const P = masterBook().S; for (let k = 0; k <= 7; k++) { const iso = lodeAddDays("2026-10-26", k), q = ymd(iso, 2026); for (const w of mePeople()) { if (w.dept !== "SUP 2") continue; const it = lodeDay(w, iso).items.find(x => x.kind === "flight" && x.time);
    if (it) { const fl = P.fl.find(z => z.mi === q.mi && z.d === q.d && z.s === it.s && z.code === it.code); if (fl && fl.row) return { id: w.p.id, iso, row: fl.row, code: it.code, time: it.time.split("-")[0], ref: sdoRef(q.y, q.mi, q.d) }; } } } });
  assert.ok(f, "no flight with a Master row in the window");
  await inject(page, [row({ t: "2026-10-25 11:00:00", file: "Master Planner", what: "Flights, x", a: f.time, z: "1330", cell: "Flights!D" + f.row }), row({ t: "2026-10-25 12:00:00", file: "Duty Roster", what: "SDO Plan, x", z: "SUP 2", cell: "SDO Plan!" + f.ref })]);
  const c = await chg(page, f.id, null);
  assert.deepStrictEqual(c.map(x => x.kind), ["duty", "moved"]);
  assert.ok(new RegExp(f.code + " moved " + f.time + " → 1330").test(c[1].text), c[1].text);
});
test("changes_since_last_visit_only", async ({ page }) => {
  await inject(page, [row({ t: "2026-10-24 09:00:00", what: "HAWK, 2 Nov AM", z: "Meeting", cell: "Nov!D27" }), row({ t: "2026-10-25 18:00:00", what: "HAWK, 3 Nov AM", z: "SIM", cell: "Nov!D28" })]);
  const c = await chg(page, "HAWK", "2026-10-25 12:00:00");
  assert.deepStrictEqual(c.map(x => x.text), ["Your 3 Nov AM is now SIM"]);
});
test("changes_first_visit_last_7_days", async ({ page }) => {
  const t = n => page.evaluate(n => { const d = new Date(Date.now() - n * 86400000), p = x => String(x).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " 12:00:00"; }, n);
  await inject(page, [row({ t: await t(2), what: "HAWK, 2 Nov AM", z: "Meeting", cell: "Nov!D27" }), row({ t: await t(10), what: "HAWK, 3 Nov AM", z: "SIM", cell: "Nov!D28" })]);
  assert.deepStrictEqual((await chg(page, "HAWK", null)).map(x => x.text), ["Your 2 Nov AM is now Meeting"]);
});
test("changes_capped_at_8_with_500_log_rows", async ({ page }) => {
  const rows = Array.from({ length: 500 }, (_, n) => row({ t: "2026-10-25 " + String(10 + Math.floor(n / 60)).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0") + ":00", what: "HAWK, " + (1 + n % 28) + " Nov AM", z: "R" + n, cell: "Nov!D27" }));
  await inject(page, rows);
  const c = await chg(page, "HAWK", "2026-10-01 00:00:00");
  assert.strictEqual(c.length, 8);
  assert.ok(c[0].t >= c[7].t);
});
test("badge_count_matches_and_seen_is_remembered", async ({ page }) => {
  await inject(page, [row({ t: "2026-10-25 18:00:00", what: "HAWK, 3 Nov AM", z: "SIM", cell: "Nov!D28" }), row({ t: "2026-10-25 19:00:00", what: "HAWK, 4 Nov AM", z: "OIL", cell: "Nov!D29" })]);
  await page.evaluate(() => { spRemember("lode_seen_SUP 2|HAWK", "2000-01-01 00:00:00"); cur.lodeIso = null; document.querySelector("nav.tabs button[data-v='lode']").click(); renderLode(); });
  assert.ok(/2 NEW/i.test(await page.innerText("#lodeChanged")), await page.innerText("#lodeChanged"));
  await page.evaluate(() => document.querySelector("nav.tabs button[data-v='ov']").click());
  const seen = await page.evaluate(() => spRecall("lode_seen_SUP 2|HAWK"));
  assert.ok(seen && seen > "2020-01-01", seen);   // moved on to the time of leaving the tab
});

// ---- Task 7: month summary, help, version
const T7 = { fresh: true, today: "2026-10-26", title: "Sarah Lim" };
const month = (page, id, mi) => page.evaluate(([id, mi]) => lodeMonth(mePeople().find(z => z.p.id === id), mi), [id, mi]);
const plannerTotals = (page, id) => page.evaluate(id => withBook(0, () => { const t = monthStats(9, actIndex()).crew[books[0].S.roster.findIndex(p => p.id === id)]; return { flights: t.fl, hrsPlanned: t.hrs, ground: t.gd, duty: t.sdo, leave: t.lv }; }), id);
test("month_matches_planner_totals", async ({ page }) => {
  for (const id of ["HAWK", "VIPER", "KESTREL"]) {
    const m = await month(page, id, 9), t = await plannerTotals(page, id);
    assert.deepStrictEqual({ flights: m.flights, hrsPlanned: m.hrsPlanned, ground: m.ground, duty: m.duty, leave: m.leave }, t, id);
  }
  assert.strictEqual((await month(page, "HAWK", 9)).cancelled, 0);
}, T7);
test("month_cancelled_and_flown_hours", async ({ page }) => {
  const base = await month(page, "HAWK", 9);
  await page.evaluate(() => { const D = opsDay("2026-10-14"), r = D.rows.find(z => z.seats.some(c => c && c.id === "HAWK")); books[opsIdx()].S.fc.set(r.key, { row: 98, st: "", why: "", seat: ["", "", "", "", "", ""], atd: "0800", ata: "1100", etd: "", eta: "", tail: "", stb: "", ao: "", brf: "", xtra: "", pax: "" }); });
  const flown = await month(page, "HAWK", 9);
  assert.strictEqual(flown.hrsFlown, 3);
  await page.evaluate(() => { const D = opsDay("2026-10-14"), r = D.rows.find(z => z.seats.some(c => c && c.id === "HAWK")); books[opsIdx()].S.fc.set(r.key, { row: 98, st: "Cancelled", why: "Weather", seat: ["", "", "", "", "", ""], atd: "", ata: "", etd: "", eta: "", tail: "", stb: "", ao: "", brf: "", xtra: "", pax: "" }); });
  const c = await month(page, "HAWK", 9);
  assert.deepStrictEqual([c.cancelled, c.flights, c.hrsFlown], [1, base.flights - 1, 0]);
  assert.strictEqual(base.sylPassed, 0);
});
test("month_card_renders", async ({ page }) => {
  await page.evaluate(() => { spRemember("lode_me", null); cur.lodeIso = null; document.querySelector("nav.tabs button[data-v='lode']").click(); renderLode(); });
  const t = await page.innerText("#lodeMonth");
  assert.ok(/October so far/i.test(t) && /FLIGHTS/i.test(t) && /HRS FLOWN/i.test(t) && /LEAVE/i.test(t), t);
});
test("help_text_present", async ({ page }) => {
  await page.evaluate(() => { document.querySelector("nav.tabs button[data-v='lode']").click(); });
  await page.click("#helpBtn");
  const t = await page.innerText("#helpBody");
  assert.ok(/next 7 days/i.test(t) && /View as/i.test(t), t.slice(0, 200));
});
test("version_is_z91", async ({ page }) => {
  const r = await page.evaluate(() => { spDiag("x"); return document.getElementById("wDiag").textContent; });
  assert.ok(/ z91 /.test(r + " "), r);
  assert.ok((await page.evaluate(() => document.documentElement.outerHTML)).includes("Dashboard version 2026-10-26 z91 "), "start screen version");
});

// ---- Regression: the rest of the dashboard still works around My Lodestar
test("every_tab_opens_without_errors", async ({ page, errs }) => {
  const views = await page.evaluate(() => [...document.querySelectorAll("nav.tabs button[data-v]")].map(b => b.dataset.v));
  for (const v of views) { await page.evaluate(v => document.querySelector("nav.tabs button[data-v='" + v + "']").click(), v); await page.waitForTimeout(250); }
  assert.ok(views.includes("lode") && !views.includes("me"), views.join());
  assert.deepStrictEqual(errs, []);
}, { fresh: true, today: "2026-10-26", title: "Sarah Lim" });
test("edit_undo_redo_save_roundtrip", async ({ page, errs }) => {
  await page.evaluate(() => { document.querySelector("nav.tabs button[data-v='plan']").click(); document.querySelector("#month").value = "9"; document.querySelector("#month").dispatchEvent(new Event("change")); });
  await page.click("#plan td[data-k='g:1:1']"); await page.keyboard.type("Meeting"); await page.keyboard.press("Enter"); await page.waitForTimeout(400);
  const st = () => page.evaluate(() => ({ cell: books[0].S.m[9].grid[1][1], undo: !btnUndo.disabled, redo: !btnRedo.disabled, dirty: books[0].dirty.size }));
  assert.deepStrictEqual(await st(), { cell: "Meeting", undo: true, redo: false, dirty: 1 });
  await page.click("#btnUndo"); await page.waitForTimeout(300);
  assert.deepStrictEqual(await st(), { cell: "", undo: false, redo: true, dirty: 0 });   // the Redo button follows an undo (z87 fix)
  await page.click("#btnRedo"); await page.waitForTimeout(300);
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }), page.click("#btnSave")]);
  assert.ok(/\.xlsx$/.test(dl.suggestedFilename()));
  await page.waitForTimeout(500);
  assert.strictEqual(await page.evaluate(() => books[0].dirty.size), 0);
  assert.deepStrictEqual(errs, []);
});
test("block_of_days_drops_planned_syllabus", async ({ page }) => {
  await page.evaluate(() => { document.querySelector("nav.tabs button[data-v='plan']").click(); document.querySelector("#month").value = "9"; document.querySelector("#month").dispatchEvent(new Event("change")); });
  await page.click("#plan td[data-k='g:17:26']"); await page.click("#popList .it.blk");
  await page.selectOption("#blkCode", "OIL"); await page.check("#blkOver"); await page.uncheck("#blkS0"); await page.uncheck("#blkS1"); await page.click("#blkGo"); await page.waitForTimeout(300);
  assert.deepStrictEqual(await page.evaluate(() => S.syl.filter(x => x.id === "OWL" && x.iso === "2026-10-27").length), 0);
}, { fresh: true, today: "2026-10-26", title: "Sarah Lim" });

// ---- Final review fixes
const T8 = { fresh: true, today: "2026-10-26", title: "nobody@x.mil" };
test("escape_apostrophe_in_names", async ({ page }) => {
  await page.evaluate(() => { const a = mePeople().find(z => z.p.id === "OWL"), b = mePeople().find(z => z.p.id === "EAGLE");
    a.p.id = "NIL"; a.p.name = "Liam O'Brien"; b.p.id = "NIL"; b.p.name = "Bad' onmouseover='window.__x=1"; spRemember("lode_me", null); cur.lodeAs = null; });
  await page.evaluate(() => { document.querySelector("nav.tabs button[data-v='lode']").click(); renderLode(); });
  const opts = await page.evaluate(() => [...document.querySelectorAll("#lodeSel option")].map(o => o.value).filter(v => /Brien/.test(v)));
  assert.deepStrictEqual(opts, ["SUP 2|Liam O'Brien"]);
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll("#lodeBody [onmouseover]").length), 0);
  await page.selectOption("#lodeSel", "SUP 2|Liam O'Brien");
  assert.strictEqual(await page.evaluate(() => lodeWho().p.name), "Liam O'Brien");
  await page.click("#lodeChip .lodeAsBtn");
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll("#lodeList [onmouseover]").length), 0);
  await page.evaluate(() => [...document.querySelectorAll("#lodeList .li")].find(e => e.dataset.who === "SUP 2|Liam O'Brien").click());
  assert.ok(/Viewing Liam O'Brien/.test(await page.innerText("#lodeBanner")));
}, T8);
test("nil_callsign_people_do_not_share_flights", async ({ page }) => {
  await page.evaluate(() => { mePeople().find(z => z.p.id === "HAWK").p.id = "NIL"; mePeople().find(z => z.p.id === "OWL").p.id = "NIL"; });
  const r = await page.evaluate(() => { const hawk = mePeople().find(z => z.p.name === "CPT Sarah Lim"), owl = mePeople().find(z => z.p.name === "ME2 Nurul Huda");
    return { hawk: lodeDay(hawk, "2026-10-14").ops.map(o => [o.code, o.fromPlan]), owl: lodeDay(owl, "2026-10-14").ops.length, me: lodeDay(hawk, "2026-10-14").ops[0].seats.filter(z => z.me).length }; });
  assert.deepStrictEqual(r, { hawk: [["2xFLT-1.5", false]], owl: 0, me: 1 });
}, T8);
test("empty_callsign_still_finds_ops_row", async ({ page }) => {
  await page.evaluate(() => { mePeople().find(z => z.p.id === "HAWK").p.id = ""; });
  const r = await page.evaluate(() => lodeDay(mePeople().find(z => z.p.name === "CPT Sarah Lim"), "2026-10-14").ops.map(o => [o.fromPlan, o.etd, o.seats.some(z => z.me)]));
  assert.deepStrictEqual(r, [[false, "0800", true]]);
}, T8);
test("cards_on_unknown_day_say_so", async ({ page }) => {
  const u = await cards(page, "HAWK", "2028-01-05"), k = await cards(page, "HAWK", "2026-10-14");
  assert.deepStrictEqual([u.known, u.medical.ok, u.medical.text, u.rest.text, u.rest.na], [false, null, "Not in this file yet", "Not in this file yet", true]);
  assert.ok(/as of today$/.test(u.cur.sub) && /as of today$/.test(k.cur.sub), u.cur.sub + " | " + k.cur.sub);
  assert.ok(!/as of today/.test((await cards(page, "HAWK", "2026-10-26")).cur.sub));
  await page.evaluate(() => { spRemember("lode_me", null); cur.lodeIso = "2028-01-05"; document.querySelector("nav.tabs button[data-v='lode']").click(); renderLode(); });
  assert.ok(!/Fit to fly/.test(await page.innerText("#v-lode")));
}, { fresh: true, today: "2026-10-26", title: "Sarah Lim" });

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
