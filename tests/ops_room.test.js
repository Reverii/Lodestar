// Ops Room redesign tests. Build the dashboard first: python3 .lodestar_build.py dashboard
// Run: node tests/ops_room.test.js [name-filter]
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const RO = { mine: "Flight_Ops_Planner_SUP2" };   // a department view (Ops Room file read-only)
const ED = { mine: "Ops_Room" };                    // the Ops Room view (everything editable)
const DAY = "2026-10-14";
const CTX = async (page, card, label) => { await page.click("#opsSide " + card, { button: "right", position: { x: 12, y: 12 } }); await page.click("#opsCtx button:has-text('" + label + "')"); };   // z145: the + buttons became a right-click menu                           // a demo day with flights
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

test("tall_window_enlarges_the_flight_table", async ({ page }) => {   // z122: a quiet day on a tall screen no longer leaves the flight box empty
  await page.setViewportSize({ width: 1900, height: 2000 }); await goOps(page, DAY);
  const r = await page.evaluate(() => { opsFit(); const tb = document.querySelector("table.opst"), m = $("opsMain"), a = tb.getBoundingClientRect(), b = m.getBoundingClientRect(); return { z: +tb.style.zoom || 1, dw: Math.abs(a.width - b.width), dh: a.height - b.height, over: m.scrollHeight - m.clientHeight, ps: !!document.querySelector("table.opst tr.f") }; });
  assert.ok(r.z > 1.2 && r.z <= 1.6, "zoom " + r.z); assert.ok(r.dw < 3, "width off by " + r.dw); assert.ok(r.dh < 3 && r.over < 3, JSON.stringify(r));
  await page.setViewportSize({ width: 1280, height: 720 }); const q = await page.evaluate(() => { opsFit(); const m = $("opsMain"); return { z: +document.querySelector("table.opst").style.zoom || 1, over: m.scrollHeight - m.clientHeight }; });
  assert.ok(q.over < 3, "no scroll created on a small window: " + JSON.stringify(q));
}, ED);
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
  assert.ok(await page.evaluate(() => !document.getElementById("opsAreaAdd") && !document.getElementById("opsDownAdd")), "the + buttons are gone");
  await CTX(page, ".opsdc", "+ Area");
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
    offs.forEach(o => { S.m[D.mi].grid[gridRow(i, shift)][D.d + o] = A.code; }); r = { code: A.code, who: S.roster[i].ini || S.roster[i].id }; });
  cur.opsDay = iso; renderOps(); return r; }, [dept, kind, iso, offs, shift]);
const ROWS = page => page.evaluate(() => [...document.querySelectorAll("#opsSide .gtab tbody tr")].map(r => ({ time: r.cells[0].textContent.trim(), act: (c => { c.querySelectorAll(".gbt").forEach(x => x.remove()); return c.textContent.trim(); })(r.cells[1].cloneNode(true)), loc: r.cells[2].textContent.trim(), who: r.cells[3].textContent.trim(), text: r.innerText })));

