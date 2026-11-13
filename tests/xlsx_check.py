#!/usr/bin/env python3
"""Strict structural check of .xlsx files: the things that make desktop Excel say "We found a problem with some content"
and repair the file. openpyxl is lenient and Excel is not, so this reads the zip and XML directly.

python3 tests/xlsx_check.py <file-or-folder> ...       prints one line per problem, exit 1 if any
"""
import re, sys, os, zipfile, posixpath
from lxml import etree

NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PR = "http://schemas.openxmlformats.org/package/2006/relationships"
CT = "http://schemas.openxmlformats.org/package/2006/content-types"
q = lambda t: "{%s}%s" % (NS, t)
# CT_Worksheet child order (ECMA-376 part 1, 18.3.1.99); out of order = repair
WS_ORDER = ["sheetPr", "dimension", "sheetViews", "sheetFormatPr", "cols", "sheetData", "sheetCalcPr", "sheetProtection", "protectedRanges",
            "scenarios", "autoFilter", "sortState", "dataConsolidate", "customSheetViews", "mergeCells", "phoneticPr", "conditionalFormatting",
            "dataValidations", "hyperlinks", "printOptions", "pageMargins", "pageSetup", "headerFooter", "rowBreaks", "colBreaks", "customProperties",
            "cellWatches", "ignoredErrors", "smartTags", "drawing", "legacyDrawing", "legacyDrawingHF", "drawingHF", "picture", "oleObjects",
            "controls", "webPublishItems", "tableParts", "extLst"]
WB_ORDER = ["fileVersion", "fileSharing", "workbookPr", "workbookProtection", "bookViews", "sheets", "functionGroups", "externalReferences",
            "definedNames", "calcPr", "oleSize", "customWorkbookViews", "pivotCaches", "smartTagPr", "smartTagTypes", "webPublishing",
            "fileRecoveryPr", "webPublishObjects", "extLst"]
BAD_XML_CHARS = re.compile("[\x00-\x08\x0b\x0c\x0e-\x1f￾￿]")


def col_num(s):
    n = 0
    for ch in s:
        n = n * 26 + ord(ch) - 64
    return n


def split_ref(ref):
    m = re.fullmatch(r"\$?([A-Z]{1,3})\$?([0-9]+)", ref)
    return (col_num(m.group(1)), int(m.group(2))) if m else None


def rng(ref):
    a, _, b = ref.partition(":")
    a, b = split_ref(a), split_ref(b or a)
    return None if not a or not b else (a[0], a[1], b[0], b[1])


def formula_problem(f):
    """Cheap syntax check of a formula's text: quotes, brackets and braces balanced, no stray template text."""
    s, depth, brace, i = f, 0, 0, 0
    while i < len(s):
        ch = s[i]
        if ch == '"':
            j = s.find('"', i + 1)
            while j != -1 and j + 1 < len(s) and s[j + 1] == '"':
                j = s.find('"', j + 2)
            if j == -1:
                return "unclosed string"
            i = j + 1
            continue
        if ch == "'":   # quoted sheet name
            j = s.find("'", i + 1)
            while j != -1 and j + 1 < len(s) and s[j + 1] == "'":
                j = s.find("'", j + 2)
            if j == -1:
                return "unclosed sheet quote"
            i = j + 1
            continue
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
            if depth < 0:
                return "unbalanced )"
        elif ch == "{":
            brace += 1
            # array constants hold only numbers, strings, booleans, errors, commas and semicolons
            j = s.find("}", i)
            if j == -1:
                return "unclosed {"
            if re.search(r"[A-Za-z_]{2,}", re.sub(r'"[^"]*"|TRUE|FALSE|#N/A|#[A-Z/0!?]+', "", s[i + 1:j])):
                return "names inside { } (template text left in the formula?): " + s[i:j + 1][:40]
        elif ch == "}":
            brace -= 1
        i += 1
    if depth:
        return "unbalanced ("
    if brace:
        return "unbalanced {"
    return None


