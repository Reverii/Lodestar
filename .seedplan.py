# Sample data shared by the builders (department planners, Master Planner, Duty Roster), so every file tells the same story:
# Master Planner flights for 1 Oct - 30 Nov, the Duty Roster's BDO / SDO department per day, and each department's crew plan
# (flights matching the Master Planner, duty days, standby, sim, admin, leave). Deterministic: same output every build.
import datetime as dt, random

YEAR = 2026
SHIFTS = ["AM", "PM", "NIGHT"]
START, END = dt.date(YEAR, 10, 1), dt.date(YEAR, 11, 30)
DEPTS = ["SUP 1", "SUP 2", "Loadmaster", "TACCO", "Pilot"]
TAG = {"Pilot": "P", "Loadmaster": "L", "TACCO": "T", "SUP 1": "S1", "SUP 2": "S2"}
# code -> (sorties = aircraft, default crew tags)
CODES = {"FLT-1.5": (1, ""), "FLT-2.0": (1, ""), "FLT-3.0": (1, ""), "NVG-2.0": (1, ""), "2xFLT-1.5": (2, ""), "2xFLT-2.0": (2, ""),
         "MSN-3.0": (1, "P T S2"), "PLT-TRG": (1, "P"), "EIS": (1, "S2"), "MAS TRG": (1, "S2")}

def days():
    d = START
    while d <= END:
        yield d; d += dt.timedelta(days=1)

# (callsign, name, cat, role, status); SANS / NSmen go into the bottom section
SAMPLE_CREW = {
    "SUP 2": [("VIPER", "MAJ Tan Wei Ming", "CAT A", "Instructor", "Active"), ("HAWK", "CPT Sarah Lim", "CAT A", "Senior CAT A", "Active"),
              ("RAPTOR", "CPT Kumaravel S.", "CAT B", "Senior CAT A", "Active"), ("FALCON", "LTA Rachel Goh", "CAT C", "Junior", "Active"),
              ("EAGLE", "LTA Marcus Chua", "CAT D", "Junior", "Active"), ("OWL", "ME2 Nurul Huda", "TRAINEE", "Junior", "Active"),
              ("TALON", "CPT (NS) Lee Kok Wai", "CAT A", "Instructor", "NSMEN"), ("KESTREL", "ME3 Ahmad Yusof", "CAT B", "Senior CAT A", "SANS")],
    "SUP 1": [("ALPHA", "CPT Alan Teo", "CAT A", "Instructor", "Active"), ("BRAVO", "LTA Grace Wong", "CAT C", "Junior", "Active"),
              ("CHARLIE", "CPT Daniel Tay", "CAT A", "Senior CAT A", "Active"), ("DELTA", "LTA Mei Ling Ho", "CAT B", "Senior CAT A", "Active"),
              ("ECHO", "2LT Ryan Lim", "CAT D", "Junior", "Active"), ("FOXTROT", "ME1 Hafiz Rahman", "TRAINEE", "Junior", "Active"),
              ("GOLF", "CPT (NS) Victor Chan", "CAT A", "Instructor", "NSMEN"), ("HOTEL", "ME3 Lim Boon Huat", "CAT B", "Senior CAT A", "SANS")],
    "TACCO": [("ORCA", "CPT Priya Nair", "CAT A", "Senior CAT A", "Active"), ("SHARK", "LTA Jason Koh", "CAT B", "Junior", "Active"),
              ("MARLIN", "MAJ Ho Jun Jie", "CAT A", "Instructor", "Active"), ("BARRACUDA", "CPT Nadia Salleh", "CAT A", "Senior CAT A", "Active"),
              ("STINGRAY", "CPT Wong Kai Xiang", "CAT B", "Senior CAT A", "Active"), ("MANTA", "LTA Lim Hui Min", "CAT C", "Junior", "Active"),
              ("TUNA", "2LT Aaron Tan", "TRAINEE", "Junior", "Active"), ("DOLPHIN", "CPT (NS) Ravi Shankar", "CAT A", "Instructor", "NSMEN")],
    "Loadmaster": [("ATLAS", "ME2 Daniel Ong", "CAT A", "Senior CAT A", "Active"), ("TITAN", "ME1 Siti Aminah", "TRAINEE", "Junior", "Active"),
                   ("ZEUS", "ME3 Kelvin Goh", "CAT A", "Instructor", "Active"), ("APOLLO", "ME2 Farhan Ismail", "CAT B", "Senior CAT A", "Active"),
                   ("HERMES", "ME1 Joanne Teo", "CAT C", "Junior", "Active"), ("ARES", "ME1 Muthu Raj", "CAT D", "Junior", "Active"),
                   ("ODIN", "ME2 (NS) Chua Wei Jie", "CAT B", "Senior CAT A", "NSMEN")],
    "Pilot": [("COBRA", "MAJ Faizal Rahman", "CAT A", "Instructor", "Active"), ("PYTHON", "CPT Ben Lee", "CAT B", "Junior", "Active"),
              ("MAMBA", "LTC Goh Chee Keong", "CAT A", "Instructor", "Active"), ("COPPERHEAD", "MAJ Ong Li Ting", "CAT A", "Instructor", "Active"),
              ("ADDER", "CPT Ryan Seah", "CAT A", "Senior CAT A", "Active"), ("BOA", "CPT Hidayah Osman", "CAT A", "Senior CAT A", "Active"),
              ("RATTLER", "CPT Kenneth Yeo", "CAT B", "Senior CAT A", "Active"), ("KRAIT", "CPT Arjun Pillai", "CAT B", "Senior CAT A", "Active"),
              ("ASP", "LTA Chloe Tan", "CAT C", "Junior", "Active"), ("TAIPAN", "LTA Isaac Ng", "CAT C", "Junior", "Active"),
              ("SIDEWINDER", "LTA Amirul Hakim", "CAT D", "Junior", "Active"), ("KING", "2LT Jolene Koh", "TRAINEE", "Junior", "Active"),
              ("ANACONDA", "MAJ (NS) Simon Lau", "CAT A", "Instructor", "NSMEN"), ("CORAL", "CPT (NS) Desmond Yap", "CAT B", "Senior CAT A", "NSMEN")],
}
# Duty Roster: who can do each duty (callsign, name, department)
_crew = {c[0]: (c[1], d) for d, L in SAMPLE_CREW.items() for c in L}
SDO_CREW = [(cs,) + _crew[cs] for cs in ["ALPHA", "BRAVO", "CHARLIE", "DELTA", "HAWK", "RAPTOR", "FALCON", "EAGLE", "ATLAS", "ZEUS", "APOLLO", "HERMES"]]
BDO_CREW = [(cs,) + _crew[cs] for cs in ["VIPER", "HAWK", "ALPHA", "CHARLIE", "COBRA", "MAMBA", "COPPERHEAD", "ADDER", "ORCA", "MARLIN", "BARRACUDA"]]

