// Test helper for the dashboard: opens the built Flight_Ops_Planner_Dashboard.html in Chromium with the demo Excel files.
// Env LODE_FILES = folder holding the 8 .xlsx files (default: the repo root). Never point it at live planning files that matter:
// the tests do not save, but keep a scratch copy anyway.
const { chromium } = require("playwright");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const FILES = process.env.LODE_FILES ? path.resolve(process.env.LODE_FILES) : ROOT;
const OTHERS = ["Duty_Roster", "Master_Planner", "Ops_Room", "Flight_Ops_Planner_SUP1", "Flight_Ops_Planner_TACCO", "Flight_Ops_Planner_Loadmaster", "Flight_Ops_Planner_Pilot"];

// boot({ today: "2026-10-26", title: "Sarah Lim", mine: "Flight_Ops_Planner_SUP2", others: true }) -> { page, errs, close }
async function boot(o = {}) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, acceptDownloads: true });
  const errs = [];
  page.on("pageerror", e => errs.push("PAGEERROR " + e.message));
  page.on("console", m => { if (m.type() === "error") errs.push("console.error " + m.text()); });
  page.on("dialog", d => { errs.push("DIALOG " + d.message().slice(0, 160)); d.dismiss(); });
  const today = o.today || "2026-10-26";
  await page.addInitScript(t => { window.OPS_TODAY = t; window.CUR_TODAY = t; window.showSaveFilePicker = undefined; window.showOpenFilePicker = undefined; }, today);
  await page.goto("file://" + path.join(ROOT, "Flight_Ops_Planner_Dashboard.html"));
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
  return { page, errs, close: () => browser.close() };
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
module.exports = { boot, ROOT, atomFixture };
