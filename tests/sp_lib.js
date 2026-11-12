// Shared helpers for the tests that run the dashboard against the SharePoint mock (tests/spmock.js): one browser context per person.
const fs = require("fs"), os = require("os"), path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");
const { startMock } = require("./spmock");
const ROOT = path.resolve(__dirname, "..");
const FILES = process.env.LODE_FILES ? path.resolve(process.env.LODE_FILES) : ROOT;
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
const browser = async () => BROWSER || (BROWSER = await chromium.launch());
// one person: a browser context with their SharePoint name, opened on a department card (or "Ops Room")
async function person(m, name, dept, errs, o = {}) {
  const ctx = await (await browser()).newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addCookies([{ name: "spuser", value: name.replace(/ /g, "+"), url: m.origin }]);
  const page = await ctx.newPage();
  page.on("pageerror", e => errs.push(name + " PAGEERROR " + e.message));
  page.on("dialog", d => { errs.push(name + " DIALOG " + d.message().slice(0, 200)); page.__dialogs = (page.__dialogs || []).concat(d.message()); d.type() === "confirm" && page.__confirm ? d.accept() : d.dismiss(); });
  await page.addInitScript(t => { window.OPS_TODAY = t; window.CUR_TODAY = t; }, o.today || "2026-10-26");
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

// run a list of { name, fn({ m, errs }) } tests, each on a fresh mock holding the folder's files; LODE_DUMP gets the saved files
async function runTests(tests, suite, mockOpts) {
  const only = process.argv[2]; let pass = 0, ran = 0;
  await browser();
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue; ran++;
    const m = await startMock(Object.assign({ files: folderFiles(), secondClock: !process.env.SPMOCK_MS }, mockOpts || {})), errs = [];
    try { await t.fn({ m, errs }); const bad = errs.filter(e => /PAGEERROR/.test(e)); if (bad.length) throw new Error(bad.join(" | ")); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 400) + (errs.length ? "  [" + errs.join(" | ").slice(0, 300) + "]" : "")); }
    finally {
      if (process.env.LODE_DUMP) { fs.mkdirSync(process.env.LODE_DUMP, { recursive: true }); for (const n of new Set(m.saves().map(e => /url='([^']+)'/.exec(e.path)[1]))) if (m.file(n)) fs.writeFileSync(path.join(process.env.LODE_DUMP, suite + "_" + t.name + "_" + n), m.file(n)); }
      for (const c of BROWSER.contexts()) await c.close(); await m.close();
    }
  }
  await BROWSER.close();
  console.log(pass + "/" + ran + " passed"); process.exit(pass === ran ? 0 : 1);
}
module.exports = { ROOT, FILES, folderFiles, cells, person, cellOf, code, edit, seen, saved, live, sleep, runTests };
