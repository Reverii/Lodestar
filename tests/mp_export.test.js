// Master Planner export tests (list + calendar for an outside office). Build the dashboard first: python3 .lodestar_build.py dashboard
// Run: node tests/mp_export.test.js [name-filter]
const assert = require("assert");
const fs = require("fs"), os = require("os"), path = require("path");
const { execFileSync } = require("child_process");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const F = { fresh: true };
const OCT = { from: "2026-10-01", to: "2026-10-31", omit: [] };
const data = (page, o) => page.evaluate(o => { const P = masterBook().S; const d = mpExportData(P, o); return { rows: d.rows, totals: d.totals, months: d.months.map(m => ({ label: m.label, hrs: m.hrs, fl: m.fl, weeks: m.weeks })) }; }, o);
// the bytes of the export as a file in the temp folder, so openpyxl can read it
const bytesTo = async (page, o, layout) => { const b64 = await page.evaluate(([o, layout]) => { const u = mpExportBytes(masterBook().S, o, layout); let s = ""; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return btoa(s); }, [o, layout]);
  const f = path.join(os.tmpdir(), "mp_export_" + Date.now() + "_" + Math.floor(Math.random() * 1e6) + ".xlsx"); fs.writeFileSync(f, Buffer.from(b64, "base64")); return f; };
const py = (code, f) => JSON.parse(execFileSync("python3", ["-I", "-c", code, f]).toString());
// what the screen counts: flights with a code on a day that has no no-flying status
const screen = page => page.evaluate(() => { const P = masterBook().S, hrs = c => { const x = P.codes.find(k => same(k.code, c)); return x ? x.hrs : 0; };
  const live = P.fl.filter(f => f.mi === 9 && f.code && !P.mp[f.mi].status[f.d]); return { n: live.length, h: live.reduce((a, f) => a + hrs(f.code), 0), codes: [...new Set(live.map(f => f.code))], off: P.mp[9].status.map((s, d) => s ? [d + 1, s] : null).filter(Boolean) }; });

