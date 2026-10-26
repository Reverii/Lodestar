#!/usr/bin/env python3
"""Builds a LODESTAR data-input workbook whose crew have DUMMY names and callsigns but the REAL Initials found in an ATOM export,
so the department files built from it match the export with no real names on them. Names follow the shape of the Initials (a one-letter word is a given name starting with it, the first longer word a surname starting with its first letter).
python3 tests/make_atom_demo_input.py ATOM_EXPORT.xlsx OUT_Data_Input.xlsx
Then: python3 .lodestar_build.py excel atom_test --data OUT_Data_Input.xlsx   (atom_test/ is git-ignored: it holds real initials)."""
import sys, openpyxl

SHEET = {"PILOT": "Pilot", "ACS": "Loadmaster", "TACCO": "TACCO", "SUP1": "SUP 1", "SUP2": "SUP 2"}
ORDER = ["SUP 1", "SUP 2", "TACCO", "Loadmaster", "Pilot"]
CALL = ["ALPHA", "BRAVO", "CHARLIE", "DELTA", "ECHO", "FOXTROT", "GOLF", "HOTEL", "INDIA", "JULIET", "KILO", "LIMA", "MIKE", "NOVEMBER", "OSCAR", "PAPA", "QUEBEC", "ROMEO",
        "SIERRA", "TANGO", "UNIFORM", "VICTOR", "WHISKEY", "XRAY", "YANKEE", "ZULU"]

GIVEN = {"A": ["Adam", "Aaron", "Alan", "Andre", "Arjun"], "B": ["Ben", "Bryan", "Bernard", "Basil"], "C": ["Chris", "Calvin", "Colin", "Clarence"], "D": ["Daniel", "David", "Darren", "Dennis"],
         "E": ["Ethan", "Eric", "Edwin", "Elvin"], "F": ["Felix", "Francis", "Farhan", "Fred"], "G": ["Gary", "Gabriel", "George", "Glenn"], "H": ["Henry", "Hugo", "Harold", "Hakim"],
         "I": ["Ian", "Isaac", "Imran", "Ivan"], "J": ["James", "Jason", "Joel", "Jerome", "Justin"], "K": ["Kevin", "Kenneth", "Kai", "Karthik"], "L": ["Lewis", "Leon", "Liam", "Lionel"],
         "M": ["Marcus", "Martin", "Mohd", "Matthew", "Mario"], "N": ["Nathan", "Noel", "Nicholas", "Naveen"], "O": ["Oscar", "Owen", "Oliver", "Omar"], "P": ["Peter", "Paul", "Patrick", "Philip"],
         "Q": ["Quentin", "Qadir"], "R": ["Ryan", "Raymond", "Richard", "Ravi", "Rafael"], "S": ["Samuel", "Simon", "Stephen", "Shawn", "Sanjay"], "T": ["Thomas", "Timothy", "Trevor", "Tariq"],
         "U": ["Umar", "Ulrich"], "V": ["Victor", "Vincent", "Vijay"], "W": ["William", "Walter", "Wesley", "Wayne"], "X": ["Xavier"], "Y": ["Yusof", "Yan", "Yosef"], "Z": ["Zachary", "Zane", "Zaki"]}
SURN = {"A": ["Abbott", "Archer", "Ashby"], "B": ["Baker", "Bennett", "Brooks", "Bishop"], "C": ["Carter", "Chambers", "Cole", "Clarke"], "D": ["Dawson", "Dean", "Dixon"], "E": ["Ellis", "Evans", "Eaton"],
        "F": ["Fisher", "Foster", "Fleming"], "G": ["Grant", "Gray", "Grove", "Gibbs"], "H": ["Hall", "Harper", "Hayes", "Holt"], "I": ["Irwin", "Ives"], "J": ["Jacobs", "Jensen", "Jordan"],
        "K": ["Keller", "Kemp", "King", "Knight"], "L": ["Lambert", "Lawson", "Lowe", "Lynch"], "M": ["Mason", "Marsh", "Miles", "Moore"], "N": ["Nash", "Nelson", "Newman", "Noble"],
        "O": ["Oakley", "Osborne", "Owens"], "P": ["Parker", "Pierce", "Powell", "Price"], "Q": ["Quinn", "Quigley"], "R": ["Reid", "Rhodes", "Rowe", "Ryder"], "S": ["Sawyer", "Shaw", "Stone", "Sutton"],
        "T": ["Tate", "Thorne", "Turner", "Tyler"], "U": ["Underwood", "Upton"], "V": ["Vance", "Vaughn", "Vega"], "W": ["Walsh", "Wells", "Wood", "Wyatt"], "X": ["Xander"], "Y": ["Yates", "York"], "Z": ["Zimmer", "Zeller"]}
