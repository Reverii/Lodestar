// Crew Roster order (z155): insert a row, move a person, sort a section, SANS and NSMEN as two groups. Build the dashboard first.
// Uses the repo's demo set (or LODE_FILES); nothing is saved to disk: the saved bytes are re-read in the page.
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const openRoster = page => page.evaluate(() => document.querySelector("nav.tabs button[data-v='roster']").click());
const menu = async (page, i, k) => { await page.click("#rosterTable tr[data-ri='" + i + "'] td.n", { button: "right" }); if (k != null) await page.click("#opsCtx button[data-k='" + k + "']"); };
const ids = (page, n) => page.evaluate(n => S.roster.slice(0, n).map(p => p.id), n);
const plan = (page, i) => page.evaluate(i => S.m.map(M => M.grid.slice(gridRow(i, 0), gridRow(i, rp())).map(r => r.join(",")).join("|")).join("#"), i);
const roundTrip = page => page.evaluate(() => { const bk = books[cur.b], bytes = logBuild(bk, new Map(bk.dirty)).bytes; bk.dirty = new Map();
  reparseBook(cur.b, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)); useBook(cur.b); renderAll(); });

test("insert_above_moves_everyone_below_with_their_plans", async ({ page }) => {
  await openRoster(page);
  const pf = await plan(page, 3), pe = await plan(page, 4), po = await plan(page, 5);
  await menu(page, 3, 0);
  assert.deepStrictEqual(await ids(page, 7), ["VIPER", "HAWK", "RAPTOR", "", "FALCON", "EAGLE", "OWL"]);
  assert.strictEqual(await plan(page, 4), pf); assert.strictEqual(await plan(page, 5), pe); assert.strictEqual(await plan(page, 6), po);
  assert.ok(/^[,|#]*$/.test(await plan(page, 3)), "the new row has no plan");
  assert.strictEqual(await page.evaluate(() => document.activeElement.dataset.r), "3", "the new row's callsign box has the focus");
  await roundTrip(page);
  assert.deepStrictEqual(await ids(page, 7), ["VIPER", "HAWK", "RAPTOR", "", "FALCON", "EAGLE", "OWL"], "saved order");
  assert.strictEqual(await plan(page, 4), pf, "saved plans");
});
test("insert_below_the_last_person", async ({ page }) => {
  await openRoster(page);
  await menu(page, 5, 1);
  assert.deepStrictEqual(await ids(page, 8), ["VIPER", "HAWK", "RAPTOR", "FALCON", "EAGLE", "OWL", "", ""]);
});
test("change_log_gets_one_line", async ({ page }) => {
  await openRoster(page);
  await menu(page, 3, 0);
  const L = await page.evaluate(() => logLines(books[cur.b], new Map(books[cur.b].dirty)).map(x => x[4]));
  assert.deepStrictEqual(L, ["Crew Roster: row added above FALCON (crew below it moved with their plans)"]);
});
test("move_up_and_down_swap_with_plans", async ({ page }) => {
  await openRoster(page);
  const pf = await plan(page, 3), pr = await plan(page, 2);
  await menu(page, 3, 2);
  assert.deepStrictEqual(await ids(page, 4), ["VIPER", "HAWK", "FALCON", "RAPTOR"]);
  assert.strictEqual(await plan(page, 2), pf); assert.strictEqual(await plan(page, 3), pr);
  await menu(page, 2, 3);
  assert.deepStrictEqual(await ids(page, 4), ["VIPER", "HAWK", "RAPTOR", "FALCON"]);
});
test("move_up_is_greyed_for_the_first_person", async ({ page }) => {
  await openRoster(page);
  await menu(page, 0);
  assert.strictEqual(await page.evaluate(() => document.querySelector("#opsCtx button[data-k='2']").disabled), true);
});
test("comments_follow_the_person", async ({ page }) => {
  await openRoster(page);
  await page.evaluate(() => { withBook(cur.b, () => setNote(9, gridRow(4, 1), 6, "Brief at 0700")); });
  await menu(page, 4, 2);   // EAGLE up to row 3
  assert.strictEqual(await page.evaluate(() => S.notes.get("9:" + gridRow(3, 1) + ":6")), "Brief at 0700");
  assert.strictEqual(await page.evaluate(() => S.notes.get("9:" + gridRow(4, 1) + ":6") || ""), "");
  await roundTrip(page);
  assert.strictEqual(await page.evaluate(() => S.roster[3].id + "|" + S.notes.get("9:" + gridRow(3, 1) + ":6")), "EAGLE|Brief at 0700");
});
test("personnel_info_and_currency_move", async ({ page }) => {
  await openRoster(page);
  await page.evaluate(() => { put("Personnel Info", "F9", "S1234567A"); if (S.hasCur) { S.curBase[3][0] = 46300; put("Currency", "D" + (CUR_ROW0 + 3), 46300); } });   // FALCON is row 9 (index 3)
  await menu(page, 3, 0);
  const r = await page.evaluate(() => [cellsNow("Personnel Info").F10, cellsNow("Personnel Info").F9 || "", S.hasCur ? cellsNow("Currency")["D" + (CUR_ROW0 + 4)] : 46300, S.hasCur ? S.curBase[4][0] : 46300]);
  assert.deepStrictEqual(r, ["S1234567A", "", 46300, 46300]);
});
test("sort_by_cat_then_rank", async ({ page }) => {
  await openRoster(page);
  await page.evaluate(() => { // made-up crew in the page, out of order
    Object.assign(S.roster[6], { id: "SHRIKE", name: "LTA Daniel Tan", cat: "CAT C", role: "Junior", status: "Active" });
    Object.assign(S.roster[7], { id: "MERLIN", name: "CPT Aisha Rahman", cat: "CAT B", role: "Senior CAT A", status: "Active" });
    Object.assign(S.roster[8], { id: "ROBIN", name: "ME2 Jason Lee", cat: "CAT D", role: "Junior", status: "Active" }); renderRoster(); });
  await menu(page, 0, 4);
  assert.ok(await page.evaluate(() => $("rosSort").style.display === "flex"));
  assert.ok(/7 crew move/.test(await page.evaluate(() => $("rosSortInfo").innerText)), await page.evaluate(() => $("rosSortInfo").innerText));
  await page.click("#rosSortGo");
  assert.deepStrictEqual(await ids(page, 9), ["VIPER", "HAWK", "MERLIN", "RAPTOR", "SHRIKE", "FALCON", "EAGLE", "ROBIN", "OWL"]);
});
test("rank_order_officers_wose_mes", async ({ page }) => {
  const r = await page.evaluate(() => ["LTC A", "MAJ B", "CPT C", "LTA D", "1WO E", "3SG F", "ME3 G", "ME1 H", "CPT (NS) I", "MR J"].map(n => rankOf({ name: n })));
  assert.deepStrictEqual(r, [0, 1, 2, 3, 4, 11, 12, 14, 2, 99]);
});
test("sans_and_nsmen_are_two_groups", async ({ page }) => {
  await openRoster(page);
  const bands = await page.evaluate(() => [...document.querySelectorAll("#rosterTable tr.sansSep")].map(t => t.innerText.split(" (")[0].trim()));
  assert.deepStrictEqual(bands, ["SANS", "NSMEN"]);
  const nx = await page.$("#rosterTable tr[data-grp='SANS']:has(input[placeholder='next SANS']) input[data-f='name']");
  await nx.fill("ME2 Lim Jia Hui"); await nx.press("Tab");
  const st = await page.evaluate(() => S.roster.find(p => p.name === "ME2 Lim Jia Hui").status);
  assert.strictEqual(st, "SANS");
});
test("insert_in_the_nsmen_group_keeps_the_status", async ({ page }) => {
  await openRoster(page);
  const i = await page.evaluate(() => S.roster.findIndex(p => p.id === "TALON"));
  await menu(page, i, 0);
  const r = await page.evaluate(i => [S.roster[i].status, S.roster[i].name, S.roster[i + 1].id], i);
  assert.deepStrictEqual(r, ["NSMEN", "", "TALON"]);
});
test("planner_shows_sans_then_nsmen", async ({ page }) => {
  await page.evaluate(() => { document.querySelector("nav.tabs button[data-v='plan']").click(); renderPlanner(); });
  const t = await page.evaluate(() => [...document.querySelectorAll("#plan tr.sansSep, #plan td.idc")].map(e => e.innerText.trim()).filter(x => /^(SANS|NSMEN|KESTREL|TALON)$/.test(x)));
  assert.deepStrictEqual(t, ["SANS", "KESTREL", "NSMEN", "TALON"]);
});
test("undo_puts_the_order_back", async ({ page }) => {
  await openRoster(page);
  await menu(page, 3, 0); await page.waitForTimeout(300);
  await page.evaluate(() => undo());
  assert.deepStrictEqual(await ids(page, 6), ["VIPER", "HAWK", "RAPTOR", "FALCON", "EAGLE", "OWL"]);
  assert.strictEqual(await page.evaluate(() => books[cur.b].dirty.size), 0);
});
test("view_only_has_no_menu", async ({ page }) => {
  await page.evaluate(() => { books[cur.b].noEdit = true; document.querySelector("nav.tabs button[data-v='roster']").click(); });
  await page.click("#rosterTable tr[data-ri='3'] td.n", { button: "right" });
  assert.strictEqual(await page.evaluate(() => !!document.getElementById("opsCtx")), false);
});

(async () => {
  const only = process.argv[2];
  let pass = 0, ran = 0;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue;
    ran++; let S = null;
    try { S = await boot(Object.assign({ today: "2026-10-26" }, t.opts)); await t.fn(S); if (S.errs.length) throw new Error("page errors: " + S.errs.join(" | ").slice(0, 300)); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 300)); }
    if (S) await S.close();
  }
  console.log(pass + "/" + ran + " pass");
  process.exit(pass === ran ? 0 : 1);
})();
