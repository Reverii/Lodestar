// Department selector (SharePoint start screen) tests. Build the dashboard first: python3 .lodestar_build.py dashboard
// Run: node tests/dept_select.test.js [name-filter]
// There is no SharePoint here: the tests stub SP.files / spList / spJson in the page and use a fake clock, window.SP_NOW.
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const BLANK = { blank: true };
const NOW = "2026-10-28T14:32:00";
// the page's file list and a stubbed spList that only stamps the listing time
const F = (name, mod, by) => ({ Name: name, ServerRelativeUrl: "/x/" + name, TimeLastModified: mod, By: by || "" });
const set = (page, files, last) => page.evaluate(([files, last, now]) => { window.SP_NOW = now; SP.folder = "/sites/121SQN/Program"; SP.files = files; window.spList = async () => { SP.listedAt = new Date(window.SP_NOW); }; if (last) spRemember("dept", last); }, [files, last, NOW]);

test("when_wording", async ({ page }) => {
  const r = await page.evaluate(now => { const n = new Date(now), w = s => spWhen(s, n); return ["2026-10-28T08:12:00", "2026-10-27T16:55:00", "2026-10-26T11:20:00", "2026-10-20T09:05:00", "2025-12-30T09:05:00"].map(w); }, NOW);
  assert.deepStrictEqual(r, [{ text: "Today 08:12", level: "g" }, { text: "Yesterday 16:55", level: "a" }, { text: "Mon 26 Oct 11:20", level: "a" }, { text: "Tue 20 Oct 09:05", level: "r" }, { text: "Tue 30 Dec 2025 09:05", level: "r" }]);
}, BLANK);
test("when_edge_cases", async ({ page }) => {
  const r = await page.evaluate(now => { const n = new Date(now), w = s => spWhen(s, n); return [w("2026-10-29T10:00:00"), w(""), w(undefined), w("not a date"), w("2026-10-22T12:00:00"), w("2026-10-21T12:00:00")]; }, NOW);
  assert.deepStrictEqual(r, [{ text: "Today 10:00", level: "g" }, { text: "Changed: unknown", level: "x" }, { text: "Changed: unknown", level: "x" }, { text: "Changed: unknown", level: "x" }, { text: "Thu 22 Oct 12:00", level: "a" }, { text: "Wed 21 Oct 12:00", level: "r" }]);
}, BLANK);
test("list_asks_for_the_editor", async ({ page }) => {
  const r = await page.evaluate(async () => { SP.web = "https://x/sites/s"; SP.folder = "/sites/s/Program"; const urls = [];
    window.spJson = async u => { urls.push(u); return { d: { results: [{ Name: "A.xlsx", ServerRelativeUrl: "/x/A.xlsx", TimeLastModified: "2026-10-28T08:00:00", ModifiedBy: { Title: "R. Tan" } }] } }; };
    await spList(); return { urls, by: SP.files[0].By, name: SP.files[0].Name, noWho: SP.noWho, at: !!SP.listedAt }; });
  assert.ok(/\$expand=ModifiedBy/.test(r.urls[0]) && /ModifiedBy\/Title/.test(r.urls[0]), r.urls[0]);
  assert.strictEqual(r.by, "R. Tan"); assert.strictEqual(r.noWho, false); assert.ok(r.at);
}, BLANK);
test("list_falls_back_without_the_editor", async ({ page }) => {
  const r = await page.evaluate(async () => { SP.web = "https://x/sites/s"; SP.folder = "/sites/s/Program"; const urls = [];
    window.spJson = async u => { urls.push(u); if (/\$expand/.test(u)) { const e = new Error("refused"); e.status = 400; throw e; } return { d: { results: [{ Name: "A.xlsx", ServerRelativeUrl: "/x/A.xlsx", TimeLastModified: "2026-10-28T08:00:00" }] } }; };
    await spList(); const first = urls.slice(); await spList(); return { first, second: urls.slice(first.length), noWho: SP.noWho, by: SP.files[0].By }; });
  assert.strictEqual(r.noWho, true); assert.strictEqual(r.by, "");
  assert.ok(r.first.some(u => /\$expand/.test(u)) && r.first.some(u => !/\$expand/.test(u)));
  assert.ok(r.second.length === 1 && !/\$expand/.test(r.second[0]), "no second try of the expand: " + r.second.join());
}, BLANK);

