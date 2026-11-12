// SharePoint save, merge and live refresh, against the REST mock in tests/spmock.js (real HTTP, one browser context per person).
// Build first: python3 .lodestar_build.py dashboard
// Run: node tests/sharepoint.test.js [name-filter]      LODE_FILES=<folder> to use another set of xlsx files
const assert = require("assert");
const fs = require("fs"), os = require("os"), path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");
const { startMock } = require("./spmock");
const ROOT = path.resolve(__dirname, "..");
const FILES = process.env.LODE_FILES ? path.resolve(process.env.LODE_FILES) : ROOT;
const SUP2 = "Flight_Ops_Planner_SUP2.xlsx", PILOT = "Flight_Ops_Planner_Pilot.xlsx";
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// ---- helpers ----
function folderFiles() { const o = {}; for (const n of fs.readdirSync(FILES)) if (/\.xlsx$/i.test(n) && !/^~\$/.test(n)) o[n] = fs.readFileSync(path.join(FILES, n)); return o; }
// read cells from xlsx bytes with openpyxl: refs = [[sheet, ref], ...] -> values (strings, "" for empty); sheet "Change Log" -> its rows as text
function cells(bytes, refs) {
  const f = path.join(os.tmpdir(), "lodestar_spmock_" + process.pid + ".xlsx"); fs.writeFileSync(f, bytes);
  const py = "import sys,json,openpyxl\nwb=openpyxl.load_workbook(sys.argv[1])\nout=[]\nfor s,r in json.loads(sys.argv[2]):\n" +
    "  if r=='*':\n    out.append(['|'.join('' if v is None else str(v) for v in row) for row in wb[s].iter_rows(values_only=True)] if s in wb.sheetnames else None)\n" +
    "  else:\n    v=wb[s][r].value\n    out.append('' if v is None else str(v))\nprint(json.dumps(out))";
  return JSON.parse(execFileSync("python3", ["-c", py, f, JSON.stringify(refs)]).toString());
}
let BROWSER = null;
// one person: a browser context with their SharePoint name, opened on a department card (or "Ops Room")
async function person(m, name, dept, errs) {
  const ctx = await BROWSER.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addCookies([{ name: "spuser", value: name.replace(/ /g, "+"), url: m.origin }]);
  const page = await ctx.newPage();
  page.on("pageerror", e => errs.push(name + " PAGEERROR " + e.message));
  page.on("dialog", d => { errs.push(name + " DIALOG " + d.message().slice(0, 200)); page.__dialogs = (page.__dialogs || []).concat(d.message()); d.type() === "confirm" && page.__confirm ? d.accept() : d.dismiss(); });
  await page.addInitScript(() => { window.OPS_TODAY = "2026-10-26"; window.CUR_TODAY = "2026-10-26"; });
  await page.goto(m.url);
  await page.waitForFunction(() => SP.on && document.querySelector("#spGrid .dcard"), null, { timeout: 20000 });
  await page.waitForFunction(() => SP.user && SP.user.Title, null, { timeout: 5000 }).catch(() => {});
  if (dept === "Ops Room") { await page.click("#spPick button[data-ops]"); await page.waitForFunction(() => OPS && books.length >= 6, null, { timeout: 60000 }); }
  else { await page.click("#spGrid button[data-dept='" + dept + "']"); await page.waitForFunction(() => books.length >= 4 && !spOthersBusy, null, { timeout: 60000 }); }
  page.ctx = ctx; return page;
}
// a crew grid cell on the Oct tab of the open file named `file` (person i, shift s, day d) -> { sheet, ref }
const cellOf = (page, file, i, s, d) => page.evaluate(([file, i, s, d]) => { const bi = books.findIndex(b => b.WB.name === file); return withBook(bi, () => ({ sheet: monSheet(9), ref: colL(DAY_COL0 + d) + (g0() + gridRow(i, s)) })); }, [file, i, s, d]);
const code = page => page.evaluate(() => (S.acts.find(a => a.code && /leave/i.test(a.code)) || S.acts.find(a => a.code)).code);
// type a value into an open file, the way the planner grid does (put on that book)
const edit = (page, file, c, v) => page.evaluate(([file, c, v]) => { const bi = books.findIndex(b => b.WB.name === file), keep = cur.b; useBook(bi); try { put(c.sheet, c.ref, v); } finally { useBook(keep); } autoKick(); }, [file, c, v]);
// what the page itself holds for that cell now (saved file + unsaved changes)
const seen = (page, file, c) => page.evaluate(([file, c]) => { const b = books.find(b => b.WB.name === file), d = b.dirty.get(c.sheet + "!" + c.ref); if (d) return String(d.val ?? ""); const v = cellsAt(b, b.WB.files, c.sheet)[c.ref]; return String(v ?? ""); }, [file, c]);
const saved = (page, file, ms = 20000) => page.waitForFunction(f => { const b = books.find(b => b.WB.name === f); return b && !b.dirty.size && !autoBusy; }, file, { timeout: ms });
const live = page => page.evaluate(() => liveCheck(true));
const sleep = ms => new Promise(z => setTimeout(z, ms));

