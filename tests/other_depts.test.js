// Other departments open by themselves + View only. Build first: python3 .lodestar_build.py dashboard
// Run: node tests/other_depts.test.js [name-filter]   (SharePoint is stubbed in the page)
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const BLANK = { blank: true };

test("can_edit_reads_the_low_bit", async ({ page }) => {
  const r = await page.evaluate(async () => {
    SP.web = "https://x/sites/s"; const out = [];
    for (const v of ["4", 4, "7", "3", 0]) { window.spJson = async () => ({ d: { EffectiveBasePermissions: { Low: v, High: "0" } } }); out.push(await spCanEdit("/x/A.xlsx")); }
    window.spJson = async () => { throw new Error("boom"); }; out.push(await spCanEdit("/x/A.xlsx"));
    window.spJson = async () => ({}); out.push(await spCanEdit("/x/A.xlsx"));
    return out; });
  assert.deepStrictEqual(r, [true, true, true, false, false, true, true]);
}, BLANK);
test("no_edit_book_is_read_only", async ({ page }) => {
  const r = await page.evaluate(() => {
    books[0].noEdit = true; updateSave();
    const before = books[0].dirty.size; put("Dashboard", "A5", 2030);
    return { may: mayEdit(0), save: getComputedStyle($("btnSave")).display, chip: getComputedStyle($("viewOnly")).display, chipTxt: $("viewOnly").textContent, ro: readOnly(), toast: $("toast").textContent, dirty: books[0].dirty.size - before }; });
  assert.strictEqual(r.may, false); assert.strictEqual(r.save, "none"); assert.notStrictEqual(r.chip, "none"); assert.strictEqual(r.chipTxt, "View only");
  assert.strictEqual(r.ro, true); assert.ok(/view access/.test(r.toast)); assert.strictEqual(r.dirty, 0);
});
test("edit_book_unchanged", async ({ page }) => {
  const r = await page.evaluate(() => { updateSave(); return { may: mayEdit(0), save: getComputedStyle($("btnSave")).display, chip: getComputedStyle($("viewOnly")).display, ro: readOnly() }; });
  assert.strictEqual(r.may, true); assert.notStrictEqual(r.save, "none"); assert.strictEqual(r.chip, "none"); assert.strictEqual(r.ro, false);
});
test("save_403_says_view_access", async ({ page }) => {
  const msg = await page.evaluate(async () => {
    let m = ""; window.alert = t => { m = t; };
    window.spJson = async () => { const e = new Error(spErr(403, "")); e.status = 403; throw e; };
    await spSave({ url: "/x/A.xlsx", name: "A.xlsx", modified: "" }, new Uint8Array(1)); return m; });
  assert.strictEqual(msg, "You only have view access to this file.");
});

// SharePoint stub: the demo xlsx files served by name through spFetch
const fs = require("fs"), path = require("path");
const { ROOT } = require("./lode_lib");
const NAMES = { sup1: "Flight_Ops_Planner_SUP1", sup2: "Flight_Ops_Planner_SUP2", tacco: "Flight_Ops_Planner_TACCO", loadmaster: "Flight_Ops_Planner_Loadmaster", pilot: "Flight_Ops_Planner_Pilot", masterplanner: "Master_Planner", dutyroster: "Duty_Roster", opsroom: "Ops_Room" };
const stub = async (page, o = {}) => {
  const data = {}; for (const [k, n] of Object.entries(NAMES)) data[n + ".xlsx"] = fs.readFileSync(path.join(ROOT, n + ".xlsx")).toString("base64");
  await page.evaluate(([data, o]) => {
    SP.on = true; SP.web = "https://x/sites/s"; SP.folder = "/sites/s/Program";
    SP.files = Object.keys(data).map(n => ({ Name: n, ServerRelativeUrl: "/sites/s/Program/" + n, TimeLastModified: "2026-10-30T08:00:00", By: "" }));
    window.spList = async () => { SP.listedAt = new Date(); };
    window.__fetches = []; window.__lat = [];
    window.spFetch = async f => { window.__fetches.push(f.Name); if (o.fail && f.Name === o.fail) throw new Error(f.Name + ": 404"); await new Promise(r => setTimeout(r, o.delay || 0)); window.__lat.push(books.length);
      const b = atob(data[f.Name]), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u.buffer; };
    window.spJson = async () => ({ d: { EffectiveBasePermissions: { Low: "7" } } });
  }, [data, o]);
};
const openSup2 = page => page.evaluate(async () => { await spOpenDept("SUP 2"); while (spOthersBusy) await new Promise(r => setTimeout(r, 20)); return books.map(b => b.S.dept); });

test("others_open_after_the_own_file", async ({ page }) => {
  await stub(page); const d = await openSup2(page);
  for (const x of ["SUP 1", "SUP 2", "TACCO", "Loadmaster", "Pilot"]) assert.ok(d.includes(x), x + " open: " + d.join());
  assert.strictEqual(d[0], "SUP 2");
}, BLANK);
test("own_file_shows_first", async ({ page }) => {
  await stub(page, { delay: 30 }); await openSup2(page);
  const lat = await page.evaluate(() => window.__lat);
  assert.strictEqual(lat[0], 0, "first fetch ran with nothing open"); assert.ok(lat.indexOf(1) >= 0 || lat.length > 4);
}, BLANK);
test("a_failed_department_is_skipped", async ({ page }) => {
  await stub(page, { fail: "Flight_Ops_Planner_TACCO.xlsx" }); const d = await openSup2(page);
  const t = await page.evaluate(() => $("toast").textContent);
  assert.ok(!d.includes("TACCO") && d.includes("SUP 1") && d.includes("Loadmaster") && d.includes("Pilot") && d[0] === "SUP 2", d.join());
  assert.ok(/TACCO/.test(t), t);
}, BLANK);
test("no_double_opening", async ({ page }) => {
  await stub(page, { delay: 10 });
  const r = await page.evaluate(async () => { await spOpenDept("SUP 2"); await Promise.all([spOpenOthers(books[0].WB), spOpenOthers(books[0].WB)]); while (spOthersBusy) await new Promise(r => setTimeout(r, 20)); return { f: window.__fetches.slice(), n: books.length }; });
  assert.strictEqual(r.f.length, new Set(r.f).size, r.f.join()); assert.strictEqual(r.n, 8);
}, BLANK);
test("button_hidden_on_sharepoint_shown_otherwise", async ({ page }) => {
  const r = await page.evaluate(() => $("btnAdd").style.display); assert.notStrictEqual(r, "none");
});
test("position_not_moved", async ({ page }) => {
  await stub(page); 
  const r = await page.evaluate(async () => { await spOpenDept("SUP 2"); cur.m = 3; const m = cur.m; const s0 = JSON.stringify(cur.sel); const bi = cur.b; while (spOthersBusy) await new Promise(r => setTimeout(r, 20)); return [cur.m === m, JSON.stringify(cur.sel) === s0, cur.b === bi]; });
  assert.deepStrictEqual(r, [true, true, true]);
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