const std = () => [F("Flight_Ops_Planner_SUP1.xlsx", "2026-10-28T08:12:00", "R. Tan"), F("Flight_Ops_Planner_SUP2.xlsx", "2026-10-28T07:40:00", "S. Lim"), F("Flight_Ops_Planner_TACCO.xlsx", "2026-10-27T16:55:00", "J. Koh"),
  F("Flight_Ops_Planner_Loadmaster.xlsx", "2026-10-26T11:20:00", "A. Ng"), F("Flight_Ops_Planner_Pilot.xlsx", "2026-10-28T06:58:00", "M. Lee"), F("Master_Planner.xlsx", "2026-10-28T08:30:00", "H. Yeo"),
  F("Duty_Roster.xlsx", "2026-10-20T09:05:00", "D. Chua"), F("Ops_Room.xlsx", "2026-10-28T08:05:00", "K. Ong")];
const show = page => page.evaluate(() => { document.getElementById("welcome").style.display = "none"; return spShowDepts(); });
const card = (page, lab) => page.evaluate(lab => { const c = [...document.querySelectorAll("#spGrid .dcard")].find(x => x.querySelector(".n").textContent === lab); return c ? { cls: c.className, txt: c.innerText.replace(/\s+/g, " ").trim(), dis: c.disabled, dot: (c.querySelector(".fresh") || {}).className || "" } : null; }, lab);

