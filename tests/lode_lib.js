// Test helper for the dashboard: opens the built Flight_Ops_Planner_Dashboard.html in Chromium with the demo Excel files.
// Env LODE_FILES = folder holding the 8 .xlsx files (default: the repo root). Never point it at live planning files that matter:
// the tests do not save, but keep a scratch copy anyway.
const { chromium } = require("playwright");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const FILES = process.env.LODE_FILES ? path.resolve(process.env.LODE_FILES) : ROOT;
// Env LODE_DUMP = folder: when a test closes its page, every open file with unsaved or saved edits is built the way a save
// builds it and written there (plus any file the page downloads), for tests/xlsx_check.py. Off unless set.
const DUMP = process.env.LODE_DUMP ? path.resolve(process.env.LODE_DUMP) : null;
let dumpN = 0;
const SUITE = path.basename(process.argv[1] || "test", ".test.js");
async function dumpBooks(page) {
  if (!DUMP) return;
  let got = [];
  try {
    got = await page.evaluate(() => {
      if (typeof books === "undefined") return [];
      const out = [], keep = typeof cur !== "undefined" ? cur.b : 0;
      books.forEach((b, i) => {
        if (!b.dirty.size && !(b.saved && b.saved.size)) return;
        try {
          useBook(i);
          if (S.hasCur && !S.kind && mayEdit(i)) curQuiet();
          syncQuiet();
          // which formula cells does this save overwrite? (a shared-formula master overwritten breaks a file Excel saved)
          const fo = []; for (const e of b.dirty.values()) { const p = WB.paths[e.sheet], x = p && WB.files[p] ? td.decode(WB.files[p]) : ""; const m = x && new RegExp('<c r="' + e.ref + '"[^>]*>(?:(?!</c>).)*?<f[ >/]').exec(x); if (m) fo.push(e.sheet + "!" + e.ref); }
          const built = logBuild(b, new Map(b.dirty)); let s = ""; const u = built.bytes;
          for (let k = 0; k < u.length; k += 0x8000) s += String.fromCharCode.apply(null, u.subarray(k, k + 0x8000));
          // the file's state in memory, for tests/reopen_check.js: a saved file opened again must read back the same
          let state = ""; try { state = JSON.stringify(b.S, (k, v) => k[0] === "_" ? undefined : v instanceof Map ? { "#map": [...v.entries()].sort((x, y) => String(x[0]) < String(y[0]) ? -1 : 1) } : v instanceof Set ? { "#set": [...v].sort() } : v); } catch (e) { }
          out.push({ name: b.WB.name, b64: btoa(s), n: b.dirty.size, fo, state });
        } catch (e) { out.push({ name: b.WB.name, err: String(e && e.message || e) }); }
      });
      try { if (books.length) useBook(keep); } catch (e) { }
      return out;
    });
  } catch (e) { return; }
  const fs = require("fs"); fs.mkdirSync(DUMP, { recursive: true });
  for (const g of got) {
    const base = SUITE + "_" + process.pid + "_" + (++dumpN) + "_" + g.name.replace(/\.xlsx$/i, "");
    if (g.err) fs.writeFileSync(path.join(DUMP, base + ".builderror.txt"), g.err);
    else fs.writeFileSync(path.join(DUMP, base + ".xlsx"), Buffer.from(g.b64, "base64"));
    if (g.state) fs.writeFileSync(path.join(DUMP, base + ".state.json"), g.state);
    if (g.fo && g.fo.length) fs.writeFileSync(path.join(DUMP, base + ".formula_overwrites.txt"), g.fo.join("\n"));
  }
}
const OTHERS = ["Duty_Roster", "Master_Planner", "Ops_Room", "Flight_Ops_Planner_SUP1", "Flight_Ops_Planner_TACCO", "Flight_Ops_Planner_Loadmaster", "Flight_Ops_Planner_Pilot"];

// boot({ today: "2026-10-26", title: "Sarah Lim", mine: "Flight_Ops_Planner_SUP2", others: true }) -> { page, errs, close }
async function boot(o = {}) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: o.viewport || { width: 1280, height: 720 }, acceptDownloads: true });
  const errs = [];
  if (DUMP) page.on("download", async d => { try { require("fs").mkdirSync(DUMP, { recursive: true }); await d.saveAs(path.join(DUMP, SUITE + "_" + process.pid + "_dl" + (++dumpN) + "_" + d.suggestedFilename())); } catch (e) { } });
  page.on("pageerror", e => errs.push("PAGEERROR " + e.message));
  page.on("console", m => { if (m.type() === "error") errs.push("console.error " + m.text()); });
  page.on("dialog", d => { errs.push("DIALOG " + d.message().slice(0, 160)); d.dismiss(); });
  const today = o.today || "2026-10-26";
  await page.addInitScript(t => { window.OPS_TODAY = t; window.CUR_TODAY = t; window.showSaveFilePicker = undefined; window.showOpenFilePicker = undefined; }, today);
  await page.goto("file://" + path.join(ROOT, "Flight_Ops_Planner_Dashboard.html"));
  if (o.blank) return { page, errs, close: async () => { await dumpBooks(page); await browser.close(); } };   // nothing opened: the start screen
  if (o.atomFirst) {   // an ATOM export as the very first file opened: nothing else is open yet
    await page.setInputFiles("#fileInput", o.atomFirst);
    await page.waitForFunction(() => typeof ATOMS !== "undefined" && ATOMS.length >= 1, null, { timeout: 20000 });
    return { page, errs, close: async () => { await dumpBooks(page); await browser.close(); } };
  }
  await page.setInputFiles("#fileInput", path.join(FILES, (o.mine || "Flight_Ops_Planner_SUP2") + ".xlsx"));
  await page.waitForFunction(() => typeof books !== "undefined" && books.length >= 1, null, { timeout: 20000 });
  if (o.others !== false) {
    const rest = OTHERS.filter(n => n !== o.mine).map(n => path.join(FILES, n + ".xlsx"));
    await page.setInputFiles("#fileInputMore", rest);
    await page.waitForFunction(n => books.length >= n, rest.length + 1, { timeout: 30000 });
  }
  if (o.atom && o.atom.length) {   // ATOM exports (made-up ones from tests/make_atom_fixture.py): opened last, through the same file input
    await page.setInputFiles("#fileInputMore", o.atom);
    await page.waitForFunction(n => typeof ATOMS !== "undefined" && ATOMS.length >= n, o.atom.length, { timeout: 20000 });
  }
  if (o.title !== undefined) await page.evaluate(t => { SP.user = { Title: t, Email: "" }; }, o.title);
  return { page, errs, close: async () => { await dumpBooks(page); await browser.close(); } };
}
// atomFixture({ variant, created, name }) -> path of a synthetic ATOM export in the temp folder
function atomFixture(o = {}) {
  const dir = path.join(os.tmpdir(), "lodestar_atom_fixtures"); require("fs").mkdirSync(dir, { recursive: true });
  const f = path.join(dir, (o.name || "ATOM_Export_" + (o.variant || "full") + "_" + String(o.created || "default").replace(/\W/g, "")) + ".xlsx");
  const args = [path.join(__dirname, "make_atom_fixture.py"), f];
  if (o.variant) args.push("--variant", o.variant);
  if (o.created) args.push("--created", o.created);
  execFileSync("python3", args);
  return f;
}
module.exports = { boot, ROOT, atomFixture, dumpBooks };
