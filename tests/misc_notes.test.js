// Miscellaneous Notes (z162): the department's own scratch sheet under Planning. Build the dashboard first.
// Uses the repo's demo set (or LODE_FILES); nothing is saved to disk: the saved bytes are checked in the page.
const assert = require("assert");
const { boot } = require("./lode_lib");
const tests = [];
const test = (name, fn, opts) => tests.push({ name, fn, opts });
const open = async page => { await page.evaluate(() => document.querySelector("nav.tabs button[data-v='misc']").click()); await page.waitForSelector("#mnWrap td[data-c]"); };
const cell = (page, ref) => page.evaluate(r => { const m = /^([A-Z])(\d+)$/.exec(r); return document.querySelector("#mnWrap td[data-r='" + (+m[2] - 1) + "'][data-c='" + (m[1].charCodeAt(0) - 65) + "']").textContent; }, ref);
const click = (page, ref, mods) => page.click("#mnWrap td[data-r='" + (+ref.slice(1) - 1) + "'][data-c='" + (ref.charCodeAt(0) - 65) + "']", mods ? { modifiers: mods } : undefined);
const dirtyMn = page => page.evaluate(() => [...books[0].dirty.values()].filter(e => e.sheet === "Misc Notes").map(e => e.ref + "=" + e.val).sort());
// build the saved file in memory: { hidden, cells, styles, sheetXml, log } and re-read it like a fresh open
const roundTrip = page => page.evaluate(() => {
  const bk = books[0], bytes = logBuild(bk, new Map(bk.dirty)).bytes, f = fflate.unzipSync(bytes), dec = x => new TextDecoder().decode(x);
  const wb = dec(f["xl/workbook.xml"]), sh = (wb.match(/<sheet [^>]*name="Misc Notes"[^>]*>/) || [""])[0], paths = sheetPaths(f), p = paths["Misc Notes"];
  const logP = paths["Change Log"], log = logP ? dec(f[logP]) : "";
  bk.dirty = new Map(); reparseBook(0, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)); useBook(0);
  return { hidden: /state="hidden"/.test(sh), sheetXml: p ? dec(f[p]) : "", styles: dec(f["xl/styles.xml"]), log, cells: mnCells() };
});

