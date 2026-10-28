# Department selector mock-up v2 (SharePoint start screen). Invented names and times only.
import html
LOGO = open("logo_banner.svg").read().replace('width="360" height="90"', 'width="330" height="82.5"')
OUT = "./"
CARDS = [  # label, file, changed, age(days), who, state
 ("SUP 1", "Flight_Ops_Planner_SUP1.xlsx", "Today 08:12", 0, "R. Tan", ""),
 ("SUP 2", "Flight_Ops_Planner_SUP2.xlsx", "Today 07:40", 0, "S. Lim", "last"),
 ("TACCO", "Flight_Ops_Planner_TACCO.xlsx", "Yesterday 16:55", 1, "J. Koh", ""),
 ("Loadmaster", "Flight_Ops_Planner_Loadmaster.xlsx", "Mon 26 Oct 11:20", 2, "A. Ng", ""),
 ("Pilot", "Flight_Ops_Planner_Pilot.xlsx", "Today 06:58", 0, "M. Lee", ""),
 ("Duty Planner", "Duty_Roster.xlsx", "Tue 20 Oct 09:05", 8, "D. Chua", "old"),
 ("Master Planner", "Master_Planner.xlsx", "Today 08:30", 0, "H. Yeo", ""),
]
CSS = """
*{box-sizing:border-box}body{margin:0;font-family:"Segoe UI",system-ui,sans-serif;background:#0f172a;color:#0f172a;width:1280px;height:720px;overflow:hidden}
.top{height:36px;background:#0b1220;color:#fff;display:flex;align-items:center;padding:0 20px;gap:12px;border-bottom:1px solid #1e293b}
.logo{font-size:20px;letter-spacing:4px;font-weight:700}.sub{font-size:11px;color:#94a3b8}.dev{background:#dc2626;color:#fff;font-size:11px;font-weight:800;border-radius:4px;padding:2px 7px}
.wrap{position:absolute;left:0;right:0;top:36px;bottom:0;display:flex;align-items:center;justify-content:center}
.box{background:#fff;border-radius:14px;width:1120px;padding:16px 24px 14px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.hero{background:#0f172a;border-radius:12px;display:flex;align-items:center;justify-content:space-between;padding:10px 26px 10px 18px;margin-bottom:12px}.hero svg{display:block}.hero .q{text-align:right}h1{margin:0;font-size:27px;color:#f8fafc}.lead{color:#94a3b8;font-size:13.5px;margin:3px 0 0;max-width:430px;margin-left:auto}
.status{display:flex;align-items:center;gap:10px;font-size:13px;color:#475569;margin-bottom:10px}.dot{width:9px;height:9px;border-radius:50%;background:#16a34a}.status b{color:#0f172a}
.ops{display:flex;align-items:center;gap:18px;background:#dbeafe;color:#0f172a;border-radius:12px;padding:11px 22px;margin-bottom:12px;border:2px solid #93c5fd}
.ops .n{font-size:24px;font-weight:800}.ops .d{font-size:13.5px;color:#1e3a8a;flex:1;line-height:1.35}.ops .m{font-size:12.5px;color:#475569;text-align:right}.ops .go{background:#2563eb;border-radius:8px;padding:9px 18px;font-weight:800;font-size:14px}
.ops.last{border-color:#60a5fa}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.card{border:2px solid #e2e8f0;border-radius:12px;padding:11px 16px;background:#f8fafc;position:relative;min-height:96px}
.card.last{border-color:#2563eb;background:#eff6ff}.card .tag{position:absolute;right:10px;top:10px;background:#2563eb;color:#fff;font-size:10.5px;font-weight:800;border-radius:999px;padding:2px 9px}
.card .n{font-size:22px;font-weight:800}.card .when{display:flex;align-items:center;gap:7px;margin-top:8px;font-size:13.5px;font-weight:700}.card .by{font-size:12.5px;color:#475569;margin-top:1px;padding-left:16px}
.card .f{font-size:11px;color:#94a3b8;margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fresh{width:9px;height:9px;border-radius:50%;flex:none}.fresh.g{background:#16a34a}.fresh.a{background:#f59e0b}.fresh.r{background:#dc2626}.fresh.x{background:#cbd5e1}
.card.old .when{color:#b45309}.card.miss{background:#f1f5f9;border-style:dashed;color:#94a3b8}.card.miss .n{color:#94a3b8}
.all{border:2px dashed #cbd5e1;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#2563eb;font-weight:700;font-size:14px;text-align:center;padding:10px}
.foot{display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-size:12px;color:#64748b}.foot .cx{background:#334155;color:#fff;border-radius:8px;padding:7px 16px;font-weight:700;font-size:13px}
.key{display:flex;gap:14px}.key span{display:flex;align-items:center;gap:5px}
"""
def card(c, variant):
    lab, f, when, age, who, st = c
    cls = "card" + (" last" if st == "last" else "") + (" old" if age >= 7 else "")
    fr = "g" if age == 0 else "a" if age < 7 else "r"
    if variant == "edge" and lab == "Loadmaster":
        return "<div class='card miss'><div class='n'>%s</div><div class='when'><span class='fresh x'></span>No file in this folder</div><div class='f'>Looking for Flight_Ops_Planner_Loadmaster.xlsx</div></div>" % lab
    return ("<div class='%s'>%s<div class='n'>%s</div><div class='when'><span class='fresh %s'></span>%s</div><div class='by'>by %s</div><div class='f'>%s</div></div>"
            % (cls, "<span class='tag'>You opened this last</span>" if st == "last" else "", html.escape(lab), fr, html.escape(when), html.escape(who), html.escape(f)))
def page(variant):
    cards = "".join(card(c, variant) for c in CARDS) + "<div class='all'>Show all files in the folder<br>instead</div>"
    return f"""<!doctype html><html><head><meta charset='utf-8'><style>{CSS}</style></head><body>
<div class='top'><span class='dev'>DEV</span><span class='sub'>No file open</span></div>
<div class='wrap'><div class='box'>
<div class='hero'>{LOGO}<div class='q'><h1>Which department are you from?</h1><div class='lead'>Your department's planner opens for editing. The other departments open beside it, read-only.</div></div></div>
<div class='status'><span class='dot'></span><span><b>Connected to Program</b> · 8 files · checked 14:32, refreshes every 15 seconds</span></div>
<div class='ops{" last" if False else ""}'><div class='n'>Ops Room</div><div class='d'>The day's flights and crew. Every department's file is editable.</div><div class='m'>Ops_Room.xlsx<br>Today 08:05 by K. Ong</div><div class='go'>Open Ops Room</div></div>
<div class='grid'>{cards}</div>
<div class='foot'><div class='key'><span><i class='fresh g'></i>Changed today</span><span><i class='fresh a'></i>Changed this week</span><span><i class='fresh r'></i>Not changed for a week or more</span></div><div class='cx'>Cancel</div></div>
</div></div></body></html>"""
for v in ["normal", "edge"]:
    open(OUT + "DeptSelect_v2_" + v + ".html", "w").write(page(v))
print("ok")