RANKS = ["CPT", "MAJ", "LTA", "LTC", "ME1", "ME2", "ME3", "2LT"]
used = {}
def dummy_name(ini, k):
    """Invented name that follows the shape of the ATOM Initials: a word of one letter is a given name starting with that letter; the first longer word is the
    surname (a surname starting with its first letter); letters of a longer word after the surname are further given-name initials."""
    toks = ini.upper().split(); givens, surname, seen_sur = [], None, False
    def pick(pool, letter, n):
        names = pool.get(letter) or pool["X"]
        for off in range(len(names)):
            w = names[(n + off) % len(names)]
            if (letter, w) not in used.get(pool is SURN, set()): used.setdefault(pool is SURN, set()).add((letter, w)); return w
        return names[n % len(names)]
    for t in toks:
        t = "".join(ch for ch in t if ch.isalpha())
        if not t: continue
        if len(t) == 1 and not (seen_sur and False): givens.append(pick(GIVEN, t, k))
        elif not seen_sur: surname = pick(SURN, t[0], k); seen_sur = True
        else: givens += [pick(GIVEN, ch, k + i) for i, ch in enumerate(t)]
    if surname is None and givens: surname = givens.pop() if len(givens) > 1 else pick(SURN, ini.strip()[0].upper(), k)
    if not givens: givens = [pick(GIVEN, surname[0], k + 1)]   # a one-word ATOM name still gets a given name
    return RANKS[k % len(RANKS)] + " " + " ".join(givens + [surname])

src = openpyxl.load_workbook(sys.argv[1], data_only=True)
crew = {}
for sn, dept in SHEET.items():
    if sn not in src.sheetnames: continue
    ws = src[sn]
    head = {str(ws.cell(2, c).value or "").strip(): c for c in range(1, ws.max_column + 1)}
    if "Name" not in head: continue
    for r in range(3, ws.max_row + 1):
        ini = str(ws.cell(r, head["Name"]).value or "").strip()
        if not ini: continue
        st = str(ws.cell(r, head["Status"]).value or "").strip() if "Status" in head else ""
        cat = str(ws.cell(r, head["CAT"]).value or "").strip().upper() if "CAT" in head else ""
        crew.setdefault(dept, []).append((ini, "NSMEN" if st.upper() == "NSMEN" else "Active", "CAT " + cat if cat in ("A", "B", "C", "D") else ""))

out = openpyxl.Workbook(); out.remove(out.active)
ws = out.create_sheet("Crew"); ws.append(["DUMMY crew: real Initials from an ATOM export, invented names and callsigns"]); ws.append([]); ws.append([])
ws.append(["Department", "Callsign", "Name", "Initials", "Cat Status", "Role", "Status", "BDO", "SDO", "Remarks"])
for dept in ORDER:
    for k, (ini, st, cat) in enumerate(crew.get(dept, [])):
        cs = CALL[k % 26] + ("" if k < 26 else str(k // 26 + 1))
        # callsigns repeat across departments on purpose-free: prefix the department so every callsign is unique squadron-wide
        cs = {"SUP 1": "S1-", "SUP 2": "S2-", "TACCO": "T-", "Loadmaster": "L-", "Pilot": "P-"}[dept] + cs
        ws.append([dept, cs, dummy_name(ini, k), ini, cat, "", st, "Yes" if k < 3 else "", "Yes" if k < 3 and dept in ("SUP 1", "SUP 2", "Loadmaster") else "", ""])
ws = out.create_sheet("Flight Codes"); ws.append(["Flight codes"]); ws.append([]); ws.append([])
ws.append(["Code", "Description", "Sorties", "Hrs", "Crew", "Mission Type", "Syllabus tag"])
for row in [("FLT-1.5", "Routine Sortie (1.5h)", 1, 1.5, "", "GEN", ""), ("FLT-2.0", "Standard Sortie (2.0h)", 1, 2.0, "", "GEN", ""), ("FLT-3.0", "Extended Mission (3.0h)", 1, 3.0, "", "GEN", ""),
            ("NVG-2.0", "Night Flying Sortie (2.0h)", 1, 2.0, "", "NIGHT", ""), ("MSN-3.0", "Mission sortie (3.0h)", 1, 3.0, "P T S2", "MSN", ""),
            ("PLT-TRG", "Pilot training sortie (1.5h)", 1, 1.5, "P", "TRG", ""), ("MAS TRG", "MAS tactical training (3.0h)", 1, 3.0, "", "TRG", "")]: ws.append(list(row))
ws = out.create_sheet("Activities"); ws.append(["Activities"]); ws.append([]); ws.append([])
ws.append(["Code", "Description", "Category"] + ORDER)
for code, desc, cat in [("SIM", "Simulator Training", "Sim"), ("BU", "Quick Reaction Standby", "Ground Duty"), ("P1", "P1 Crew", "Ground Duty"), ("P2", "P2 Crew", "Ground Duty"),
                        ("SDO", "Squadron Duty Orderly", "Squadron Duty"), ("BDO", "Base Duty Officer", "Squadron Duty"), ("Meeting", "Meeting", "Admin"),
                        ("MC", "Medical Leave", "Medical"), ("LL", "Local Leave", "Leave"), ("OL", "Oversea Leave", "Leave"), ("OIL", "OIL", "Off")]:
    ws.append([code, desc, cat] + ["Yes"] * 5)
ws = out.create_sheet("Lists"); ws.append(["Lists"]); ws.append([]); ws.append([])
ws.append(["Day status", "", "Ground programme", "", "Tails"])
import itertools
for a, c, e in itertools.zip_longest(["Maintenance", "Stand-down", "Public Holiday"], ["Safety Brief", "CRM Lecture", "Lecture"], [str(t) for t in range(710, 719)], fillvalue=""): ws.append([a, "", c, "", e])
ws = out.create_sheet("Public Holidays"); ws.append(["Date", "Name"])
out.save(sys.argv[2])
print({d: len(v) for d, v in crew.items()})