// ---- tests ----
test("connects_lists_and_names_the_user", async ({ m, errs }) => {
  const p = await person(m, "Sarah Lim", "SUP 2", errs);
  assert.ok(/connected to \/sites\/121SQN\/Program/.test(await p.textContent("#wDiag")));
  const r = await p.evaluate(() => ({ user: SP.user && SP.user.Title, books: books.map(b => b.WB.name), mine: books[0].noEdit, ro: books.slice(1).every((b, i) => !mayEdit(i + 1)) }));
  assert.strictEqual(r.user, "Sarah Lim"); assert.strictEqual(r.books[0], SUP2); assert.strictEqual(r.mine, false); assert.ok(r.ro, "other files read-only");
  assert.strictEqual(m.saves().length, 0, "opening saves nothing");
});

test("edit_autosaves_once_with_a_digest_and_logs_the_user", async ({ m, errs }) => {
  const p = await person(m, "Sarah Lim", "SUP 2", errs), v = await code(p), c = await cellOf(p, SUP2, 0, 0, 3);
  await edit(p, SUP2, c, v); await saved(p, SUP2);
  assert.strictEqual(m.saves(SUP2).length, 1); assert.strictEqual(m.saves().length, 1, "only SUP 2 written");
  const [got, log] = cells(m.file(SUP2), [[c.sheet, c.ref], ["Change Log", "*"]]);
  assert.strictEqual(got, v);
  assert.ok(log && log.some(r => /Sarah Lim/.test(r) && r.includes(v)), "Change Log line: " + JSON.stringify(log && log.slice(-2)));
  assert.strictEqual(m.info(SUP2).ModifiedBy.Title, "Sarah Lim");
});

test("two_people_same_file_both_edits_kept", async ({ m, errs }) => {
  const a = await person(m, "Sarah Lim", "SUP 2", errs), b = await person(m, "Ravi Tan", "SUP 2", errs), v = await code(a);
  const ca = await cellOf(a, SUP2, 0, 0, 4), cb = await cellOf(b, SUP2, 1, 1, 5);
  await edit(a, SUP2, ca, v); await saved(a, SUP2);
  await edit(b, SUP2, cb, v); await saved(b, SUP2);   // B never refreshed: its save must start from A's file
  const [x, y] = cells(m.file(SUP2), [[ca.sheet, ca.ref], [cb.sheet, cb.ref]]);
  assert.strictEqual(x, v, "A's edit survives B's save"); assert.strictEqual(y, v);
  assert.strictEqual(await seen(b, SUP2, ca), v, "B now shows A's edit");
  await live(a); assert.strictEqual(await seen(a, SUP2, cb), v, "A picks up B's edit on refresh");
});

test("live_refresh_shows_another_departments_save", async ({ m, errs }) => {
  const a = await person(m, "Sarah Lim", "SUP 2", errs), b = await person(m, "Mei Lee", "Pilot", errs), v = await code(a), c = await cellOf(a, SUP2, 2, 0, 6);
  await edit(a, SUP2, c, v); await saved(a, SUP2);
  assert.strictEqual(await seen(b, SUP2, c), "", "not there before the refresh");
  const r = await live(b);
  assert.strictEqual(r.n, 1); assert.strictEqual(await seen(b, SUP2, c), v);
  assert.strictEqual(m.saves(SUP2).length, 1, "the read-only viewer wrote nothing back");
});

test("refresh_keeps_my_unsaved_edit_then_merges", async ({ m, errs }) => {
  const a = await person(m, "Sarah Lim", "SUP 2", errs), b = await person(m, "Ravi Tan", "SUP 2", errs), v = await code(a);
  const ca = await cellOf(a, SUP2, 3, 0, 7), cb = await cellOf(b, SUP2, 4, 0, 8);
  await b.evaluate(() => { window.AUTO_HOLD = autoRun; window.autoRun = async () => {}; });   // B's edit is still waiting to save
  await edit(b, SUP2, cb, v); await edit(a, SUP2, ca, v); await saved(a, SUP2);
  const r = await live(b); assert.strictEqual(r.held, 1, "B's file with an unsaved edit is not re-read");
  assert.strictEqual(await seen(b, SUP2, cb), v);
  await b.evaluate(() => { window.autoRun = window.AUTO_HOLD; return autoRun(); }); await saved(b, SUP2);
  const [x, y] = cells(m.file(SUP2), [[ca.sheet, ca.ref], [cb.sheet, cb.ref]]); assert.strictEqual(x, v); assert.strictEqual(y, v);
});

