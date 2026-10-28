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
    window.spJson = async u => { urls.push(u); if (/\$expand/.test(u)) throw new Error("refused"); return { d: { results: [{ Name: "A.xlsx", ServerRelativeUrl: "/x/A.xlsx", TimeLastModified: "2026-10-28T08:00:00" }] } }; };
    await spList(); const first = urls.slice(); await spList(); return { first, second: urls.slice(first.length), noWho: SP.noWho, by: SP.files[0].By }; });
  assert.strictEqual(r.noWho, true); assert.strictEqual(r.by, "");
  assert.ok(r.first.some(u => /\$expand/.test(u)) && r.first.some(u => !/\$expand/.test(u)));
  assert.ok(r.second.length === 1 && !/\$expand/.test(r.second[0]), "no second try of the expand: " + r.second.join());
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
