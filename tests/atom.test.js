// ATOM currency tests (synthetic exports only). Build the dashboard first: python3 .lodestar_build.py dashboard
// Run: node tests/atom.test.js [name-filter]   (prints "N/M pass"; exit code 1 if any fail)
const assert = require("assert");
const fs = require("fs");
const { boot, atomFixture, ROOT } = require("./lode_lib");
const path = require("path");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const FULL = () => atomFixture();
const A = () => ({ atom: [FULL()] });

// ---- Task 1: fixture, harness, tab skeleton
test("fixture_builds", async () => {
  const f = atomFixture();
  assert.ok(fs.statSync(f).size > 3000);
  const names = require("child_process").execFileSync("python3", ["-c", "import openpyxl,sys;print(','.join(openpyxl.load_workbook(sys.argv[1]).sheetnames))", f]).toString().trim();
  assert.strictEqual(names, "PILOT,ACS,TACCO,SUP1,SUP2");
});
test("atom_state_exists", async ({ page }) => {
  assert.ok(await page.evaluate(() => Array.isArray(ATOMS) && typeof renderAtom === "function"));
});
test("currency_tab_has_atom_box", async ({ page }) => {
  assert.ok(await page.evaluate(() => !!document.querySelector("#v-cur #atomBox")));
});

// ---- Task 2: parser and intake
const MOVED = () => ({ atom: [atomFixture({ variant: "moved" })], others: false, fresh: true });
const PART = () => ({ atom: [atomFixture({ variant: "partial" })], others: false, fresh: true });
const F0 = page => page.evaluate(() => JSON.parse(JSON.stringify(ATOMS[0])));
test("parse_reads_headers_not_positions", async ({ page }) => {
  const f = await F0(page);
  assert.deepStrictEqual(f.sheets.Pilot.map(r => r.name), ["A NGO", "HO KM", "S LIM JH", "SAMY", "TEO WK"]);
  assert.deepStrictEqual(f.groups, [{ group: "Flight Currencies", cols: ["Day Capt", "Day Curr", "IRT", "Night Capt", "Night Curr"] }]);   // ATOM_CUR order, the extra NVG Curr column ignored
  assert.strictEqual(f.sheets.Pilot[0].cells["Night Curr"].iso, "2026-10-27");
  assert.strictEqual(f.sheets.Pilot[0].hours, 3.9);
}, MOVED());
test("parse_reads_only_the_five", async ({ page }) => {
  const f = await F0(page);
  assert.deepStrictEqual(f.groups.map(g => g.group), ["Flight Currencies"]);
  const text = JSON.stringify(f);
  for (const bad of ["Instructor Check", "SIM Package", "ACE", "APT", "SVT", "MAS", "SAL", "\"SIM\"", "Level", "Remarks", "FAKE personal remark"]) assert.ok(!text.includes(bad), bad);
  for (const d in f.sheets) for (const r of f.sheets[d]) assert.ok(Object.keys(r.cells).every(k => ["Day Capt", "Day Curr", "IRT", "Night Capt", "Night Curr"].includes(k)), d + ":" + Object.keys(r.cells));
}, { atom: [FULL()], others: false, fresh: true });
test("parse_value_kinds", async ({ page }) => {
  const rows = (await F0(page)).sheets.Pilot, a = rows.find(r => r.name === "A NGO").cells, t = rows.find(r => r.name === "TEO WK").cells;
  assert.deepStrictEqual([a["Day Curr"].k, a["Day Curr"].iso, a["Day Curr"].raw], ["date", "2026-11-16", "16 Nov 26"]);
  assert.strictEqual(a["IRT"].k, "none");
  assert.strictEqual(t["Day Curr"].k, "na");
  assert.strictEqual(t["Night Capt"].k, "blank");
  assert.deepStrictEqual([t["IRT"].k, t["IRT"].iso, t["IRT"].raw], ["text", null, "soon"]);
  assert.deepStrictEqual([t["Day Capt"].k, t["Day Capt"].iso], ["date", "2027-01-22"]);   // a real Excel date
});
test("parse_hours", async ({ page }) => {
  const rows = (await F0(page)).sheets.Pilot, h = n => rows.find(r => r.name === n).hours;
  assert.deepStrictEqual([h("A NGO"), h("HO KM"), h("S LIM JH"), h("SAMY")], [3.9, 8.2, null, 0]);
});
test("parse_hours_month", async ({ page }) => {
  const f = await F0(page); assert.strictEqual(f.hoursMonth, "2026-10"); assert.strictEqual(f.source, "export");
});
test("parse_skips_band_rows", async ({ page }) => {
  const f = await F0(page);
  for (const d in f.sheets) for (const r of f.sheets[d]) assert.ok(r.name && !/^\s*->/.test(r.name), d + ":" + r.name);
  assert.deepStrictEqual(Object.keys(f.sheets), ["Pilot", "Loadmaster", "TACCO", "SUP 1", "SUP 2"]);
  assert.strictEqual(f.sheets.Pilot.find(r => r.name === "TEO WK").status, "NSmen");
});
test("parse_created_time", async ({ page }) => {
  const r = await page.evaluate(() => { const d = new Date("2026-10-25T12:41:33Z"), p = n => String(n).padStart(2, "0"); return [ATOMS[0].created, d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes())]; });
  assert.strictEqual(r[0], r[1]);
});
test("partial_file_lists_missing", async ({ page }) => {
  assert.deepStrictEqual((await F0(page)).missing, ["Loadmaster", "TACCO", "SUP 1"]);
}, PART());
test("loading_an_atom_file_does_not_touch_books", async ({ page }) => {
  const r = await page.evaluate(() => ({ n: books.length, atoms: ATOMS.length, same: WB === books[cur.b].WB, names: books.map(b => b.S.dept || b.S.kind) }));
  assert.strictEqual(r.n, 8, JSON.stringify(r)); assert.strictEqual(r.atoms, 1); assert.ok(r.same);
}, { atom: [FULL()], fresh: true });
test("atom_first_then_planner", async ({ page, errs }) => {
  assert.strictEqual(await page.evaluate(() => [ATOMS.length, books.length]).then(String), "1,0");
  assert.ok(/ATOM export loaded/.test(await page.innerText("#toast")));
  assert.ok(await page.evaluate(() => getComputedStyle(document.getElementById("welcome")).display !== "none"));
  assert.deepStrictEqual(errs, []);
}, { atomFirst: FULL(), fresh: true });
test("as_of_override_is_remembered", async ({ page }) => {
  const r = await page.evaluate(() => { const f = ATOMS[0], d0 = atomAsOf(f); atomSetAsOf(f, "2026-10-20 09:00"); return [d0, atomAsOf(f), spRecall("atom_asof_" + f.name)]; });
  assert.strictEqual(r[1], "2026-10-20 09:00"); assert.strictEqual(r[2], "2026-10-20 09:00"); assert.notStrictEqual(r[0], r[1]);
}, { atom: [FULL()], others: false, fresh: true });
test("folder_picker_routes_atom_file", async ({ page }) => {
  const f = atomFixture({ name: "ATOM_second", created: "2026-10-20 08:00:00" });
  await page.setInputFiles("#fileInputMore", [f]);
  await page.waitForFunction(() => ATOMS.length === 2);
  assert.strictEqual(await page.evaluate(() => books.length), 8);
}, { atom: [FULL()], fresh: true });

