// Saved files stay valid for desktop Excel under awkward edits: cells added before / between / after existing ones, new rows
// past the end and between rows, self-closing rows, overwritten formula cells (also shared formulas, as desktop Excel writes
// them), merged cells cleared, very long and odd values. Every file is built as a save builds it and checked with
// tests/xlsx_check.py. Build the dashboard first. Run: node tests/xlsx_stress.test.js [name-filter]
const assert = require("assert");
const fs = require("fs"), os = require("os"), path = require("path");
const { execFileSync } = require("child_process");
const { boot } = require("./lode_lib");
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), "lodestar_stress_"));
const check = f => { try { execFileSync("python3", [path.join(__dirname, "xlsx_check.py"), f], { stdio: "pipe" }); return []; } catch (e) { return String(e.stdout).trim().split("\n").filter(l => !/files, \d+ problems/.test(l)); } };
const cellsPy = (f, refs) => JSON.parse(execFileSync("python3", ["-c", "import sys,json,openpyxl\nwb=openpyxl.load_workbook(sys.argv[1])\nfrom openpyxl.cell.cell import MergedCell\nprint(json.dumps(['(merged)' if isinstance(wb[s][r], MergedCell) else None if wb[s][r].value is None else str(wb[s][r].value) for s,r in json.loads(sys.argv[2])]))", f, JSON.stringify(refs)]).toString());
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// in the page: build book bi with the given edits (after an optional prepare(xml) -> xml on a sheet), return base64 bytes
const BUILD = `window.__build = (bi, edits) => withBook(bi, () => {
  const b = books[bi]; b.dirty.clear(); for (const [sheet, ref, val] of edits) b.dirty.set(sheet + "!" + ref, { sheet, ref, val });
  const built = logBuild(b, new Map(b.dirty)); b.dirty.clear(); let s = ""; const u = built.bytes;
  for (let k = 0; k < u.length; k += 0x8000) s += String.fromCharCode.apply(null, u.subarray(k, k + 0x8000));
  return btoa(s); });
window.__xml = (bi, sheet) => withBook(bi, () => td.decode(WB.files[WB.paths[sheet]]));
window.__setXml = (bi, sheet, x) => withBook(bi, () => { WB.files[WB.paths[sheet]] = te.encode(x); });`;
let N = 0;
const save = async (page, bi, edits) => { const b64 = await page.evaluate(([bi, e]) => __build(bi, e), [bi, edits]); const name = await page.evaluate(bi => books[bi].WB.name, bi); const f = path.join(OUT, (++N) + "_" + name); fs.writeFileSync(f, Buffer.from(b64, "base64")); return f; };
const books = page => page.evaluate(() => books.map((b, i) => ({ i, name: b.WB.name, sheets: Object.keys(b.WB.paths) })));

test("cells_added_in_every_position", async ({ page }) => {
  for (const b of await books(page)) {
    const sheet = b.sheets[0], x = await page.evaluate(([i, s]) => __xml(i, s), [b.i, sheet]);
    const rows = [...x.matchAll(/<row r="(\d+)"[^>]*?(\/?)>/g)].map(m => ({ r: +m[1], empty: m[2] === "/" }));
    const full = rows.find(r => !r.empty && new RegExp('<row r="' + r.r + '"[^>]*>(?:(?!</row>)[\\s\\S])*<c r="C' + r.r + '"').test(x)) || rows[0];
    const gap = rows.find((r, k) => k && r.r - rows[k - 1].r > 1), last = rows.length ? rows[rows.length - 1].r : 1, selfc = rows.find(r => r.empty);
    const edits = [[sheet, "A" + full.r, "first"], [sheet, "B" + full.r, "second"], [sheet, "XFD" + full.r, "last col"], [sheet, "AAA" + full.r, "far"],
      [sheet, "D" + (last + 5), "past the end"], [sheet, "C" + (last + 2), "past the end 2"]];
    if (gap) edits.push([sheet, "E" + (gap.r - 1), "in a gap"]);
    if (selfc) edits.push([sheet, "F" + selfc.r, "self-closing row"]);
    const f = await save(page, b.i, edits), probs = check(f);
    assert.deepStrictEqual(probs, [], b.name + ": " + probs.slice(0, 3).join(" | "));
    const got = cellsPy(f, edits.map(e => [e[0], e[1]]));
    assert.deepStrictEqual(got, edits.map((e, k) => got[k] === "(merged)" ? "(merged)" : e[2]), b.name + " values read back: " + JSON.stringify(edits.map((e, k) => [e[1], got[k]])));
  }
});

test("odd_values", async ({ page }) => {
  const vals = ["x".repeat(40000), "jet ✈ 😀 中文", "ctrl\u0001\u0008\u000b\u001fend", "=SUM(A1:A2)", "<b>&amp;\"'", " lead and trail ", "007", "1e5", "TRUE", 0, -1.5, 1e21, 1e-7, "\uD83D", "line\r\nbreak\ttab"];
  for (const b of await books(page)) {
    const sheet = b.sheets[0], edits = vals.map((v, k) => [sheet, "AZ" + (500 + k), v]);
    const f = await save(page, b.i, edits), probs = check(f);
    assert.deepStrictEqual(probs, [], b.name + ": " + probs.slice(0, 3).join(" | "));
    const got = cellsPy(f, edits.slice(1, 3).map(e => [e[0], e[1]]));
    assert.strictEqual(got[0], vals[1], "emoji kept");
  }
});

