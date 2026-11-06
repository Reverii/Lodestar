import sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule
out = sys.argv[1]
ATOM = sys.argv[2] if len(sys.argv) > 2 else None
RANKS = ["LTC", "MAJ", "CPT", "LTA", "1WO", "2WO", "3WO", "MSG", "SSG", "1SG", "2SG", "3SG", "ME3", "ME2", "ME1"]
STAT = ["Active", "NSMEN", "SANS"]
DEPTS = ["SUP 1", "SUP 2", "TACCO", "Loadmaster", "Pilot"]
N, R0 = 300, 5
wb = Workbook(); ws = wb.active; ws.title = "Crew List"
thin = Side(style="thin", color="CBD5E1"); bd = Border(left=thin, right=thin, top=thin, bottom=thin)
ws["A1"] = "LODESTAR crew list: callsign, rank and status by initials"; ws["A1"].font = Font(bold=True, size=14, color="0F172A")
ws["A2"] = "Department, Initials and ATOM status come from the ATOM export. Fill in Rank and Callsign, and check Status (Active / NSMEN / SANS; NS = NSMEN). Staff/Assigned in ATOM is left blank for you to decide."
ws["A3"] = "Red = the same Initials twice in a department, or the same Callsign twice. Amber = Rank, Callsign or Status still missing. New people: add a row at the bottom. Ranks not in the list can be added on the Lists sheet."
for c in ("A2", "A3"): ws[c].font = Font(size=10, color="475569")
heads = ["Department", "Initials", "ATOM status", "Rank", "Callsign", "Status", "Remarks"]
widths = [13, 13, 15, 9, 14, 11, 34]
for i, (h, w) in enumerate(zip(heads, widths), 1):
    c = ws.cell(4, i, h); c.font = Font(bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor="1E3A8A"); c.alignment = Alignment(horizontal="center", vertical="center"); c.border = bd
    ws.column_dimensions[c.column_letter].width = w
ws.row_dimensions[4].height = 20
for r in range(R0, R0 + N):
    for i in range(1, 8):
        c = ws.cell(r, i); c.border = bd
        c.alignment = Alignment(horizontal="left" if i == 7 else "center", vertical="center")
        c.number_format = "@"   # text, so initials and callsigns are kept as typed
    ws.cell(r, 2).font = Font(bold=True)
    ws.cell(r, 3).font = Font(color="64748B")
L = wb.create_sheet("Lists")
for col, (h, vals) in enumerate([("Rank", RANKS), ("Status", STAT), ("Department", DEPTS)], 1):
    c = L.cell(1, col, h); c.font = Font(bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor="1E3A8A")
    for k, v in enumerate(vals, 2): L.cell(k, col, v)
    L.column_dimensions[c.column_letter].width = 14
L["E1"] = "Add a rank at the bottom of column A (up to row 60); it appears in the Rank list."; L["E1"].font = Font(italic=True, color="475569")
last = R0 + N - 1
def dv(f, col, title, msg):
    d = DataValidation(type="list", formula1=f, allow_blank=True, showErrorMessage=True, errorTitle=title, error=msg); ws.add_data_validation(d); d.add(f"{col}{R0}:{col}{last}")
dv("=Lists!$A$2:$A$60", "D", "Rank", "Pick a rank from the list (add new ranks on the Lists sheet).")
dv("=Lists!$B$2:$B$4", "F", "Status", "Pick Active, NSMEN or SANS.")
dv("=Lists!$C$2:$C$6", "A", "Department", "Pick the department.")
red = PatternFill("solid", fgColor="FECACA"); amber = PatternFill("solid", fgColor="FEF3C7")
ws.conditional_formatting.add(f"B{R0}:B{last}", FormulaRule(formula=[f'AND(B{R0}<>"",COUNTIFS($A${R0}:$A${last},A{R0},$B${R0}:$B${last},B{R0})>1)'], fill=red))
ws.conditional_formatting.add(f"E{R0}:E{last}", FormulaRule(formula=[f'AND(E{R0}<>"",COUNTIF($E${R0}:$E${last},E{R0})>1)'], fill=red))
for col in "DEF":
    ws.conditional_formatting.add(f"{col}{R0}:{col}{last}", FormulaRule(formula=[f'AND($B{R0}<>"",{col}{R0}="")'], fill=amber))
ws.freeze_panes = "C5"; ws.auto_filter.ref = f"A4:G{last}"
ws.sheet_view.zoomScale = 110
if ATOM:   # fill Department, Initials and ATOM status from an ATOM export (sheets PILOT, ACS, TACCO, SUP1, SUP2; Status in A, Name = initials in B)
    import openpyxl
    MAP = {"PILOT": "Pilot", "ACS": "Loadmaster", "TACCO": "TACCO", "SUP1": "SUP 1", "SUP2": "SUP 2"}
    ST = {"active": "Active", "nsmen": "NSMEN", "sans": "SANS"}
    src = openpyxl.load_workbook(ATOM, read_only=True, data_only=True); r = R0; seen = set()
    for sn in ["PILOT", "TACCO", "SUP1", "SUP2", "ACS"]:
        if sn not in src.sheetnames: continue
        for row in src[sn].iter_rows(min_row=3, max_col=2, values_only=True):
            stv, nm = (str(row[0] or "").strip(), " ".join(str(row[1] or "").split()))
            if not nm or (sn, nm.upper()) in seen: continue
            seen.add((sn, nm.upper()))
            ws.cell(r, 1, MAP[sn]); ws.cell(r, 2, nm); ws.cell(r, 3, stv); ws.cell(r, 6, ST.get(stv.lower(), "")); r += 1
    print("rows", r - R0)
wb.save(out)