// ---- Task 3: matching by Initials
const MT = { atom: [FULL()], fresh: true };
const rowOf = (page, bi, i) => page.evaluate(([bi, i]) => { const r = atomFor(bi, i); return r && r.name; }, [bi, i]);
test("match_exact_case_and_spaces", async ({ page }) => {
  const [b1, i1] = await setIni(page, "SUP 2", 0, "v  tan"), [b2, i2] = await setIni(page, "Pilot", 0, "s lim jh");
  assert.strictEqual(await rowOf(page, b1, i1), "V TAN"); assert.strictEqual(await rowOf(page, b2, i2), "S LIM JH");
}, MT);
test("match_blank_initials_never_matches", async ({ page }) => {
  const [b, i] = await setIni(page, "SUP 2", 0, "   ");
  const r = await page.evaluate(([b, i]) => { const m = atomMatch(ATOMS[0]); return [atomFor(b, i), m.fix.rosterOnly.some(x => x.dept === "SUP 2" && x.id === books[b].S.roster[i].id)]; }, [b, i]);
  assert.deepStrictEqual(r, [null, false]);
});
test("match_duplicates_listed_not_chosen", async ({ page }) => {
  const [b, i] = await setIni(page, "SUP 2", 0, "V TAN"), [, j] = await setIni(page, "SUP 2", 1, "v tan");
  const r = await page.evaluate(([b, i, j]) => { const m = atomMatch(ATOMS[0]); return { d: m.fix.dupes.map(x => [x.dept, x.ini.toLowerCase(), x.ids.length]), a: atomFor(b, i), c: atomFor(b, j) }; }, [b, i, j]);
  assert.deepStrictEqual(r, { d: [["SUP 2", "v tan", 2]], a: null, c: null });
});
test("match_atom_only_and_roster_only_listed", async ({ page }) => {
  const [b, i] = await setIni(page, "SUP 2", 0, "V TAN");
  const r = await page.evaluate(() => { const m = atomMatch(ATOMS[0]); return { ao: m.fix.atomOnly.filter(x => x.dept === "SUP 2").map(x => x.name), ro: m.fix.rosterOnly.filter(x => x.dept === "SUP 2").length, pilotAo: m.fix.atomOnly.filter(x => x.dept === "Pilot").length }; });
  assert.deepStrictEqual(r.ao, ["H LIM", "O NG"]); assert.ok(r.ro >= 4, "roster-only SUP 2: " + r.ro); assert.strictEqual(r.pilotAo, 5 - 0);
}, MT);
test("match_cat_difference_listed", async ({ page }) => {
  await setIni(page, "SUP 2", 0, "V TAN", "CAT B");    // ATOM CAT A
  await setIni(page, "SUP 2", 1, "H LIM", "CAT B");    // ATOM CAT B, same
  const r = await page.evaluate(() => atomMatch(ATOMS[0]).fix.cat.map(x => [x.dept, x.atom, x.roster]));
  assert.deepStrictEqual(r, [["SUP 2", "A", "CAT B"]]);
});
test("closed_department_is_not_an_error", async ({ page }) => {
  const r = await page.evaluate(() => { books = books.filter(b => b.S.kind || b.S.dept !== "SUP 1"); const m = atomMatch(ATOMS[0]); return { closed: m.fix.closed, ao: m.fix.atomOnly.filter(x => x.dept === "SUP 1").length }; });
  assert.deepStrictEqual(r, { closed: ["SUP 1"], ao: 0 });
}, { atom: [FULL()] });
test("match_within_department_only", async ({ page }) => {
  const [b, i] = await setIni(page, "SUP 1", 0, "V TAN");   // V TAN is a SUP 2 name in ATOM
  const r = await page.evaluate(([b, i]) => ({ row: atomFor(b, i), ao: atomMatch(ATOMS[0]).fix.atomOnly.some(x => x.name === "V TAN" && x.dept === "SUP 2") }), [b, i]);
  assert.deepStrictEqual(r, { row: null, ao: true });
});

