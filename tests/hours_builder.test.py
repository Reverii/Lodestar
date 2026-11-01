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
codes_all = [str(fc.cell(r, 1).value or "") for r in range(6, 46)]
check("no_combined_2x_codes", not any(c.lower().startswith("2x") for c in codes_all), [c for c in codes_all if c.lower().startswith("2x")])
import re
rows = [r for r in range(6, 1006) if fl.cell(r, 3).value]
check("demo_has_a_two_sortie_flight", any((fl.cell(r, 7).value or 0) == 2 for r in rows), "no G = 2 row")
bad = [(r, fl.cell(r, 4).value) for r in rows if not re.fullmatch(r"\d{4}-\d{4}", str(fl.cell(r, 4).value or ""))]
check("every_demo_flight_has_a_full_range", not bad, bad[:5])
# ---- department file (layout 4): no Flight Hrs / Sorties on Activities, no ActHrs / ActSort anywhere
if len(sys.argv) > 1: dfolder = folder
else:
    dfolder = tempfile.mkdtemp(prefix="lodestar_hrsd_")
    subprocess.run([sys.executable, os.path.join(ROOT, ".lodestar_build.py"), "excel", dfolder, "--only", "sup2"], check=True, stdout=subprocess.DEVNULL)
dp = os.path.join(dfolder, "Flight_Ops_Planner_SUP2.xlsx")
dw = openpyxl.load_workbook(dp); ac = dw["Activities"]
check("dept_stamp_is_layout_4", str(dw["Dashboard"]["Z2"].value).endswith("layout 4"), dw["Dashboard"]["Z2"].value)
check("activities_hrs_and_sorties_columns_unused_and_hidden", [ac.cell(5, 4).value, ac.cell(5, 5).value] == ["(unused)", "(unused)"] and ac.column_dimensions["D"].hidden and ac.column_dimensions["E"].hidden, [ac.cell(5, 4).value, ac.cell(5, 5).value])
check("flight_rows_have_no_hrs_or_sorties", all(ac.cell(r, 4).value in (None, 0) and ac.cell(r, 5).value is None for r in range(6, 40)), [(ac.cell(r, 1).value, ac.cell(r, 4).value, ac.cell(r, 5).value) for r in range(6, 20)])
check("no_combined_codes_on_activities", not any(str(ac.cell(r, 1).value or "").lower().startswith("2x") for r in range(6, 80)))
check("no_actsort_or_acthrs_names", "ActSort" not in dw.defined_names and "ActHrs" not in dw.defined_names, list(dw.defined_names.keys())[:40])
bad = []
for ws in dw.worksheets:
    for row in ws.iter_rows():
        for c in row:
            if isinstance(c.value, str) and c.value.startswith("=") and ("ActSort" in c.value or "ActHrs" in c.value): bad.append((ws.title, c.coordinate))
check("no_formula_reads_actsort_or_acthrs", not bad, bad[:3])
oct_ = dw["Oct"]
check("fly_hrs_column_hidden", any(d.hidden for k, d in oct_.column_dimensions.items() if k in ("AI", "AJ", "AK")), {k: d.hidden for k, d in oct_.column_dimensions.items() if k in ("AI", "AJ", "AK")})
sys.exit(1 if fails else 0)
