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
  const r = await page.evaluate(() => { const row = ATOMS[0].sheets.Pilot[0]; return atomCells(row, "2026-10-26").map(c => [c.col, c.group, c.state, c.days]); });
  assert.deepStrictEqual(r, [["Day Capt", "Flight Currencies", "lap", -10], ["Day Curr", "Flight Currencies", "ok", 21], ["Night Capt", "Flight Currencies", "lap", -10], ["Night Curr", "Flight Currencies", "due", 1]]);   // IRT is '-' (not held): hidden
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
test("grid_has_five_columns_and_hours", async ({ page }) => {
  await setIni(page, "Pilot", 0, "A NGO"); await setIni(page, "SUP 2", 0, "V TAN"); await openCur(page);
  const heads = dept => page.evaluate(d => { spRemember("atom_dept", d); renderAtom(); return [...document.querySelectorAll("#atomGrid thead tr:last-child th")].map(x => x.textContent.replace(/\s+/g, " ").trim()); }, dept);
  assert.deepStrictEqual(await heads("Pilot"), ["Day Capt", "Day Curr", "IRT", "Night Capt", "Night Curr", "Hours (month)"]);
  assert.deepStrictEqual(await heads("SUP 2"), ["Day Curr", "Night Curr", "Hours (month)"]);
});
test("grid_columns_follow_file", async ({ page }) => {
  await setIni(page, "Pilot", 0, "A NGO"); await openCur(page);
  const t = await page.evaluate(() => { spRemember("atom_dept", "Pilot"); renderAtom(); return [...document.querySelectorAll("#atomGrid thead tr:last-child th")].map(x => x.textContent.replace(/\s+/g, " ").trim()); });
  assert.deepStrictEqual(t, ["Day Capt", "Day Curr", "IRT", "Night Capt", "Night Curr", "Hours (month)"]);   // reordered columns and the extra NVG Curr in the file change nothing
}, { atom: [atomFixture({ variant: "moved" })], others: true, fresh: true });
test("grid_hides_not_held_and_formats_dates", async ({ page }) => {
  await setIni(page, "Pilot", 0, "A NGO"); await openCur(page);
  const r = await page.evaluate(() => { spRemember("atom_dept", "Pilot"); renderAtom(); const th = [...document.querySelectorAll("#atomGrid thead tr:last-child th")].map(x => x.textContent.replace(/\s+/g, " ").trim()), tds = [...document.querySelectorAll("#atomGrid tbody tr:first-child td")];
    const at = n => tds[th.indexOf(n) + 1]; return { irt: [at("IRT").className, at("IRT").textContent], dc: at("Day Curr").textContent, lap: at("Day Capt").className.includes("lap"), hrs: at("Hours (month)").textContent }; });
  assert.deepStrictEqual(r, { irt: ["nh", "–"], dc: "16 Nov", lap: true, hrs: "3.9" });
});
test("grid_no_hours_shows_dash", async ({ page }) => {
  await setIni(page, "Pilot", 2, "S LIM JH"); await openCur(page);   // S LIM JH has no hours in ATOM ('-')
  const t = await page.evaluate(() => { spRemember("atom_dept", "Pilot"); renderAtom(); return [...document.querySelectorAll("#atomGrid tbody tr")].map(tr => [...tr.querySelectorAll("td")].pop().textContent); });
  assert.deepStrictEqual(t, ["–"]);
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
  assert.ok(/has not shared ATOM data/.test(await page.innerText("#atomBox")));
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
test("my_lodestar_uses_atom_when_matched", async ({ page }) => {
  const id = await ID(page, "SUP 2", 0); await setIni(page, "SUP 2", 0, "V TAN");   // V TAN: Night Curr expires 27 Oct (due)
  const card = (dept, id) => page.evaluate(([dept, id, iso]) => lodeCards(mePeople().find(z => z.p.id === id && z.dept === dept), iso).cur, [dept, id, "2026-10-26"]);
  const c = await card("SUP 2", id);
  assert.deepStrictEqual([c.level, c.text], ["due", "Night Curr expires 27 Oct"]); assert.ok(/from ATOM, data as of 2026-10-25/.test(c.sub), c.sub);
  const ok = await ID(page, "SUP 2", 1); await setIni(page, "SUP 2", 1, "HO KM-NOT-HERE");   // unmatched: falls back, not ATOM
  const pid = await ID(page, "Pilot", 0); await setIni(page, "Pilot", 0, "A NGO");
  const d = await card("Pilot", pid);
  assert.deepStrictEqual([d.level, d.text], ["bad", "Day Capt expired 16 Oct"]);
  const hid = await ID(page, "SUP 2", 2); await setIni(page, "SUP 2", 2, "H LIM");
  const e = await card("SUP 2", hid); assert.deepStrictEqual([e.level, e.text], ["ok", "All current"]);
});
test("my_lodestar_falls_back_without_atom", async ({ page }) => {
  const c = await page.evaluate(() => { ATOMS = []; return lodeCards(mePeople().find(z => z.dept === "SUP 2"), "2026-10-26").cur; });
  assert.ok(!/ATOM/.test(c.sub), c.sub);
});

// ---- Task 8: the flight-needs table (ATOM Needs sheet in Ops_Room.xlsx)
const opsBi = page => page.evaluate(() => books.findIndex(b => b.S.kind === "ops"));
const opsMode = page => page.evaluate(() => { OPS = true; });
// ---- Task 9: Planner warnings
// V TAN (SUP 2, roster person 0): Night Curr ends 27 Oct, MAS ended 16 Oct. Rule: NVG-* needs Night Curr (and MAS in the second rule).
const rule = (page, rows) => page.evaluate(rows => { OPS = true; rows.forEach((r, n) => atomNeedsSet(n, r[0], r[1], r[2] || "Any")); }, rows);
const plan = async (page, ix, shift, day, code) => page.evaluate(([ix, shift, day, code]) => { useBook(0); cur.m = 9; S.m[9].grid[gridRow(ix, shift)][day - 1] = code; renderAll(); document.querySelector("nav.tabs button[data-v='plan']").click(); }, [ix, shift, day, code]);
const cellOf = (page, ix, shift, day) => page.evaluate(([ix, shift, day]) => { const td = document.querySelector("#plan td[data-k='g:" + (gridRow(ix, shift)) + ":" + (day - 1) + "']"); return td ? { cls: td.className, title: td.title, txt: td.innerText } : null; }, [ix, shift, day]);
// ---- Task 10: Ops Room seat mark (2026-10-26 FLT-2.0: captain ADDER, pilot SIDEWINDER, loadmaster TITAN)
const opsMarks = (page, day) => page.evaluate(day => { cur.opsDay = day || "2026-10-26"; document.querySelector("nav.tabs button[data-v='ops']").click(); renderOps();
  return [...document.querySelectorAll("#v-ops td.oc")].filter(td => td.querySelector("i.opsb.atomx")).map(td => [td.querySelector("b").textContent.trim(), td.querySelector("i.opsb.atomx").title]); }, day);
const idOf = (page, dept, id) => page.evaluate(([dept, id]) => { const b = books.find(b => !b.S.kind && b.S.dept === dept); return b.S.roster.findIndex(p => p.id === id); }, [dept, id]);
const iniOf = async (page, dept, id, ini) => { await page.evaluate(([dept, id, ini]) => { const b = books.find(b => !b.S.kind && b.S.dept === dept); b.S.roster.find(p => p.id === id).ini = ini; }, [dept, id, ini]); };
test("ops_room_still_renders_without_atom", async ({ page, errs }) => {
  await page.evaluate(() => { ATOMS = []; }); assert.deepStrictEqual(await opsMarks(page), []);
  assert.deepStrictEqual(errs.filter(e => /PAGEERROR/.test(e)), []);
});

// ---- Task 11: help and version
test("help_mentions_atom", async ({ page }) => {
  await page.evaluate(() => { document.querySelector("nav.tabs button[data-v='cur']").click(); document.getElementById("helpBtn").click(); });
  const t = await page.innerText("#helpBody");
  for (const w of ["ATOM", "Initials", "Names to fix", "Publish to everyone", "expires", "clocked hours"]) assert.ok(t.includes(w), w);
  assert.ok(!t.includes("What each flight needs"));
});
test("version_is_z103", async ({ page }) => {
  const r = await page.evaluate(() => { spDiag("x"); return document.getElementById("wDiag").textContent; });
  assert.ok(/ z103 /.test(r + " "), r);
  assert.ok((await page.evaluate(() => document.documentElement.outerHTML)).includes("Dashboard version 2026-10-31 z103 "));
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
test("atom_file_picked_first_with_ops_room_still_opens_the_app", async ({ page }) => {
  const f = atomFixture();
  await page.setInputFiles("#fileInputOps", [f, path.join(ROOT, "Flight_Ops_Planner_SUP2.xlsx"), path.join(ROOT, "Ops_Room.xlsx")]);
  await page.waitForFunction(() => books.length >= 2, null, { timeout: 30000 });
  const r = await page.evaluate(() => ({ welcome: getComputedStyle(document.getElementById("welcome")).display, n: books.length, atoms: ATOMS.length, first: books[0].S.dept, ops: OPS }));
  assert.deepStrictEqual(r, { welcome: "none", n: 2, atoms: 1, first: "SUP 2", ops: true });
}, { blank: true, fresh: true });

// ---- v2 Task 2: the v1 needs table and name badges are gone
test("needs_table_is_gone", async ({ page }) => {
  assert.ok(await page.evaluate(() => typeof atomNeedsFor === "undefined" && typeof atomNeedsSet === "undefined"));
  await page.evaluate(() => { document.querySelector("nav.tabs button[data-v='cur']").click(); renderAtom(); });
  assert.ok(await page.evaluate(() => !document.getElementById("atomNeeds")));
}, { atom: [FULL()], fresh: true });
test("no_atom_name_badge", async ({ page }) => {
  await setIni(page, "Pilot", 0, "A NGO");
  const n = await page.evaluate(() => { useBook(books.findIndex(b => !b.S.kind && b.S.dept === "Pilot")); cur.sel = null; renderAll(); document.querySelector("nav.tabs button[data-v='plan']").click(); return document.querySelectorAll("#plan i.curb[data-atom], #plan i.atomw").length; });
  assert.strictEqual(n, 0);
}, { atom: [FULL()], fresh: true });

// ---- v2 Task 4: publish into the ATOM Currency sheet
const PUB2 = { atom: [FULL(), atomFixture({ variant: "partial", name: "ATOM_partial" })], fresh: true };
const sheetCells = page => page.evaluate(() => { const bi = books.findIndex(b => b.S.kind === "ops"), out = withBook(bi, () => buildXlsx()), files = fflate.unzipSync(out.bytes), paths = sheetPaths(files);
  return paths["ATOM Currency"] ? readCellsOf(files, paths["ATOM Currency"], parseSST(files)) : null; });
test("publish_writes_sheet_and_reads_back", async ({ page }) => {
  await opsMode(page);
  assert.ok(await page.evaluate(() => atomPublish(ATOMS[0])));
  const c = await sheetCells(page), f = await page.evaluate(() => ({ asOf: atomAsOf(ATOMS[0]), month: ATOMS[0].hoursMonth }));
  assert.deepStrictEqual([c.A8, c.B8, c.D8, c.E8, c.F8, c.I8], ["A NGO", "Pilot", c.D8, "2026-11-16", "-", 3.9]);
  assert.strictEqual(c.B2, f.asOf); assert.strictEqual(c.B3, "ATOM_Export_full_default.xlsx"); assert.strictEqual(c.B4, f.month);
  assert.ok(Object.keys(c).every(r => /^[A-I]\d+$/.test(r)), "a column beyond I");
  assert.ok(!JSON.stringify(c).includes("FAKE personal remark"));
}, PUB2);
test("publish_replaces_and_leaves_no_stale_rows", async ({ page }) => {
  await opsMode(page);
  const r = await page.evaluate(() => { atomPublish(ATOMS[0]); const full = Object.keys(books.find(b => b.S.kind === "ops").dirty).length; atomPublish(ATOMS[1]); return null; });
  const c = await sheetCells(page), names = Object.keys(c).filter(k => /^A\d+$/.test(k) && +k.slice(1) >= 8).map(k => c[k]);
  assert.deepStrictEqual(names, ["A NGO", "HO KM", "S LIM JH", "SAMY", "TEO WK", "V TAN", "H LIM", "O NG"]);   // the partial export: Pilot and SUP 2 only
  assert.strictEqual(c.B3, "ATOM_partial.xlsx");
}, PUB2);
test("publish_only_in_ops_room_view", async ({ page }) => {
  const r = await page.evaluate(() => { OPS = false; const ob = books.find(b => b.S.kind === "ops"), n = ob.dirty.size, ok = atomPublish(ATOMS[0]); return [ok, ob.dirty.size - n]; });
  assert.deepStrictEqual(r, [false, 0]);
}, PUB2);
test("publish_sheet_created_after_a_merge", async ({ page }) => {
  await opsMode(page);
  const r = await page.evaluate(() => { const bi = books.findIndex(b => b.S.kind === "ops"), b = books[bi], pristine = Object.assign({}, b.WB.files);
    atomPublish(ATOMS[0]); b.WB.files = pristine; b.WB.paths = sheetPaths(pristine);   // another user saved first: our copy was replaced
    const out = withBook(bi, () => buildXlsx()), files = fflate.unzipSync(out.bytes), paths = sheetPaths(files);
    return { stray: Object.keys(files).filter(k => /undefined/.test(k)), a8: paths["ATOM Currency"] ? readCellsOf(files, paths["ATOM Currency"], parseSST(files)).A8 : null }; });
  assert.deepStrictEqual(r, { stray: [], a8: "A NGO" });
}, PUB2);
test("publish_logs_one_line", async ({ page }) => {
  await opsMode(page);
  const r = await page.evaluate(() => { atomPublish(ATOMS[0]); const b = books.find(b => b.S.kind === "ops"); return logLines(b, b.dirty).map(l => [l[4], l[7]]); });
  assert.strictEqual(r.length, 1); assert.ok(/^ATOM published: ATOM_Export_full_default\.xlsx, as of /.test(r[0][0]), r[0][0]);
}, PUB2);
test("publish_stores_only_allowed_fields", async ({ page }) => {
  await opsMode(page);
  await page.evaluate(() => atomPublish(ATOMS[0]));
  const c = await sheetCells(page), heads = "ABCDEFGHI".split("").map(L => c[L + "7"]);
  assert.deepStrictEqual(heads, ["Initials", "Department", "CAT", "Day Capt", "Day Curr", "IRT", "Night Capt", "Night Curr", "Clocked hours (month)"]);
  const names = await page.evaluate(() => books.filter(b => !b.S.kind).flatMap(b => b.S.roster.map(p => p.name)).filter(n => n && n.length > 4));
  const text = JSON.stringify(c); for (const n of names) assert.ok(!text.includes(n), n);
}, PUB2);

// ---- v2 Task 5: read the shared sheet
const SH = { atom: [FULL(), atomFixture({ variant: "partial", name: "ATOM_partial" })], fresh: true };
const cardText = page => page.evaluate(() => { document.querySelector("nav.tabs button[data-v='cur']").click(); renderAtom(); return document.getElementById("atomBox").innerText; });
test("shared_sheet_read_into_same_shape", async ({ page }) => {
  await opsMode(page);
  const r = await page.evaluate(() => { atomPublish(ATOMS[0]); const bi = books.findIndex(b => b.S.kind === "ops"), out = withBook(bi, () => buildXlsx()), files = fflate.unzipSync(out.bytes), keep = WB;
    WB = { files, paths: sheetPaths(files), sst: parseSST(files), name: "copy.xlsx" };
    try { const sh = readOps("copy.xlsx").atomShared, shape = f => ATOM_DEPT_ORDER.map(d => (f.sheets[d] || []).map(r => [r.name, r.cat, r.hours, ATOM_CUR.map(c => r.cells[c] ? [r.cells[c].k, r.cells[c].iso] : null)]));
      return { same: JSON.stringify(shape(sh)) === JSON.stringify(shape(ATOMS[0])), src: sh.source, month: sh.hoursMonth, created: sh.created === atomAsOf(ATOMS[0]) }; } finally { WB = keep; } });
  assert.deepStrictEqual(r, { same: true, src: "shared", month: "2026-10", created: true });
}, SH);
test("shared_used_when_nothing_added", async ({ page }) => {
  await opsMode(page); await setIni(page, "Pilot", 0, "A NGO");
  await page.evaluate(() => { atomPublish(ATOMS[0]); ATOMS = []; cur.atom = 0; });
  const t = await cardText(page), n = await page.evaluate(() => atomGridRows("Pilot", false, "2026-10-26").map(x => x.row.name));
  assert.ok(/Shared from the Ops Room/.test(t), t.slice(0, 200)); assert.deepStrictEqual(n, ["A NGO"]);
}, SH);
test("hand_added_wins_and_is_labelled", async ({ page }) => {
  await opsMode(page);
  await page.evaluate(() => { atomPublish(ATOMS[0]); cur.atom = 1; });   // the partial file, added by hand
  assert.ok(/File added by you/.test(await cardText(page)));
  await page.evaluate(() => { cur.atom = -1; });
  assert.ok(/Shared from the Ops Room/.test(await cardText(page)));
}, SH);
test("shared_missing_message", async ({ page }) => {
  await page.evaluate(() => { ATOMS = []; cur.atom = 0; });
  const t = await cardText(page); assert.ok(/has not shared ATOM data/.test(t), t.slice(0, 200));
  assert.deepStrictEqual(await page.evaluate(() => [atomCurrent(), atomMatch.length >= 0]), [null, true]);
}, SH);
test("shared_without_ops_room_book", async ({ page, errs }) => {
  await page.evaluate(() => { ATOMS = []; cur.atom = 0; books = books.filter(b => b.S.kind !== "ops"); renderAll(); });
  assert.ok(/has not shared ATOM data/.test(await cardText(page))); assert.deepStrictEqual(errs.filter(e => /PAGEERROR/.test(e)), []);
}, SH);
test("shared_refresh_follows_the_latest_publish", async ({ page }) => {
  await opsMode(page);
  const r = await page.evaluate(() => { atomPublish(ATOMS[0]); cur.atom = -1; const first = Object.keys(atomCurrent().sheets); atomPublish(ATOMS[1]); return [first, Object.keys(atomCurrent().sheets)]; });
  assert.deepStrictEqual(r, [["Pilot", "Loadmaster", "TACCO", "SUP 1", "SUP 2"], ["Pilot", "SUP 2"]]);
}, SH);

// ---- v2 Task 6: department dashboards open the Ops Room file read-only
test("dept_open_includes_ops_room", async ({ page }) => {
  const r = await page.evaluate(() => { const keep = window.spFileFor; window.spFileFor = k => ({ Name: k + ".xlsx" }); try { return [spDeptExtras("pilot").map(f => f && f.Name), spDeptExtras("dutyroster").map(f => f && f.Name)]; } finally { window.spFileFor = keep; } });
  assert.ok(r[0].includes("opsroom.xlsx") && r[0].includes("masterplanner.xlsx") && r[0].includes("dutyroster.xlsx"), JSON.stringify(r));
  assert.ok(r[1].includes("opsroom.xlsx"), JSON.stringify(r));
});
test("dept_without_ops_room_still_works", async ({ page }) => {
  const r = await page.evaluate(() => { const keep = window.spFileFor; window.spFileFor = k => k === "opsroom" ? undefined : { Name: k + ".xlsx" }; try { return spDeptExtras("pilot").filter(Boolean).map(f => f.Name); } finally { window.spFileFor = keep; } });
  assert.ok(!r.includes("opsroom.xlsx") && r.length >= 2, JSON.stringify(r));
});
test("dept_cannot_write_the_ops_room_file", async ({ page }) => {
  const r = await page.evaluate(() => { OPS = false; const bi = books.findIndex(b => b.S.kind === "ops"), ob = books[bi], n = ob.dirty.size; useBook(0); withBook(bi, () => put("ATOM Currency", "A1", "x")); const ok = atomPublish(ATOMS[0]); return [ob.dirty.size - n, ok]; });
  assert.deepStrictEqual(r, [0, false]);
});

// ---- v2 Task 7: Planner layer 1 (expiry-day marker) and layer 2 (alert)
const planMonth = (page, mi, edits, dept) => page.evaluate(([mi, edits, dept]) => { useBook(dept ? books.findIndex(b => !b.S.kind && b.S.dept === dept) : 0); cur.sel = null; cur.m = mi; edits.forEach(([ix, shift, day, code]) => { S.m[mi].grid[gridRow(ix, shift)][day - 1] = code; }); renderAll(); document.querySelector("nav.tabs button[data-v='plan']").click(); }, [mi, edits, dept || null]);
const cellAt = (page, ix, shift, day) => page.evaluate(([ix, shift, day]) => { const td = document.querySelector("#plan td[data-k='g:" + (gridRow(ix, shift)) + ":" + (day - 1) + "']"); return td ? { cls: td.className, title: td.title, txt: td.innerText } : null; }, [ix, shift, day]);
const L7 = { atom: [FULL()], fresh: true };
test("marker_on_expiry_day_only", async ({ page }) => {   // V TAN (SUP 2, 0): Night Curr expires 27 Oct
  const [bi, ix] = await setIni(page, "SUP 2", 0, "V TAN"); await planMonth(page, 9, []);
  const n = await cellAt(page, ix, 2, 27), before = await cellAt(page, ix, 2, 26), after = await cellAt(page, ix, 2, 28), am = await cellAt(page, ix, 0, 27), pm = await cellAt(page, ix, 1, 27);
  assert.ok(/l1end/.test(n.cls) && /Night Curr expires/.test(n.txt) && /Night Curr expires 27 Oct/.test(n.title), JSON.stringify(n));
  for (const c of [before, after, am, pm]) assert.ok(!/l1end/.test(c.cls), JSON.stringify(c));
}, L7);
test("marker_day_rows", async ({ page }) => {   // O NG (SUP 2, 2): Day Curr expires 5 Nov -> AM and PM
  const [bi, ix] = await setIni(page, "SUP 2", 2, "O NG"); await planMonth(page, 10, []);
  const am = await cellAt(page, ix, 0, 5), pm = await cellAt(page, ix, 1, 5), nt = await cellAt(page, ix, 2, 5);
  assert.ok(/l1end/.test(am.cls) && /l1end/.test(pm.cls) && !/l1end/.test(nt.cls), JSON.stringify([am.cls, pm.cls, nt.cls]));
  assert.ok(/Day Curr expires/.test(am.txt) && !/Day Curr expires/.test(pm.txt), "the label is on the AM row only");
}, L7);
test("capt_marker_is_outline_and_never_alerts", async ({ page }) => {   // A NGO (Pilot, 0): Night Capt expired 16 Oct, Night Curr valid to 27 Oct
  const [bi, ix] = await setIni(page, "Pilot", 0, "A NGO");
  await planMonth(page, 9, [[ix, 2, 20, "NVG-2.0"]], "Pilot");
  const m = await cellAt(page, ix, 2, 16), f = await cellAt(page, ix, 2, 20);
  assert.ok(/l1end/.test(m.cls) && /capt/.test(m.cls) && /Night Capt expires/.test(m.txt), JSON.stringify(m));
  assert.ok(!/atomw/.test(f.cls), JSON.stringify(f));
}, L7);
test("alert_on_and_after_expiry", async ({ page }) => {
  const [bi, ix] = await setIni(page, "SUP 2", 0, "V TAN"); await planMonth(page, 9, [[ix, 2, 27, "NVG-2.0"], [ix, 2, 28, "NVG-2.0"]]);
  const on = await cellAt(page, ix, 2, 27), next = await cellAt(page, ix, 2, 28);
  assert.ok(!/atomw/.test(on.cls) && /l1end/.test(on.cls), JSON.stringify(on));
  assert.ok(/atomw/.test(next.cls) && /NOT CURRENT/.test(next.txt) && /Night Curr expired 27 Oct/.test(next.title) && /From ATOM, data as of 2026-10-25/.test(next.title), JSON.stringify(next));
}, L7);
test("alert_uses_the_shift_row", async ({ page }) => {
  const [bi, ix] = await setIni(page, "SUP 2", 0, "V TAN"); await planMonth(page, 9, [[ix, 0, 29, "FLT-2.0"], [ix, 2, 29, "NVG-2.0"]]);   // Day Curr valid, Night Curr expired 27 Oct
  assert.ok(!/atomw/.test((await cellAt(page, ix, 0, 29)).cls)); assert.ok(/atomw/.test((await cellAt(page, ix, 2, 29)).cls));
}, L7);
test("pure_marks_for_odd_values", async ({ page }) => {
  const r = await page.evaluate(() => { const row = k => ({ cells: { "Day Curr": { k, iso: null, raw: "" }, "Night Curr": { k, iso: null, raw: "" }, IRT: { k: "date", iso: "2026-10-27", raw: "" } } });
    return ["none", "na", "blank", "text"].map(k => atomDayMarks(row(k), "2026-10-28", 0, true)).map(x => [x.marks.length, !!x.alert]); });
  assert.deepStrictEqual(r, [[0, false], [0, false], [0, false], [0, false]]);   // odd values give no mark and no alert; IRT after its day never alerts
}, L7);
test("irt_highlights_the_expiry_day_in_all_rows_and_never_alerts", async ({ page }) => {
  const r = await page.evaluate(() => { const row = { cells: { IRT: { k: "date", iso: "2026-10-27", raw: "" } } };
    return { on: [0, 1, 2].map(s => atomDayMarks(row, "2026-10-27", s, true).marks.map(m => m.label)), after: [0, 1, 2].map(s => { const x = atomDayMarks(row, "2026-10-28", s, true); return [x.marks.length, !!x.alert]; }), before: atomDayMarks(row, "2026-10-26", 0, true).marks.length }; });
  assert.deepStrictEqual(r, { on: [["IRT expires"], ["IRT expires"], ["IRT expires"]], after: [[0, false], [0, false], [0, false]], before: 0 });
}, L7);
test("irt_marker_in_the_planner", async ({ page }) => {
  const [bi, ix] = await setIni(page, "Pilot", 1, "HO KM");
  await page.evaluate(() => { ATOMS[0].sheets.Pilot[1].cells.IRT = { k: "date", iso: "2026-10-20", raw: "20 Oct 26" }; });
  await planMonth(page, 9, [[ix, 0, 22, "FLT-2.0"]], "Pilot");
  const am = await cellAt(page, ix, 0, 20), pm = await cellAt(page, ix, 1, 20), nt = await cellAt(page, ix, 2, 20), after = await cellAt(page, ix, 0, 22);
  assert.ok([am, pm, nt].every(c => /l1end/.test(c.cls) && /IRT expires/.test(c.title)), JSON.stringify([am.cls, pm.cls, nt.cls]));
  assert.ok(/IRT expires/.test(am.txt) && !/IRT expires/.test(pm.txt), "the label is on the AM row only");
  assert.ok(!/atomw/.test(after.cls) && !/l1/.test(after.cls), JSON.stringify(after));   // a flight after the IRT expiry day: no alert, no tint
}, L7);
test("cancelled_or_non_flight_not_alerted", async ({ page }) => {
  const r = await page.evaluate(() => { const row = { cells: { "Night Curr": { k: "date", iso: "2026-10-27", raw: "" } } }; return [!!atomDayMarks(row, "2026-10-28", 2, false).alert, !!atomDayMarks(row, "2026-10-28", 2, true).alert]; });
  assert.deepStrictEqual(r, [false, true]);
}, L7);
test("no_tint_after_expiry", async ({ page }) => {
  const [bi, ix] = await setIni(page, "SUP 2", 0, "V TAN"); await planMonth(page, 9, []);
  for (const d of [28, 29, 30]) assert.ok(!/l1/.test((await cellAt(page, ix, 2, d)).cls), "day " + d);
}, L7);
test("legend_has_new_chips", async ({ page }) => {
  await planMonth(page, 9, []);
  const t = await page.innerText("#legend"); assert.ok(/expires/i.test(t) && /Not current/i.test(t), t);
}, L7);

// ---- v2 Task 8: Ops Room seat check (2026-10-26 FLT-2.0 AM: captain ADDER, pilot SIDEWINDER; 2026-10-27 NVG-2.0: captain ADDER, pilot ASP)
const L8 = { atom: [FULL()], fresh: true };
test("ops_room_shows_no_currency_marks", async ({ page, errs }) => {
  await iniOf(page, "Pilot", "ADDER", "A NGO"); await iniOf(page, "Pilot", "SIDEWINDER", "S LIM JH");   // both have expired currencies on 26 Oct
  assert.deepStrictEqual(await opsMarks(page), []);
  assert.ok(await page.evaluate(() => typeof atomSeatWarn === "undefined"));
  assert.deepStrictEqual(errs.filter(e => /PAGEERROR/.test(e)), []);
}, L8);
// ---- v2 Task 9: clocked hours (ATOM is the truth)
const L9 = { atom: [FULL()], fresh: true };
const flownCell = (page, id) => page.evaluate(id => { const td = [...document.querySelectorAll("#plan td.idc")].find(x => x.textContent.trim() === id); const c = td && td.closest("tr").querySelector("td.flown"); return c ? { txt: c.textContent.trim(), title: c.title } : null; }, id);
test("hours_show_for_the_export_month", async ({ page }) => {   // A NGO: 3.9 h clocked; the export is from October
  const [bi, ix] = await setIni(page, "Pilot", 0, "A NGO"), id = await ID(page, "Pilot", 0);
  await planMonth(page, 9, [], "Pilot");
  const c = await flownCell(page, id); assert.ok(c && c.txt === "3.9" && /from ATOM, as of 2026-10-25/.test(c.title), JSON.stringify(c));
}, L9);
test("hours_not_shown_for_another_month", async ({ page }) => {
  const [bi, ix] = await setIni(page, "Pilot", 0, "A NGO"), id = await ID(page, "Pilot", 0);
  await planMonth(page, 10, [], "Pilot");
  const c = await flownCell(page, id); assert.ok(c && c.txt !== "3.9" && !/ATOM/.test(c.title), JSON.stringify(c));
}, L9);
test("hours_year_boundary", async ({ page }) => {
  const [bi, ix] = await setIni(page, "Pilot", 0, "A NGO");
  const r = await page.evaluate(([bi, ix]) => { atomSetAsOf(ATOMS[0], "2026-12-31 23:00"); return [atomHours(bi, ix, 11) && atomHours(bi, ix, 11).h, atomHours(bi, ix, 0), atomHours(bi, ix, 12), atomHours(bi, ix, 9)]; }, [bi, ix]);
  assert.deepStrictEqual(r, [3.9, null, null, null]);   // Dec of the plan year only; not Jan, not the next Jan, not Oct
}, L9);
test("hours_my_lodestar", async ({ page }) => {
  await setIni(page, "Pilot", 0, "A NGO"); const id = await ID(page, "Pilot", 0);
  const r = await page.evaluate(id => { const who = mePeople().find(z => z.p.id === id && z.dept === "Pilot"); const m = lodeMonth(who, 9); return [m.hrsFlown, m.hrsSrc, /from ATOM, as of 2026-10-25/.test(lodeMonthHtml(who, "2026-10-14"))]; }, id);
  assert.deepStrictEqual(r, [3.9, "ATOM", true]);
}, L9);
test("hours_without_atom_unchanged", async ({ page }) => {
  await setIni(page, "Pilot", 0, "A NGO"); const id = await ID(page, "Pilot", 0);
  const r = await page.evaluate(id => { ATOMS = []; cur.atom = 0; const who = mePeople().find(z => z.p.id === id && z.dept === "Pilot"), m = lodeMonth(who, 9); return [atomHours(books.findIndex(b => !b.S.kind && b.S.dept === "Pilot"), who.i, 9), m.hrsSrc || null, typeof m.hrsFlown]; }, id);
  assert.deepStrictEqual(r, [null, null, "number"]);
}, L9);

// ---- final review fixes (v2)
test("undo_survives_a_read_only_book_reread", async ({ page }) => {
  await page.evaluate(() => { useBook(0); undoReset(); });
  await page.waitForTimeout(100);
  await page.evaluate(() => { put("Jan", "D27", "LL"); });
  await page.waitForTimeout(100);
  const r = await page.evaluate(() => { try { const before = undoSt.length, oi = books.findIndex(b => b.S.kind === "ops"); books[oi].S.atomShared = { marker: 1 };
    liveDone([oi]); const afterRo = undoSt.length; undo(); return [before, afterRo, !!(books[oi].S.atomShared && books[oi].S.atomShared.marker === 1)]; } catch (e) { return String(e.message); } });
  assert.deepStrictEqual(r, [1, 1, true]);   // re-reading the read-only Ops Room keeps the undo step, and undo leaves that book alone
}, { atom: [FULL()], fresh: true });
test("undo_resets_when_an_editable_book_is_reread", async ({ page }) => {
  await page.evaluate(() => { useBook(0); undoReset(); });
  await page.waitForTimeout(100);
  await page.evaluate(() => { put("Jan", "D27", "LL"); });
  await page.waitForTimeout(100);
  const r = await page.evaluate(() => { try { const before = undoSt.length; liveDone([0]); return [before, undoSt.length]; } catch (e) { return String(e.message); } });
  assert.deepStrictEqual(r, [1, 0]);
}, { atom: [FULL()], fresh: true });
test("publish_summary_names_missing_departments", async ({ page }) => {
  const r = await page.evaluate(() => { const s = atomPublishSummary(ATOMS[1]); return [s.count, s.missing, /Loadmaster, TACCO, SUP 1/.test(s.text) && /5 people|8 people/.test(s.text)]; });
  assert.deepStrictEqual(r, [8, ["Loadmaster", "TACCO", "SUP 1"], true]);
}, { atom: [FULL(), atomFixture({ variant: "partial", name: "ATOM_partial" })], fresh: true });
test("publish_refuses_an_empty_export", async ({ page }) => {
  await opsMode(page);
  const r = await page.evaluate(() => { const ob = books.find(b => b.S.kind === "ops"), n = ob.dirty.size; const ok = atomPublish({ name: "empty.xlsx", created: "2026-10-26 08:00", sheets: {}, missing: [], groups: [], hoursMonth: "2026-10", source: "export" }); return [ok, ob.dirty.size - n]; });
  assert.deepStrictEqual(r, [false, 0]);
}, { atom: [FULL()], fresh: true });
test("currency_tab_names_missing_departments", async ({ page }) => {
  await page.evaluate(() => { cur.atom = 1; document.querySelector("nav.tabs button[data-v='cur']").click(); renderAtom(); });
  const t = await page.innerText("#atomBox"); assert.ok(/no data for Loadmaster, TACCO, SUP 1/.test(t), t.slice(0, 300));
}, { atom: [FULL(), atomFixture({ variant: "partial", name: "ATOM_partial" })], fresh: true });
test("wording_after_the_expiry_day", async ({ page }) => {
  await page.evaluate(() => { document.querySelector("nav.tabs button[data-v='cur']").click(); document.getElementById("helpBtn").click(); });
  const t = await page.innerText("#helpBody"); assert.ok(!/on or after/.test(t) && !/lapsed \/ due/.test(t), t.slice(0, 200));
  const chip = await page.evaluate(() => { cur.m = 9; renderAll(); document.querySelector("nav.tabs button[data-v='plan']").click(); return [...document.querySelectorAll("#legend .chip")].map(c => c.title).join("|"); });
  assert.ok(!/on or after/.test(chip), chip);
  await page.evaluate(() => { document.querySelector("nav.tabs button[data-v='plan']").click(); document.getElementById("helpBtn").click(); });
  assert.ok(!/currency lapsed \/ due/.test(await page.innerText("#helpBody")));
}, { atom: [FULL()], fresh: true });

// A shared session is reused between tests; snapshot once, restore before each following test
const snap = () => { window.__bk = books.slice(); window.__ros = books.map(b => b.S.kind ? null : b.S.roster.map(p => [p.ini, p.cat, p.id, p.name])); window.__at = ATOMS.slice(); window.__an = books.map(b => b.S.atomNeeds ? JSON.stringify(b.S.atomNeeds) : null); window.__sh = books.map(b => b.S.atomShared || null); };
const restore = () => { books = window.__bk.slice(); books.forEach((b, i) => { if (window.__ros[i]) b.S.roster.forEach((p, j) => { [p.ini, p.cat, p.id, p.name] = window.__ros[i][j]; }); }); ATOMS = window.__at.slice(); books.forEach((b, i) => { b.S.atomShared = window.__sh[i]; b.S.atomPub = null; b.S.atomPubLast = 0; b.dirty.clear(); if (window.__an[i]) b.S.atomNeeds = JSON.parse(window.__an[i]); }); cur.atom = 0; OPS = false; useBook(0); Object.keys(localStorage).filter(k => k.startsWith("fop_sp_atom")).forEach(k => localStorage.removeItem(k)); };
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