// ---- Task 4: status and issues
const AO = { atom: [FULL()] };
const dcell = iso => ({ k: "date", iso, raw: iso });
test("state_boundaries", async ({ page }) => {
  const r = await page.evaluate(() => { const D = "2026-10-26", st = iso => atomState({ k: "date", iso, raw: iso }, D);
    const a = ["2026-10-25", "2026-10-26", "2026-11-09", "2026-11-10"].map(st); atomSetDue(7); const b = ["2026-11-02", "2026-11-03"].map(st); atomSetDue(14); return [a, b, atomDue()]; });
  assert.deepStrictEqual(r, [["lap", "due", "due", "ok"], ["due", "ok"], 14]);
}, AO);
test("state_kinds", async ({ page }) => {
  const r = await page.evaluate(() => ["none", "na", "blank", "text"].map(k => atomState({ k, iso: null, raw: "" }, "2026-10-26")));
  assert.deepStrictEqual(r, ["nh", "nh", "nr", "nr"]);
});
test("cells_hide_not_held_and_carry_group", async ({ page }) => {
  const r = await page.evaluate(() => { const row = ATOMS[0].sheets.Pilot[0]; return atomCells(row, "2026-10-26").map(c => [c.col, c.group, c.state, c.days]).filter(x => ["Day Capt", "Day Curr", "IRT", "Instructor Check", "ACE", "APT", "Night Curr"].includes(x[0])); });
  assert.deepStrictEqual(r, [["Day Capt", "Flight Currencies", "lap", -10], ["Day Curr", "Flight Currencies", "ok", 21], ["Night Curr", "Flight Currencies", "due", 1], ["ACE", "LSS Currencies", "nr", null], ["APT", "LSS Currencies", "nr", null]]);
});
test("issues_for_matched_person", async ({ page }) => {
  const [b, i] = await setIni(page, "Pilot", 0, "A NGO");
  const r = await page.evaluate(([b, i]) => { const x = atomIssues(b, i, "2026-10-26"); return [x.lap.map(c => c.col), x.due.map(c => c.col)]; }, [b, i]);
  assert.deepStrictEqual(r, [["Day Capt", "Night Capt"], ["Night Curr"]]);
});
test("issues_empty_for_unmatched", async ({ page }) => {
  const [b, i] = await setIni(page, "Pilot", 1, "NOBODY");
  assert.deepStrictEqual(await page.evaluate(([b, i]) => atomIssues(b, i, "2026-10-26"), [b, i]), { lap: [], due: [] });
});
test("stale_thresholds", async ({ page }) => {
  const r = await page.evaluate(() => { const f = ATOMS[0], t = "2026-10-26", o = {}; for (const [k, d] of [["6", "2026-10-20 08:00"], ["8", "2026-10-18 08:00"], ["31", "2026-09-25 08:00"]]) { atomSetAsOf(f, d); o[k] = [atomAge(f, t), atomStale(f, t)]; } return o; });
  assert.deepStrictEqual(r, { "6": [6, ""], "8": [8, "amber"], "31": [31, "red"] });
});