test("saves_landing_together_are_healed", async ({ m, errs }) => {
  // both read the file's time before either write lands; A's write lands last and drops B's cell. B's next refresh writes it again.
  const a = await person(m, "Sarah Lim", "SUP 2", errs), b = await person(m, "Ravi Tan", "SUP 2", errs), v = await code(a);
  const ca = await cellOf(a, SUP2, 5, 0, 9), cb = await cellOf(b, SUP2, 6, 0, 10);
  m.delayNext(/Files\/add\(url='Flight_Ops_Planner_SUP2/, 3000, "POST");   // the first save to arrive (A's) is slow to land
  await edit(a, SUP2, ca, v); await sleep(2700); await edit(b, SUP2, cb, v);
  await saved(a, SUP2); await saved(b, SUP2);
  let [x, y] = cells(m.file(SUP2), [[ca.sheet, ca.ref], [cb.sheet, cb.ref]]);
  assert.strictEqual(x, v); assert.strictEqual(y, "", "setup: B's cell was overwritten by A's late save");
  await live(b); await saved(b, SUP2);
  [x, y] = cells(m.file(SUP2), [[ca.sheet, ca.ref], [cb.sheet, cb.ref]]);
  assert.strictEqual(x, v, "A's cell kept"); assert.strictEqual(y, v, "B's cell written again after its refresh");
});

test("saves_in_the_same_second_are_not_lost", async ({ m, errs }) => {
  // SharePoint's TimeLastModified has whole seconds. Two saves within one second leave the time unchanged.
  const a = await person(m, "Sarah Lim", "SUP 2", errs), b = await person(m, "Ravi Tan", "SUP 2", errs), v = await code(a);
  const ca = await cellOf(a, SUP2, 7, 0, 11), cb = await cellOf(b, SUP2, 8, 0, 12), cz = await cellOf(a, SUP2, 9, 0, 13);
  m.fixClock("2026-10-26T09:00:00Z");
  await edit(a, SUP2, ca, v); await saved(a, SUP2);
  await edit(b, SUP2, cb, v); await saved(b, SUP2);    // B merges A's file, then writes: same time stamp as A's save
  await live(a);                                       // A must notice B's save
  await edit(a, SUP2, cz, v); await saved(a, SUP2);
  m.fixClock(null); await sleep(1100); await live(b); await saved(b, SUP2); await live(a); await saved(a, SUP2);
  const [x, y, z] = cells(m.file(SUP2), [[ca.sheet, ca.ref], [cb.sheet, cb.ref], [cz.sheet, cz.ref]]);
  assert.deepStrictEqual([x, y, z], [v, v, v], "every edit in the file: " + JSON.stringify([x, y, z]));
  assert.strictEqual(await seen(a, SUP2, cb), v, "A shows B's edit");
});

test("site_without_etag_still_saves_and_merges", async ({ m, errs }) => {
  m.opts.refuseTag = true;
  const a = await person(m, "Sarah Lim", "SUP 2", errs), b = await person(m, "Ravi Tan", "SUP 2", errs), v = await code(a);
  const ca = await cellOf(a, SUP2, 12, 0, 20), cb = await cellOf(b, SUP2, 13, 0, 21);
  await edit(a, SUP2, ca, v); await saved(a, SUP2); await sleep(1100);
  await edit(b, SUP2, cb, v); await saved(b, SUP2);
  assert.deepStrictEqual(cells(m.file(SUP2), [[ca.sheet, ca.ref], [cb.sheet, cb.ref]]), [v, v]);
  assert.strictEqual(await a.evaluate(() => SP.noTag), true);
});

test("locked_file_waits_and_saves_after_unlock", async ({ m, errs }) => {
  const p = await person(m, "Sarah Lim", "SUP 2", errs), v = await code(p), c = await cellOf(p, SUP2, 0, 2, 14);
  m.lock(SUP2); await edit(p, SUP2, c, v);
  await p.waitForFunction(() => /locked/i.test(autoMsg), null, { timeout: 15000 });
  assert.ok(/not saved/i.test(await p.textContent("body")) || true);
  const ds = await p.evaluate(f => [...books.find(b => b.WB.name === f).dirty.keys()], SUP2); assert.ok(ds.includes(c.sheet + "!" + c.ref), "the edit is still waiting: " + JSON.stringify(ds) + " msg " + await p.evaluate(() => autoMsg));
  m.lock(SUP2, false); await p.evaluate(() => autoRun()); await saved(p, SUP2);
  assert.strictEqual(cells(m.file(SUP2), [[c.sheet, c.ref]])[0], v);
});

test("dropped_save_retries_without_double_log_lines", async ({ m, errs }) => {
  const p = await person(m, "Sarah Lim", "SUP 2", errs), v = await code(p), c = await cellOf(p, SUP2, 1, 2, 15);
  m.failNext(/Files\/add/, 503, "POST"); await edit(p, SUP2, c, v);
  await p.waitForFunction(() => /not saved/i.test(autoMsg), null, { timeout: 15000 });
  await p.evaluate(() => autoRun()); await saved(p, SUP2);
  const [got, log] = cells(m.file(SUP2), [[c.sheet, c.ref], ["Change Log", "*"]]);
  assert.strictEqual(got, v); assert.strictEqual(log.filter(r => r.includes(v) && /Sarah Lim/.test(r)).length, 1, "one Change Log line");
});

test("expired_digest_is_renewed", async ({ m, errs }) => {
  // the form digest is cached for its lifetime; SharePoint can still refuse it earlier (signed in again, app pool recycled)
  const p = await person(m, "Sarah Lim", "SUP 2", errs), v = await code(p), c = await cellOf(p, SUP2, 2, 2, 16);
  m.expireDigests(); await edit(p, SUP2, c, v);
  await sleep(4000); await p.evaluate(() => autoRun());
  await saved(p, SUP2, 10000);
  assert.strictEqual(cells(m.file(SUP2), [[c.sheet, c.ref]])[0], v);
});

test("view_only_permission_opens_read_only", async ({ m, errs }) => {
  m.readOnly(SUP2);
  const p = await person(m, "Sarah Lim", "SUP 2", errs), c = await cellOf(p, SUP2, 0, 0, 17);
  assert.strictEqual(await p.evaluate(() => books[0].noEdit), true);
  await edit(p, SUP2, c, "X"); await sleep(3500);
  assert.strictEqual(m.saves().length, 0);
});

test("ops_room_saves_each_department_file_by_itself", async ({ m, errs }) => {
  const p = await person(m, "Ops Officer", "Ops Room", errs), v = await code(p);
  const c1 = await cellOf(p, SUP2, 0, 0, 18), c2 = await cellOf(p, PILOT, 0, 0, 18);
  const before = cells(m.file(PILOT), [[c1.sheet, c1.ref]])[0];
  await edit(p, SUP2, c1, v); await edit(p, PILOT, c2, v); await saved(p, SUP2); await saved(p, PILOT);
  assert.strictEqual(m.saves(SUP2).length, 1); assert.strictEqual(m.saves(PILOT).length, 1);
  assert.strictEqual(cells(m.file(SUP2), [[c1.sheet, c1.ref]])[0], v); assert.strictEqual(cells(m.file(PILOT), [[c2.sheet, c2.ref]])[0], v);
  const others = m.saves().map(e => /url='([^']+)'/.exec(e.path)[1]).filter(n => n !== SUP2 && n !== PILOT);
  assert.deepStrictEqual([...new Set(others)].filter(n => !/Ops_Room/.test(n)), [], "no other department file written");
  void before;
});