test("cards_in_order_with_texts", async ({ page }) => {
  await set(page, std(), "SUP 2"); await show(page);
  const g = await page.evaluate(() => ({ names: [...document.querySelectorAll("#spGrid .dcard .n")].map(x => x.textContent), last: document.getElementById("spGrid").lastElementChild.id, lastTxt: document.getElementById("spGrid").lastElementChild.innerText }));
  assert.deepStrictEqual(g.names, ["SUP 1", "SUP 2", "TACCO", "Loadmaster", "Pilot", "Duty Planner", "Master Planner"]);
  assert.strictEqual(g.last, "spAll"); assert.ok(/Show all files in the folder/.test(g.lastTxt));
  const c = await card(page, "SUP 2"); assert.ok(/Today 07:40/.test(c.txt) && /by S\. Lim/.test(c.txt) && /Flight_Ops_Planner_SUP2\.xlsx/.test(c.txt), c.txt);
}, BLANK);
test("dots_follow_age", async ({ page }) => {
  const f = std(); f[2].TimeLastModified = "2026-10-25T10:00:00"; f[3].TimeLastModified = "garbage";
  await set(page, f, ""); await show(page);
  const d = await Promise.all(["SUP 1", "TACCO", "Duty Planner", "Loadmaster"].map(l => card(page, l)));
  assert.ok(/ g\b/.test(d[0].dot) && / a\b/.test(d[1].dot) && / r\b/.test(d[2].dot) && / x\b/.test(d[3].dot), d.map(x => x.dot).join("|"));
  assert.ok(/Changed: unknown/.test(d[3].txt));
}, BLANK);
test("last_used_is_highlighted", async ({ page }) => {
  await set(page, std(), "SUP 2"); await show(page);
  let r = await page.evaluate(() => ({ lasts: [...document.querySelectorAll("#spPick .dcard.last")].map(c => c.querySelector(".n").textContent), tag: document.querySelector("#spPick .dcard.last").innerText, ops: document.querySelector("#spPick .opscard").classList.contains("last") }));
  assert.deepStrictEqual(r.lasts, ["SUP 2"]); assert.ok(/You opened this last/.test(r.tag)); assert.strictEqual(r.ops, false);
  await page.evaluate(() => { spRemember("dept", "Ops Room"); return spShowDepts(); });
  r = await page.evaluate(() => ({ lasts: document.querySelectorAll("#spPick .dcard.last").length, ops: document.querySelector("#spPick .opscard").classList.contains("last"), tag: document.querySelector("#spPick .opscard").innerText }));
  assert.strictEqual(r.lasts, 0); assert.ok(r.ops && /You opened this last/.test(r.tag));
  await page.evaluate(() => { spRemember("dept", "Some Old Name"); return spShowDepts(); });
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll("#spPick .last").length), 0);
}, BLANK);
test("missing_file_card", async ({ page }) => {
  await set(page, std().filter(f => !/Loadmaster/.test(f.Name)), ""); await show(page);
  const c = await card(page, "Loadmaster");
  assert.ok(/miss/.test(c.cls) && c.dis === true && /No file in this folder/.test(c.txt) && /Looking for Flight_Ops_Planner_Loadmaster\.xlsx/.test(c.txt), JSON.stringify(c));
  await page.evaluate(() => { window.__d = null; window.spOpenDept = l => (window.__d = l); });
  await page.click("#spGrid .dcard.miss", { force: true }).catch(() => {});
  assert.strictEqual(await page.evaluate(() => window.__d), null);
}, BLANK);
test("no_by_line_without_an_editor", async ({ page }) => {
  const f = std(); f[1].By = ""; await set(page, f, ""); await show(page);
  const c = await card(page, "SUP 2"); assert.ok(!/\bby\b/.test(c.txt), c.txt);
}, BLANK);
test("hostile_names_are_text", async ({ page }) => {
  const f = std(); f[0].By = "<img src=x onerror=\"window.__x=1\">\""; f[3].Name = "Flight_Ops_Planner_Loadmaster_" + "x".repeat(200) + ".xlsx";
  await set(page, f, ""); await show(page); await page.waitForTimeout(100);
  const g = await page.evaluate(() => { const cs = [...document.querySelectorAll("#spGrid .dcard")], w = cs.map(c => Math.round(c.getBoundingClientRect().width)), lm = cs.find(c => c.querySelector(".n").textContent === "Loadmaster");
    return { img: document.querySelectorAll("#spGrid img").length, x: window.__x, widths: [...new Set(w)], ell: getComputedStyle(lm.querySelector(".f")).textOverflow }; });
  assert.strictEqual(g.img, 0); assert.strictEqual(g.x, undefined); assert.strictEqual(g.widths.length, 1, "cards stay one width: " + g.widths); assert.strictEqual(g.ell, "ellipsis");
}, BLANK);
test("ops_card_content", async ({ page }) => {
  await set(page, std(), ""); await show(page);
  const t = await page.evaluate(() => document.querySelector("#spPick .opscard").innerText.replace(/\s+/g, " "));
  assert.ok(/The day's flights and crew\. Every department's file is editable\./.test(t) && /Today 08:05/.test(t) && /by K\. Ong/.test(t) && /Open Ops Room/.test(t), t);
}, BLANK);
test("hero_and_status", async ({ page }) => {
  await set(page, std(), ""); await show(page);
  const g = await page.evaluate(() => ({ logo: !!document.querySelector("#spPick .hero svg.lslogo"), h: document.querySelector("#spPick .hero h1").textContent, st: document.getElementById("spStatus").innerText.replace(/\s+/g, " ") }));
  assert.ok(g.logo); assert.strictEqual(g.h, "Which department are you from?");
  assert.ok(/Connected to Program/.test(g.st) && /8 files/.test(g.st) && /refreshes every 15 seconds/.test(g.st), g.st);
}, BLANK);
test("clicks_reach_the_openers", async ({ page }) => {
  await set(page, std(), ""); await show(page);
  await page.evaluate(() => { window.spOpenDept = l => (window.__d = l); window.spOpenOps = () => (window.__o = 1); window.spShowPicker = a => (window.__p = a); });
  await page.click("#spGrid .dcard >> text=SUP 1"); await page.click("#spPick .opscard"); await page.click("#spAll");
  assert.deepStrictEqual(await page.evaluate(() => [window.__d, window.__o, window.__p]), ["SUP 1", 1, false]);
}, BLANK);
test("fits_1280x720", async ({ page }) => {
  await set(page, std(), "SUP 2"); await show(page); await page.waitForTimeout(100);
  const g = await page.evaluate(() => { const b = document.querySelector("#spPick .box"), r = b.getBoundingClientRect(); return { bottom: r.bottom, over: b.scrollHeight - b.clientHeight, w: r.width }; });
  assert.ok(g.bottom <= 720 && g.over <= 1, JSON.stringify(g)); assert.ok(g.w > 900, "wide box " + g.w);
}, BLANK);
test("file_picker_keeps_the_narrow_box", async ({ page }) => {
  await set(page, std(), ""); await show(page);
  await page.evaluate(() => { window.spList = async () => {}; return spShowPicker(false); });
  const g = await page.evaluate(() => ({ wide: document.querySelector("#spPick .box").classList.contains("wide"), w: document.querySelector("#spPick .box").getBoundingClientRect().width, title: document.getElementById("spTitle").offsetParent !== null }));
  assert.strictEqual(g.wide, false); assert.ok(g.w <= 640, "box " + g.w); assert.ok(g.title, "the picker title is back");
}, BLANK);