// ---- Task 5: Currency tab grid
const NAMES = { Pilot: ["A NGO", "HO KM", "S LIM JH", "SAMY", "TEO WK"], Loadmaster: ["L CHEW", "M SOH"], TACCO: ["T LEE", "R KOH"], "SUP 1": ["P YEO", "Q ONG"], "SUP 2": ["V TAN", "H LIM", "O NG"] };
const matchAll = async page => { for (const d in NAMES) for (let n = 0; n < NAMES[d].length; n++) await setIni(page, d, n, NAMES[d][n]); };
const openCur = async page => { await page.evaluate(() => { document.querySelector("nav.tabs button[data-v='cur']").click(); renderAtom(); }); };
const D0 = "2026-10-26";
test("grid_rows_sorted_worst_first", async ({ page }) => {
  await setIni(page, "Pilot", 0, "A NGO"); await setIni(page, "Pilot", 1, "HO KM"); await setIni(page, "Pilot", 2, "S LIM JH");
  const r = await page.evaluate(d => atomGridRows("Pilot", false, d).map(x => [x.row.name, x.lap, x.due]), D0);
  assert.deepStrictEqual(r, [["A NGO", 2, 1], ["S LIM JH", 1, 2], ["HO KM", 0, 0]]);
  assert.deepStrictEqual(await page.evaluate(d => atomGridRows("Pilot", true, d).map(x => x.row.name), D0), ["A NGO", "S LIM JH"]);
});
test("grid_columns_follow_file", async ({ page }) => {
  await setIni(page, "Pilot", 0, "A NGO"); await openCur(page);
  const t = await page.innerText("#atomGrid");
  assert.ok(/NVG\s*Curr/i.test(t), t.slice(0, 200));
}, { atom: [atomFixture({ variant: "moved" })], others: true, fresh: true });
test("grid_hides_not_held_and_formats_dates", async ({ page }) => {
  await setIni(page, "Pilot", 0, "A NGO"); await openCur(page);
  const r = await page.evaluate(() => { const th = [...document.querySelectorAll("#atomGrid thead tr:last-child th")].map(x => x.textContent.replace(/\s+/g, " ").trim()), tds = [...document.querySelectorAll("#atomGrid tbody tr:first-child td")];
    const at = n => { const i = th.indexOf(n); return tds[i + 1]; }; return { irt: [at("IRT").className, at("IRT").textContent], dc: at("Day Curr").textContent, mas: at("MAS").textContent, ace: [at("ACE").className, at("ACE").textContent], lap: at("Day Capt").className.includes("lap") }; });
  assert.deepStrictEqual(r, { irt: ["nh", "–"], dc: "16 Nov", mas: "30 Jun 31", ace: ["nr gs", "?"], lap: true });
});
test("grid_counts_match_cells", async ({ page }) => {
  await matchAll(page); await openCur(page);
  const r = await page.evaluate(() => ({ lap: document.querySelectorAll("#atomGrid td.lap").length, due: document.querySelectorAll("#atomGrid td.due").length, chips: [...document.querySelectorAll("#atomBox .cnt .c b")].map(b => +b.textContent) }));
  assert.ok(r.lap > 0 && r.due > 0);
  assert.strictEqual(r.chips[0], r.lap); assert.strictEqual(r.chips[1], r.due);
});
test("stale_banner_amber_and_red", async ({ page }) => {
  const f = async d => { await page.evaluate(d => { atomSetAsOf(ATOMS[0], d); window.OPS_TODAY = "2026-10-26"; renderAtom(); }, d); return page.evaluate(() => { const b = document.querySelector("#atomBox .astale"); return b ? b.className : ""; }); };
  assert.ok((await f("2026-10-18 08:00")).includes("amber")); assert.ok((await f("2026-09-10 08:00")).includes("red")); assert.strictEqual(await f("2026-10-25 08:00"), "");
});
test("empty_state_message", async ({ page }) => {
  await page.evaluate(() => { ATOMS = []; renderAtom(); });
  assert.ok(/Add an ATOM export/.test(await page.innerText("#atomBox")));
});
test("fits_1280x720", async ({ page }) => {
  await matchAll(page); await openCur(page);
  const r = await page.evaluate(() => { const g = document.getElementById("atomGrid").getBoundingClientRect(); return [Math.round(g.bottom), document.documentElement.scrollHeight]; });
  assert.ok(r[0] <= 720 && r[1] <= 720, JSON.stringify(r));
});
test("no_put_calls", async ({ page }) => {
  await matchAll(page);
  const r = await page.evaluate(() => { let n = 0; const keep = window.put; window.put = (...a) => { n++; return keep(...a); };
    document.querySelector("nav.tabs button[data-v='cur']").click(); renderAtom();
    for (const b of document.querySelectorAll("#atomBox .seg button")) b.click();
    const o = document.getElementById("atomOnly"); if (o) o.click(); window.put = keep; return [n, books.every(b => b.dirty.size === 0)]; });
  assert.deepStrictEqual(r, [0, true]);
});

// ---- Task 6: Names to fix panel
const fixText = page => page.evaluate(() => { atomFixOpen(); return document.getElementById("atomFixPanel").innerText; });
const liCount = (page, sec) => page.evaluate(sec => document.querySelectorAll("#atomFixPanel [data-sec='" + sec + "'] li").length, sec);
test("fix_panel_sections_and_counts", async ({ page }) => {
  await setIni(page, "SUP 2", 0, "V TAN", "CAT B"); await setIni(page, "SUP 2", 1, "dupe"); await setIni(page, "SUP 2", 2, "DUPE");
  const t = await fixText(page);
  for (const h of ["In ATOM, but no roster Initials match", "Same Initials twice on a roster", "CAT differs from the roster", "On the roster, Initials not in ATOM"]) assert.ok(t.includes(h), h);
  const f = await page.evaluate(() => atomMatch(ATOMS[0]).fix);
  assert.strictEqual(await liCount(page, "atomOnly"), f.atomOnly.length); assert.strictEqual(await liCount(page, "dupes"), 1);
  assert.strictEqual(await liCount(page, "cat"), 1); assert.strictEqual(await liCount(page, "rosterOnly"), f.rosterOnly.length);
  assert.strictEqual(await page.evaluate(() => +document.querySelector("#atomFix b").textContent), f.atomOnly.length + f.rosterOnly.length + 1 + 1);
});
test("fix_closed_department_line", async ({ page }) => {
  await page.evaluate(() => { books = books.filter(b => b.S.kind || b.S.dept !== "Loadmaster"); });
  assert.ok((await fixText(page)).includes("Open the Loadmaster file to match its names"));
});
test("fix_link_opens_crew_roster", async ({ page }) => {
  await fixText(page);
  const bi = await page.evaluate(() => { const a = document.querySelector("#atomFixPanel a[data-bi]"); const n = +a.dataset.bi; a.click(); return n; });
  assert.ok(await page.evaluate(() => document.getElementById("v-roster").classList.contains("on")));
  assert.strictEqual(await page.evaluate(() => cur.b), bi);
});
test("fix_clears_when_initials_fixed", async ({ page }) => {
  const n0 = await page.evaluate(() => atomFixCount(ATOMS[0]));
  await setIni(page, "SUP 2", 0, "H LIM");
  const r = await page.evaluate(() => { atomFixOpen(); return [atomFixCount(ATOMS[0]), atomMatch(ATOMS[0]).fix.atomOnly.some(x => x.name === "H LIM")]; });
  assert.ok(r[0] < n0 && r[1] === false, JSON.stringify([n0, r]));   // H LIM leaves 'in ATOM only' (VIPER's CAT A vs ATOM B shows up as one new CAT line)
});
test("fix_panel_empty_state", async ({ page }) => {
  const CATS = { Pilot: "ABACA", Loadmaster: "AB", TACCO: "AC", "SUP 1": "AB", "SUP 2": "ABC" };   // the CAT column of the fixture
  for (const d in NAMES) for (let n = 0; n < NAMES[d].length; n++) await setIni(page, d, n, NAMES[d][n], "CAT " + CATS[d][n]);
  await page.evaluate(NAMES => { for (const d in NAMES) { const b = books.find(b => !b.S.kind && b.S.dept === d); b.S.roster.filter(p => p.name || p.id).slice(NAMES[d].length).forEach(p => { p.ini = ""; }); } }, NAMES);
  assert.ok((await fixText(page)).includes("Nothing to fix"));
});