test("menu_item_for_your_own_department", async ({ page }) => {
  const r = await page.evaluate(() => [getComputedStyle(document.getElementById("mnTab")).display, document.getElementById("mnTab").closest("#plMenu") != null]);
  assert.deepStrictEqual(r, ["block", true]);
  await open(page);
  const t = await page.evaluate(() => document.getElementById("mnWrap").innerText);
  assert.ok(/Only SUP 2 sees this page/.test(t), t.slice(0, 200));
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll("#mnWrap tbody tr").length), 100);
});
test("not_shown_for_the_master_planner_file", async ({ page }) => {
  assert.strictEqual(await page.evaluate(() => getComputedStyle(document.getElementById("mnTab")).display), "none");
}, { mine: "Master_Planner", others: false });
test("hidden_in_ops_room_mode_shown_in_dev_mode", async ({ page }) => {
  const vis = () => page.evaluate(() => { renderBooks(); return getComputedStyle(document.getElementById("mnTab")).display; });
  await page.evaluate(() => { OPS = true; devFull = false; }); assert.strictEqual(await vis(), "none", "Ops Room mode");
  await page.evaluate(() => { OPS = true; devFull = true; }); assert.strictEqual(await vis(), "block", "dev mode, own department first");
});
test("type_enter_moves_down_tab_moves_right", async ({ page }) => {
  await open(page); await click(page, "B3");
  await page.keyboard.type("Ask OPS O"); await page.keyboard.press("Enter");
  await page.keyboard.type("Stores"); await page.keyboard.press("Tab");
  await page.keyboard.type("6543"); await page.keyboard.press("Escape");
  assert.deepStrictEqual(await dirtyMn(page), ["B3=Ask OPS O", "B4=Stores"]);
  assert.strictEqual(await page.evaluate(() => document.getElementById("mnAt").textContent), "C4");
  assert.strictEqual(await cell(page, "B3"), "Ask OPS O");
  assert.ok(await page.evaluate(() => document.querySelector("#mnWrap td[data-r='2'][data-c='1']").classList.contains("un")), "unsaved cell is yellow");
});
test("f2_edits_and_alt_enter_adds_a_line", async ({ page }) => {
  await open(page); await click(page, "A1"); await page.keyboard.type("Line one"); await page.keyboard.press("Enter");
  await click(page, "A1"); await page.keyboard.press("F2"); await page.keyboard.press("Alt+Enter"); await page.keyboard.type("two"); await page.keyboard.press("Enter");
  assert.deepStrictEqual(await dirtyMn(page), ["A1=Line one\ntwo"]);
});
test("formula_bar_writes_the_cell", async ({ page }) => {
  await open(page); await click(page, "C2");
  await page.fill("#mnIn", "From the bar"); await page.press("#mnIn", "Enter");
  assert.deepStrictEqual(await dirtyMn(page), ["C2=From the bar"]);
  assert.strictEqual(await page.evaluate(() => document.getElementById("mnAt").textContent), "C3");
});
test("paste_a_block_from_excel", async ({ page }) => {
  await open(page); await click(page, "B2");
  await page.evaluate(() => mnPaste('Sim desk\t6543 2100\r\nNote\t"two\nlines"\r\n'));
  assert.deepStrictEqual(await dirtyMn(page), ["B2=Sim desk", "B3=Note", "C2=6543 2100", "C3=two\nlines"]);
  assert.strictEqual(await page.evaluate(() => document.getElementById("mnAt").textContent), "B2:C3");
});
test("copy_gives_tab_separated_text", async ({ page }) => {
  await open(page);
  await page.evaluate(() => mnPaste("a\tb\nc\td"));
  const t = await page.evaluate(() => mnTsv(mnCells(), { r0: 0, r1: 1, c0: 0, c1: 1 }));
  assert.strictEqual(t, "a\tb\r\nc\td");
});
test("delete_clears_the_picked_cells", async ({ page }) => {
  await open(page);
  await page.evaluate(() => mnPaste("a\tb\nc\td"));
  await click(page, "A1"); await click(page, "B2", ["Shift"]); await page.keyboard.press("Delete");
  assert.deepStrictEqual(await dirtyMn(page), ["A1=", "A2=", "B1=", "B2="]);
  assert.strictEqual(await cell(page, "B2"), "");
});
test("bold_and_wrap_write_the_row_format", async ({ page }) => {
  await open(page); await click(page, "A1"); await page.keyboard.type("To do"); await page.keyboard.press("Enter");
  await click(page, "A1"); await click(page, "B1", ["Shift"]); await page.keyboard.press("Control+b");
  await page.click("#mnWrapB");
  const d = await dirtyMn(page);
  assert.ok(d.includes("AA1=A:bw,B:bw"), d.join(" | "));
  assert.ok(await page.evaluate(() => { const t = document.querySelector("#mnWrap td[data-r='0'][data-c='0']"); return t.classList.contains("b") && t.classList.contains("w"); }));
  await page.keyboard.press("Control+b");
  assert.ok((await dirtyMn(page)).includes("AA1=A:w,B:w"), "bold off again");
});
test("column_width_is_dragged_and_kept", async ({ page }) => {
  await open(page);
  const h = await page.$("#mnWrap .mnRz[data-rz='1']"), b = await h.boundingBox();
  await page.mouse.move(b.x + 3, b.y + 5); await page.mouse.down(); await page.mouse.move(b.x + 93, b.y + 5, { steps: 4 }); await page.mouse.up();
  const d = await dirtyMn(page);
  assert.ok(/^AB1=B:2\d\d$/.test(d[0]) && d.length === 1, d.join(" | "));
});
test("more_rows_and_clear_sheet", async ({ page }) => {
  await open(page); await page.click("#mnMore");
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll("#mnWrap tbody tr").length), 120);
  await page.evaluate(() => mnPaste("x\ty"));
  await page.evaluate(() => { window.confirm = () => true; }); await page.click("#mnClear");
  assert.deepStrictEqual(await dirtyMn(page), ["A1=", "AB2=120", "B1="]);
});
test("undo_brings_the_text_back", async ({ page }) => {
  await open(page); await click(page, "A1"); await page.keyboard.type("Keep me"); await page.keyboard.press("Enter");
  await page.waitForTimeout(30);
  await click(page, "A1"); await page.keyboard.press("Delete"); await page.waitForTimeout(30);
  assert.strictEqual(await cell(page, "A1"), "");
  await page.keyboard.press("Control+z"); await page.waitForTimeout(30);
  assert.strictEqual(await cell(page, "A1"), "Keep me");
});
test("saved_hidden_with_excel_formats_and_a_count_in_the_log", async ({ page }) => {
  await open(page);
  await page.evaluate(() => mnPaste("Phone list\nSim desk\t6543 2100"));
  await click(page, "A1"); await page.keyboard.press("Control+b");
  await click(page, "B2"); await page.click("#mnWrapB");
  await page.evaluate(() => mnPut([["AB1", "B:210"]]));
  const r = await roundTrip(page);
  assert.ok(r.hidden, "sheet is hidden in Excel");
  assert.deepStrictEqual([r.cells.A1, r.cells.A2, r.cells.B2, r.cells.AA1, r.cells.AA2], ["Phone list", "Sim desk", "6543 2100", "A:b", "B:w"]);
  const s = (ref) => +((r.sheetXml.match(new RegExp('<c r="' + ref + '"[^>]*\\bs="(\\d+)"')) || [])[1] ?? -1);
  const xfs = r.styles.match(/<cellXfs\b[^>]*>[\s\S]*?<\/cellXfs>/)[0].match(/<xf\b[^>]*\/>|<xf\b[^>]*>[\s\S]*?<\/xf>/g);
  const fonts = r.styles.match(/<fonts\b[^>]*>[\s\S]*?<\/fonts>/)[0].match(/<font\b[^>]*\/>|<font\b[^>]*>[\s\S]*?<\/font>/g);
  const font = ref => fonts[+(xfs[s(ref)].match(/fontId="(\d+)"/) || [])[1]];
  assert.ok(/<b\/>/.test(font("A1")), "A1 bold in Excel: " + xfs[s("A1")]);
  assert.ok(/wrapText="1"/.test(xfs[s("B2")]) && !/<b\/>/.test(font("B2")), "B2 wrapped, not bold");
  assert.ok(/<col min="2" max="2" width="30" customWidth="1"\/>/.test(r.sheetXml), "B width 210 px");
  assert.ok(/<col min="27" max="28"[^>]*hidden="1"/.test(r.sheetXml), "format columns hidden");
  const cnt = (r.styles.match(/<cellXfs count="(\d+)"/) || [])[1];
  assert.strictEqual(+cnt, xfs.length, "cellXfs count matches");
  assert.ok(/Misc Notes: 3 cells changed, formatting too/.test(r.log), "one log line");
  assert.ok(!/Sim desk|6543/.test(r.log), "the text itself is not logged");
});
test("second_save_reuses_the_formats", async ({ page }) => {
  await open(page);
  await page.evaluate(() => mnPaste("a\tb")); await click(page, "A1"); await page.keyboard.press("Control+b");
  const n1 = (await roundTrip(page)).styles.match(/<cellXfs count="(\d+)"/)[1];
  await click(page, "B1"); await page.keyboard.press("Control+b");
  const r2 = await roundTrip(page), n2 = r2.styles.match(/<cellXfs count="(\d+)"/)[1];
  assert.strictEqual(n2, n1, "no new formats added on the second save");
  assert.strictEqual(r2.cells.AA1, "A:b,B:b");
});
test("view_only_file_cannot_change_it", async ({ page }) => {
  await page.evaluate(() => { books[0].noEdit = true; });
  await open(page); await click(page, "A1"); await page.keyboard.type("x");
  assert.deepStrictEqual(await dirtyMn(page), []);
  assert.ok(await page.evaluate(() => document.getElementById("mnBold").disabled && /View only/.test(document.getElementById("mnLock").textContent)));
});
test("log_merges_misc_notes_saves_and_keeps_roster_lines", async ({ page }) => {
  const r = await page.evaluate(() => {
    const bk = books[0], t = logTime(), who = "Tester";
    const W = logApply(bk, [[t, who, "", "SUP 2", "Crew Roster: A moved up", "", "", "Roster"], [t, who, "", "SUP 2", "Misc Notes: 2 cells changed", "", "", "Misc Notes"]]);
    bk.WB.files = W.files; bk.WB.paths = W.paths;
    const W2 = logApply(bk, [[t, who, "", "SUP 2", "Crew Roster: B moved up", "", "", "Roster"], [t, who, "", "SUP 2", "Misc Notes: 3 cells changed", "", "", "Misc Notes"]]);
    const x = new TextDecoder().decode(W2.files[W2.paths["Change Log"]]);
    return { a: /A moved up/.test(x), b: /B moved up/.test(x), five: /Misc Notes: 5 cells changed/.test(x), n: (x.match(/Misc Notes:/g) || []).length };
  });
  assert.deepStrictEqual(r, { a: true, b: true, five: true, n: 1 });
});
// ---- z180: formatting toolbar
const fmtOf = (page, ref) => page.evaluate(r => { const m = /^([A-Z])(\d+)$/.exec(r); return mnFmtRow(mnCells(), +m[2] - 1)[m[1]] || ""; }, ref);
const tdStyle = (page, ref) => page.evaluate(r => { const m = /^([A-Z])(\d+)$/.exec(r), t = document.querySelector("#mnWrap td[data-r='" + (+m[2] - 1) + "'][data-c='" + (m[1].charCodeAt(0) - 65) + "']");
  const cs = getComputedStyle(t), be = getComputedStyle(t, "::before"); return { fs: cs.fontStyle, td: cs.textDecorationLine, size: cs.fontSize, color: cs.color, bg: cs.backgroundColor, al: cs.textAlign,
    bt: be.borderTopWidth, bb: cs.borderBottomWidth, bl: be.borderLeftWidth, br: cs.borderRightWidth, bbc: cs.borderBottomColor, cs: t.colSpan, rs: t.rowSpan }; }, ref);
