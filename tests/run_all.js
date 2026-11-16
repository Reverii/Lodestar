// Runs every suite in tests/ against the repo's demo set (layout 4) and against a fresh builder set (layout 5), and prints one
// line per run. Build first:  python3 .lodestar_build.py dashboard && python3 .lodestar_build.py excel <fresh folder>
// Run:  node tests/run_all.js <fresh folder> [log folder] [name-filter]      or, building both first:  node tests/run_all.js --build
// Env JOBS = suites at once (default 3); SKIP = comma list of suite names to leave out (e.g. SKIP=atom, it takes minutes).
const { spawn } = require("child_process");
const fs = require("fs"), path = require("path"), os = require("os");
const ROOT = path.resolve(__dirname, "..");
// "--build" in place of the fresh folder: builds the dev dashboard and a fresh demo set (in a temp folder) first, so one command runs everything.
let FRESH = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (process.argv[2] === "--build") {
  const { execFileSync } = require("child_process");
  FRESH = fs.mkdtempSync(path.join(os.tmpdir(), "lodestar_fresh_"));
  console.log("Building the dashboard and a fresh set in " + FRESH + " ...");
  execFileSync("python3", [path.join(ROOT, ".lodestar_build.py"), "dashboard"], { cwd: ROOT, stdio: "ignore" });
  fs.rmdirSync(FRESH); execFileSync("python3", [path.join(ROOT, ".lodestar_build.py"), "excel", FRESH], { cwd: ROOT, stdio: "ignore" });
}
if (!FRESH || !fs.existsSync(path.join(FRESH, "Ops_Room.xlsx"))) { console.log("Usage: node tests/run_all.js <folder with a fresh layout-5 set | --build> [log folder] [name-filter]"); process.exit(1); }
const LOGS = path.resolve(process.argv[3] || path.join(os.tmpdir(), "lodestar_run_all")); fs.mkdirSync(LOGS, { recursive: true });
const only = process.argv[4] || "", skip = (process.env.SKIP || "").split(",").filter(Boolean);
const JOBS = +process.env.JOBS || 3;
const suites = fs.readdirSync(__dirname).filter(f => /\.test\.(js|py)$/.test(f)).map(f => f.replace(/\.test\.(js|py)$/, m => m)).sort();
// Suites that only make sense on one set: bdo_person needs a set built after z177 (BDO as a person), upgrade turns the repo's
// layout-4 set into layout 5 (LODE_FILES = the old set). wd_row needs a layout-3 set and is left out unless LODE_OLD3 names one.
const ONLY_SET = { bdo_person: "fresh", upgrade: "repo" };
const jobs = [];
for (const f of suites) {
  const name = f.replace(/\.test\.(js|py)$/, ""); if (only && !name.includes(only)) continue; if (skip.includes(name)) continue;
  if (f.endsWith(".py")) { jobs.push({ name, set: "-", cmd: "python3", args: [path.join(__dirname, f)], env: {} }); continue; }
  if (name === "wd_row") { if (process.env.LODE_OLD3) jobs.push({ name, set: "layout3", cmd: "node", args: [path.join(__dirname, f)], env: { LODE_FILES: path.resolve(process.env.LODE_OLD3) } }); else console.log("skip wd_row (set LODE_OLD3=<layout-3 set> to run it)"); continue; }
  if (ONLY_SET[name] !== "fresh") jobs.push({ name, set: "repo", cmd: "node", args: [path.join(__dirname, f)], env: { LODE_FILES: ROOT, LODE_NEW: FRESH } });
  if (ONLY_SET[name] !== "repo") jobs.push({ name, set: "fresh", cmd: "node", args: [path.join(__dirname, f)], env: { LODE_FILES: FRESH, LODE_NEW: FRESH } });
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
