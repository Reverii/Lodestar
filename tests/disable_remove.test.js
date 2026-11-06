// Switch off / on and Remove on the Currency Rules table and the Master Planner Flight Codes table (z189).
// Build first: python3 .lodestar_build.py dashboard. Run: node tests/disable_remove.test.js [name-filter]
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const DEPT = { mine: "Flight_Ops_Planner_SUP2", today: "2026-10-14", fresh: true };
const MP = { mine: "Master_Planner", today: "2026-10-14", fresh: true };
const yes = page => page.evaluate(() => { window.confirm = () => true; window.alert = m => { window.__alert = m; }; });

test("rule_switched_off_is_not_checked_and_saved_in_J", async ({ page }) => {
  const r = await page.evaluate(() => { const k = S.rules.findIndex(ruleOn), nm = S.rules[k].name; const before = computeCurrency()[0].res[k];
    ruleOff(k, true); const after = computeCurrency()[0].res[k];
    const out = buildXlsx(), c = readCellsOf(out.files, WB.paths["Currency Rules"], WB.sst || []); reparseBook(0, out.bytes);
    return { k, nm, before: !!before, after, j: c["J" + (CUR_ROW0 + k)], back: S.rules[k].off, name: S.rules[k].name }; });
  assert.ok(r.before, "checked before"); assert.strictEqual(r.after, null, "not checked when off");
  assert.strictEqual(r.j, "Off"); assert.strictEqual(r.back, true); assert.strictEqual(r.name, r.nm, "kept");
}, DEPT);

test("rule_row_right_click_menu_and_grey_row", async ({ page }) => {
  await page.evaluate(() => { document.querySelector("nav.tabs button[data-v='cur']").click(); });
  await page.click("#ruleTable tr[data-rr='0'] td.n", { button: "right" });
  const m = await page.evaluate(() => [...document.querySelectorAll("#opsCtx button")].map(b => b.textContent));
  assert.ok(m.some(t => /Switch off/.test(t)) && m.some(t => /Remove/.test(t)), JSON.stringify(m));
  await page.evaluate(() => [...document.querySelectorAll("#opsCtx button")].find(b => /Switch off/.test(b.textContent)).click());
  const g = await page.evaluate(() => ({ off: document.querySelector("#ruleTable tr[data-rr='0']").classList.contains("roff"), tag: !!document.querySelector("#ruleTable tr[data-rr='0'] .offtag"), cols: document.querySelectorAll("#curTable thead th").length }));
  assert.ok(g.off && g.tag, JSON.stringify(g));
}, DEPT);

test("rule_remove_clears_row_in_place_and_before_dates", async ({ page }) => {
  await yes(page);
  const r = await page.evaluate(() => { const k = S.rules.findIndex(ruleOn), next = S.rules[k + 1] && S.rules[k + 1].name;
    S.curBase[0][k] = 46000; ruleRemove(k);
    return { k, name: S.rules[k].name, next: S.rules[k + 1] && S.rules[k + 1].name, nextWas: next, base: S.curBase[0][k], dA: dirty.get("Currency Rules!A" + (CUR_ROW0 + k)) }; });
  assert.strictEqual(r.name, ""); assert.strictEqual(r.next, r.nextWas, "rules below stay put"); assert.strictEqual(r.base, null);
  assert.ok(r.dA && r.dA.quiet && /removed/.test(r.dA.quiet), "one Change Log line");
}, DEPT);