// ---- ground programme personnel: merged across departments, borrowed from squadron events, an empty row is a mistake
const SQ_ADD = (page, iso, o) => page.evaluate(([iso, o]) => { const mb = masterBook(), D = opsDay(iso); mb.S.gr.push(Object.assign({ row: 950, mi: D.mi, d: D.d, time: "", act: "X", crew: "", note: "" }, o)); mb.S.grUsed.add(950); cur.opsDay = iso; renderOps(); }, [iso, o]);
const WHO_HTML = (page, act) => page.evaluate(act => { const r = [...document.querySelectorAll("#opsSide .gtab tbody tr")].find(r => r.cells[1].textContent.includes(act)); return r ? { html: r.cells[3].innerHTML, text: r.cells[3].textContent.trim(), n: document.querySelectorAll("#opsSide .gtab tbody tr").length } : null; }, act);
// ---- z112: the board holds only squadron events and the Ops Room's own rows; the planners' items are a reference list in the + Ops row dialog
const MAN = (page, iso, f) => page.evaluate(([iso, f]) => { cur.opsDay = iso; const ok = grrSave(iso, grrNewKey(), "manual", f); renderOps(); return ok; }, [iso, f]);
test("ground_planner_items_not_on_the_board", async ({ page }) => {
  const r = await PLAN_SET(page, "Pilot", "admin", DAY, [0], 1);
  const rows = await ROWS(page); assert.ok(!rows.some(x => x.act.includes(r.code)), "a planner's admin item must not appear: " + JSON.stringify(rows));
}, ED);
test("ground_reference_list_by_department", async ({ page }) => {
  const a = await PLAN_SET(page, "Pilot", "admin", DAY, [0, 1, 2], 1), b = await PLAN_SET(page, "SUP 1", "admin", DAY, [0], 1);
  await page.click("#grAddBtn");
  const t = await page.evaluate(() => [...document.querySelectorAll("#grRef .rh")].map(x => x.textContent.trim()));
  assert.ok(t.includes("Pilot") && t.includes("SUP 1"), t.join());
  const h = await page.evaluate(() => document.getElementById("grRef").textContent);
  assert.ok(h.includes(a.code) && h.includes(a.who) && h.includes(b.who) && /till 16 Oct/.test(h), h);
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll("#grRef input").length), 0, "reference only: nothing to tick");
  assert.ok(await page.evaluate(() => document.querySelectorAll("#grWho input[data-gp]:checked").length === 0), "no one is ticked for you");
}, ED);
test("ground_manual_rows_sorted", async ({ page }) => {
  for (const [time, act] of [["1500H", "A AOP"], ["0930", "CST"], ["PM", "SAFSA"], ["AM", "P8 INFRA"], ["WD", "112 ASSESSMENT"], ["TILL 25 OCT", "SIMBEX"], ["NIGHT", "NAV EX"]]) assert.ok(await MAN(page, DAY, { time, act, note: "X", who: "ALL" }), act);
  const rows = await ROWS(page); assert.deepStrictEqual(rows.map(r => r.act), ["CST", "Sqn Meeting", "A AOP", "P8 INFRA", "SAFSA", "NAV EX", "112 ASSESSMENT", "SIMBEX"], rows.map(r => r.time + " " + r.act).join(" | "));
  assert.strictEqual(rows[rows.length - 1].time, "TILL 25 OCT"); assert.strictEqual(rows[4].time, "PM");
}, ED);
test("ground_till_row_shows_each_day_to_the_date", async ({ page }) => {
  assert.ok(await MAN(page, DAY, { time: "TILL 16 OCT", act: "O/D SIMBEX", note: "INDIA", who: "ALL" }));
  const on = async iso => { await page.evaluate(i => { cur.opsDay = i; renderOps(); }, iso); return (await ROWS(page)).some(r => r.act === "O/D SIMBEX"); };
  assert.ok(await on(DAY) && await on("2026-10-15") && await on("2026-10-16"), "shown until the date"); assert.ok(!(await on("2026-10-17")), "gone after"); assert.ok(!(await on("2026-10-13")), "not before it was added");
  await page.evaluate(() => { cur.opsDay = "2026-10-15"; renderOps(); });
  await page.evaluate(() => [...document.querySelectorAll("#opsSide .gtab tbody tr")].find(r => r.cells[1].textContent.includes("O/D SIMBEX")).querySelector(".ghide").click()); assert.ok(!(await on("2026-10-15")) && await on("2026-10-16"), "hiding one day keeps the other days");
}, ED);
test("ground_time_quick_buttons", async ({ page }) => {
  await page.click("#grAddBtn"); await page.click("#grQ [data-q='PM']"); assert.strictEqual(await page.inputValue("#grTime"), "PM");
  await page.fill("#grTill", "2026-10-25"); await page.dispatchEvent("#grTill", "change"); assert.strictEqual(await page.inputValue("#grTime"), "TILL 25 OCT");
}, ED);
test("ground_blank_crew_no_personnel", async ({ page }) => {
  await SQ_ADD(page, DAY, { act: "Safety Brief", crew: "" });
  const w = await WHO_HTML(page, "Safety Brief"); assert.ok(w.text.includes("NO PERSONNEL"), w.text); assert.ok(!/TBC|ALL RELEVANT/.test(w.text), w.text);
}, ED);
test("ground_all_text", async ({ page }) => {
  await SQ_ADD(page, DAY, { act: "PSM", crew: "ALL" });
  assert.ok((await WHO_HTML(page, "PSM")).text.includes("ALL RELEVANT PERSONNEL"));
}, ED);
test("ground_tags_label", async ({ page }) => {
  await SQ_ADD(page, DAY, { act: "SIMS", crew: "S1 S2" });
  const w = await WHO_HTML(page, "SIMS"); assert.ok(w.text.includes("SUP 1, SUP 2") && !w.text.includes("NO PERSONNEL"), w.text);
}, ED);
test("ground_strip_grows_and_scrolls", async ({ page }) => {
  await page.evaluate(iso => { const mb = masterBook(), D = opsDay(iso); for (let i = 0; i < 40; i++) mb.S.gr.push({ row: 900 + i, mi: D.mi, d: D.d, time: String(800 + i).padStart(4, "0"), act: "Brief " + i, crew: "ALL", note: "Room " + i }); }, DAY);
  await goOps(page, DAY);
  const r = await page.evaluate(() => { const w = document.getElementById("opsWrap"), s = document.getElementById("opsSide"), sc = document.querySelector("#opsSide .gsc"), f = document.getElementById("opsMain").getBoundingClientRect();
    return { side: s.getBoundingClientRect().height, wrap: w.getBoundingClientRect().height, scrolls: sc.scrollHeight > sc.clientHeight + 1, page: document.documentElement.scrollHeight > innerHeight + 1 }; });
  assert.ok(r.side > 170 && r.side <= 0.51 * r.wrap, JSON.stringify(r)); assert.ok(r.scrolls, "past the cap the table scrolls"); assert.ok(!r.page, "the page itself does not scroll");
}, ED);
test("leave_and_mc_has_no_department_labels", async ({ page }) => {
  const r = await PLAN_SET(page, "Pilot", "leave", DAY, [0], 0);
  const t = await page.evaluate(() => ({ text: document.querySelector("#opsSide .olv").textContent, dn: document.querySelectorAll("#opsSide .olv .dn").length, chips: document.querySelectorAll("#opsSide .opsdc .dept, #opsSide .gtab .dept").length }));
  assert.ok(t.text.includes(r.who) && t.text.includes(r.code), t.text);
  assert.strictEqual(t.dn, 0, "no department label"); assert.strictEqual(t.chips, 0, "no department chips in down-chit or ground programme");
}, ED);
test("remarks_and_ground_programme_swapped", async ({ page }) => {
  await goOps(page, DAY);
  const o = await page.evaluate(() => [...document.querySelectorAll("#opsSide > .card, #opsSide > .stack")].map(c => c.classList.contains("rmk") ? "rmk" : c.classList.contains("gp") ? "gp" : c.classList.contains("olv") ? "olv" : "stack"));
  assert.deepStrictEqual(o, ["rmk", "olv", "stack", "gp"]);
}, ED);
test("standby_alert_plus_adds_a_line_and_font_is_readable", async ({ page }) => {
  await goOps(page, DAY);
  const has = await page.evaluate(() => !!document.querySelector("td.oalert .alAdd"));
  assert.ok(has, "the + button is on the Alert status cell");
  const fs = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("td.oalert")).fontSize));
  assert.ok(fs >= 14, "alert font " + fs);
  await page.click("td.oalert .alAdd");
  await page.keyboard.type("P1 0800H-1200H");
  await page.keyboard.press("Control+Enter");
  await page.click("td.oalert .alAdd");
  await page.keyboard.type("P2 1200H-1600H");
  await page.keyboard.press("Control+Enter");
  const t = await page.evaluate(() => document.querySelector("td.oalert").innerText);
  assert.ok(/P1 0800H-1200H/.test(t) && /P2 1200H-1600H/.test(t), t);
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
  assert.ok(d.every(x => x.startsWith("catD|") && RGB(x.split("|")[1]) === "rgb(185,28,28)"), d.join());   // z149: CAT D darker red
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
test("ocu_is_pink", async ({ page }) => {
  await goOps(page, DAY); await ALL_CAT(page, "TRAINEE", "Active");
  const d = await page.evaluate(() => [...document.querySelectorAll("#opsMain tr.f td.oc b")].map(b => b.className + "|" + getComputedStyle(b).color));
  assert.ok(d.length && d.every(x => x.startsWith("catT|") && RGB(x.split("|")[1]) === "rgb(217,70,168)"), d.join());   // z149: OCU pink again
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
test("default_size_100", async ({ page }) => {
  const g = await page.evaluate(() => ({ z: OPS_ZS[opsZi], saved: localStorage.getItem("opsZoom2"), steps: OPS_ZS.join() }));
  assert.strictEqual(g.z, 1, g.steps); assert.strictEqual(g.saved, null);
}, ED);
test("size_buttons_remembered", async ({ page }) => {
  await goOps(page, DAY); await page.click("#opsSize button[data-z='1']");
  const g = await page.evaluate(() => ({ z: OPS_ZS[opsZi], saved: localStorage.getItem("opsZoom2") }));
  assert.strictEqual(g.z, 1.15); assert.strictEqual(g.saved, "3");
}, ED);
// a day with many flights: the day's rows repeated (same keys, only the layout matters)
const BUSY = page => page.evaluate(() => { const od = opsDay; window.opsDay = iso => { const D = od(iso); if (D && D.rows) D.rows = [].concat(D.rows, D.rows, D.rows, D.rows, D.rows); return D; }; });
const FIT = async (page, busy) => { await goOps(page, DAY); if (busy) await BUSY(page); await page.click("#opsFull"); await page.evaluate(() => renderOps()); await page.waitForTimeout(300);
  return page.evaluate(() => ({ z: opsZEff, chosen: opsZ(), mainOver: document.getElementById("opsMain").scrollHeight - document.getElementById("opsMain").clientHeight, docOver: document.documentElement.scrollHeight - innerHeight })); };

test("default_size_100", async ({ page }) => {
  const g = await page.evaluate(() => ({ z: OPS_ZS[opsZi], saved: localStorage.getItem("opsZoom2"), steps: OPS_ZS.join() }));
  assert.strictEqual(g.z, 1, g.steps); assert.strictEqual(g.saved, null);
}, ED);
test("size_buttons_remembered", async ({ page }) => {
  await goOps(page, DAY); await page.click("#opsSize button[data-z='1']");
  const g = await page.evaluate(() => ({ z: OPS_ZS[opsZi], saved: localStorage.getItem("opsZoom2") }));
  assert.strictEqual(g.z, 1.15); assert.strictEqual(g.saved, "3");
}, ED);
test("quiet_day_not_stretched", async ({ page }) => {
  const f = await FIT(page, false);
  assert.strictEqual(f.z, f.chosen, JSON.stringify(f)); assert.ok(f.mainOver <= 2, JSON.stringify(f));
}, Object.assign({}, ED, { viewport: { width: 1920, height: 1080 } }));
test("busy_day_fits_height_1920", async ({ page }) => {
  const f = await FIT(page, true);
  assert.ok(f.z <= f.chosen && f.z >= 0.5, JSON.stringify(f)); assert.ok(f.mainOver <= 2 && f.docOver <= 1, JSON.stringify(f));   // z139: the flight table shrinks by itself first, so the page may stay at the chosen size
}, Object.assign({}, ED, { viewport: { width: 1920, height: 1080 } }));
test("busy_day_fits_height_1280", async ({ page }) => {
  const f = await FIT(page, true);
  assert.ok(f.z < f.chosen && f.z >= 0.5, JSON.stringify(f)); assert.ok(f.mainOver <= 2 && f.docOver <= 1, JSON.stringify(f));
}, Object.assign({}, ED, { viewport: { width: 1280, height: 720 } }));

test("editing_paths_still_work", async ({ page }) => {
  await goOps(page, DAY);
  // a seat cell opens the seat picker
  await page.click("#opsMain tr.f td[data-oc]");
  assert.ok(await page.evaluate(() => getComputedStyle(document.getElementById("opsPop")).display === "block"), "seat picker opens");
  await page.evaluate(() => { document.getElementById("opsPop").style.display = "none"; cur.opsPop = null; });
  // the remarks box saves into the Day Board cell
  await page.fill("#opsDayRem", "Fuel bowser out 1300"); await page.press("#opsDayRem", "Tab");
  assert.ok(await page.evaluate(() => { const r = document.getElementById("opsDayRem"); return Object.values(books[opsIdx()].S.db).includes("Fuel bowser out 1300"); }), "remark stored");
  // 1 Set / 2 Set
  await goOps(page, DAY); await page.click(".sbset[data-sbset='1']");
  assert.strictEqual(await page.evaluate(() => opsSbSets(opsDay(cur.opsDay))), 1);
  await page.click(".sbset[data-sbset='2']");
  assert.strictEqual(await page.evaluate(() => opsSbSets(opsDay(cur.opsDay))), 2);
  // + Ops Add and + Down-chit open their dialogs
  await page.click("#opsAddBtn"); assert.ok(await page.evaluate(() => getComputedStyle(document.getElementById("oaPop")).display === "flex"), "Ops Add dialog");
  await page.evaluate(() => { document.getElementById("oaPop").style.display = "none"; });
  await CTX(page, ".opsdc", "+ Down-chit"); assert.strictEqual(await page.evaluate(() => document.getElementById("chitTitle").textContent), "Down-chit");
}, ED);

// contrast ratio of an element's text colour against its (own or nearest painted) background, run in the page
const CONTRAST = (page, sel) => page.evaluate(sel => { const P = c => c.match(/[\d.]+/g).map(Number), L = ([r, g, b]) => { const f = v => (v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const el = document.querySelector(sel); let bgEl = el, bg = P(getComputedStyle(bgEl).backgroundColor); while ((bg.length > 3 && bg[3] === 0) && bgEl.parentElement) { bgEl = bgEl.parentElement; bg = P(getComputedStyle(bgEl).backgroundColor); }
  const fg = P(getComputedStyle(el).color), a = L(fg) + 0.05, b = L(bg) + 0.05; return Math.max(a, b) / Math.min(a, b); }, sel);

test("quiet_day_not_stretched", async ({ page }) => {
  const f = await FIT(page, false);
  assert.strictEqual(f.z, f.chosen, JSON.stringify(f)); assert.ok(f.mainOver <= 2, JSON.stringify(f));
}, Object.assign({}, ED, { viewport: { width: 1920, height: 1080 } }));
test("busy_day_fits_height_1920", async ({ page }) => {
  const f = await FIT(page, true);
  assert.ok(f.z <= f.chosen && f.z >= 0.5, JSON.stringify(f)); assert.ok(f.mainOver <= 2 && f.docOver <= 1, JSON.stringify(f));   // z139: the flight table shrinks by itself first, so the page may stay at the chosen size
}, Object.assign({}, ED, { viewport: { width: 1920, height: 1080 } }));
test("busy_day_fits_height_1280", async ({ page }) => {
  const f = await FIT(page, true);
  assert.ok(f.z < f.chosen && f.z >= 0.5, JSON.stringify(f)); assert.ok(f.mainOver <= 2 && f.docOver <= 1, JSON.stringify(f));
}, Object.assign({}, ED, { viewport: { width: 1280, height: 720 } }));

test("editing_paths_still_work", async ({ page }) => {
  await goOps(page, DAY);
  // a seat cell opens the seat picker
  await page.click("#opsMain tr.f td[data-oc]");
  assert.ok(await page.evaluate(() => getComputedStyle(document.getElementById("opsPop")).display === "block"), "seat picker opens");
  await page.evaluate(() => { document.getElementById("opsPop").style.display = "none"; cur.opsPop = null; });
  // the remarks box saves into the Day Board cell
  await page.fill("#opsDayRem", "Fuel bowser out 1300"); await page.press("#opsDayRem", "Tab");
  assert.ok(await page.evaluate(() => { const r = document.getElementById("opsDayRem"); return Object.values(books[opsIdx()].S.db).includes("Fuel bowser out 1300"); }), "remark stored");
  // 1 Set / 2 Set
  await goOps(page, DAY); await page.click(".sbset[data-sbset='1']");
  assert.strictEqual(await page.evaluate(() => opsSbSets(opsDay(cur.opsDay))), 1);
  await page.click(".sbset[data-sbset='2']");
  assert.strictEqual(await page.evaluate(() => opsSbSets(opsDay(cur.opsDay))), 2);
  // + Ops Add and + Down-chit open their dialogs
  await page.click("#opsAddBtn"); assert.ok(await page.evaluate(() => getComputedStyle(document.getElementById("oaPop")).display === "flex"), "Ops Add dialog");
  await page.evaluate(() => { document.getElementById("oaPop").style.display = "none"; });
  await CTX(page, ".opsdc", "+ Down-chit"); assert.strictEqual(await page.evaluate(() => document.getElementById("chitTitle").textContent), "Down-chit");
}, ED);

// contrast ratio of an element's text colour against its (own or nearest painted) background, run in the page
test("long_lists_do_not_shrink_the_table", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await goOps(page, DAY); await page.click("#opsFull"); await page.evaluate(() => renderOps()); await page.waitForTimeout(200);
  const z0 = await page.evaluate(() => opsZEff);
  await page.evaluate(() => { const og = opsGround; window.opsGround = D => og(D).concat(Array.from({ length: 40 }, (_, i) => ({ sh: i % 3, k: "3", when: "", until: "", act: "Item " + i, desc: "", who: "X", note: "" }))); renderOps(); });
  await page.waitForTimeout(200);
  const g = await page.evaluate(() => ({ z: opsZEff, side: document.getElementById("opsSide").getBoundingClientRect().height, h: innerHeight }));
  assert.ok(g.z >= 0.5 && g.z <= z0 + 0.001, "zoom " + z0 + " -> " + g.z); assert.ok(g.side <= 0.51 * g.h + 1, "bottom row " + g.side);   // z139: a long list may grow the strip (to half the page); the flight table gives way, never below 50% of the page size
}, ED);
test("many_flights_shrink_only_the_flight_table", async ({ page }) => {   // z139: the top and the bottom cards keep their size, only the flight table scales (until it is at its smallest readable size)
  await page.setViewportSize({ width: 1920, height: 1080 }); await goOps(page, DAY);
  const m = () => page.evaluate(() => { opsFit(); const tb = document.querySelector("table.opst"), m = $("opsMain"), r = id => document.getElementById(id).getBoundingClientRect().height;
    return { z: opsZEff, top: document.querySelector("#opsScale .opsbar").getBoundingClientRect().height, side: r("opsSide"), tz: +tb.style.zoom || 1, over: m.scrollHeight - m.clientHeight, flights: tb.querySelectorAll("tr.f").length }; });
  const a = await m();
  await page.evaluate(() => { const D = opsDay(cur.opsDay), S2 = books[opsIdx()].S; for (let i = 0; i < 4; i++) S2.oa.push({ row: 900 + i, y: D.y, mi: D.mi, d: D.d, s: i % 3, code: "FLT-1.5", time: "0900-1030", crew: "", note: "", oa: true }); renderOps(); });
  const b = await m();
  assert.ok(b.flights > a.flights + 2, "more flights: " + a.flights + " -> " + b.flights);
  assert.ok(Math.abs(b.z - a.z) < 0.001, "page zoom " + a.z + " -> " + b.z);
  assert.ok(Math.abs(b.side - a.side) < 2, "bottom cards " + a.side + " -> " + b.side);
  assert.ok(Math.abs(b.top - a.top) < 2, "top bar " + a.top + " -> " + b.top);
  assert.ok(b.tz < a.tz && b.tz >= 0.6, "table zoom " + a.tz + " -> " + b.tz); assert.ok(b.over < 3, "no scroll: " + b.over);
}, ED);
const dragBar = async (page, id, dy) => { const b = await page.evaluate(id => { const r = document.getElementById(id).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, id);
  await page.mouse.move(b.x, b.y); await page.mouse.down(); await page.mouse.move(b.x, b.y + dy / 2); await page.mouse.move(b.x, b.y + dy); await page.mouse.up(); };
test("bottom_bar_resizes_and_scales_the_cards", async ({ page }) => {   // z141
  await page.setViewportSize({ width: 1600, height: 1000 }); await goOps(page, DAY);
  const m = () => page.evaluate(() => ({ side: document.getElementById("opsSide").getBoundingClientRect().height, z: +document.getElementById("opsSide").style.zoom || 1, over: document.getElementById("opsSide").scrollHeight - document.getElementById("opsSide").clientHeight, bars: localStorage.getItem("opsBars") }));
  const a = await m(); await dragBar(page, "opsBarB", -150); const b = await m();
  assert.ok(b.side > a.side + 100, "taller: " + a.side + " -> " + b.side); assert.ok(b.z > a.z + 0.05, "text scaled up: " + a.z + " -> " + b.z); assert.ok(b.over < 4, "nothing cut off: " + b.over); assert.ok(/"b"/.test(b.bars), "remembered");
  await dragBar(page, "opsBarB", 260); const c = await m(); assert.ok(c.side < b.side - 100 && c.z < b.z, JSON.stringify([b, c]));
  await page.dblclick("#opsBarB"); const d = await m(); assert.ok(Math.abs(d.z - 1) < 0.001 && !/"b"/.test(d.bars || ""), "automatic again: " + JSON.stringify(d));
}, ED);
test("top_bar_resizes_and_scales_the_duty_strip", async ({ page }) => {   // z141
  await page.setViewportSize({ width: 1600, height: 1000 }); await goOps(page, DAY);
  const m = () => page.evaluate(() => ({ h: document.getElementById("opsBoardBox").getBoundingClientRect().height, z: +document.getElementById("opsBoard").style.zoom || 1, bh: document.getElementById("opsBoard").getBoundingClientRect().height }));
  const a = await m(); await dragBar(page, "opsBarT", 90); const b = await m();
  assert.ok(b.h > a.h + 50, "taller: " + a.h + " -> " + b.h); assert.ok(b.z > a.z + 0.1, "scaled: " + a.z + " -> " + b.z); assert.ok(b.bh <= b.h + 3, "fits its box: " + JSON.stringify(b));
  await page.dblclick("#opsBarT"); const c = await m(); assert.ok(Math.abs(c.z - 1) < 0.001, JSON.stringify(c));
}, ED);
test("projector_refits_when_the_window_height_changes_late", async ({ page }) => {   // z142: full screen changes the height a moment after the click
  await page.setViewportSize({ width: 1280, height: 720 }); await goOps(page, DAY); await page.click("#opsFull");
  await page.evaluate(() => { const h = innerHeight; Object.defineProperty(window, "innerHeight", { configurable: true, get: () => 1000 }); document.dispatchEvent(new Event("fullscreenchange")); });
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => { const w = document.getElementById("opsWrap").getBoundingClientRect(), s = document.getElementById("opsSide").getBoundingClientRect(); return { bottom: w.bottom, side: s.height, ih: innerHeight }; });
  assert.ok(r.bottom > 900 && r.bottom <= r.ih, "page uses the new height: " + JSON.stringify(r)); assert.ok(r.side >= 200, "bottom cards not cut: " + r.side);
}, ED);
test("projector_bottom_cards_keep_their_row", async ({ page }) => {   // z143: the hidden drag bar left the grid and the cards slid into its 10 px row
  await page.setViewportSize({ width: 2000, height: 600 }); await goOps(page, "2026-10-20"); await page.click("#opsFull"); await page.waitForTimeout(800);
  const r = await page.evaluate(() => ({ side: document.getElementById("opsSide").getBoundingClientRect().height, z: opsZEff, wb: document.getElementById("opsWrap").getBoundingClientRect().bottom, sb: document.getElementById("opsSide").getBoundingClientRect().bottom }));
  assert.ok(r.side >= 240 * r.z - 2, "bottom cards not squeezed: " + JSON.stringify(r)); assert.ok(Math.abs(r.wb - r.sb) < 3, "cards reach the bottom of the page: " + JSON.stringify(r));
}, ED);
test("right_click_menus_on_the_two_cards", async ({ page }) => {   // z145
  await goOps(page, DAY);
  await page.click("#opsSide .olv", { button: "right", position: { x: 12, y: 12 } });
  const l = await page.evaluate(() => [...document.querySelectorAll("#opsCtx button")].map(b => b.textContent)); assert.deepStrictEqual(l, ["+ Leave", "+ MC"]);
  await page.keyboard.press("Escape"); assert.ok(await page.evaluate(() => !document.getElementById("opsCtx")), "Esc closes the menu");
  await page.click("#opsSide .opsdc", { button: "right", position: { x: 12, y: 12 } });
  const d = await page.evaluate(() => [...document.querySelectorAll("#opsCtx button")].map(b => b.textContent)); assert.ok(d[0] === "+ Down-chit", d.join());
}, ED);
test("right_click_leave_and_mc_fill_the_plan", async ({ page }) => {   // z145 (Ops Room mode: every open department file is editable)
  await page.evaluate(() => { OPS = true; }); await goOps(page, DAY);
  for (const [kind, label] of [["leave", "+ Leave"], ["mc", "+ MC"]]) {
    await CTX(page, ".olv", label);
    const t = await page.evaluate(() => ({ h: document.querySelector("#blkPop h2").textContent, who: document.getElementById("blkWho").value, code: document.getElementById("blkCode").value, from: document.getElementById("blkFrom").value, show: getComputedStyle(document.getElementById("blkPop")).display }));
    assert.strictEqual(t.show, "flex"); assert.strictEqual(t.h, kind === "mc" ? "MC" : "Leave"); assert.strictEqual(t.from, DAY); assert.ok(t.code, JSON.stringify(t));
    if (kind === "mc") assert.strictEqual(t.code, "MC");
    await page.evaluate(() => { document.getElementById("blkOver").checked = true; document.getElementById("blkOver").dispatchEvent(new Event("change")); });
    await page.click("#blkGo"); await page.waitForTimeout(200);
    const r = await page.evaluate(([w, c, iso]) => { const [bi, i] = w.split(":").map(Number); return withBook(bi, () => { const D = opsDay(iso); return [0, 1, 2].map(s => S.m[D.mi].grid[gridRow(i, s)][D.d]); }); }, [t.who, t.code, DAY]);
    assert.deepStrictEqual(r, [t.code, t.code, t.code], kind + " on all three shifts");
    await page.evaluate(([w, iso]) => { const [bi, i] = w.split(":").map(Number); withBook(bi, () => { const D = opsDay(iso); [0, 1, 2].forEach(s => { S.m[D.mi].grid[gridRow(i, s)][D.d] = ""; }); }); }, [t.who, DAY]);
  }
}, ED);
test("right_click_name_removes_leave", async ({ page }) => {   // z146
  await page.evaluate(() => { OPS = true; }); await goOps(page, DAY);
  const set = () => page.evaluate(iso => { const bi = books.findIndex(b => isDept(b) && b.S.dept === "Pilot"); return withBook(bi, () => { const D = opsDay(iso), i = S.roster.findIndex(p => p.name || p.id), c = S.acts.find(a => (actIndex().get(a.code.toUpperCase()) || {}).ci === CAT_LEAVE).code;
    [-1, 0, 1].forEach(o => [0, 1, 2].forEach(s => { S.m[D.mi].grid[gridRow(i, s)][D.d + o] = c; })); renderAll(); cur.opsDay = iso; renderOps(); return { bi, i, c }; }); }, DAY);
  const cnt = ({ bi, i, c }) => page.evaluate(([bi, i, c, iso]) => withBook(bi, () => { const D = opsDay(iso); return [-1, 0, 1].map(o => [0, 1, 2].filter(s => S.m[D.mi].grid[gridRow(i, s)][D.d + o] === c).length); }), [bi, i, c, DAY]);
  const w = await set(); assert.deepStrictEqual(await cnt(w), [3, 3, 3]);
  await page.click("#opsSide .olp", { button: "right" });
  const items = await page.evaluate(() => [...document.querySelectorAll("#opsCtx button")].map(b => b.textContent));
  assert.ok(/this day/.test(items[0]) && /whole run.*3 days/.test(items[1]) && items.includes("+ Leave"), items.join(" | "));
  await page.click("#opsCtx button:has-text('this day')"); assert.deepStrictEqual(await cnt(w), [3, 0, 3], "only this day is cleared");
  const w2 = await set(); await page.click("#opsSide .olp", { button: "right" }); await page.click("#opsCtx button:has-text('whole run')");
  assert.deepStrictEqual(await cnt(w2), [0, 0, 0], "the whole run is cleared");
}, ED);
test("duty_strip_cells_take_several_lines", async ({ page }) => {   // z147: SXO / OPS O / SDO / BDO, Safety ... Codes accept Enter for a new line
  await goOps(page, DAY);
  for (const sel of ["#opsBoard .odg .dc.oe >> nth=2", "#opsBoard .odi.codes .dv"]) {
    await page.click(sel); assert.strictEqual(await page.evaluate(() => document.activeElement.tagName), "TEXTAREA", sel + " opens a text box that takes lines");
    await page.keyboard.type("AAA"); await page.keyboard.press("Enter"); await page.keyboard.type("BBB"); await page.click("#opsStats", { position: { x: 5, y: 5 } });
  }
  const r = await page.evaluate(() => { const st = books[opsIdx()].S; return Object.values(st.db).filter(v => /AAA\nBBB/.test(v)).length; }); assert.strictEqual(r, 2, "both cells saved with two lines");
  const h = await page.evaluate(() => [...document.querySelectorAll("#opsBoard .odg .dc, #opsBoard .odi.codes .dv")].filter(e => /AAA/.test(e.textContent)).map(e => e.getBoundingClientRect().height > 0 && getComputedStyle(e).whiteSpace));
  assert.deepStrictEqual(h.length, 2); assert.ok(h.every(w => /pre/.test(w)), h.join());
  await page.click("#opsBoard .odi.dob .dv"); assert.strictEqual(await page.evaluate(() => document.activeElement.tagName), "INPUT", "DOB stays one line");
}, ED);
test("area_add_hidden_when_projector_clicked", async ({ page }) => {
  await goOps(page, DAY); await CTX(page, ".opsdc", "+ Area");
  await page.click("#opsFull");
  assert.ok(await page.evaluate(() => !document.getElementById("opsAreaAdd") || getComputedStyle(document.getElementById("opsAreaAdd")).display === "none"), "button hidden");
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll("#opsSide .opsac .v.oe").length), 0, "no empty area lines on the projector");
}, ED);

test("sample_ops_room_can_pick_a_seat", async ({ page }) => {
  await page.click("#wSample");
  await page.waitForFunction(() => typeof books !== "undefined" && books.length >= 8, null, { timeout: 20000 });
  await goOps(page, DAY);
  assert.ok(await page.evaluate(() => opsEditable()), "the sample's Ops Room is editable");
  const before = await page.evaluate(() => document.querySelectorAll("#opsMain td.oc.miss[data-oc]").length);
  assert.ok(before > 0, "an empty seat can be clicked");
  await page.click("#opsMain td.oc.miss[data-oc]");
  assert.ok(await page.evaluate(() => getComputedStyle(document.getElementById("opsPop")).display === "block"), "the seat picker opens");
  await page.selectOption("#opsPick", { index: 1 });
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll("#opsMain td.oc.miss[data-oc]").length), before - 1, "the seat is filled");
}, { blank: true });


