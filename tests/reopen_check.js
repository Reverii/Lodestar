// A saved file opened again must read back what the dashboard had in memory when it saved.
// Run any suite with LODE_DUMP=<folder> (see lode_lib.js): it writes each edited file the way a save builds it, plus
// <name>.state.json. This script opens every dumped file by itself in a fresh dashboard and lists what reads back differently.
// Run:  node tests/reopen_check.js <dump folder> [name-filter]
// Differences need a look, they are not all bugs: a test that pokes the state directly (without the edit going through the
// dashboard) shows up here too.
const fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..");
const DIR = process.argv[2] && path.resolve(process.argv[2]), only = process.argv[3] || "";
if (!DIR || !fs.existsSync(DIR)) { console.log("Usage: node tests/reopen_check.js <dump folder> [name-filter]"); process.exit(1); }
const NORM = `(S => JSON.stringify(S, (k, v) => k[0] === "_" ? undefined : v instanceof Map ? { "#map": [...v.entries()].sort((x, y) => String(x[0]) < String(y[0]) ? -1 : 1) } : v instanceof Set ? { "#set": [...v].sort() } : v))`;
// values that mean "nothing" either way
const empty = v => v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length) || (typeof v === "object" && v && !Object.keys(v).length);
function diff(a, b, p, out) {
  if (out.length > 400) return;
  if (empty(a) && empty(b)) return;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) { if (a !== b && String(a) !== String(b)) out.push(p + ": memory " + JSON.stringify(a) + " | file " + JSON.stringify(b)); return; }
  if (Array.isArray(a) && Array.isArray(b)) {
    let n = Math.max(a.length, b.length); for (let i = 0; i < n; i++) diff(a[i], b[i], p + "[" + i + "]", out); return;
  }
  for (const k of new Set(Object.keys(a).concat(Object.keys(b)))) diff(a[k], b[k], p ? p + "." + k : k, out);
}
(async () => {
  const files = fs.readdirSync(DIR).filter(f => f.endsWith(".state.json") && f.includes(only)).sort();
  const browser = await chromium.launch(); let bad = 0, seen = new Map();
  for (const f of files) {
    const x = path.join(DIR, f.replace(/\.state\.json$/, ".xlsx")); if (!fs.existsSync(x)) continue;
    const page = await browser.newPage(); const errs = [];
    page.on("pageerror", e => errs.push("PAGEERROR " + e.message)); page.on("dialog", d => { errs.push("DIALOG " + d.message().slice(0, 200)); d.dismiss(); });
    await page.addInitScript(() => { window.OPS_TODAY = window.CUR_TODAY = "2026-10-26"; window.showSaveFilePicker = undefined; window.showOpenFilePicker = undefined; });
    await page.goto("file://" + path.join(ROOT, "Flight_Ops_Planner_Dashboard.html"));
    let got = null;
    try {
      await page.setInputFiles("#fileInput", x);
      await page.waitForFunction(() => typeof books !== "undefined" && books.length >= 1, null, { timeout: 20000 });
      got = JSON.parse(await page.evaluate("(" + NORM + ")(books[0].S)"));
    } catch (e) { errs.push("did not open: " + String(e.message).split("\n")[0]); }
    const out = errs.slice(); if (got) diff(JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")), got, "", out);
    await page.close();
    if (out.length) {
      bad++; const fresh = out.filter(l => { const k = f.split("_")[0] + "|" + l.replace(/\[\d+\]/g, "[n]").replace(/"[^"]*"/g, '""').slice(0, 90); if (seen.has(k)) { seen.set(k, seen.get(k) + 1); return false; } seen.set(k, 1); return true; });
      console.log("DIFF " + f.replace(/\.state\.json$/, "") + ": " + out.length + " difference" + (out.length === 1 ? "" : "s") + (fresh.length ? "" : " (all of a kind already listed)"));
      fresh.slice(0, 12).forEach(l => console.log("     " + l.slice(0, 260)));
    }
  }
  await browser.close();
  console.log((files.length - bad) + " of " + files.length + " files read back the same");
  process.exit(bad ? 1 : 0);
})();