const pick = async (page, a, b) => { await click(page, a); if (b) await click(page, b, ["Shift"]); };
test("format_string_reads_old_and_new", async ({ page }) => {
  const r = await page.evaluate(() => [mnFs(mnFx("bw")), mnFx("bw"), mnFs(mnFx("biuswz14cdc2626ffef3c7eft3acm2x3")), mnFs({ z: 11, b: true })]);
  assert.deepStrictEqual(r[0], "bw"); assert.deepStrictEqual(r[1], { b: true, w: true });
  assert.strictEqual(r[2], "biuswz14cdc2626ffef3c7eft3acm2x3"); assert.strictEqual(r[3], "b");
});
test("italic_underline_strike_size_align", async ({ page }) => {
  await open(page); await page.evaluate(() => mnPaste("Note"));
  await pick(page, "A1"); await page.keyboard.press("Control+i"); await page.keyboard.press("Control+u"); await page.click("#mnStrk");
  await page.selectOption("#mnSize", "16"); await page.click("#mnAc");
  assert.strictEqual(await fmtOf(page, "A1"), "iusz16ac");
  const s = await tdStyle(page, "A1");
  assert.deepStrictEqual([s.fs, s.td, s.size, s.al], ["italic", "underline line-through", "19px", "center"]);
  assert.ok(await page.evaluate(() => document.getElementById("mnAc").classList.contains("on") && document.getElementById("mnSize").value === "16"), "toolbar shows the state");
  await page.click("#mnAc"); assert.strictEqual(await fmtOf(page, "A1"), "iusz16", "centre again turns it off");
  await page.selectOption("#mnSize", "11"); assert.strictEqual(await fmtOf(page, "A1"), "ius", "11 is the default size");
});
test("text_and_fill_colour_from_the_palette", async ({ page }) => {
  await open(page); await pick(page, "B2", "C3");
  await page.click("#mnFlK"); await page.click("#mnPop i[data-col='dcfce7']");
  await page.click("#mnFcK"); await page.click("#mnPop i[data-col='16a34a']");
  assert.strictEqual(await fmtOf(page, "C3"), "c16a34afdcfce7");
  const s = await tdStyle(page, "B2"); assert.deepStrictEqual([s.color, s.bg], ["rgb(22, 163, 74)", "rgb(220, 252, 231)"]);
  await pick(page, "D4"); await page.click("#mnFl"); assert.strictEqual(await fmtOf(page, "D4"), "fdcfce7", "the button repeats the last fill");
  await pick(page, "B2", "C3"); await page.click("#mnFlK"); await page.click("#mnPop .nc"); assert.strictEqual(await fmtOf(page, "B2"), "c16a34a", "No fill");
  assert.strictEqual(await page.evaluate(() => getComputedStyle(document.getElementById("mnPop")).display), "none", "palette closes");
});
test("borders_all_outside_thick_bottom_none", async ({ page }) => {
  await open(page); await pick(page, "B2", "C3");
  await page.click("#mnBrd"); await page.click("#mnPop [data-brd='all']");
  assert.deepStrictEqual([await fmtOf(page, "B2"), await fmtOf(page, "C3")], ["ef", "ef"]);
  const b2 = await tdStyle(page, "B2"), b1 = await tdStyle(page, "B1"), a2 = await tdStyle(page, "A2"), a1 = await tdStyle(page, "A1");
  assert.deepStrictEqual([b2.br, b2.bb, b1.bb, a2.br, b1.bbc], ["1px", "1px", "1px", "1px", "rgb(30, 41, 59)"], "each edge is one dark line (the shared grid line)");
  assert.strictEqual(a1.bb, "1px"); assert.notStrictEqual(a1.bbc, "rgb(30, 41, 59)", "A1 keeps its light grid line");
  await page.click("#mnBrd"); await page.click("#mnPop [data-brd='thick']");
  assert.deepStrictEqual([await fmtOf(page, "B2"), await fmtOf(page, "C3")], ["e6t9", "e9t6"], "thick outline, thin inside");
  await page.click("#mnBrd"); await page.click("#mnPop [data-brd='none']");
  assert.deepStrictEqual([await fmtOf(page, "B2"), await fmtOf(page, "C3")], ["", ""]);
  await pick(page, "A1"); await page.click("#mnBrd"); await page.click("#mnPop [data-brd='bottom']"); assert.strictEqual(await fmtOf(page, "A1"), "e4");
  await pick(page, "A2"); await page.click("#mnBrd"); await page.click("#mnPop [data-brd='none']");
  assert.strictEqual(await fmtOf(page, "A1"), "", "No border also clears the neighbour's side that touches it");
  await pick(page, "E5", "F6"); await page.click("#mnBrd"); await page.click("#mnPop [data-brd='out']");
  assert.deepStrictEqual([await fmtOf(page, "E5"), await fmtOf(page, "F5"), await fmtOf(page, "E6"), await fmtOf(page, "F6")], ["e9", "e3", "ec", "e6"]);
});
test("merge_and_unmerge", async ({ page }) => {
  await open(page); await page.evaluate(() => mnPaste("Title\tx\nA\tB"));
  await page.evaluate(() => { window.confirm = () => true; });
  await pick(page, "A1", "C1"); await page.click("#mnMerge");
  assert.strictEqual(await fmtOf(page, "A1"), "acm1x3");
  assert.deepStrictEqual(await dirtyMn(page), ["A1=Title", "A2=A", "AA1=A:acm1x3", "B1=", "B2=B"], "B1's text went");
  const s = await tdStyle(page, "A1"); assert.deepStrictEqual([s.cs, s.al], [3, "center"]);
  assert.strictEqual(await page.evaluate(() => !!document.querySelector("#mnWrap td[data-r='0'][data-c='1']")), false, "B1 is covered");
  await pick(page, "A1"); await page.keyboard.press("ArrowRight");
  assert.strictEqual(await page.evaluate(() => document.getElementById("mnAt").textContent), "D1", "the arrow steps past the merge");
  await page.keyboard.press("ArrowLeft"); assert.strictEqual(await page.evaluate(() => document.getElementById("mnAt").textContent), "A1:C1", "back onto it: the whole block");
  await page.click("#mnFl"); assert.deepStrictEqual([await fmtOf(page, "A1"), await fmtOf(page, "C1")], ["ffef3c7acm1x3", "ffef3c7"], "formats the whole block");
  await page.click("#mnMerge"); assert.strictEqual(await fmtOf(page, "A1"), "ffef3c7ac", "unmerged");
  assert.strictEqual(await page.evaluate(() => !!document.querySelector("#mnWrap td[data-r='0'][data-c='1']")), true);
});
test("format_painter_copies_the_look", async ({ page }) => {
  await open(page); await pick(page, "A1"); await page.keyboard.press("Control+b"); await page.click("#mnFl");
  await page.click("#mnPainter"); assert.ok(await page.evaluate(() => document.querySelector("#mnWrap .mnGrid").classList.contains("painting")));
  const a = await page.$("#mnWrap td[data-r='2'][data-c='1']"), b = await page.$("#mnWrap td[data-r='3'][data-c='2']"), A = await a.boundingBox(), B = await b.boundingBox();
  await page.mouse.move(A.x + 5, A.y + 5); await page.mouse.down(); await page.mouse.move(B.x + 5, B.y + 5, { steps: 3 }); await page.mouse.up();
  assert.deepStrictEqual([await fmtOf(page, "B3"), await fmtOf(page, "C4")], ["bffef3c7", "bffef3c7"]);
  assert.ok(await page.evaluate(() => !mn.paint && !document.querySelector("#mnWrap .mnGrid").classList.contains("painting")), "painter is off after one use");
});
test("undo_takes_back_a_format", async ({ page }) => {
  await open(page); await pick(page, "A1"); await page.click("#mnBrd"); await page.click("#mnPop [data-brd='all']"); await page.waitForTimeout(30);
  assert.strictEqual(await fmtOf(page, "A1"), "ef");
  await page.keyboard.press("Control+z"); await page.waitForTimeout(30);
  assert.strictEqual(await fmtOf(page, "A1"), "");
});
test("saved_file_has_excel_colours_borders_and_merges", async ({ page }) => {
  await open(page); await page.evaluate(() => { window.confirm = () => true; mnPaste("Title\nItem\tWho"); });
  await pick(page, "A1", "B1"); await page.click("#mnMerge"); await page.selectOption("#mnSize", "14"); await page.click("#mnFcK"); await page.click("#mnPop i[data-col='1e3a8a']");
  await pick(page, "A2", "B3"); await page.click("#mnBrd"); await page.click("#mnPop [data-brd='all']");
  await pick(page, "A2", "B2"); await page.click("#mnFlK"); await page.click("#mnPop i[data-col='dbeafe']"); await page.keyboard.press("Control+i");
  const r = await roundTrip(page);
  assert.ok(/<mergeCells count="1"><mergeCell ref="A1:B1"\/><\/mergeCells>/.test(r.sheetXml), "merge in Excel");
  const xfs = r.styles.match(/<cellXfs\b[^>]*>[\s\S]*?<\/cellXfs>/)[0].match(/<xf\b[^>]*\/>|<xf\b[^>]*>[\s\S]*?<\/xf>/g), list = (pl, t) => r.styles.match(new RegExp("<" + pl + "\\b[^>]*>[\\s\\S]*?</" + pl + ">"))[0].match(new RegExp("<" + t + "\\b[^>]*/>|<" + t + "\\b[^>]*>[\\s\\S]*?</" + t + ">", "g"));
  const fonts = list("fonts", "font"), fills = list("fills", "fill"), borders = list("borders", "border");
  const xf = ref => xfs[+((r.sheetXml.match(new RegExp('<c r="' + ref + '"[^>]*\\bs="(\\d+)"')) || [])[1] ?? -1)] || "";
  const id = (ref, k) => +(xf(ref).match(new RegExp(k + 'Id="(\\d+)"')) || [])[1];
  assert.ok(/<sz val="14"\/><color rgb="FF1E3A8A"\/>/.test(fonts[id("A1", "font")]) && /horizontal="center"/.test(xf("A1")), "A1 size 14, dark blue, centred: " + xf("A1"));
  assert.ok(/<i\/>/.test(fonts[id("A2", "font")]) && /FFDBEAFE/.test(fills[id("A2", "fill")]), "A2 italic on light blue");
  assert.ok(/<left style="thin">[\s\S]*<bottom style="thin">/.test(borders[id("B3", "border")]), "B3 has all borders");
  assert.ok(/<c r="B3" s="\d+"\/>/.test(r.sheetXml), "an empty bordered cell is written so Excel draws it");
  assert.ok(/<c r="B1" s="\d+"\/>/.test(r.sheetXml) || !/<c r="B1"/.test(r.sheetXml), "covered cell");
  for (const [pl, n] of [["fonts", fonts.length], ["fills", fills.length], ["borders", borders.length], ["cellXfs", xfs.length]]) assert.strictEqual(+(r.styles.match(new RegExp("<" + pl + ' count="(\\d+)"')) || [])[1], n, pl + " count");
  const n1 = xfs.length, r2 = await roundTrip(page);
  assert.strictEqual(r2.styles.match(/<cellXfs\b[^>]*>[\s\S]*?<\/cellXfs>/)[0].match(/<xf\b/g).length, n1, "a second save adds no styles");
  assert.strictEqual((r2.sheetXml.match(/<mergeCells/g) || []).length, 1, "one merge list after a second save");
});

(async () => {
  const only = process.argv[2];
  let pass = 0, ran = 0;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue;
    ran++; let S = null;
    try { S = await boot(Object.assign({ today: "2026-10-26", others: false }, t.opts)); await t.fn(S); if (S.errs.length) throw new Error("page errors: " + S.errs.join(" | ").slice(0, 300)); pass++; console.log("ok   " + t.name); }
    catch (e) { console.log("FAIL " + t.name + ": " + String(e.message).split("\n")[0].slice(0, 300)); }
    if (S) await S.close();
  }
  console.log(pass + "/" + ran + " pass");
  process.exit(pass === ran ? 0 : 1);
})();
