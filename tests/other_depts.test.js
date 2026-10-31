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