# ---------------------------------------------------------------- Master Planner
STATUS = {dt.date(YEAR, 10, 9): "Maintenance", dt.date(YEAR, 10, 16): "Stand-down", dt.date(YEAR, 11, 9): "Public Holiday", dt.date(YEAR + 1, 1, 1): "Public Holiday"}
_base = {  # October 1-20 (the original samples): day -> shift -> [(code, time, comment, crew)]
    1: {"AM": [("2xFLT-2.0", "0830-1030", "Formation lead VIPER", ""), ("FLT-1.5", "0900-1030", "", "")],
        "PM": [("FLT-2.0", "1400-1600", "", ""), ("FLT-1.5", "1530-1700", "", ""), ("FLT-2.0", "1600-1800", "Ferry back", "")]},
    2: {"AM": [("FLT-1.5", "0800-0930", "", ""), ("FLT-2.0", "1000-1200", "", "")], "PM": [("FLT-2.0", "1330", "", "")], "NIGHT": [("NVG-2.0", "2000-2200", "", "")]},
    5: {"AM": [("FLT-2.0", "0830", "", ""), ("FLT-1.5", "TBC", "Wx dependent", "")], "NIGHT": [("NVG-2.0", "1930-2130", "", "")]},
    6: {"PM": [("FLT-3.0", "1300-1600", "", "P L")]},
    7: {"AM": [("FLT-2.0", "0830-1030", "Need 2nd crew", ""), ("FLT-1.5", "1100", "", "")]},
    8: {"AM": [("FLT-2.0", "0900-1100", "Exercise", "P T")]},
    12: {"AM": [("FLT-2.0", "0830-1030", "", "")], "PM": [("FLT-1.5", "1400-1530", "", "")]},
    13: {"NIGHT": [("NVG-2.0", "2000-2200", "", "P S2")]},
    14: {"AM": [("2xFLT-1.5", "0800-1100", "Check rides", "")]},
    15: {"PM": [("MSN-3.0", "1300-1600", "Long range", "")]},
    20: {"AM": [("PLT-TRG", "0900-1030", "", "")]},
}
FLIGHTS = []   # (date, shift, code, time, comment, crew override)
for d in sorted(_base):
    for sh in SHIFTS:
        for x in _base[d].get(sh, []): FLIGHTS.append((dt.date(YEAR, 10, d), sh) + x)