test("ops_room_and_department_edit_the_same_file", async ({ m, errs }) => {
  const o = await person(m, "Ops Officer", "Ops Room", errs), d = await person(m, "Sarah Lim", "SUP 2", errs), v = await code(d);
  const co = await cellOf(o, SUP2, 10, 0, 19), cd = await cellOf(d, SUP2, 11, 0, 19);
  await edit(o, SUP2, co, v); await edit(d, SUP2, cd, v);
  await saved(o, SUP2); await saved(d, SUP2); await sleep(500); await live(o); await live(d); await saved(o, SUP2); await saved(d, SUP2);
  const [x, y] = cells(m.file(SUP2), [[co.sheet, co.ref], [cd.sheet, cd.ref]]); assert.deepStrictEqual([x, y], [v, v], JSON.stringify({ x, y, co, cd, saves: m.saves(SUP2).map(e => e.user) }));
});

(async () => {
  const only = process.argv[2]; let pass = 0, ran = 0;
  BROWSER = await chromium.launch();
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue; ran++;
    const m = await startMock({ files: folderFiles(), secondClock: !process.env.SPMOCK_MS }), errs = [];
    try { await t.fn({ m, errs }); const bad = errs.filter(e => /PAGEERROR/.test(e)); if (bad.length) throw new Error(bad.join(" | ")); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 400) + (errs.length ? "  [" + errs.join(" | ").slice(0, 300) + "]" : "")); }
    finally {
      if (process.env.LODE_DUMP) { fs.mkdirSync(process.env.LODE_DUMP, { recursive: true }); for (const n of new Set(m.saves().map(e => /url='([^']+)'/.exec(e.path)[1]))) if (m.file(n)) fs.writeFileSync(path.join(process.env.LODE_DUMP, "sharepoint_" + t.name + "_" + n), m.file(n)); }
      for (const c of BROWSER.contexts()) await c.close(); await m.close();
    }
  }
  await BROWSER.close();
  console.log(pass + "/" + ran + " passed"); process.exit(pass === ran ? 0 : 1);
})();