test("totals_match_the_screen", async ({ page }) => {
  const s = await screen(page), d = await data(page, OCT);
  assert.strictEqual(d.totals.fl, s.n); assert.ok(Math.abs(d.totals.hrs - s.h) < 1e-9, d.totals.hrs + " vs " + s.h);
  assert.strictEqual(d.rows.length, s.n);
}, F);
test("omitted_codes_leave_rows_and_totals", async ({ page }) => {
  const s = await screen(page), code = s.codes.find(c => /NVG/i.test(c)) || s.codes[0];
  const all = await data(page, OCT), cut = await data(page, Object.assign({}, OCT, { omit: [code] }));
  assert.ok(all.rows.some(r => r.code === code) && !cut.rows.some(r => r.code === code));
  const gone = all.rows.filter(r => r.code === code);
  assert.strictEqual(cut.totals.fl, all.totals.fl - gone.length); assert.ok(Math.abs(cut.totals.hrs - (all.totals.hrs - gone.reduce((a, r) => a + r.hrs, 0))) < 1e-9);
  assert.ok(!cut.totals.byCode.some(c => c.code === code));
}, F);
test("no_fly_days_have_no_flights_and_show_the_reason", async ({ page }) => {
  const s = await screen(page), d = await data(page, OCT);
  assert.ok(s.off.length > 0, "the demo has no-flying days");
  for (const [day] of s.off) assert.ok(!d.rows.some(r => r.d === day - 1), "flight on a no-flying day " + day);
  const cells = d.months[0].weeks.flat().filter(Boolean), [day, why] = s.off[0], cell = cells.find(c => c.iso === "2026-10-" + String(day).padStart(2, "0"));
  assert.ok(cell && cell.status === why && cell.lines.join("\n").includes(why), JSON.stringify(cell));
}, F);
test("range_limits_the_export", async ({ page }) => {
  const d = await data(page, { from: "2026-10-05", to: "2026-10-09", omit: [] });
  assert.ok(d.rows.length > 0 && d.rows.every(r => r.iso >= "2026-10-05" && r.iso <= "2026-10-09"), JSON.stringify(d.rows.map(r => r.iso)));
}, F);
test("calendar_day_lines_and_week_hours", async ({ page }) => {
  const d = await data(page, OCT), cells = d.months[0].weeks.flat().filter(Boolean), busy = cells.find(c => c.lines.length > 1 && !c.status);
  assert.ok(busy && /^\d+$/.test(busy.lines[0]) && / · \d+\.\d h$/.test(busy.lines[1]) && /Day total \d+\.\d h$/.test(busy.lines[busy.lines.length - 1]), JSON.stringify(busy));
  const wk = d.months[0].weeks.map(w => w.filter(Boolean).reduce((a, c) => a + c.hrs, 0)), tot = wk.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(tot - d.months[0].hrs) < 1e-9 && Math.abs(tot - d.totals.hrs) < 1e-9);
}, F);
test("xlsx_is_one_calendar_sheet", async ({ page }) => {
  const f = await bytesTo(page, OCT);
  const r = py(`import openpyxl,sys,json
cal=openpyxl.load_workbook(sys.argv[1])["Calendar"]
print(json.dumps({"sheets":openpyxl.load_workbook(sys.argv[1]).sheetnames,"title":cal["A1"].value,"orient":cal.page_setup.orientation,"fit":cal.sheet_properties.pageSetUpPr.fitToPage if cal.sheet_properties.pageSetUpPr else None,"merged":len(cal.merged_cells.ranges)}))`, f);
  assert.deepStrictEqual(r.sheets, ["Calendar"]); assert.ok(/^121 SQN flight programme, October 2026$/.test(r.title), JSON.stringify(r));
  assert.strictEqual(r.orient, "landscape"); assert.ok(r.fit); assert.ok(r.merged > 0);
}, F);
test("xlsx_flight_hours_sit_beside_each_flight_and_add_up", async ({ page }) => {
  const d = await data(page, OCT), f = await bytesTo(page, OCT);
  const r = py(`import openpyxl,sys,json,re
ws=openpyxl.load_workbook(sys.argv[1])["Calendar"]
n=0;h=0.0;wk=0.0
for row in ws.iter_rows(min_row=4):
    for c in row[:14:2]:
        nxt=ws.cell(row=c.row,column=c.column+1).value
        if isinstance(c.value,str) and re.match(r"^(\\d{4}-\\d{4}|\\d{4})?\\s*\\S+",c.value) and isinstance(nxt,(int,float)) and not re.match(r"^\\d+$",c.value): n+=1;h+=nxt
print(json.dumps({"n":n,"hrs":h}))`, f);
  assert.strictEqual(r.n, d.totals.fl); assert.ok(Math.abs(r.hrs - d.totals.hrs) < 1e-6, JSON.stringify(r));
}, F);
test("no_crew_or_comments_in_the_file", async ({ page }) => {
  const secret = await page.evaluate(() => { const P = masterBook().S, out = new Set(), shown = P.codes.map(k => k.code + " " + k.desc).join(" "); P.fl.forEach(f => { if (f.note) out.add(f.note); if (f.crew) out.add(f.crew); }); books.filter(b => !b.S.kind).forEach(b => b.S.roster.forEach(p => { if (p.id && p.id.length > 3) out.add(p.id); if (p.name && p.name.length > 5) out.add(p.name); })); return [...out].filter(x => !shown.includes(x)); });   // a comment that merely repeats a flight code's own description is not a leak
  const f = await bytesTo(page, OCT);
  const text = execFileSync("python3", ["-I", "-c", "import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);print(' '.join(z.read(n).decode('utf8','ignore') for n in z.namelist()))", f]).toString();
  for (const s of secret) assert.ok(!text.includes(s), "leaked: " + s);
}, F);
test("dialog_defaults_and_preview", async ({ page }) => {
  await page.evaluate(() => { document.querySelector("nav.tabs button[data-v='mp']").click(); cur.mpM = 9; renderMp(); document.getElementById("mpExport").click(); });
  const r = await page.evaluate(() => ({ from: document.getElementById("mpExpFrom").value, to: document.getElementById("mpExpTo").value, boxes: [...document.querySelectorAll("#mpExpCodes input[data-code]")].map(b => b.checked), prev: document.getElementById("mpExpPreview").textContent }));
  const s = await screen(page);
  assert.deepStrictEqual([r.from, r.to], ["2026-10-01", "2026-10-31"]); assert.ok(r.boxes.length > 0 && r.boxes.every(Boolean));
  assert.ok(r.prev.includes(s.n + " flights") && r.prev.includes(s.h.toFixed(1) + " planned hours"), r.prev + " vs " + s.n + "/" + s.h);
}, F);
test("omitting_in_the_dialog_updates_preview_and_is_remembered", async ({ page }) => {
  await page.evaluate(() => { document.querySelector("nav.tabs button[data-v='mp']").click(); cur.mpM = 9; renderMp(); document.getElementById("mpExport").click(); });
  const code = await page.evaluate(() => { const b = [...document.querySelectorAll("#mpExpCodes input[data-code]")].find(x => /NVG/i.test(x.dataset.code)) || document.querySelector("#mpExpCodes input[data-code]"); b.click(); return b.dataset.code; });
  const prev = await page.evaluate(() => document.getElementById("mpExpPreview").textContent), full = await data(page, OCT), cut = await data(page, Object.assign({}, OCT, { omit: [code] }));
  assert.ok(prev.includes(cut.totals.fl + " flights"), prev); assert.notStrictEqual(cut.totals.fl, full.totals.fl);
  const again = await page.evaluate(code => { document.getElementById("mpExpCancel").click(); document.getElementById("mpExport").click(); return [...document.querySelectorAll("#mpExpCodes input[data-code]")].find(b => b.dataset.code === code).checked; }, code);
  assert.strictEqual(again, false);   // remembered
}, F);
test("export_button_downloads_a_named_file", async ({ page }) => {
  await page.evaluate(() => { document.querySelector("nav.tabs button[data-v='mp']").click(); cur.mpM = 9; renderMp(); document.getElementById("mpExport").click(); });
  const [dl] = await Promise.all([page.waitForEvent("download"), page.evaluate(() => document.getElementById("mpExpGo").click())]);
  assert.strictEqual(dl.suggestedFilename(), "Flight_Programme_2026-10.xlsx");
}, F);

(async () => {
  const only = process.argv[2];
  let pass = 0, ran = 0;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue;
    ran++; let S = null;
    try { S = await boot(Object.assign({}, t.opts)); await t.fn(S); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 300)); }
    if (S) await S.close();
  }
  console.log(pass + "/" + ran + " pass");
  process.exit(pass === ran ? 0 : 1);
})();
