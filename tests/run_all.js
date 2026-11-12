// Runs every suite in tests/ against the repo's demo set (layout 4) and against a fresh builder set (layout 5), and prints one
// line per run. Build first:  python3 .lodestar_build.py dashboard && python3 .lodestar_build.py excel <fresh folder>
// Run:  node tests/run_all.js <fresh folder> [log folder] [name-filter]
// Env JOBS = suites at once (default 3); SKIP = comma list of suite names to leave out (e.g. SKIP=atom, it takes minutes).
const { spawn } = require("child_process");
const fs = require("fs"), path = require("path"), os = require("os");
const ROOT = path.resolve(__dirname, "..");
const FRESH = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (!FRESH || !fs.existsSync(path.join(FRESH, "Ops_Room.xlsx"))) { console.log("Usage: node tests/run_all.js <folder with a fresh layout-5 set> [log folder] [name-filter]"); process.exit(1); }
const LOGS = path.resolve(process.argv[3] || path.join(os.tmpdir(), "lodestar_run_all")); fs.mkdirSync(LOGS, { recursive: true });
const only = process.argv[4] || "", skip = (process.env.SKIP || "").split(",").filter(Boolean);
const JOBS = +process.env.JOBS || 3;
const suites = fs.readdirSync(__dirname).filter(f => /\.test\.(js|py)$/.test(f)).map(f => f.replace(/\.test\.(js|py)$/, m => m)).sort();
const jobs = [];
for (const f of suites) {
  const name = f.replace(/\.test\.(js|py)$/, ""); if (only && !name.includes(only)) continue; if (skip.includes(name)) continue;
  if (f.endsWith(".py")) { jobs.push({ name, set: "-", cmd: "python3", args: [path.join(__dirname, f)], env: {} }); continue; }
  jobs.push({ name, set: "repo", cmd: "node", args: [path.join(__dirname, f)], env: { LODE_FILES: ROOT, LODE_NEW: FRESH } });
  jobs.push({ name, set: "fresh", cmd: "node", args: [path.join(__dirname, f)], env: { LODE_FILES: FRESH, LODE_NEW: FRESH } });
}
const results = [];
function run(j) {
  return new Promise(res => {
    const log = path.join(LOGS, j.name + "." + j.set + ".log"), out = fs.createWriteStream(log), t0 = Date.now();
    const env = Object.assign({}, process.env, j.env); if (j.set === "repo") delete env.LODE_DUMP;
    const p = spawn(j.cmd, j.args, { cwd: ROOT, env }); p.stdout.pipe(out); p.stderr.pipe(out);
    const kill = setTimeout(() => p.kill("SIGKILL"), 40 * 60000);
    p.on("close", code => {
      clearTimeout(kill);
      const txt = fs.readFileSync(log, "utf8"), tally = (txt.match(/(\d+)\s*\/\s*(\d+) pass/g) || []).pop() || "";
      const fails = txt.split("\n").filter(l => /^FAIL /.test(l)).map(l => l.slice(5).split(":")[0]);
      const r = { name: j.name, set: j.set, code, tally, fails, secs: Math.round((Date.now() - t0) / 1000) }; results.push(r);
      console.log((code === 0 ? "ok   " : "FAIL ") + (j.name + " [" + j.set + "]").padEnd(34) + tally.padEnd(14) + r.secs + "s" + (fails.length ? "  " + fails.join(", ") : "")); res();
    });
  });
}
(async () => {
  let i = 0; const worker = async () => { while (i < jobs.length) await run(jobs[i++]); };
  await Promise.all(Array.from({ length: JOBS }, worker));
  results.sort((a, b) => (a.name + a.set).localeCompare(b.name + b.set));
  fs.writeFileSync(path.join(LOGS, "summary.json"), JSON.stringify(results, null, 1));
  const bad = results.filter(r => r.code !== 0);
  console.log("\n" + (results.length - bad.length) + " of " + results.length + " runs clean. Logs: " + LOGS);
  process.exit(bad.length ? 1 : 0);
})();