_r = random.Random(121)
for d in days():
    if d <= dt.date(YEAR, 10, 20) or d.weekday() >= 5 or d in STATUS: continue
    am = [("FLT-2.0", "0830-1030"), ("FLT-1.5", "1000-1130")] if _r.random() < .55 else [(_r.choice(["FLT-2.0", "FLT-3.0", "2xFLT-2.0", "PLT-TRG"]), "0830-1030")]
    if am[0][0] == "FLT-3.0": am[0] = ("FLT-3.0", "0800-1100")
    for code, tm in am: FLIGHTS.append((d, "AM", code, tm, "", ""))
    if d.weekday() in (0, 2, 4) or _r.random() < .4:
        code = _r.choice(["FLT-2.0", "FLT-2.0", "FLT-1.5", "MSN-3.0"])
        FLIGHTS.append((d, "PM", code, {"FLT-2.0": "1400-1600", "FLT-1.5": "1430-1600", "MSN-3.0": "1300-1600"}[code], "Long range" if code == "MSN-3.0" else "", ""))
    if d.weekday() in (1, 3):
        FLIGHTS.append((d, "NIGHT", "NVG-2.0", "2000-2200", "", ""))
FLIGHTS.append((dt.date(YEAR, 11, 24), "PM", "FLT-2.0", "1500-1700", "VIP familiarisation", "P L S2"))
# syllabus-tagged codes (demo, SUP 2 only so the other departments' samples stay as they are)
FLIGHTS.append((dt.date(YEAR, 10, 29), "PM", "EIS", "1400-1600", "EIS training", ""))
FLIGHTS.append((dt.date(YEAR, 11, 3), "PM", "MAS TRG", "1300-1600", "MAS tactical training", ""))
# next January (the look-ahead tab), planned while still in the old year
FLIGHTS.append((dt.date(YEAR + 1, 1, 4), "AM", "FLT-2.0", "0830-1030", "First flight of the new year", ""))
FLIGHTS.append((dt.date(YEAR + 1, 1, 5), "PM", "MSN-3.0", "1300-1600", "Long range", ""))
GROUND = [(dt.date(YEAR, 10, 1), "0730-0800", "Safety Brief", "", "Monthly safety brief"), (dt.date(YEAR, 10, 7), "1400-1600", "CRM Lecture", "S1 S2", ""),
          (dt.date(YEAR, 10, 9), "0900-1200", "Ground School", "", "While the aircraft are in maintenance"), (dt.date(YEAR, 10, 14), "1500", "Sqn Meeting", "", ""),
          (dt.date(YEAR, 10, 22), "1400-1600", "CRM Lecture", "P T", ""), (dt.date(YEAR, 10, 28), "1500", "Sqn Meeting", "", ""),
          (dt.date(YEAR, 11, 2), "0730-0800", "Safety Brief", "", "Monthly safety brief"), (dt.date(YEAR, 11, 11), "0900-1200", "Ground School", "L S1 S2", "Sonobuoy refresher"),
          (dt.date(YEAR, 11, 18), "1500", "Sqn Meeting", "", ""), (dt.date(YEAR, 11, 26), "1400-1600", "CRM Lecture", "", "")]

# ---------------------------------------------------------------- Duty Roster: department per day
DUTY = {"SDO": {}, "BDO": {}}
for k, v in {1: "SUP 1", 2: "SUP 2", 3: "SUP 2", 4: "SUP 2", 5: "Loadmaster", 6: "SUP 1", 7: "Loadmaster", 8: "SUP 1", 9: "Loadmaster", 10: "SUP 2"}.items(): DUTY["SDO"][dt.date(YEAR, 10, k)] = v
for k, v in {1: "SUP 2", 2: "Pilot", 3: "SUP 1", 4: "TACCO", 5: "SUP 2", 6: "SUP 1", 7: "Pilot", 8: "SUP 2"}.items(): DUTY["BDO"][dt.date(YEAR, 10, k)] = v
_sdo, _bdo = ["SUP 1", "SUP 2", "Loadmaster"], ["Pilot", "SUP 2", "TACCO", "SUP 1"]
for i, d in enumerate(x for x in days() if x > dt.date(YEAR, 10, 10)): DUTY["SDO"][d] = _sdo[i % 3]
for i, d in enumerate(x for x in days() if x > dt.date(YEAR, 10, 8)): DUTY["BDO"][d] = _bdo[i % 4]

