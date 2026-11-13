#!/usr/bin/env python3
"""Self-test of tests/xlsx_check.py: a clean file passes, and each kind of damage Excel repairs is reported.
python3 tests/xlsx_check.test.py   (uses this folder's Duty_Roster.xlsx, or LODE_FILES)"""
import os, re, sys, zipfile, tempfile, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("xlsx_check", os.path.join(HERE, "xlsx_check.py")); xc = importlib.util.module_from_spec(spec); spec.loader.exec_module(xc)
SRC = os.path.join(os.environ.get("LODE_FILES", os.path.join(HERE, "..")), "Duty_Roster.xlsx")


def variant(edit):
    """copy SRC with edit(name, text) -> text applied to every XML part"""
    fd, out = tempfile.mkstemp(suffix=".xlsx"); os.close(fd)
    with zipfile.ZipFile(SRC) as zi, zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zo:
        for n in zi.namelist():
            d = zi.read(n)
            if n.endswith(".xml") or n.endswith(".rels"):
                d = edit(n, d.decode("utf-8")).encode("utf-8")
            if d is not None:
                zo.writestr(n, d)
    return out


def first_sheet(n):
    return n == "xl/worksheets/sheet1.xml"


CASES = {
    "clean": (lambda n, t: t, None),
    "cells out of order": (lambda n, t: re.sub(r'(<c r="([A-Z]+)(\d+)"[^>]*?(?:/>|>.*?</c>))(<c r="[A-Z]+\3"[^>]*?(?:/>|>.*?</c>))', r"\4\1", t, count=1) if first_sheet(n) else t, "left to right"),
    "rows out of order": (lambda n, t: t.replace('<row r="2"', '<row r="99999"', 1) if first_sheet(n) else t, "rows must go up"),
    "shared string past the end": (lambda n, t: re.sub(r't="(?:s|inlineStr)">(?:<v>\d+</v>|<is>.*?</is>)', 't="s"><v>999999</v>', t, count=1) if first_sheet(n) else t, "shared string index"),
    "two sheets with one name": (lambda n, t: re.sub(r'(<sheet [^>]*name=")[^"]+(")', r"\1Same\2", t, count=2) if n == "xl/workbook.xml" else t, "two sheets named"),
    "bad XML": (lambda n, t: t.replace("</worksheet>", "<oops></worksheet>") if first_sheet(n) else t, "does not parse"),
    "control character": (lambda n, t: t.replace("<sheetData>", "<sheetData>\x01", 1) if first_sheet(n) else t, "control character"),
    "template text in a formula": (lambda n, t: re.sub(r"<f>([^<]+)</f>", r"<f>INDEX({ref},1)</f>", t, count=1) if n.startswith("xl/worksheets/") else t, "names inside"),
    "element out of order": (lambda n, t: re.sub(r"(<sheetViews>.*?</sheetViews>)(.*?)(<sheetData)", r"\2\1\3", t, count=1, flags=re.S) if first_sheet(n) else t, "out of order"),
    "missing part in content types": (lambda n, t: re.sub(r'<Override PartName="/xl/worksheets/sheet1.xml"[^>]*/>', "", t) if n == "[Content_Types].xml" else t, "content type"),
    "style past cellXfs": (lambda n, t: re.sub(r'(<c r="[A-Z]+\d+" )s="\d+"', r'\1s="9999"', t, count=1) if first_sheet(n) else t, "beyond cellXfs"),
}

fails = 0
for name, (edit, expect) in CASES.items():
    f = variant(edit)
    probs = xc.Book(f).check(); os.remove(f)
    ok = (not probs) if expect is None else any(expect in p for p in probs)
    print(("ok   " if ok else "FAIL ") + name + ("" if ok else ": " + (probs[:2] if probs else "nothing reported").__str__()))
    fails += not ok
print("all pass" if not fails else "%d FAILED" % fails)
sys.exit(1 if fails else 0)