// ---- Task 7: name badge and My Lodestar card
const badgeFor = (page, dept, id) => page.evaluate(([dept, id]) => { const bi = books.findIndex(b => !b.S.kind && b.S.dept === dept); useBook(bi); cur.sel = null; renderAll(); document.querySelector("nav.tabs button[data-v='plan']").click();
  const td = [...document.querySelectorAll("#plan td.idc")].find(x => x.textContent.trim() === id); const b = td && td.nextElementSibling.querySelector("i.curb[data-atom]"); return b ? [b.className, b.textContent, b.title] : null; }, [dept, id]);
test("planner_badge_for_atom_lapse", async ({ page }) => {
  const id = await ID(page, "SUP 2", 0); await setIni(page, "SUP 2", 0, "V TAN");   // V TAN: MAS lapsed 16 Oct, Night Curr due 27 Oct
  const b = await badgeFor(page, "SUP 2", id);
  assert.ok(b && /bad/.test(b[0]) && b[1] === "ATOM ⚠ 1" && /MAS/.test(b[2]), JSON.stringify(b));
  const pid = await ID(page, "Pilot", 0); await setIni(page, "Pilot", 0, "A NGO");   // scaled up: any department
  const c = await badgeFor(page, "Pilot", pid);
  assert.ok(c && c[1] === "ATOM ⚠ 2", JSON.stringify(c));
});
test("planner_badge_due_only", async ({ page }) => {
  const id = await ID(page, "SUP 2", 2); await setIni(page, "SUP 2", 2, "O NG");   // O NG: Day Curr due only
  const b = await badgeFor(page, "SUP 2", id);
  assert.ok(b && /due/.test(b[0]) && b[1] === "ATOM ! 1", JSON.stringify(b));
});
test("planner_badge_absent_without_atom", async ({ page }) => {
  const id = await ID(page, "SUP 2", 0); await setIni(page, "SUP 2", 0, "V TAN");
  await page.evaluate(() => { ATOMS = []; });
  assert.strictEqual(await badgeFor(page, "SUP 2", id), null);
});
test("my_lodestar_uses_atom_when_matched", async ({ page }) => {
  const id = await ID(page, "SUP 2", 0); await setIni(page, "SUP 2", 0, "V TAN");
  const c = await page.evaluate(([id, iso]) => lodeCards(mePeople().find(z => z.p.id === id && z.dept === "SUP 2"), iso).cur, [id, "2026-10-26"]);
  assert.strictEqual(c.level, "bad"); assert.strictEqual(c.text, "MAS lapsed 16 Oct"); assert.ok(/from ATOM, data as of 2026-10-25/.test(c.sub), c.sub);
  const ok = await ID(page, "SUP 2", 1); await setIni(page, "SUP 2", 1, "H LIM");
  const d = await page.evaluate(([id, iso]) => lodeCards(mePeople().find(z => z.p.id === id && z.dept === "SUP 2"), iso).cur, [ok, "2026-10-26"]);
  assert.deepStrictEqual([d.level, d.text], ["ok", "All current"]);
});
test("my_lodestar_falls_back_without_atom", async ({ page }) => {
  const c = await page.evaluate(() => { ATOMS = []; return lodeCards(mePeople().find(z => z.dept === "SUP 2"), "2026-10-26").cur; });
  assert.ok(!/ATOM/.test(c.sub), c.sub);
});