# ---------------------------------------------------------------- what a department sees from the Master Planner (same rules as the dashboard)
def tags(s): return str(s or "").replace(",", " ").split()
def needs(crew, dept): t = tags(crew); return not t or TAG[dept] in t
def flcrew(f): return f[5] or CODES.get(f[2], (1, ""))[1]
def shift_flights(d, s, dept=None):
    L = [(i, f) for i, f in enumerate(FLIGHTS) if f[0] == d and f[1] == s and (dept is None or needs(flcrew(f), dept))]
    L.sort(key=lambda x: (("T" + x[1][3].upper()) if x[1][3] else "ZZ", x[0]))
    return [f for _, f in L]
def dept_slots(d, dept):
    """the 6 MASTER rows of a department for a day: [(code, time, note)]"""
    out = [["", "", ""] for _ in range(6)]
    if d in STATUS: out[0][2] = "NO FLY: " + STATUS[d]; return out
    for s in range(3):
        L = shift_flights(d, SHIFTS[s], dept)
        for k, f in enumerate(L[:2]): out[s * 2 + k] = [f[2], f[3], f[4]]
        if len(L) > 2:
            x = out[s * 2 + 1]; x[2] = (x[2] + " · " if x[2] else "") + "+" + str(len(L) - 2) + " more: " + ", ".join(f[2] + (" " + f[3] if f[3] else "") for f in L[2:])
    return out
def dept_ground(d, dept):
    return "; ".join(g[2] + (" " + g[1] if g[1] else "") for g in GROUND if g[0] == d and needs(g[3], dept))

# ---------------------------------------------------------------- each department's plan: (callsign, date, shift) -> code
FIXED = [("FALCON", 29, "PM", "EIS"), ("TALON", 1, "AM", "LL"), ("TALON", 1, "PM", "LL"), ("TALON", 1, "NIGHT", "LL"), ("KESTREL", 1, "AM", "MC"), ("KESTREL", 1, "PM", "MC"), ("FALCON", 1, "PM", "OIL"), ("VIPER", 1, "AM", "FLT-2.0"), ("VIPER", 1, "PM", "Meeting"), ("VIPER", 2, "AM", "FLT-1.5"),
         ("VIPER", 2, "NIGHT", "NVG-2.0"), ("VIPER", 3, "AM", "SDO"), ("VIPER", 5, "AM", "P2"), ("VIPER", 5, "PM", "BDO"),
         ("VIPER", 6, "PM", "FLT-3.0"), ("HAWK", 1, "AM", "P2"), ("HAWK", 1, "PM", "FLT-2.0"),
         ("HAWK", 2, "AM", "SDO"), ("HAWK", 5, "AM", "FLT-2.0"), ("HAWK", 5, "NIGHT", "NVG-2.0"),
         ("RAPTOR", 1, "AM", "FLT-1.5"), ("RAPTOR", 1, "PM", "P1"), ("RAPTOR", 2, "PM", "FLT-2.0"),
         ("RAPTOR", 4, "AM", "SDO"), ("TALON", 5, "AM", "FLT-2.0"), ("KESTREL", 6, "PM", "FLT-3.0"), ("FALCON", 1, "AM", "SIM"), ("FALCON", 2, "AM", "FLT-2.0"),
         ("FALCON", 5, "PM", "BU"), ("EAGLE", 1, "AM", "FLT-2.0"), ("EAGLE", 3, "PM", "SDO"),
         ("ALPHA", 6, "AM", "SDO"), ("BRAVO", 1, "AM", "FLT-2.0"), ("ORCA", 1, "AM", "FLT-2.0"), ("SHARK", 5, "NIGHT", "NVG-2.0"),
         ("ATLAS", 2, "AM", "FLT-1.5"), ("ATLAS", 7, "AM", "SDO"),
         ("ALPHA", 1, "PM", "FLT-2.0"), ("CHARLIE", 1, "AM", "FLT-1.5"), ("CHARLIE", 2, "AM", "FLT-2.0"), ("CHARLIE", 8, "AM", "LL"), ("DELTA", 2, "PM", "FLT-2.0"),
         ("DELTA", 1, "AM", "SDO"), ("ECHO", 2, "NIGHT", "NVG-2.0"), ("ECHO", 5, "AM", "FLT-2.0"), ("FOXTROT", 5, "AM", "SIM"), ("GOLF", 5, "NIGHT", "NVG-2.0"),
         ("BRAVO", 6, "PM", "P2"), ("DELTA", 7, "AM", "FLT-2.0"), ("ALPHA", 7, "AM", "FLT-1.5"), ("HOTEL", 2, "AM", "FLT-1.5"),
         ("ZEUS", 1, "AM", "FLT-2.0"), ("APOLLO", 1, "PM", "FLT-2.0"), ("HERMES", 1, "PM", "FLT-1.5"), ("ZEUS", 2, "NIGHT", "NVG-2.0"),
         ("APOLLO", 2, "PM", "FLT-2.0"), ("TITAN", 2, "AM", "FLT-2.0"), ("ATLAS", 5, "AM", "SDO"), ("HERMES", 5, "AM", "FLT-2.0"),
         ("ARES", 5, "NIGHT", "NVG-2.0"), ("ZEUS", 6, "PM", "FLT-3.0"), ("APOLLO", 7, "AM", "FLT-2.0"), ("ODIN", 7, "AM", "FLT-1.5"), ("ARES", 3, "AM", "P2"), ("COBRA", 1, "AM", "FLT-2.0"), ("PYTHON", 6, "PM", "FLT-3.0")]
