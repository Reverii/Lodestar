import sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule
out = sys.argv[1]
RANKS = ["LTC", "MAJ", "CPT", "LTA", "1WO", "2WO", "3WO", "MSG", "SSG", "1SG", "2SG", "3SG", "ME3", "ME2", "ME1"]
STAT = ["Active", "NSMEN", "SANS"]
DEPTS = ["SUP 1", "SUP 2", "TACCO", "Loadmaster", "Pilot"]
N, R0 = 300, 5
wb = Workbook(); ws = wb.active; ws.title = "Crew List"
thin = Side(style="thin", color="CBD5E1"); bd = Border(left=thin, right=thin, top=thin, bottom=thin)
ws["A1"] = "LODESTAR crew list: callsign, rank and status by initials"; ws["A1"].font = Font(bold=True, size=14, color="0F172A")
ws["A2"] = "One row per person. Initials are the key (the same Initials as in ATOM and on the Crew Roster). Pick Rank, Status and Department from the lists. NS = NSMEN."
ws["A3"] = "Red = the same Initials or Callsign twice. Amber = Initials typed but Rank, Status or Department missing. Ranks not in the list can be added on the Lists sheet."
for c in ("A2", "A3"): ws[c].font = Font(size=10, color="475569")
heads = ["Initials", "Rank", "Callsign", "Status", "Department", "Name (optional)", "Remarks"]
widths = [11, 9, 14, 11, 13, 30, 34]
for i, (h, w) in enumerate(zip(heads, widths), 1):
    c = ws.cell(4, i, h); c.font = Font(bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor="1E3A8A"); c.alignment = Alignment(horizontal="center", vertical="center"); c.border = bd
    ws.column_dimensions[c.column_letter].width = w
ws.row_dimensions[4].height = 20
for r in range(R0, R0 + N):
    for i in range(1, 8):
        c = ws.cell(r, i); c.border = bd
        c.alignment = Alignment(horizontal="center" if i <= 5 else "left", vertical="center")
        c.number_format = "@"   # text, so initials and callsigns are kept as typed
    ws.cell(r, 1).font = Font(bold=True)
L = wb.create_sheet("Lists")
for col, (h, vals) in enumerate([("Rank", RANKS), ("Status", STAT), ("Department", DEPTS)], 1):
    c = L.cell(1, col, h); c.font = Font(bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor="1E3A8A")
    for k, v in enumerate(vals, 2): L.cell(k, col, v)
    L.column_dimensions[c.column_letter].width = 14
L["E1"] = "Add a rank at the bottom of column A (up to row 60); it appears in the Rank list."; L["E1"].font = Font(italic=True, color="475569")
last = R0 + N - 1
def dv(f, col, title, msg):
    d = DataValidation(type="list", formula1=f, allow_blank=True, showErrorMessage=True, errorTitle=title, error=msg); ws.add_data_validation(d); d.add(f"{col}{R0}:{col}{last}")
dv("=Lists!$A$2:$A$60", "B", "Rank", "Pick a rank from the list (add new ranks on the Lists sheet).")
dv("=Lists!$B$2:$B$4", "D", "Status", "Pick Active, NSMEN or SANS.")
dv("=Lists!$C$2:$C$6", "E", "Department", "Pick the department.")
red = PatternFill("solid", fgColor="FECACA"); amber = PatternFill("solid", fgColor="FEF3C7")
ws.conditional_formatting.add(f"A{R0}:A{last}", FormulaRule(formula=[f'AND(A{R0}<>"",COUNTIF($A${R0}:$A${last},A{R0})>1)'], fill=red))
ws.conditional_formatting.add(f"C{R0}:C{last}", FormulaRule(formula=[f'AND(C{R0}<>"",COUNTIF($C${R0}:$C${last},C{R0})>1)'], fill=red))
for col in "BDE":
    ws.conditional_formatting.add(f"{col}{R0}:{col}{last}", FormulaRule(formula=[f'AND($A{R0}<>"",{col}{R0}="")'], fill=amber))
ws.freeze_panes = "B5"; ws.auto_filter.ref = f"A4:G{last}"
ws.sheet_view.zoomScale = 110
wb.save(out)
