// Saved files stay readable by Excel (z150): hidden control characters, NaN numbers and a desktop-Excel calcChain
// must not make Excel report "a problem with some content". Build the dashboard first.
const assert = require("assert");
const { boot } = require("./lode_lib");
(async () => {
  const b = await boot({ today: "2026-11-03" }), p = b.page; let fails = 0;
  const ok = (n, f) => { try { f(); console.log("ok  ", n); } catch (e) { fails++; console.log("FAIL", n, e.message); } };
  const r = await p.evaluate(() => {
    OPS = true;
    const vals = ["Line1\nLine2", "Word soft\u000Bbreak", "ctrl\u0001char", "a & <b> \"c\"", "jet ✈ 😀", NaN, Infinity, 12.5, "\uD800lone", "cr\r\nlf"];
    const out = [];
    books.forEach((bk, bi) => withBook(bi, () => {
      const sh = Object.keys(WB.paths)[0];
      // pretend desktop Excel saved this file last: it then carries a calcChain part
      WB.files["xl/calcChain.xml"] = new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><calcChain xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><c r="A1" i="1"/></calcChain>');
      const rp = "xl/_rels/workbook.xml.rels", cp = "[Content_Types].xml";
      WB.files[rp] = te.encode(td.decode(WB.files[rp]).replace("</Relationships>", '<Relationship Id="rIdCC" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/calcChain" Target="calcChain.xml"/></Relationships>'));
      WB.files[cp] = te.encode(td.decode(WB.files[cp]).replace("</Types>", '<Override PartName="/xl/calcChain.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.calcChain+xml"/></Types>'));
      vals.forEach((v, k) => dirty.set(sh + "!Z" + (60 + k), { sheet: sh, ref: "Z" + (60 + k), val: v }));
      const z = fflate.unzipSync(logBuild(bk, new Map(bk.dirty)).bytes), bad = [];
      for (const [n, u] of Object.entries(z)) if (/\.(xml|rels)$/.test(n)) { const d = new DOMParser().parseFromString(td.decode(u), "application/xml"); if (d.getElementsByTagName("parsererror").length) bad.push(n); }
      const x = td.decode(z[WB.paths[sh]]);
      out.push({ name: WB.name, bad, cc: Object.keys(z).some(n => /calcChain/.test(n)) || /calcChain/.test(td.decode(z[rp]) + td.decode(z[cp])),
        nan: /<v>(NaN|Infinity)<\/v>/.test(x), soft: x.includes("Word soft\nbreak"), num: /<c r="Z67"[^>]*><v>12.5<\/v>/.test(x) });
    }));
    return out;
  });
  ok("every file was saved", () => assert.strictEqual(r.length, 8, r.map(x => x.name).join()));
  r.forEach(f => ok(f.name + " is valid XML, no calcChain, no NaN", () => { assert.deepStrictEqual(f.bad, []); assert.ok(!f.cc, "calcChain left"); assert.ok(!f.nan, "NaN written"); assert.ok(f.soft, "soft line break kept as a new line"); assert.ok(f.num, "a real number still saved"); }));
  ok("no page errors", () => assert.deepStrictEqual(b.errs, []));
  await b.close(); console.log(fails ? fails + " FAILED" : "all pass"); process.exit(fails ? 1 : 0);
})();