// ---- Task 8: the flight-needs table (ATOM Needs sheet in Ops_Room.xlsx)
const opsBi = page => page.evaluate(() => books.findIndex(b => b.S.kind === "ops"));
const opsMode = page => page.evaluate(() => { OPS = true; });
test("needs_sheet_created_on_first_edit", async ({ page }) => {
  await opsMode(page);
  const r = await page.evaluate(() => { const bi = books.findIndex(b => b.S.kind === "ops"), had = !!books[bi].WB.paths["ATOM Needs"]; atomNeedsSet(0, "NVG-*", ["Night Curr"], "Any");
    const b = books[bi]; return [had, !!b.WB.paths["ATOM Needs"], [...b.dirty.keys()].filter(k => k.startsWith("ATOM Needs!")).sort(), books.filter(x => x.WB.paths["Change Log"] || true).length > 0]; });
  assert.deepStrictEqual(r.slice(0, 3), [false, true, ["ATOM Needs!A2", "ATOM Needs!B2", "ATOM Needs!C2"]]);
});
test("needs_roundtrip", async ({ page }) => {
  await opsMode(page);
  const r = await page.evaluate(() => { atomNeedsSet(0, "NVG-*", ["Night Curr", "Night Capt"], "Any"); atomNeedsSet(1, "TRG", ["SIM"], "Captain");
    const bi = books.findIndex(b => b.S.kind === "ops"); const out = withBook(bi, () => buildXlsx());
    const files = fflate.unzipSync(out.bytes), keep = WB; WB = { files, paths: sheetPaths(files), sst: parseSST(files), name: "copy.xlsx" };
    try { const st = readOps("copy.xlsx"); return { has: st.atomNeeds.has, rows: st.atomNeeds.rows.filter(x => x.match).map(x => [x.match, x.needs.join("|"), x.seat]) }; } finally { WB = keep; } });
  assert.deepStrictEqual(r, { has: true, rows: [["NVG-*", "Night Curr|Night Capt", "Any"], ["TRG", "SIM", "Captain"]] });
});
test("needs_matching", async ({ page }) => {
  await opsMode(page);
  const r = await page.evaluate(() => { atomNeedsSet(0, "NVG-*", ["Night Curr"], "Any"); atomNeedsSet(1, "TRG", ["SIM"], "Any"); atomNeedsSet(2, "FLT-*", ["Day Capt"], "Captain"); atomNeedsSet(3, "NVG-2.0", ["Night Capt"], "Captain");
    return [atomNeedsFor("NVG-2.0", "", "Any"), atomNeedsFor("NVG-2.0", "", "Captain"), atomNeedsFor("PLT-TRG", "TRG", "Any"), atomNeedsFor("FLT-1.5", "GEN", "Any"), atomNeedsFor("FLT-1.5", "GEN", "Captain"), atomNeedsFor("EIS", "", "Any")]; });
  assert.deepStrictEqual(r, [["Night Curr"], ["Night Curr", "Night Capt"], ["SIM"], [], ["Day Capt"], []]);
});
test("needs_empty_means_no_needs", async ({ page }) => {
  assert.deepStrictEqual(await page.evaluate(() => atomNeedsFor("NVG-2.0", "NIGHT", "Captain")), []);
});
test("needs_delete_blanks_the_row", async ({ page }) => {
  await opsMode(page);
  const r = await page.evaluate(() => { atomNeedsSet(0, "NVG-*", ["Night Curr"], "Any"); atomNeedsDel(0); return [atomNeedsFor("NVG-2.0", "", "Any"), atomNeedsRows().length]; });
  assert.deepStrictEqual(r, [[], 0]);
});
test("needs_disabled_without_ops_mode", async ({ page }) => {
  await page.evaluate(() => { OPS = false; document.querySelector("nav.tabs button[data-v='cur']").click(); renderAtom(); });
  const t = await page.innerText("#atomBox");
  assert.ok(/Open the Ops Room file to save these rules/.test(t), t.slice(-300));
  assert.ok(await page.evaluate(() => !document.querySelector("#atomNeeds input:not([disabled])")));
});

// ---- Task 9: Planner warnings
// V TAN (SUP 2, roster person 0): Night Curr ends 27 Oct, MAS ended 16 Oct. Rule: NVG-* needs Night Curr (and MAS in the second rule).
const rule = (page, rows) => page.evaluate(rows => { OPS = true; rows.forEach((r, n) => atomNeedsSet(n, r[0], r[1], r[2] || "Any")); }, rows);
const plan = async (page, ix, shift, day, code) => page.evaluate(([ix, shift, day, code]) => { useBook(0); cur.m = 9; S.m[9].grid[ix * 3 + shift][day - 1] = code; renderAll(); document.querySelector("nav.tabs button[data-v='plan']").click(); }, [ix, shift, day, code]);
const cellOf = (page, ix, shift, day) => page.evaluate(([ix, shift, day]) => { const td = document.querySelector("#plan td[data-k='g:" + (ix * 3 + shift) + ":" + (day - 1) + "']"); return td ? { cls: td.className, title: td.title, txt: td.innerText } : null; }, [ix, shift, day]);
test("warn_when_expired_by_flight_day", async ({ page }) => {
  const [bi, ix] = await setIni(page, "SUP 2", 0, "V TAN"); await rule(page, [["NVG-*", ["Night Curr"]]]);
  const r = await page.evaluate(([bi, ix]) => [atomWarn(bi, ix, "NVG-2.0", "NIGHT", "2026-10-28"), atomWarn(bi, ix, "NVG-2.0", "NIGHT", "2026-10-25"), atomWarn(bi, ix, "NVG-2.0", "NIGHT", "2026-10-27")], [bi, ix]);
  assert.deepStrictEqual(r, [{ lines: ["Night Curr ended 27 Oct"] }, null, null]);
});
test("warn_lists_every_missing_currency", async ({ page }) => {
  const [bi, ix] = await setIni(page, "SUP 2", 0, "V TAN"); await rule(page, [["NVG-*", ["Night Curr"]], ["NVG-2.0", ["MAS", "SIM"]]]);
  const r = await page.evaluate(([bi, ix]) => atomWarn(bi, ix, "NVG-2.0", "NIGHT", "2026-10-28").lines, [bi, ix]);
  assert.deepStrictEqual(r, ["Night Curr ended 27 Oct", "MAS ended 16 Oct"]);
});
test("warn_none_when_unmatched_or_no_needs", async ({ page }) => {
  const [bi, ix] = await setIni(page, "SUP 2", 0, "V TAN");
  assert.strictEqual(await page.evaluate(([bi, ix]) => atomWarn(bi, ix, "NVG-2.0", "NIGHT", "2026-10-28"), [bi, ix]), null);   // no rules yet
  await rule(page, [["NVG-*", ["Night Curr"]]]);
  const [b2, i2] = await setIni(page, "SUP 2", 1, "NOBODY");
  assert.strictEqual(await page.evaluate(([b, i]) => atomWarn(b, i, "NVG-2.0", "NIGHT", "2026-10-28"), [b2, i2]), null);
});
test("corner_and_tooltip_render", async ({ page }) => {
  const [bi, ix] = await setIni(page, "SUP 2", 0, "V TAN"); await rule(page, [["NVG-*", ["Night Curr"]]]);
  await plan(page, ix, 2, 28, "NVG-2.0");
  const c = await cellOf(page, ix, 2, 28);
  assert.ok(/atomw/.test(c.cls) && /Night Curr ended 27 Oct/.test(c.title) && /From ATOM, data as of 2026-10-25/.test(c.title) && /NOT CURRENT/.test(c.txt), JSON.stringify(c));
});
test("warn_only_for_flights", async ({ page }) => {
  const [bi, ix] = await setIni(page, "SUP 2", 0, "V TAN"); await rule(page, [["NVG-*", ["Night Curr"]], ["LV", ["Night Curr"]]]);
  await plan(page, ix, 0, 28, "LV");
  const c = await cellOf(page, ix, 0, 28);
  assert.ok(!/atomw/.test(c.cls), JSON.stringify(c));
});
test("name_badge_counts_warned_flights", async ({ page }) => {
  const [bi, ix] = await setIni(page, "SUP 2", 0, "V TAN"); await rule(page, [["NVG-*", ["Night Curr"]]]);
  await plan(page, ix, 2, 28, "NVG-2.0"); await plan(page, ix, 2, 29, "NVG-2.0"); await plan(page, ix, 2, 25, "NVG-2.0");
  const t = await page.evaluate(() => [...document.querySelectorAll("#plan i.curb.atomw")].map(x => x.textContent));
  assert.deepStrictEqual(t, ["▲ 2"]);
});