test("cleared_and_retyped_cells", async ({ page }) => {
  for (const b of await books(page)) {
    const sheet = b.sheets[0], x = await page.evaluate(([i, s]) => __xml(i, s), [b.i, sheet]);
    const vals = [...x.matchAll(/<c r="([A-Z]+\d+)"[^>]*t="(?:s|inlineStr)"[^>]*>/g)].slice(0, 20).map(m => m[1]);
    const merges = [...x.matchAll(/<mergeCell ref="([A-Z]+\d+):/g)].slice(0, 5).map(m => m[1]);
    const edits = vals.map(r => [sheet, r, ""]).concat(merges.map(r => [sheet, r, ""])).concat([[sheet, "Q900", ""]]);
    const f = await save(page, b.i, edits), probs = check(f);
    assert.deepStrictEqual(probs, [], b.name + ": " + probs.slice(0, 3).join(" | "));
    const f2 = await save(page, b.i, vals.map(r => [sheet, r, 12])), p2 = check(f2);
    assert.deepStrictEqual(p2, [], b.name + " retyped as numbers: " + p2.slice(0, 3).join(" | "));
  }
});

test("formula_cells_overwritten", async ({ page }) => {
  for (const b of await books(page)) {
    for (const sheet of b.sheets) {
      const x = await page.evaluate(([i, s]) => __xml(i, s), [b.i, sheet]);
      const fc = [...x.matchAll(/<c r="([A-Z]+\d+)"[^>]*><f>/g)].slice(0, 3).map(m => m[1]); if (!fc.length) continue;
      const f = await save(page, b.i, fc.map((r, k) => [sheet, r, k ? 5 : "typed over a formula"])), probs = check(f);
      assert.deepStrictEqual(probs, [], b.name + " " + sheet + ": " + probs.slice(0, 3).join(" | "));
      break;
    }
  }
});

test("shared_formula_master_overwritten_after_excel_saved", async ({ page }) => {
  // desktop Excel writes a formula filled down a column once (the master, with ref and si) and the cells below as <f t="shared" si/>.
  // Overwriting the master must not leave the cells below pointing at a formula that is gone.
  let tried = 0;
  for (const b of await books(page)) {
    for (const sheet of b.sheets) {
      let x = await page.evaluate(([i, s]) => __xml(i, s), [b.i, sheet]);
      // two formula cells straight below each other
      const all = [...x.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)><f>([^<]*)<\/f>/g)];
      const by = new Map(all.map(m => [m[1] + m[2], m]));
      const top = all.find(m => by.has(m[1] + (+m[2] + 1))); if (!top) continue;
      const below = by.get(top[1] + (+top[2] + 1)), si = "77";
      x = x.replace(top[0], '<c r="' + top[1] + top[2] + '"' + top[3] + '><f t="shared" ref="' + top[1] + top[2] + ":" + top[1] + (+top[2] + 1) + '" si="' + si + '">' + top[4] + "</f>")
           .replace(below[0], '<c r="' + below[1] + below[2] + '"' + below[3] + '><f t="shared" si="' + si + '"/>');
      await page.evaluate(([i, s, x]) => __setXml(i, s, x), [b.i, sheet, x]);
      assert.deepStrictEqual(check(await save(page, b.i, [])), [], "setup: the shared formula is valid before the edit");
      const f = await save(page, b.i, [[sheet, top[1] + top[2], "over the master"]]), probs = check(f);
      tried++;
      assert.deepStrictEqual(probs, [], b.name + " " + sheet + ": " + probs.slice(0, 2).join(" | "));
      // the cell below keeps its formula, moved down one row the way Excel would fill it
      const want = await page.evaluate(t => "=" + shiftFormula(t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&"), 0, 1), top[4]);
      const [m, d] = cellsPy(f, [[sheet, top[1] + top[2]], [sheet, below[1] + below[2]]]);
      assert.strictEqual(m, "over the master"); assert.strictEqual(d, want, "formula below");
      break;
    }
  }
  assert.ok(tried >= 4, "found formulas to share in " + tried + " files");
});

test("formula_shift", async ({ page }) => {
  const r = await page.evaluate(() => [
    shiftFormula("SUM(D13:AH13)", 0, 1), shiftFormula("$A$5+A5+$B6+C$7", 2, 3), shiftFormula('IF(A1="B2",LOG10(C3),\'Oct\'!D5)', 1, 1),
    shiftFormula("COUNTIF(Oct!$D$6:$AH$6,\"A1\")+PlanYear+1E5", 0, 4), shiftFormula("A1", -1, 0), shiftFormula("XFD1+ZZ9", 0, 1)]);
  assert.deepStrictEqual(r, ["SUM(D14:AH14)", "$A$5+C8+$B9+E$7", 'IF(B2="B2",LOG10(D4),\'Oct\'!E6)', 'COUNTIF(Oct!$D$6:$AH$6,"A1")+PlanYear+1E5', "#REF!", "XFD2+ZZ10"]);
});

(async () => {
  const only = process.argv[2]; let pass = 0, ran = 0;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue; ran++;
    const S = await boot({ today: "2026-11-03" });
    try { await S.page.evaluate(() => { OPS = true; }); await S.page.evaluate(BUILD); await t.fn(S); if (S.errs.some(e => /PAGEERROR/.test(e))) throw new Error(S.errs.join(" | ")); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 500)); }
    finally { await S.page.evaluate(() => books.forEach(b => b.dirty.clear())).catch(() => {}); await S.close(); }
  }
  console.log(pass + "/" + ran + " passed  (files in " + OUT + ")"); process.exit(pass === ran ? 0 : 1);
})();