test("code_switched_off_not_offered_but_still_a_flight", async ({ page }) => {
  const r = await page.evaluate(() => { const P = books[mpIdx()].S, i = P.codeAll.findIndex(k => k.code && P.fl.some(f => same(f.code, k.code))), code = P.codeAll[i].code;
    fcOff(i, true); const k = P.codes.find(x => same(x.code, code));
    const out = withBook(mpIdx(), () => buildXlsx()), c = readCellsOf(out.files, books[mpIdx()].WB.paths["Flight Codes"], books[mpIdx()].WB.sst || []);
    return { code, off: k && k.off, f: c["F" + P.codeAll[i].row], head: c.F5, flight: isFlightCode(P, code) || P.codes.some(x => same(x.code, code)), uses: fcUses(code) }; });
  assert.ok(r.off, "kept in codes, marked off"); assert.strictEqual(r.f, "Off"); assert.strictEqual(r.head, "Off"); assert.ok(r.uses > 0);
  await page.evaluate(() => document.querySelector("nav.tabs button[data-v='mp']") && document.querySelector("nav.tabs button[data-v='mp']").click());
  const dl = await page.evaluate(code => { renderMp(); const d = document.getElementById("fcList"); return d ? [...d.options].map(o => o.value) : null; }, r.code);
  if (dl) assert.ok(!dl.includes(r.code), "not in the code list");
}, MP);

test("code_in_use_cannot_be_removed", async ({ page }) => {
  await yes(page);
  const r = await page.evaluate(() => { const P = books[mpIdx()].S, i = P.codeAll.findIndex(k => k.code && P.fl.some(f => same(f.code, k.code))), code = P.codeAll[i].code; fcRemove(i); return { code, still: P.codeAll[i].code, msg: window.__alert || "" }; });
  assert.strictEqual(r.still, r.code); assert.ok(/can't be removed/.test(r.msg), r.msg);
}, MP);

test("unused_code_removed_and_codes_below_move_up", async ({ page }) => {
  await yes(page);
  const r = await page.evaluate(() => { const P = books[mpIdx()].S, j = P.codeAll.findIndex(k => !k.code);
    Object.assign(P.codeAll[j], { code: "ZZ-ONE", desc: "spare" }); Object.assign(P.codeAll[j + 1], { code: "ZZ-TWO", desc: "spare 2" }); mkCodes(P);
    const i = P.codeAll.findIndex(k => k.code && !fcUses(k.code)); if (i < 0) return null;
    const code = P.codeAll[i].code, next = P.codeAll[i + 1].code, last = lastFilled(P.codeAll, k => k.code); fcRemove(i);
    return { code, now: P.codeAll[i].code, next, lastNow: lastFilled(P.codeAll, k => k.code), last, gone: !P.codes.some(k => same(k.code, code)) }; });
  assert.ok(r, "an unused code in the demo set");
  assert.ok(r.gone); assert.strictEqual(r.now, r.next || ""); assert.strictEqual(r.lastNow, r.last - 1);
}, MP);

test("code_row_right_click_menu", async ({ page }) => {
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => x.dataset && x.dataset.v === "codes"); if (b) b.click(); renderCodes(); document.getElementById("codeTable").scrollIntoView(); });
  const has = await page.evaluate(() => !!document.querySelector("#codeTable tr[data-fr='0']") && document.querySelector("#codeTable tr[data-fr='0']").offsetParent !== null);
  if (!has) { await page.evaluate(() => { document.querySelectorAll(".view").forEach(v => v.classList.remove("on")); const v = document.getElementById("v-codes"); if (v) v.classList.add("on"); renderCodes(); }); }
  await page.click("#codeTable tr[data-fr='0'] td.n", { button: "right" });
  const m = await page.evaluate(() => [...document.querySelectorAll("#opsCtx button")].map(b => [b.textContent, b.disabled]));
  assert.ok(m.some(([t]) => /Switch off/.test(t)), JSON.stringify(m)); assert.ok(m.some(([t]) => /Remove/.test(t)), JSON.stringify(m));
}, MP);

(async () => {
  const only = process.argv[2]; let pass = 0, ran = 0, S = null;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue; ran++;
    try { if (!S || (t.opts && t.opts.fresh)) { if (S) await S.close(); S = await boot(Object.assign({}, t.opts)); } await t.fn(S); if (S.errs.length) throw new Error(S.errs.join(" | ")); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 300)); if (S) { await S.close(); S = null; } }
  }
  if (S) await S.close(); console.log(pass + "/" + ran + " pass"); process.exit(pass === ran ? 0 : 1);
})();