// ---- Task 10: Ops Room seat mark (2026-10-26 FLT-2.0: captain ADDER, pilot SIDEWINDER, loadmaster TITAN)
const opsMarks = page => page.evaluate(() => { cur.opsDay = "2026-10-26"; document.querySelector("nav.tabs button[data-v='ops']").click(); renderOps();
  return [...document.querySelectorAll("#v-ops td.oc")].filter(td => td.querySelector("i.opsb.atomx")).map(td => [td.querySelector("b").textContent.trim(), td.querySelector("i.opsb.atomx").title]); });
const idOf = (page, dept, id) => page.evaluate(([dept, id]) => { const b = books.find(b => !b.S.kind && b.S.dept === dept); return b.S.roster.findIndex(p => p.id === id); }, [dept, id]);
const iniOf = async (page, dept, id, ini) => { await page.evaluate(([dept, id, ini]) => { const b = books.find(b => !b.S.kind && b.S.dept === dept); b.S.roster.find(p => p.id === id).ini = ini; }, [dept, id, ini]); };
test("seat_mark_for_captain_currency", async ({ page }) => {
  await iniOf(page, "Pilot", "ADDER", "A NGO"); await iniOf(page, "Pilot", "SIDEWINDER", "S LIM JH");
  await rule(page, [["FLT-*", ["Day Capt"], "Captain"], ["FLT-*", ["Night Curr"], "Any"]]);
  const m = await opsMarks(page);
  assert.strictEqual(m.length, 2, JSON.stringify(m));
  const cap = m.find(x => /Day Capt ended 16 Oct/.test(x[1])), pil = m.find(x => /Night Curr ended 25 Oct/.test(x[1]));
  assert.ok(cap && pil && !/Day Capt/.test(pil[1]), JSON.stringify(m));
});
test("seat_mark_for_any_currency_only", async ({ page }) => {
  await iniOf(page, "Pilot", "SIDEWINDER", "S LIM JH"); await rule(page, [["FLT-*", ["Night Curr"], "Any"]]);
  const m = await opsMarks(page);
  assert.strictEqual(m.length, 1, JSON.stringify(m));
});
test("no_mark_when_current_or_unmatched", async ({ page }) => {
  await iniOf(page, "Pilot", "ADDER", "HO KM"); await rule(page, [["FLT-*", ["Day Capt"], "Captain"]]);
  assert.deepStrictEqual(await opsMarks(page), []);
});
test("ops_room_still_renders_without_atom", async ({ page, errs }) => {
  await page.evaluate(() => { ATOMS = []; }); assert.deepStrictEqual(await opsMarks(page), []);
  assert.deepStrictEqual(errs.filter(e => /PAGEERROR/.test(e)), []);
});

// ---- Task 11: help and version
test("help_mentions_atom", async ({ page }) => {
  await page.evaluate(() => { document.querySelector("nav.tabs button[data-v='cur']").click(); document.getElementById("helpBtn").click(); });
  const t = await page.innerText("#helpBody");
  for (const w of ["ATOM", "Initials", "Names to fix", "What each flight needs"]) assert.ok(t.includes(w), w);
});
test("version_is_z93", async ({ page }) => {
  const r = await page.evaluate(() => { spDiag("x"); return document.getElementById("wDiag").textContent; });
  assert.ok(/ z93 /.test(r + " "), r);
  assert.ok((await page.evaluate(() => document.documentElement.outerHTML)).includes("Dashboard version 2026-10-26 z93 "));
});

