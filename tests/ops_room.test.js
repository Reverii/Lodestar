// Ops Room redesign tests. Build the dashboard first: python3 .lodestar_build.py dashboard
// Run: node tests/ops_room.test.js [name-filter]
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const RO = { mine: "Flight_Ops_Planner_SUP2" };   // a department view (Ops Room file read-only)
const ED = { mine: "Ops_Room" };                    // the Ops Room view (everything editable)
const DAY = "2026-10-14";                           // a demo day with flights
const goOps = (page, iso) => page.evaluate(iso => { cur.opsDay = iso; document.querySelector("nav.tabs button[data-v='ops']").click(); renderOps(); }, iso);

test("chips_no_seats_or_downchit", async ({ page }) => {
  await goOps(page, DAY);
  const labs = await page.evaluate(() => [...document.querySelectorAll("#opsStats .opsk small")].map(x => x.textContent.trim()));
  for (const l of ["Flights", "Sorties", "Flown", "Cancelled"]) assert.ok(labs.includes(l), l + " missing: " + labs.join());
  assert.ok(!labs.includes("Seats filled") && !labs.includes("Down-chit"), labs.join());
}, ED);
test("no_timeline", async ({ page }) => {
  await goOps(page, DAY);
  assert.strictEqual(await page.evaluate(() => document.getElementById("opsView")), null);
  assert.strictEqual(await page.evaluate(() => typeof opsTimeline), "undefined");
  assert.strictEqual(await page.evaluate(() => document.querySelector("#v-ops button[data-vw]")), null);
}, RO);

// the Day Board cells of an Area line / Codes for the open day: ref and value helpers run in the page
const AREA_SET = (page, vals) => page.evaluate(vals => { const st = books[opsIdx()].S, row = 6 + dayOfYear(...Object.values((({ y, mi, d }) => ({ y, mi, d }))(opsDay(cur.opsDay))));
  OPS_DB_CELLS.filter(c => c.stack >= 0).forEach(c => { st.db[c.col + row] = vals[c.sub] || ""; }); renderOps(); }, vals);

test("side_cards_below_table", async ({ page }) => {
  await goOps(page, DAY);
  const g = await page.evaluate(() => { const s = document.getElementById("opsSide").getBoundingClientRect(), m = document.getElementById("opsMain").getBoundingClientRect(), w = document.getElementById("opsWrap").getBoundingClientRect();
    return { sideTop: s.top, mainBottom: m.bottom, mainW: m.width, wrapW: w.width, txt: document.getElementById("opsSide").innerText }; });
  assert.ok(g.sideTop >= g.mainBottom - 1, "side " + g.sideTop + " main bottom " + g.mainBottom);
  assert.ok(g.mainW >= 0.9 * g.wrapW, g.mainW + " of " + g.wrapW);
  for (const h of ["Ground programme", "Down-chit", "Remarks"]) assert.ok(g.txt.includes(h), h);
  assert.ok(/Movement|Leave and MC/.test(g.txt));
}, ED);
test("codes_card_next_to_dob", async ({ page }) => {
  await goOps(page, DAY);
  const g = await page.evaluate(() => { const c = document.querySelector("#opsBoard .odi.codes"), d = document.querySelector("#opsBoard .odi.dob"); return { has: !!c, cl: c && c.getBoundingClientRect().left, dl: d && d.getBoundingClientRect().left, side: document.getElementById("opsSide").innerText }; });
  assert.ok(g.has && g.cl > g.dl, JSON.stringify(g));
  assert.ok(!/Codes/i.test(g.side), "Codes still in the side cards");
}, ED);
test("area_hidden_when_empty", async ({ page }) => {
  await goOps(page, DAY);
  await AREA_SET(page, {});
  assert.strictEqual(await page.evaluate(() => document.querySelector("#opsSide .opsac")), null);
  await AREA_SET(page, { Echo: "VIPER" });
  const t = await page.evaluate(() => { const a = document.querySelector("#opsSide .opsac"); return a ? a.innerText : null; });
  assert.ok(t && /echo/i.test(t) && /VIPER/.test(t) && !/oscar/i.test(t), String(t));
}, ED);
test("area_add_button", async ({ page }) => {
  await goOps(page, DAY); await AREA_SET(page, {});
  assert.ok(await page.evaluate(() => !!document.getElementById("opsAreaAdd")), "button in the Ops Room view");
  await page.click("#opsAreaAdd");
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll("#opsSide .opsac .v.oe").length), 3);
  await page.evaluate(iso => opsGo(iso), "2026-10-15");
  assert.strictEqual(await page.evaluate(() => document.querySelector("#opsSide .opsac")), null, "closed on a new day");
  await page.evaluate(() => { document.body.classList.add("opsfs"); renderOps(); });
  assert.ok(await page.evaluate(() => !document.getElementById("opsAreaAdd")), "no button in projector mode");
}, ED);
test("area_add_button_absent_read_only", async ({ page }) => {
  await goOps(page, DAY);
  assert.ok(await page.evaluate(() => !document.getElementById("opsAreaAdd")));
}, RO);

