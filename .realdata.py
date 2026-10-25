# Real squadron data from LODESTAR_Data_Input.xlsx (Brandon fills it in). Used by every builder when LODESTAR_INPUT points at the file;
# without it the builders make the demo set (seedplan.py samples).
import os, datetime as dt
PATH = os.environ.get("LODESTAR_INPUT")
ON = bool(PATH)
DEPTS = ["SUP 1", "SUP 2", "TACCO", "Loadmaster", "Pilot"]
TAG_FIX = {"LM": "L", "PLT": "P", "PILOT": "P", "LOADMASTER": "L", "TACCO": "T", "SUP1": "S1", "SUP2": "S2"}
def _s(v):
    if v is None: return ""
    if isinstance(v, float) and v.is_integer(): v = int(v)
    return " ".join(str(v).split())
CREW, FLIGHT_CODES, ACTS, DAY_STATUS, GROUND_LIST, TAILS, HOLS, BDO, SDO = {}, [], [], [], [], [], [], [], []
if ON:
    from openpyxl import load_workbook
    wb = load_workbook(PATH, data_only=True)
    ws = wb["Crew"]
    for r in range(5, ws.max_row + 1):
        dep, cs, nm, ini, cat, role, st, b, s, rem = (_s(ws.cell(r, c).value) for c in range(1, 11))
        if dep not in DEPTS or not (cs or nm): continue
        if cs.upper() in ("NIL", "NA", "N/A", "-"): cs = ""
        st = {"NSMEN": "NSMEN", "SANS": "SANS", "INACTIVE": "Inactive"}.get(st.upper(), "Active")
        cat = cat.upper() if cat.upper() in ("CAT A", "CAT B", "CAT C", "CAT D", "TRAINEE") else ""
        role = next((x for x in ("Instructor", "Senior CAT A", "Junior") if x.lower() == role.lower()), "")
        p = dict(cs=cs, name=nm, ini=ini.upper(), cat=cat, role=role, status=st, rem=rem, dept=dep)
        CREW.setdefault(dep, []).append(p)
        if b.upper().startswith("Y"): BDO.append(p)
        if s.upper().startswith("Y"): SDO.append(p)
    ws = wb["Flight Codes"]
    for r in range(5, ws.max_row + 1):
        code, desc, so, hrs, crew, mt, tag = (_s(ws.cell(r, c).value) for c in range(1, 8))
        if not code or code.lower() == "code": continue
        crew = " ".join(TAG_FIX.get(t, t) for t in crew.upper().replace(",", " ").split())
        num = lambda x, d: float(x.lower().rstrip("hrs").strip()) if x.lower().rstrip("hrs").strip().replace(".", "", 1).isdigit() else d
        so_ = num(so, 1); FLIGHT_CODES.append(dict(code=code, desc=desc or code, sorties=int(so_) if float(so_).is_integer() else so_, hrs=num(hrs, 0), crew=crew, mtype=mt.upper(), tag=tag))
    ws = wb["Activities"]
    for r in range(5, ws.max_row + 1):
        code, desc, cat = (_s(ws.cell(r, c).value) for c in range(1, 4))
        if not code or code.lower() == "code": continue
        ACTS.append(dict(code=code, desc=desc or code, cat=cat, depts={d for j, d in enumerate(DEPTS) if _s(ws.cell(r, 4 + j).value).upper().startswith("Y")}))
    ws = wb["Lists"]
    for r in range(5, ws.max_row + 1):
        for col, L in ((1, DAY_STATUS), (3, GROUND_LIST), (5, TAILS)):
            v = _s(ws.cell(r, col).value)
            if v: L.append(v)
    ws = wb["Public Holidays"]
    for r in range(2, ws.max_row + 1):
        d, n = ws.cell(r, 1).value, _s(ws.cell(r, 2).value)
        if isinstance(d, dt.datetime): d = d.date()
        if isinstance(d, dt.date): HOLS.append((d, n))
def crew_tuples(dept):
    """(callsign, name, cat, role, status) like seedplan.SAMPLE_CREW, plus initials and remarks by position"""
    return [(p["cs"], p["name"], p["cat"], p["role"], p["status"]) for p in CREW.get(dept, [])]
def acts_for(dept):
    return [a for a in ACTS if dept in a["depts"]]