// ---- hours from the time range, sorties from the flight (z126): a running change is one flight with 2 or 3 sorties
test("sorties_on_the_flight_make_the_rows", async ({ page }) => {
  const r = await page.evaluate(() => { const P = masterBook().S, mk = n => { const f = P.fl.find(f => f.mi === 9 && f.d === 12 && f.code); f.sort = n; return opsDay("2026-10-13").rows.filter(x => x.x.code === f.code && x.x.s === f.s).length; };
    const one = mk(1), three = mk(3); return { one, three }; });
  assert.deepStrictEqual(r, { one: 1, three: 3 });
}, ED);
test("flight_rows_carry_the_hours_of_their_range", async ({ page }) => {
  const r = await page.evaluate(() => { const D = opsDay("2026-10-01"), x = D.rows.find(z => z.x.code === "FLT-2.0" && z.x.s === 0); return { hrs: x.x.hrs, n: D.rows.filter(z => z.x.code === "FLT-2.0" && z.x.s === 0).length }; });
  assert.deepStrictEqual(r, { hrs: 4, n: 2 });   // demo: FLT-2.0 0830-1230 with Sorties 2
}, ED);

(async () => {
  const only = process.argv[2];
  let pass = 0, ran = 0;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue;
    ran++; let S = null;
    try { S = await boot(Object.assign({}, t.opts)); await t.fn(S); if (S.errs.length) throw new Error("page errors: " + S.errs.join(" | ").slice(0, 3000)); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 3000)); }
    if (S) await S.close();
  }
  console.log(pass + "/" + ran + " pass");
  process.exit(pass === ran ? 0 : 1);
})();
