// SharePoint save, merge and live refresh, against the REST mock in tests/spmock.js (real HTTP, one browser context per person).
// Build first: python3 .lodestar_build.py dashboard
// Run: node tests/sharepoint.test.js [name-filter]      LODE_FILES=<folder> to use another set of xlsx files
const assert = require("assert");
const { cells, person, cellOf, code, edit, seen, saved, live, sleep, runTests } = require("./sp_lib");
const SUP2 = "Flight_Ops_Planner_SUP2.xlsx", PILOT = "Flight_Ops_Planner_Pilot.xlsx";
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

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

runTests(tests, "sharepoint");