class Book:
    def __init__(self, path):
        self.path, self.problems = path, []
        self.z = zipfile.ZipFile(path)
        self.names = set(self.z.namelist())

    def bad(self, part, msg):
        self.problems.append("%s: %s: %s" % (os.path.basename(self.path), part, msg))

    def xml(self, part):
        try:
            data = self.z.read(part)
        except KeyError:
            self.bad(part, "missing part")
            return None
        try:
            txt = data.decode("utf-8")
        except UnicodeDecodeError:
            self.bad(part, "not UTF-8")
            return None
        if BAD_XML_CHARS.search(txt):
            self.bad(part, "control character not allowed in XML")
        try:
            return etree.fromstring(data)
        except etree.XMLSyntaxError as e:
            self.bad(part, "XML does not parse: %s" % e)
            return None

    def rels(self, part):
        d, b = posixpath.split(part)
        rp = posixpath.join(d, "_rels", b + ".rels")
        out = {}
        if rp not in self.names:
            return out
        x = self.xml(rp)
        if x is None:
            return out
        ids = set()
        for r in x:
            rid, tgt, mode = r.get("Id"), r.get("Target"), r.get("TargetMode")
            if rid in ids:
                self.bad(rp, "duplicate relationship Id " + rid)
            ids.add(rid)
            if mode == "External":
                continue
            full = posixpath.normpath(tgt.lstrip("/") if tgt.startswith("/") else posixpath.join(d, tgt))
            if full not in self.names:
                self.bad(rp, "relationship %s points at a missing part %s" % (rid, full))
            out[rid] = (r.get("Type").rsplit("/", 1)[-1], full)
        return out

    def check(self):
        bad = self.z.testzip()
        if bad:
            self.bad(bad, "zip entry is corrupt")
        for n in self.names:
            if n.endswith(".xml") or n.endswith(".rels") or n.endswith(".vml"):
                self.xml(n)
        self.content_types()
        self.rels("")   # _rels/.rels
        wb = self.xml("xl/workbook.xml")
        if wb is None:
            return self.problems
        wrels = self.rels("xl/workbook.xml")
        self.order(wb, WB_ORDER, "xl/workbook.xml")
        styles = self.styles(wrels)
        sst = self.sst(wrels)
        sheets, seen_names, seen_ids = [], set(), set()
        for s in wb.iter(q("sheet")):
            name, sid, rid = s.get("name"), s.get("sheetId"), s.get("{%s}id" % R)
            low = name.lower()
            if low in seen_names:
                self.bad("xl/workbook.xml", "two sheets named " + name)
            if len(name) > 31 or re.search(r"[\[\]:*?/\\]", name) or name.startswith("'") or name.endswith("'"):
                self.bad("xl/workbook.xml", "sheet name Excel refuses: " + name)
            if sid in seen_ids:
                self.bad("xl/workbook.xml", "duplicate sheetId " + sid)
            seen_names.add(low); seen_ids.add(sid)
            if rid not in wrels:
                self.bad("xl/workbook.xml", "sheet %s has no relationship %s" % (name, rid))
            else:
                sheets.append((name, wrels[rid][1]))
        dn = set()
        for d in wb.iter(q("definedName")):
            key = (d.get("name").lower(), d.get("localSheetId"))
            if key in dn:
                self.bad("xl/workbook.xml", "defined name twice in one scope: " + d.get("name"))
            dn.add(key)
            lid = d.get("localSheetId")
            if lid is not None and int(lid) >= len(sheets):
                self.bad("xl/workbook.xml", "defined name %s on sheet index %s that doesn't exist" % (d.get("name"), lid))
            p = formula_problem(d.text or "")
            if p:
                self.bad("xl/workbook.xml", "defined name %s: %s" % (d.get("name"), p))
        for name, part in sheets:
            self.sheet(name, part, styles, sst)
        return self.problems

    def content_types(self):
        x = self.xml("[Content_Types].xml")
        if x is None:
            return
        defaults = {e.get("Extension").lower() for e in x.iter("{%s}Default" % CT)}
        over = {e.get("PartName").lstrip("/"): e.get("ContentType") for e in x.iter("{%s}Override" % CT)}
        for n in self.names:   # a sheet, the workbook, styles and shared strings need their own content type (a plain xml default isn't enough)
            m = re.fullmatch(r"xl/(worksheets/sheet\d+|workbook|styles|sharedStrings)\.xml", n)
            kind = m and {"workbook": "sheet.main", "styles": "styles", "sharedStrings": "sharedStrings"}.get(m.group(1), "worksheet")
            if kind and not (over.get(n) or "").endswith(kind + "+xml"):
                self.bad("[Content_Types].xml", "%s has no %s content type" % (n, kind))
        for o in over:
            if o not in self.names:
                self.bad("[Content_Types].xml", "override for a missing part /" + o)
        for n in self.names:
            if n.endswith("/") or n == "[Content_Types].xml":
                continue
            if n not in over and n.rsplit(".", 1)[-1].lower() not in defaults:
                self.bad("[Content_Types].xml", "no content type for " + n)

    def order(self, root, order, part):
        last = -1
        for ch in root:
            if not isinstance(ch.tag, str) or not ch.tag.startswith("{%s}" % NS):
                continue
            t = etree.QName(ch).localname
            if t not in order:
                self.bad(part, "unknown element <%s>" % t)
                continue
            i = order.index(t)
            if i < last:
                self.bad(part, "<%s> is out of order (Excel repairs this)" % t)
            if i == last and t not in ("conditionalFormatting",):
                self.bad(part, "<%s> appears twice" % t)
            last = i

    def styles(self, wrels):
        part = next((p for t, p in wrels.values() if t == "styles"), None)
        if not part:
            return {"xf": 10 ** 9, "dxf": 10 ** 9}
        x = self.xml(part)
        if x is None:
            return {"xf": 10 ** 9, "dxf": 10 ** 9}
        xfs = x.find(q("cellXfs")); dxfs = x.find(q("dxfs"))
        out = {"xf": len(xfs) if xfs is not None else 0, "dxf": len(dxfs) if dxfs is not None else 0}
        for el in (xfs, dxfs, x.find(q("fonts")), x.find(q("fills")), x.find(q("borders")), x.find(q("numFmts"))):
            if el is not None and el.get("count") is not None and int(el.get("count")) != len(el):
                self.bad(part, "<%s count=%s> but %d children" % (etree.QName(el).localname, el.get("count"), len(el)))
        return out

    def sst(self, wrels):
        part = next((p for t, p in wrels.values() if t == "sharedStrings"), None)
        if not part:
            return 0
        x = self.xml(part)
        if x is None:
            return 0
        n = len(x.findall(q("si")))
        if x.get("uniqueCount") is not None and int(x.get("uniqueCount")) != n:
            self.bad(part, "uniqueCount=%s but %d strings" % (x.get("uniqueCount"), n))
        for si in x.findall(q("si")):
            for t in si.iter(q("t")):
                if t.text and len(t.text) > 32767:
                    self.bad(part, "string longer than 32767 characters")
        return n

    def sheet(self, name, part, styles, nsst):
        x = self.xml(part)
        if x is None:
            return
        where = "%s (%s)" % (part, name)
        self.order(x, WS_ORDER, where)
        sd = x.find(q("sheetData"))
        last_row, cells, shared = 0, set(), {}
        for row in (sd if sd is not None else []):
            r = row.get("r")
            if r is not None:
                r = int(r)
                if r <= last_row:
                    self.bad(where, "row %d after row %d (rows must go up)" % (r, last_row))
                if r > 1048576:
                    self.bad(where, "row number beyond Excel's grid: %d" % r)
                last_row = r
            else:
                r = last_row + 1; last_row = r
            if row.get("s") is not None and int(row.get("s")) >= styles["xf"]:
                self.bad(where, "row %d style %s beyond cellXfs" % (r, row.get("s")))
            last_col = 0
            for c in row:
                ref = c.get("r")
                if ref is None:
                    last_col += 1; col = last_col
                else:
                    sr = split_ref(ref)
                    if not sr:
                        self.bad(where, "bad cell reference " + ref); continue
                    col, rr = sr
                    if rr != r:
                        self.bad(where, "cell %s sits in row %d" % (ref, r))
                    if col <= last_col:
                        self.bad(where, "cell %s after column %d in row %d (cells must go left to right, once each)" % (ref, last_col, r))
                    if col > 16384:
                        self.bad(where, "column beyond XFD: " + ref)
                    last_col = col
                cells.add((col, r))
                t, s = c.get("t", "n"), c.get("s")
                if s is not None and int(s) >= styles["xf"]:
                    self.bad(where, "cell %s style %s beyond cellXfs (%d)" % (ref, s, styles["xf"]))
                v, f, is_ = c.find(q("v")), c.find(q("f")), c.find(q("is"))
                vt = v.text if v is not None else None
                if t == "s":
                    if vt is None or not vt.isdigit() or int(vt) >= nsst:
                        self.bad(where, "cell %s shared string index %s (only %d strings)" % (ref, vt, nsst))
                elif t == "n" and vt not in (None, ""):
                    try:
                        fl = float(vt)
                        if fl != fl or fl in (float("inf"), float("-inf")):
                            raise ValueError
                    except ValueError:
                        self.bad(where, "cell %s number is not a number: %r" % (ref, vt))
                elif t == "b" and vt not in ("0", "1", None):
                    self.bad(where, "cell %s boolean is %r" % (ref, vt))
                elif t == "inlineStr" and is_ is None and vt is not None:
                    self.bad(where, "cell %s inlineStr without <is>" % ref)
                elif t not in ("s", "n", "b", "e", "str", "inlineStr", "d"):
                    self.bad(where, "cell %s unknown type %s" % (ref, t))
                if t == "s" and f is not None:
                    self.bad(where, "cell %s has a formula and a shared-string type" % ref)
                if f is not None:
                    ft = f.get("t")
                    if ft == "shared":
                        si = f.get("si")
                        if f.get("ref"):
                            shared.setdefault(si, {"master": None, "users": []})["master"] = (ref, rng(f.get("ref")))
                        else:
                            shared.setdefault(si, {"master": None, "users": []})["users"].append(ref)
                    if f.text:
                        p = formula_problem(f.text)
                        if p:
                            self.bad(where, "cell %s formula %s: %s" % (ref, f.text[:60], p))
                    elif ft != "shared":
                        self.bad(where, "cell %s empty formula" % ref)
        for si, d in shared.items():
            if d["master"] is None and d["users"]:
                self.bad(where, "shared formula si=%s used by %s but its master cell is gone" % (si, ", ".join(d["users"][:3])))
            elif d["master"]:
                a = d["master"][1]
                for u in d["users"]:
                    cr = split_ref(u)
                    if a and not (a[0] <= cr[0] <= a[2] and a[1] <= cr[1] <= a[3]):
                        self.bad(where, "shared formula si=%s used at %s outside its range" % (si, u))
        mc = x.find(q("mergeCells"))
        if mc is not None:
            if mc.get("count") is not None and int(mc.get("count")) != len(mc):
                self.bad(where, "mergeCells count=%s but %d merges" % (mc.get("count"), len(mc)))
            boxes = []
            for m in mc:
                b = rng(m.get("ref", ""))
                if not b:
                    self.bad(where, "bad merge " + m.get("ref", "")); continue
                for o in boxes:
                    if not (b[2] < o[0] or b[0] > o[2] or b[3] < o[1] or b[1] > o[3]):
                        self.bad(where, "merged ranges overlap: %s" % m.get("ref")); break
                boxes.append(b)
        dv = x.find(q("dataValidations"))
        if dv is not None:
            if dv.get("count") is not None and int(dv.get("count")) != len(dv):
                self.bad(where, "dataValidations count=%s but %d rules" % (dv.get("count"), len(dv)))
            for v in dv:
                f1 = v.find(q("formula1"))
                if f1 is not None and f1.text and v.get("type") == "list" and f1.text.startswith('"') and len(f1.text) > 257:
                    self.bad(where, "list validation over 255 characters at %s" % v.get("sqref"))
                if f1 is not None and f1.text:
                    p = formula_problem(f1.text)
                    if p:
                        self.bad(where, "validation %s: %s" % (v.get("sqref"), p))
        prio = set()
        for cf in x.findall(q("conditionalFormatting")):
            for rule in cf.findall(q("cfRule")):
                d = rule.get("dxfId")
                if d is not None and int(d) >= styles["dxf"]:
                    self.bad(where, "conditional format dxfId %s beyond dxfs (%d)" % (d, styles["dxf"]))
                p = rule.get("priority")
                if p in prio:
                    pass   # Excel tolerates duplicate priorities
                prio.add(p)
                for fo in rule.findall(q("formula")):
                    pr = formula_problem(fo.text or "")
                    if pr:
                        self.bad(where, "conditional format %s: %s" % (cf.get("sqref"), pr))
        srels = self.rels(part)
        for el in x:
            rid = el.get("{%s}id" % R)
            if rid and rid not in srels:
                self.bad(where, "<%s> refers to a missing relationship %s" % (etree.QName(el).localname, rid))
        for tp in x.iter(q("tablePart")):
            rid = tp.get("{%s}id" % R)
            if rid in srels:
                self.table(srels[rid][1], name)
        for t, p in srels.values():
            if t == "comments":
                cx = self.xml(p)
                if cx is not None:
                    authors = cx.find(q("authors"))
                    na = len(authors) if authors is not None else 0
                    seen = set()
                    for cm in cx.iter(q("comment")):
                        if int(cm.get("authorId", "0")) >= na:
                            self.bad(p, "comment %s authorId beyond authors" % cm.get("ref"))
                        if cm.get("ref") in seen:
                            self.bad(p, "two comments on cell %s" % cm.get("ref"))
                        seen.add(cm.get("ref"))
                if not any(tt == "vmlDrawing" for tt, _ in srels.values()):
                    self.bad(where, "comments without a VML drawing (Excel drops them)")

    def table(self, part, sheet):
        x = self.xml(part)
        if x is None:
            return
        cols = x.find(q("tableColumns"))
        if cols is not None:
            names = [c.get("name", "").lower() for c in cols]
            if len(set(names)) != len(names):
                self.bad(part, "table column names repeat")
            if cols.get("count") is not None and int(cols.get("count")) != len(cols):
                self.bad(part, "tableColumns count mismatch")
            b = rng(x.get("ref", ""))
            if b and b[2] - b[0] + 1 != len(cols):
                self.bad(part, "table %s width doesn't match %d columns" % (x.get("ref"), len(cols)))


def main(args):
    paths = []
    for a in args:
        if os.path.isdir(a):
            paths += sorted(os.path.join(a, n) for n in os.listdir(a) if n.lower().endswith(".xlsx") and not n.startswith("~$"))
        else:
            paths.append(a)
    total = 0
    for p in paths:
        try:
            probs = Book(p).check()
        except zipfile.BadZipFile:
            probs = [os.path.basename(p) + ": not a zip file"]
        for x in probs[:40]:
            print(x)
        if len(probs) > 40:
            print("%s: ... %d more" % (os.path.basename(p), len(probs) - 40))
        total += len(probs)
    print("%d files, %d problems" % (len(paths), total))
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
