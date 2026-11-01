#!/usr/bin/env python3
# Builder checks for "planned hours from the time range" (Master Planner layout 3, department layout 4).
# Run: python3 tests/hours_builder.test.py [folder holding a built demo set]   (no folder: builds the demo Master Planner into a temp dir)
import os, subprocess, sys, tempfile
import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
if len(sys.argv) > 1: folder = sys.argv[1]
else:
    folder = tempfile.mkdtemp(prefix="lodestar_hrs_")
    subprocess.run([sys.executable, os.path.join(ROOT, ".lodestar_build.py"), "excel", folder, "--only", "master"], check=True, stdout=subprocess.DEVNULL)
fails = []
def check(name, ok, detail=""):
    print(("ok   " if ok else "FAIL ") + name + ("" if ok else ": " + str(detail)))
    if not ok: fails.append(name)

mp = openpyxl.load_workbook(os.path.join(folder, "Master_Planner.xlsx"))
fc, fl = mp["Flight Codes"], mp["Flights"]
heads = [fc.cell(5, c).value for c in range(1, 6)]
check("flight_codes_headers", heads == ["Code", "Description", "Crew", "Mission Type", "Syllabus tag"], heads)
allh = " ".join(str(fc.cell(5, c).value or "") for c in range(1, 12))
check("flight_codes_no_hrs_or_sorties", "Hrs" not in allh and "Sorties" not in allh, allh)
check("flights_sorties_is_typed", fl["G5"].value == "Sorties" and not str(fl["G6"].value or "").startswith("="), (fl["G5"].value, fl["G6"].value))
check("flights_hrs_reads_the_time", str(fl["L6"].value).startswith("=") and "MOD(" in str(fl["L6"].value), fl["L6"].value)
check("flights_crew_lookup_col_3", "VLOOKUP(C6,CodeTable,3" in str(fl["H6"].value), fl["H6"].value)
check("flights_effective_sorties_col_O", "IF(G6=\"\",1,G6)" in str(fl["O6"].value), fl["O6"].value)
check("sorties_name_points_at_O", "$O$" in mp.defined_names["FlSorties"].attr_text, mp.defined_names["FlSorties"].attr_text)
check("stamp_is_master_layout_3", str(mp["Dashboard"]["Z2"].value).endswith("layout 3"), mp["Dashboard"]["Z2"].value)
sys.exit(1 if fails else 0)