// plan a dept's first crew member on an Admin ("admin") or Leave ("leave") activity for the given day offsets in one shift of the open day, then redraw
const PLAN_SET = (page, dept, kind, iso, offs, shift) => page.evaluate(([dept, kind, iso, offs, shift]) => {
  const bi = books.findIndex(b => isDept(b) && same(b.S.dept, dept)); let r = null;
  withBook(bi, () => { const all = [...actIndex().values()].filter(a => a.ci === (kind === "admin" ? CAT_ADMIN : CAT_LEAVE)), A = all[all.length - 1], D = opsDay(iso), i = S.roster.findIndex(p => p.name || p.id);
    offs.forEach(o => { S.m[D.mi].grid[i * 3 + shift][D.d + o] = A.code; }); r = { code: A.code, who: S.roster[i].ini || S.roster[i].id }; });
  cur.opsDay = iso; renderOps(); return r; }, [dept, kind, iso, offs, shift]);
const COLS = page => page.evaluate(() => [...document.querySelectorAll("#opsSide .gp3 .gcol")].map(c => ({ head: c.querySelector(".opssh").textContent.trim(), text: c.innerText })));

test("ground_columns_am_pm_night", async ({ page }) => {
  const r = await PLAN_SET(page, "Pilot", "admin", DAY, [0, 1, 2], 1);
  const cols = await COLS(page);
  assert.deepStrictEqual(cols.map(c => c.head), ["AM", "PM", "NIGHT"]);
  assert.ok(cols[1].text.includes(r.code) && /until 16 Oct/.test(cols[1].text), cols[1].text);
  assert.ok(!/until 16 Oct/.test(cols[0].text) && !/until 16 Oct/.test(cols[2].text));
}, ED);
test("ground_one_day_no_until", async ({ page }) => {
  const r = await PLAN_SET(page, "Pilot", "admin", DAY, [0], 1);
  const cols = await COLS(page);
  assert.ok(cols[1].text.includes(r.code) && !/until/.test(cols[1].text), cols[1].text);
}, ED);
test("ground_until_stops_at_month_end", async ({ page }) => {
  const r = await PLAN_SET(page, "Pilot", "admin", "2026-10-30", [0, 1], 1);
  const cols = await COLS(page);
  assert.ok(cols[1].text.includes(r.code) && /until 31 Oct/.test(cols[1].text), cols[1].text);
}, ED);
test("leave_and_mc_by_department", async ({ page }) => {
  const r = await PLAN_SET(page, "Pilot", "leave", DAY, [0], 0);
  const rows = await page.evaluate(() => [...document.querySelectorAll("#opsSide .olv .dep")].map(d => ({ dept: d.querySelector("b").textContent.trim(), text: d.textContent })));
  assert.deepStrictEqual(rows.map(x => x.dept), ["Pilot", "Loadmaster", "TACCO", "SUP 1", "SUP 2"]);
  assert.ok(rows[0].text.includes(r.who) && rows[0].text.includes(r.code), rows[0].text);
  assert.ok(rows.slice(1).some(x => /–/.test(x.text)), "a department with nobody shows a dash");
}, ED);
test("empty_day_still_renders", async ({ page }) => {
  await goOps(page, "2026-12-27");
  const t = await page.evaluate(() => document.getElementById("opsSide").innerText);
  for (const h of ["Ground programme", "Leave and MC", "Down-chit", "Remarks"]) assert.ok(t.includes(h), h + " missing: " + t);
}, ED);