test("refresh_redraws_a_changed_list", async ({ page }) => {
  await set(page, std(), "SUP 2"); await show(page);
  await page.evaluate(() => { window.__hero = document.querySelector("#spPick .hero svg"); window.SP_NOW = "2026-10-28T14:40:00";
    window.spList = async () => { SP.files = SP.files.map(f => f.Name === "Flight_Ops_Planner_SUP2.xlsx" ? Object.assign({}, f, { TimeLastModified: "2026-10-28T14:00:00" }) : f); SP.listedAt = new Date(window.SP_NOW); }; return spRefreshDepts(); });
  const c = await card(page, "SUP 2"); assert.ok(/Today 14:00/.test(c.txt), c.txt);
  const g = await page.evaluate(() => ({ st: document.getElementById("spStatus").innerText, same: window.__hero === document.querySelector("#spPick .hero svg") }));
  assert.ok(/checked 14:40/.test(g.st), g.st); assert.ok(g.same, "the logo is not redrawn on a refresh");
}, BLANK);
test("refresh_failure_is_quiet", async ({ page }) => {
  await set(page, std(), ""); await show(page);
  await page.evaluate(() => { window.SP_NOW = "2026-10-28T14:47:00"; window.spList = async () => { throw new Error("offline"); }; return spRefreshDepts(); });
  let g = await page.evaluate(() => ({ warn: document.getElementById("spStatus").classList.contains("warn"), st: document.getElementById("spStatus").innerText, cards: document.querySelectorAll("#spGrid .dcard").length }));
  assert.ok(g.warn && /Couldn't check at 14:47/.test(g.st) && /seen at 14:32/.test(g.st), g.st); assert.strictEqual(g.cards, 7);
  await page.evaluate(() => { window.spList = async () => { SP.listedAt = new Date(window.SP_NOW); }; return spRefreshDepts(); });
  g = await page.evaluate(() => ({ warn: document.getElementById("spStatus").classList.contains("warn"), st: document.getElementById("spStatus").innerText }));
  assert.ok(!g.warn && /checked 14:47/.test(g.st), g.st);
}, BLANK);
test("timer_runs_only_while_open", async ({ page }) => {
  await set(page, std(), ""); await show(page);
  assert.strictEqual(typeof await page.evaluate(() => spDeptT), "number");
  await page.click("#spCancel"); assert.strictEqual(await page.evaluate(() => spDeptT), null);
  await show(page); assert.strictEqual(typeof await page.evaluate(() => spDeptT), "number");
  await page.evaluate(() => spShowPicker(false)); assert.strictEqual(await page.evaluate(() => spDeptT), null);
}, BLANK);
test("refresh_ignored_when_hidden", async ({ page }) => {
  await set(page, std(), ""); await show(page); await page.click("#spCancel");
  const n = await page.evaluate(async () => { window.__calls = 0; window.spList = async () => { window.__calls++; }; const before = document.getElementById("spGrid").innerHTML; await spRefreshDepts(); return { calls: window.__calls, same: before === document.getElementById("spGrid").innerHTML }; });
  assert.strictEqual(n.calls, 0); assert.ok(n.same);
}, BLANK);

test("a_temporary_error_does_not_hide_the_editor", async ({ page }) => {
  const r = await page.evaluate(async () => { SP.web = "https://x/sites/s"; SP.folder = "/sites/s/Program"; const urls = []; let n = 0;
    window.spJson = async u => { urls.push(u); n++; if (n === 1) { const e = new Error("busy"); e.status = 503; throw e; } return { d: { results: [{ Name: "A.xlsx", ServerRelativeUrl: "/x/A.xlsx", TimeLastModified: "2026-10-28T08:00:00", ModifiedBy: { Title: "R. Tan" } }] } }; };
    await spList(); const afterFirst = SP.noWho; await spList(); return { afterFirst, noWho: SP.noWho, by: SP.files[0].By, last: urls[urls.length - 1] }; });
  assert.strictEqual(r.afterFirst, false, "a 503 is not a refusal"); assert.strictEqual(r.noWho, false); assert.strictEqual(r.by, "R. Tan"); assert.ok(/\$expand/.test(r.last), "the editor is asked for again");
}, BLANK);
test("a_network_error_does_not_latch_either", async ({ page }) => {
  const r = await page.evaluate(async () => { SP.web = "https://x/sites/s"; SP.folder = "/sites/s/Program"; window.spJson = async () => { throw new Error("Failed to fetch"); };
    let threw = false; try { await spList(); } catch (e) { threw = true; } return { threw, noWho: SP.noWho }; });
  assert.ok(r.threw, "the failure still shows"); assert.strictEqual(r.noWho, false);
}, BLANK);
test("a_refresh_in_flight_cannot_undo_an_opening", async ({ page }) => {
  await set(page, std(), ""); await show(page);
  const r = await page.evaluate(async () => { let go; window.spList = () => new Promise(res => { go = res; }); const p = spRefreshDepts();
    document.querySelectorAll("#spGrid .dcard").forEach(b => (b.disabled = true)); spStopDepts(); go(); await p;
    return document.querySelectorAll("#spGrid .dcard:not(.miss):disabled").length; });
  assert.strictEqual(r, 7, "the cards stay disabled once an opening has started");
}, BLANK);
test("an_unchanged_refresh_keeps_the_focused_card", async ({ page }) => {
  await set(page, std(), ""); await show(page);
  const r = await page.evaluate(async () => { const c = document.querySelector("#spGrid .dcard"); c.focus(); window.SP_NOW = "2026-10-28T14:47:00"; window.spList = async () => { SP.listedAt = new Date(window.SP_NOW); };
    await spRefreshDepts(); return { same: document.activeElement === c, connected: c.isConnected, st: document.getElementById("spStatus").innerText }; });
  assert.ok(r.same && r.connected, "the focused card is still the same element"); assert.ok(/checked 14:47/.test(r.st), r.st);
}, BLANK);
test("ops_card_cuts_a_long_name", async ({ page }) => {
  const f = std(); f[7].Name = "Ops_Room_" + "x".repeat(200) + ".xlsx"; await set(page, f, ""); await show(page); await page.waitForTimeout(100);
  const g = await page.evaluate(() => { const m = document.querySelector("#spPick .opscard .m"), go = document.querySelector("#spPick .opscard .go"); return { ell: getComputedStyle(m).textOverflow, mr: m.getBoundingClientRect().right, gl: go.getBoundingClientRect().left, title: m.title }; });
  assert.strictEqual(g.ell, "ellipsis"); assert.ok(g.mr <= g.gl + 1, "text " + g.mr + " ends before the button " + g.gl); assert.ok(g.title.length > 10, "the full name is in the tooltip");
}, BLANK);

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