_plans = {}
def plan(dept):
    if dept in _plans: return _plans[dept]
    r = random.Random("plan-" + dept)
    crew = SAMPLE_CREW.get(dept, []); ids = [c[0] for c in crew]
    reg = [c[0] for c in crew if c[4] == "Active"]; ns = [c[0] for c in crew if c[4] != "Active"]
    P = {}
    for cs, d, sh, code in FIXED:
        if cs in ids: P[(cs, dt.date(YEAR, 10, d), sh)] = code
    down = {cs for (cs, d, sh), v in P.items() if v == "MC"}   # still down-chitted (no up-chit in the sample): kept off the plan
    fixed_days = {(cs, d) for (cs, d, sh) in P}
    # leave: one block of annual leave per regular, a day off here and there, one detachment, one medical appointment
    away = {}
    for k, cs in enumerate(reg):
        s0 = dt.date(YEAR, 10, 21) + dt.timedelta(days=(k * 6 + r.randint(0, 4)) % 36)
        for j in range(r.choice([2, 3, 5])):
            away[(cs, s0 + dt.timedelta(days=j))] = "LL"
        away[(cs, dt.date(YEAR, 10, 21) + dt.timedelta(days=r.randint(0, 40)))] = r.choice(["OIL", "OL"])
    if len(reg) > 4:
        cs = reg[-2]; s0 = dt.date(YEAR, 11, 16)
        for j in range(5): away[(cs, s0 + dt.timedelta(days=j))] = "Detachment"
        away[(reg[1], dt.date(YEAR, 10, 27))] = "Medical Appt"
    flown = {cs: 0 for cs in ids}; last = {}
    def free(cs, d, sh):
        return cs not in down and (cs, d, sh) not in P and (cs, d) not in away and (cs, d) not in fixed_days
    def run(cs, d):   # flying days in a row before d
        n, x = 0, d - dt.timedelta(days=1)
        while any(P.get((cs, x, s), "") in CODES or str(P.get((cs, x, s), "")).startswith(("FLT", "NVG")) for s in SHIFTS): n += 1; x -= dt.timedelta(days=1)
        return n
    for d in days():
        busy_today = set()
        for (cs, dd) in [k for k in away if k[1] == d]:
            for s in SHIFTS: P[(cs, d, s)] = away[(cs, d)]
            busy_today.add(cs)
        # duties: the department on BDO / SDO that day puts one person on it (from the Duty Roster's crew list)
        for code, L in (("BDO", BDO_CREW), ("SDO", SDO_CREW)):
            if DUTY[code].get(d) == dept and (d > dt.date(YEAR, 10, 8) or dept in ("Pilot", "TACCO")) and not any(P.get((cs, d, "AM")) == code for cs in ids):
                ok = [c[0] for c in L if c[2] == dept and free(c[0], d, "AM") and c[0] not in busy_today]
                if ok:
                    cs = min(ok, key=lambda x: (last.get((x, code), START), r.random())); last[(cs, code)] = d
                    P[(cs, d, "AM")] = code; busy_today.add(cs)
        # Pilot / TACCO squadron duties on weekdays: SXO (Pilot) and OPS O (Pilot, TACCO alternate weeks)
        if d.weekday() < 5 and d > dt.date(YEAR, 10, 8):
            wk = d.isocalendar()[1]
            for code, who in (("SXO", "Pilot"), ("OPS O", "Pilot" if wk % 2 else "TACCO")):
                if who != dept: continue
                ok = [c[0] for c in crew if c[4] == "Active" and c[3] in ("Instructor", "Senior CAT A") and free(c[0], d, "AM") and c[0] not in busy_today]
                if ok:
                    cs = sorted(ok, key=lambda x: (ids.index(x) + wk + (0 if code == "SXO" else 3)) % len(ok))[0]
                    P[(cs, d, "AM")] = code; busy_today.add(cs)
        # 1-8 Oct keep the original demo gaps (warnings) for SUP 1, SUP 2 and Loadmaster; Pilot and TACCO get crewed
        if d < dt.date(YEAR, 10, 9) and dept not in ("Pilot", "TACCO") or d.weekday() >= 5 and not any(f[0] == d for f in FLIGHTS): continue
        # flights: seats per aircraft (2 for Pilot: Captain + Co-Pilot)
        for s in SHIFTS:
            for f in shift_flights(d, s, dept):
                ac = CODES.get(f[2], (1, ""))[0]
                code = f[2].split("x", 1)[1] if f[2][:1].isdigit() and "x" in f[2] else f[2]
                need = ac * (2 if dept == "Pilot" else 1)
                have = sum(1 for cs in ids if P.get((cs, d, s)) == code)
                for _ in range(max(0, need - have)):
                    ok = [cs for cs in reg + ns if free(cs, d, s) and cs not in busy_today and run(cs, d) < 4 and (dept != "Pilot" or s != "NIGHT" or cs != "KING")]
                    if not ok: break
                    cs = min(ok, key=lambda x: (x in ns, flown[x] + (1 if any(P.get((x, d, t)) for t in SHIFTS) else 0) * 3, r.random()))
                    P[(cs, d, s)] = code; flown[cs] += 1
        # standby under PM and NIGHT flights, one sim, the odd meeting
        for s, sb in (("PM", "P1"), ("NIGHT", "P2")):
            if shift_flights(d, s, dept) and r.random() < .7:
                ok = [cs for cs in reg if free(cs, d, s) and cs not in busy_today]
                if ok: P[(r.choice(ok), d, s)] = sb
        if d.weekday() < 5:
            ok = [cs for cs in reg if free(cs, d, "PM") and cs not in busy_today]
            if ok and r.random() < .5: P[(r.choice(ok), d, "PM")] = "SIM"
            ok = [cs for cs in reg if free(cs, d, "AM") and cs not in busy_today]
            if ok and r.random() < .25: P[(r.choice(ok), d, "AM")] = r.choice(["Meeting", "BU", "Outstation"])
    _plans[dept] = P
    return P

# real squadron data (LODESTAR_Data_Input.xlsx via LODESTAR_INPUT): the real crew and duty lists, and no sample plans, flights or duty days
import realdata
if realdata.ON:
    SAMPLE_CREW = {d: realdata.crew_tuples(d) for d in DEPTS}
    SDO_CREW = [(p["cs"], p["name"], p["dept"]) for p in realdata.SDO]
    BDO_CREW = [(p["cs"], p["name"], p["dept"]) for p in realdata.BDO]
    CODES = {c["code"]: (c["sorties"], c["crew"]) for c in realdata.FLIGHT_CODES}
    STATUS, FLIGHTS, GROUND, FIXED = {}, [], [], []
    DUTY = {"SDO": {}, "BDO": {}}
    def plan(dept): return {}

if __name__ == "__main__":
    print(len(FLIGHTS), "flights")
    for dep in DEPTS:
        P = plan(dep); n = sum(1 for v in P.values() if v in CODES or v in ("FLT-2.0", "FLT-1.5"))
        print(dep, len(P), "cells", n, "flight cells")