// every roster person of every open department gets this Cat and Status, then redraw
const ALL_CAT = (page, cat, status) => page.evaluate(([cat, status]) => { books.forEach(b => { if (isDept(b)) b.S.roster.forEach(p => { p.cat = cat; p.status = status; }); }); renderOps(); }, [cat, status]);
const RGB = c => c.replace(/\s/g, "");

test("seat_names_use_cat_classes", async ({ page }) => {
  await goOps(page, DAY);
  const g = await page.evaluate(() => { const bs = [...document.querySelectorAll("#opsMain tr.f td.oc b")], a = bs.find(b => b.classList.contains("catA"));
    return { n: bs.length, bad: bs.filter(b => !/^cat[ABCDT]$/.test(b.className) && b.className !== "sansbox").map(b => b.textContent + ":" + b.className), a: a ? getComputedStyle(a).color : null }; });
  assert.ok(g.n > 0, "no seat names");
  assert.ok(g.a == null || RGB(g.a) === "rgb(0,0,0)", "CAT A is black: " + g.a);
  await ALL_CAT(page, "CAT D", "Active");
  const d = await page.evaluate(() => [...document.querySelectorAll("#opsMain tr.f td.oc b")].map(b => b.className + "|" + getComputedStyle(b).color));
  assert.ok(d.every(x => x.startsWith("catD|") && RGB(x.split("|")[1]) === "rgb(220,38,38)"), d.join());
}, ED);
test("sans_person_gets_green_box", async ({ page }) => {
  await goOps(page, DAY);
  const g = await page.evaluate(() => { const r = opsDay(cur.opsDay).rows[0], c = r.seats.find(x => x), b = books.find(b => isDept(b) && same(b.S.dept, c.dept)), p = b.S.roster.find(q => same(q.id, c.id));
    p.status = "NSMEN"; renderOps(); const el = [...document.querySelectorAll("#opsMain tr.f td.oc b")].find(e => e.textContent === opsName(c));
    return { cls: el.className, bg: getComputedStyle(el).backgroundColor, fg: getComputedStyle(el).color }; });
  assert.strictEqual(g.cls, "sansbox"); assert.strictEqual(RGB(g.bg), "rgb(22,163,74)"); assert.strictEqual(RGB(g.fg), "rgb(255,255,255)");
}, ED);
test("blank_cat_and_status_ok", async ({ page }) => {
  await goOps(page, DAY); await ALL_CAT(page, "", "");
  const cls = await page.evaluate(() => [...document.querySelectorAll("#opsMain tr.f td.oc b")].map(b => b.className));
  assert.ok(cls.length && cls.every(c => c === ""), cls.join());
}, ED);
test("all_names_follow_cat_on_the_day_board", async ({ page }) => {
  await goOps(page, DAY); await ALL_CAT(page, "CAT C", "Active");
  const cls = await page.evaluate(() => [...document.querySelectorAll("#opsBoard .dc b")].map(b => b.className));
  assert.ok(cls.length > 0 && cls.every(c => c === "catC"), "day board duty names: " + cls.join());
}, ED);
test("standby_rows_flight_size", async ({ page }) => {
  await goOps(page, DAY);
  const g = await page.evaluate(() => { const f = document.querySelector("#opsMain tr.f"), s = document.querySelector("#opsMain tr.sb"), fs = e => parseFloat(getComputedStyle(e).fontSize);
    return { fc: fs(f.querySelector("td.oc")), sc: fs(s.querySelector("td.oc")), fh: f.getBoundingClientRect().height, sh: s.getBoundingClientRect().height, lab: fs(s.querySelector("td.sbc b")), flab: fs(f.querySelector(".ocsn")), w: +getComputedStyle(s.querySelector("td.sbc b")).fontWeight }; });
  assert.strictEqual(g.sc, g.fc, "seat cell font");
  assert.ok(g.sh >= 0.85 * g.fh, "standby row " + g.sh + " vs flight row " + g.fh);
  assert.ok(g.lab >= g.flab && g.w >= 700, JSON.stringify(g));
}, ED);
test("ground_and_leave_names_coloured", async ({ page }) => {
  const a = await PLAN_SET(page, "Pilot", "admin", DAY, [0], 1); await PLAN_SET(page, "Pilot", "leave", DAY, [0], 0);
  await ALL_CAT(page, "CAT B", "Active");
  const g = await page.evaluate(() => ({ gp: [...document.querySelectorAll("#opsSide .gp3 .owho b")].map(b => b.className), lv: [...document.querySelectorAll("#opsSide .olv .olp b")].map(b => b.className) }));
  assert.ok(g.gp.length && g.gp.every(c => c === "catB"), g.gp.join()); assert.ok(g.lv.length && g.lv.every(c => c === "catB"), g.lv.join());
}, ED);
test("ocu_is_pink", async ({ page }) => {
  await goOps(page, DAY); await ALL_CAT(page, "TRAINEE", "Active");
  const d = await page.evaluate(() => [...document.querySelectorAll("#opsMain tr.f td.oc b")].map(b => b.className + "|" + getComputedStyle(b).color));
  assert.ok(d.length && d.every(x => x.startsWith("catT|") && RGB(x.split("|")[1]) === "rgb(236,72,153)"), d.join());
}, ED);
test("key_line", async ({ page }) => {
  await goOps(page, DAY);
  const t = await page.evaluate(() => { const k = document.getElementById("opsKey"); return k && k.textContent; });
  assert.ok(t && /SANS \/ NSMEN/.test(t) && /OCU/.test(t), String(t));
}, ED);

