// The SharePoint mock as a standing server, so several people (browsers, scripts, agents) can work in one folder at once.
// Run:  node tests/sp_serve.js <folder with the 8 xlsx> [port] [snapshot folder]
// Open: http://127.0.0.1:<port>/sites/121SQN/Program/Flight_Ops_Planner_Dashboard.html?sptest   (cookie spuser=<name> names the person)
// Files live in memory; with a snapshot folder every saved file is also written there (plus saves.log: time, person, file),
// so the saved files can be checked with tests/xlsx_check.py or openpyxl while people work.
const fs = require("fs"), path = require("path");
const { startMock } = require("./spmock");
const DIR = process.argv[2] && path.resolve(process.argv[2]), PORT = +process.argv[3] || 8121, SNAP = process.argv[4] && path.resolve(process.argv[4]);
if (!DIR || !fs.existsSync(DIR)) { console.log("Usage: node tests/sp_serve.js <folder with the 8 xlsx> [port] [snapshot folder]"); process.exit(1); }
(async () => {
  const files = {}; for (const n of fs.readdirSync(DIR)) if (/\.xlsx$/i.test(n) && !/^~\$/.test(n)) files[n] = fs.readFileSync(path.join(DIR, n));
  const m = await startMock({ files, port: PORT, secondClock: true });
  console.log("SharePoint mock: " + m.url);
  if (!SNAP) return;
  fs.mkdirSync(SNAP, { recursive: true }); let seen = 0; const ver = new Map();
  for (const n of m.names()) fs.writeFileSync(path.join(SNAP, n), m.file(n));
  setInterval(() => {
    const log = m.log; for (; seen < log.length; seen++) { const e = log[seen]; if (e.method === "POST" && /Files\/add/.test(e.path)) fs.appendFileSync(path.join(SNAP, "saves.log"), new Date().toISOString() + " | " + e.user + " | " + e.status + " | " + decodeURIComponent(e.path).slice(-90) + "\n"); }
    for (const n of m.names()) { const i = m.info(n), k = i.ETag + i.TimeLastModified; if (ver.get(n) !== k) { ver.set(n, k); fs.writeFileSync(path.join(SNAP, n), m.file(n)); } }
    for (const [k, b] of m.other) { const f = path.join(SNAP, "other", k.replace(/[\\/:]/g, "_")); if (!fs.existsSync(f)) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, b); } }
  }, 2000);
})();