// ---- Final review fixes
test("closing_a_tab_keeps_matches_and_does_not_crash", async ({ page, errs }) => {
  await setIni(page, "Pilot", 0, "A NGO");
  const r = await page.evaluate(() => { const find = () => atomGridRows("Pilot", false, "2026-10-26").map(x => x.row.name);
    const before = find(); const di = books.findIndex(b => b.S.kind === "roster"); books.splice(di, 1);   // a tab before Pilot is closed: Pilot moves one place
    let after, err = ""; try { after = find(); renderAll(); } catch (e) { err = e.message; } return { before, after, err }; });
  assert.deepStrictEqual(r, { before: ["A NGO"], after: ["A NGO"], err: "" });
  assert.deepStrictEqual(errs, []);
});
test("needs_sheet_is_added_at_save_time_after_a_merge", async ({ page }) => {
  await opsMode(page);
  const r = await page.evaluate(() => { const bi = books.findIndex(b => b.S.kind === "ops"), b = books[bi], pristine = Object.assign({}, b.WB.files);
    atomNeedsSet(0, "NVG-*", ["Night Curr"], "Any");
    b.WB.files = pristine; b.WB.paths = sheetPaths(pristine);   // another user saved the file in between: our copy is replaced by theirs
    const out = withBook(bi, () => buildXlsx()), files = fflate.unzipSync(out.bytes), keep = WB;
    WB = { files, paths: sheetPaths(files), sst: parseSST(files), name: "copy.xlsx" };
    try { const st = readOps("copy.xlsx"); return { stray: Object.keys(files).filter(k => /undefined/.test(k)), rows: st.atomNeeds.rows.filter(x => x.match).map(x => [x.match, x.needs.join("|")]) }; } finally { WB = keep; } });
  assert.deepStrictEqual(r, { stray: [], rows: [["NVG-*", "Night Curr"]] });
});
test("atom_file_picked_first_with_ops_room_still_opens_the_app", async ({ page }) => {
  const f = atomFixture();
  await page.setInputFiles("#fileInputOps", [f, path.join(ROOT, "Flight_Ops_Planner_SUP2.xlsx"), path.join(ROOT, "Ops_Room.xlsx")]);
  await page.waitForFunction(() => books.length >= 2, null, { timeout: 30000 });
  const r = await page.evaluate(() => ({ welcome: getComputedStyle(document.getElementById("welcome")).display, n: books.length, atoms: ATOMS.length, first: books[0].S.dept, ops: OPS }));
  assert.deepStrictEqual(r, { welcome: "none", n: 2, atoms: 1, first: "SUP 2", ops: true });
}, { blank: true, fresh: true });

// A shared session is reused between tests; snapshot once, restore before each following test
const snap = () => { window.__bk = books.slice(); window.__ros = books.map(b => b.S.kind ? null : b.S.roster.map(p => [p.ini, p.cat, p.id, p.name])); window.__at = ATOMS.slice(); window.__an = books.map(b => b.S.atomNeeds ? JSON.stringify(b.S.atomNeeds) : null); };
const restore = () => { books = window.__bk.slice(); books.forEach((b, i) => { if (window.__ros[i]) b.S.roster.forEach((p, j) => { [p.ini, p.cat, p.id, p.name] = window.__ros[i][j]; }); }); ATOMS = window.__at.slice(); books.forEach((b, i) => { b.dirty.clear(); if (window.__an[i]) b.S.atomNeeds = JSON.parse(window.__an[i]); }); cur.atom = 0; OPS = false; useBook(0); Object.keys(localStorage).filter(k => k.startsWith("fop_sp_atom")).forEach(k => localStorage.removeItem(k)); };
// setIni("SUP 2", n, "V TAN") sets the Initials of the nth person on that roster (empty slots skipped); returns [bookIndex, rosterIndex]
const setIni = (page, dept, n, ini, cat) => page.evaluate(([dept, n, ini, cat]) => { const bi = books.findIndex(b => !b.S.kind && b.S.dept === dept); const ix = books[bi].S.roster.map((p, i) => (p.name || p.id) ? i : -1).filter(i => i >= 0)[n]; books[bi].S.roster[ix].ini = ini; if (cat) books[bi].S.roster[ix].cat = cat; return [bi, ix]; }, [dept, n, ini, cat]);
const ID = (page, dept, n) => page.evaluate(([dept, n]) => { const b = books.find(b => !b.S.kind && b.S.dept === dept); return b.S.roster.filter(p => p.name || p.id)[n].id; }, [dept, n]);

// ---- runner
(async () => {
  const only = process.argv[2];
  let pass = 0, ran = 0, S = null;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue;
    ran++;
    try {
      if (!S || (t.opts && t.opts.fresh)) { if (S) await S.close(); S = await boot(Object.assign({ atom: [FULL()] }, t.opts)); await S.page.evaluate(snap); }
      else await S.page.evaluate(restore);
      await t.fn(S); pass++; console.log("ok   " + t.name);
    } catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 300)); if (S) { await S.close(); S = null; } }
  }
  if (S) await S.close();
  console.log(pass + "/" + ran + " pass");
  process.exit(pass === ran ? 0 : 1);
})();