const BGSUM = (page, sel) => page.evaluate(sel => { const m = getComputedStyle(document.querySelector(sel)).backgroundColor.match(/\d+/g).map(Number); return m[0] + m[1] + m[2]; }, sel);
test("clock_shows_time", async ({ page }) => {
  await goOps(page, DAY);
  await page.evaluate(() => { window.OPS_NOW = "14:32"; renderOps(); });
  assert.strictEqual(await page.evaluate(() => document.getElementById("opsClock").textContent.trim()), "14:32");
  await page.evaluate(() => { window.OPS_NOW = "07:05"; opsTick(); });
  assert.strictEqual(await page.evaluate(() => document.getElementById("opsClock").textContent.trim()), "07:05");
}, ED);
test("theme_toggle_dark_and_back", async ({ page }) => {
  await goOps(page, DAY);
  const light = await BGSUM(page, "#opsMain tr.f td.oc"); assert.ok(light > 700, "light cells are light: " + light);
  const plan0 = await page.evaluate(() => getComputedStyle(document.querySelector("#v-plan")).backgroundColor);
  await page.click("#opsTheme");
  assert.ok(await page.evaluate(() => document.body.classList.contains("opsdark")));
  for (const sel of ["#opsMain tr.f td.oc", "#opsLeft", "#opsSide .card", "#opsStats .opsk"]) assert.ok(await BGSUM(page, sel) < 250, sel + " is dark: " + await BGSUM(page, sel));
  assert.strictEqual(await page.evaluate(() => getComputedStyle(document.querySelector("#v-plan")).backgroundColor), plan0, "other pages stay as they were");
  await page.click("#opsTheme");
  assert.ok(await BGSUM(page, "#opsMain tr.f td.oc") > 700);
}, ED);
test("theme_persists", async ({ page }) => {
  await goOps(page, DAY); await page.click("#opsTheme");
  assert.strictEqual(await page.evaluate(() => localStorage.getItem("opsTheme")), "dark");
  await page.evaluate(() => { document.body.classList.remove("opsdark"); opsThemeInit(); });
  assert.ok(await page.evaluate(() => document.body.classList.contains("opsdark")));
}, ED);
test("theme_storage_throws", async ({ page }) => {
  await goOps(page, DAY);
  const r = await page.evaluate(() => { Storage.prototype.getItem = () => { throw new Error("blocked"); }; Storage.prototype.setItem = () => { throw new Error("blocked"); };
    try { opsThemeInit(); document.getElementById("opsTheme").click(); return document.body.classList.contains("opsdark"); } catch (e) { return "threw " + e.message; } });
  assert.strictEqual(r, true, "still switches to dark for this visit");
}, ED);
test("dark_inputs_readable", async ({ page }) => {
  await goOps(page, DAY); await page.click("#opsTheme");
  assert.ok(await BGSUM(page, "#opsDayRem") < 250, "remarks box is dark");
}, ED);

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
