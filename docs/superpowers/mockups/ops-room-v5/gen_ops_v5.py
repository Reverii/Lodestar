# Ops Room v5 mock-up generator (invented crew only). Target look for the Ops Room redesign, see docs/superpowers/specs/2026-10-27-ops-room-redesign-design.md
# Ops Room board v4 mock-up: today's Ops Room screen kept, with Cat colours, full-size standby crew rows, clock + theme, grouped right column, no empty space. Invented crew only.
import html
OUT = "./"  # run from this folder; writes OpsRoom_v5_*.html, screenshots are taken separately
SANS_SET = {"OWL","EAGLE","KITE","TALON","TIGER"}
def cat_of(n):
    if n in SANS_SET: return "S"
    return ["A","A","B","B","C","D","T","B"][sum(map(ord, n)) % 8]
def cs(n): n = n.strip(); return "<span class='cs c-%s'>%s</span>" % (cat_of(n), html.escape(n))
def seat(v):
    if not v: return "<td class='s none'>–</td>"
    tag = ""
    if v.endswith("*"): v, tag = v[:-1], "MC"
    if v.endswith("+"): v, tag = v[:-1], "CR"
    return "<td class='s'>%s%s</td>" % (cs(v), "<i>%s</i>" % tag if tag else "")
NORMAL = [
 ("AM","FLT-2.0","Standard sortie","1/2","713","715","Echo 0800–0930","0700","0800","1000",["ADDER*","SIDEWINDER","TITAN","TUNA","CHARLIE","RAPTOR+"],""),
 ("AM","FLT-1.5","Routine sortie","2/2","714","","Oscar 0930–1100","0830","0930","1130",["BOA*","KING","HERMES","MANTA","DELTA","EAGLE+"],""),
 ("PM","FLT-2.0","Standard sortie","1/1","716","717","Echo 1330–1500","1230","1330","1530",["MAMBA*","TAIPAN","ARES","TUNA","ALPHA","RAPTOR+"],""),
 ("PM","MSN-3.0","Mission sortie","1/1","710","","Nov 1600–1900","1500","1600","1730",["COBRA*","KRAIT","","SHARK","","OWL+"],"Long range"),
 ("NIGHT","NVG-2.0","Night flying","1/1","711","718","Echo 1930–2130","1830","1930","2130",["ADDER*","ASP","APOLLO","STINGRAY","ECHO","OWL+"],""),
]
POOL=["VIPER","HAWK","OWL","RAPTOR","FALCON","EAGLE","KITE","TALON","KESTREL","WREN","PIKE","NOMAD","SABLE","ORYX","MAKO","LYNX","TIGER","VEGA","COBRA","PYTHON","MAMBA","ADDER","KING","BOA","ASP","KRAIT","TAIPAN","ATLAS","TITAN","ZEUS","APOLLO","HERMES","ARES","ORCA","SHARK","MARLIN","MANTA","TUNA","STINGRAY","ALPHA","BRAVO","CHARLIE","DELTA","ECHO"]
def heavy():
    codes=[("FLT-2.0","Standard sortie"),("FLT-1.5","Routine sortie"),("NVG-2.0","Night flying"),("MSN-3.0","Mission sortie"),("2xFLT-1.5","Two sorties")]
    rows=[];k=0
    for i in range(10):
        sh="AM" if i<4 else "PM" if i<7 else "NIGHT";c=codes[i%5];h=7+i*1.2
        f=lambda x:"%02d%02d"%(int(x),int((x%1)*60))
        s=[POOL[(k+j)%len(POOL)] for j in range(6)];s[0]+="*";s[5]+="+";k+=4
        if i==6:s[2]="";s[4]=""
        ao=["Echo","Oscar","Nov","Echo","","Oscar","Echo","Nov","","Echo"][i]
        rows.append((sh,c[0],c[1],"1/1",str(710+i%9),"",(ao+" "+f(h)+"–"+f(h+1.5)) if ao else "",f(h-1),f(h),f(h+3),s,""))
    return rows
HEAVY=heavy()
STANDBY=[("P1","718",["KING*","ASP","HERMES","MANTA","DELTA","EAGLE+"]),("P2","715",["BOA*","SIDEWINDER","ZEUS","SHARK","FOXTROT","TIGER+"]),("BU","719",["COBRA*","TAIPAN","ARES","TUNA","ALPHA","OWL+"])]
POSTS=[("SXO",["COBRA","COBRA","ORCA"]),("OPS O",["PYTHON","PYTHON","MARLIN"]),("SDO",["ALPHA","ALPHA","BRAVO"]),("BDO",["VIPER","HAWK","HAWK"])]
GROUND={"AM":[("Safety brief","0730–0800","All crew","Briefing room"),("Meeting","0900–1100","ORCA, SHARK","Ops conference room"),("On course","until 30 Oct","HAWK, VIPER","Instructor course")],
 "PM":[("CRM lecture","1400–1600","ALPHA, CHARLIE, RAPTOR, EAGLE","Classroom"),("Outstation","until 29 Oct","COBRA, KRAIT","Base visit")],
 "NIGHT":[("Sim","1900–2100","MAMBA, ADDER","SIMCEN")]}
LEAVE=[("SUP 2",[("FALCON","MC")]),("TACCO",[]),("Loadmaster",[("ATLAS","MC")]),("Pilot",[("PYTHON","LL"),("MAMBA","OL")]),("SUP 1",[("ECHO","LL")])]
CSS="""
:root{--bg:#f1f5f9;--card:#fff;--ink:#0f172a;--mut:#64748b;--line:#e2e8f0;--head:#0f172a;--headfg:#fff;--am:#0369a1;--pm:#b45309;--nt:#312e81;--sb:#166534;--sbbg:#f0fdf4;--acc:#0f766e;--cA:#0f172a;--cB:#15803d;--cC:#ca8a04;--cD:#dc2626;--cT:#ec4899;--red:#be123c}
body.dark{--bg:#0b1220;--card:#111a2e;--ink:#e8eefc;--mut:#8da0c0;--line:#1f2d4a;--head:#060b16;--headfg:#e8eefc;--am:#38bdf8;--pm:#fbbf24;--nt:#a5b4fc;--sb:#14532d;--sbbg:#10261c;--acc:#2dd4bf;--cA:#f8fafc;--cB:#4ade80;--cC:#facc15;--cD:#f87171;--cT:#f472b6;--red:#fb7185}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:"Segoe UI",system-ui,sans-serif;overflow:hidden}
#stage{width:1920px;height:1080px;transform-origin:0 0;display:flex;flex-direction:column;gap:10px;padding:10px 24px 8px}
.top{display:flex;align-items:center;gap:18px;flex:none;height:56px}.top .t{font-size:28px;font-weight:700}.sp{flex:1}
.nav{display:flex;border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--card);font-size:17px}.nav span{padding:7px 16px;border-right:1px solid var(--line)}.nav span.on{background:var(--head);color:var(--headfg);font-weight:700}
.chip{border:1px solid var(--line);background:var(--card);border-radius:999px;padding:6px 16px;font-size:16px}.clock{font-size:38px;font-weight:700;font-variant-numeric:tabular-nums}
.stats{display:flex;gap:8px;flex:none}.stats .chip b{font-size:17px;margin-right:6px}.stats .chip{font-size:12px;text-transform:uppercase;letter-spacing:.6px;color:var(--mut)}
.board{display:grid;grid-template-columns:96px 1.3fr 1.3fr 1.3fr 1.3fr .9fr .9fr .9fr 1.5fr .8fr 1.1fr;gap:8px;flex:none;height:92px;align-items:stretch}
.chips{display:flex;flex-direction:column;gap:3px;justify-content:center}.chips span{color:#fff;font-size:13px;font-weight:800;text-align:center;border-radius:4px;padding:3px 0;letter-spacing:1px}.chips .AM{background:var(--am)}.chips .PM{background:var(--pm)}.chips .NIGHT{background:var(--nt)}
body.dark .chips span{color:#0b1220}
.bx{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:5px 10px;display:flex;flex-direction:column;overflow:hidden}.bx .h{font-size:12px;font-weight:800;letter-spacing:1.3px;color:var(--red);text-transform:uppercase}.bx.g .h{color:var(--ink)}
.bx .l{font-size:16px;font-weight:700;line-height:21px;height:21px}.bx .l.e{color:var(--line)}.bx .v{font-size:19px;font-weight:700;margin-top:6px}.bx .v.e{color:var(--line)}
.main{display:grid;grid-template-columns:minmax(0,1fr) 430px;gap:14px;flex:1;min-height:0}.left{display:flex;flex-direction:column;gap:10px;min-height:0}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 14px}
table{width:100%;border-collapse:collapse;table-layout:fixed}td,th{white-space:nowrap;overflow:hidden}
thead th{background:var(--head);color:var(--headfg);font-size:13px;padding:8px 6px;text-align:left}
td{padding:0 6px;border-bottom:1px solid var(--line);vertical-align:middle}tr.fl td{height:var(--rh)}
tr.band td{color:#fff;font-weight:800;font-size:15px;padding:2px 10px;height:26px;letter-spacing:1px}tr.band small{font-weight:600;opacity:.85;margin-left:10px;letter-spacing:0}
tr.band.AM td{background:var(--am)}tr.band.PM td{background:var(--pm)}tr.band.NIGHT td{background:var(--nt)}tr.band.SB td{background:var(--sb)}body.dark tr.band td{color:#0b1220}body.dark tr.band.SB td{color:#e8eefc}
td.cl b{font-size:calc(var(--u)*25px)}td.cl small{display:block;font-size:calc(var(--u)*13px);color:var(--mut)}
td.tl{font-size:calc(var(--u)*26px);font-weight:700}td.tl small{display:block;font-size:calc(var(--u)*13px);color:var(--mut);font-weight:500}
td.so{font-size:calc(var(--u)*19px);font-weight:600}td.so small{display:block;font-size:calc(var(--u)*13px);color:#7c3aed;font-style:italic;font-weight:500}
td.s{font-size:calc(var(--u)*24px);padding:0 3px;font-weight:700}td.s i{font-style:normal;font-size:calc(var(--u)*13px);color:var(--acc);margin-left:3px;vertical-align:super}td.s.none{color:var(--line)}
td.t2{font-size:calc(var(--u)*19px);font-weight:600}td.rm{font-size:calc(var(--u)*17px);color:var(--mut)}
tr.sb td{background:var(--sbbg)}tr.sb td.cl b{font-size:calc(var(--u)*30px)}
.cs{font-weight:700}.c-A{color:var(--cA)}.c-B{color:var(--cB)}.c-C{color:var(--cC)}.c-D{color:var(--cD)}.c-T{color:var(--cT)}.c-S{background:#16a34a;color:#fff;border-radius:5px;padding:0 6px}
.seg{display:flex;border:1px solid #fff;border-radius:6px;overflow:hidden;font-size:15px;margin-left:auto}.seg span{padding:2px 10px;background:#fff;color:#166534}.seg span.on{background:#166534;color:#fff}
.right{display:flex;flex-direction:column;gap:10px;min-height:0}.hd{font-size:15px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;color:var(--mut);margin-bottom:5px}
.gp .sh{display:inline-block;font-size:13px;font-weight:800;letter-spacing:2px;color:#fff;border-radius:4px;padding:1px 9px;margin-top:4px}.sh.AM{background:var(--am)}.sh.PM{background:var(--pm)}.sh.NIGHT{background:var(--nt)}body.dark .sh{color:#0b1220}
.gp .ln{font-size:20px;line-height:1.28;padding:3px 0;border-bottom:1px solid var(--line)}.gp .m{color:var(--mut);font-size:16px}
.lv .dep{display:flex;gap:10px;align-items:baseline;font-size:20px;padding:3px 0;border-bottom:1px solid var(--line)}.lv .dep b{min-width:116px;font-size:15px;color:var(--mut);text-transform:uppercase;letter-spacing:1px}.lv i{font-style:normal;font-size:13px;color:var(--mut);margin:0 8px 0 3px}
.dc .row{display:flex;gap:14px;align-items:center;font-size:20px}.dc .tag{background:#9f1239;color:#fff;border-radius:5px;padding:2px 10px;font-weight:800}.dc small{color:var(--mut);display:block;font-size:15px;margin-top:3px}
.rem .v{font-size:21px;line-height:1.35;font-weight:600}
.note{color:var(--mut);font-size:14px;display:flex;gap:16px;flex:none;align-items:center}
"""
def band_html():
    bx="<div class='chips'><span class='AM'>AM</span><span class='PM'>PM</span><span class='NIGHT'>NIGHT</span></div>"
    for h,vs in POSTS: bx+="<div class='bx'><div class='h'>%s</div>%s</div>"%(h,"".join("<div class='l'>%s</div>"%cs(v) for v in vs))
    bx+="<div class='bx g'><div class='h'>Safety</div><div class='v'>%s</div></div>"%cs("MARLIN")
    bx+="<div class='bx g'><div class='h'>Prefect</div><div class='v e'>–</div></div>"
    bx+="<div class='bx g'><div class='h'>Security</div><div class='v'>%s</div></div>"%cs("ORCA")
    bx+="<div class='bx g'><div class='h'>Intel</div><div class='v'>%s</div></div>"%(cs("TUNA")+" · "+cs("SHARK"))
    bx+="<div class='bx g'><div class='h'>DOB</div><div class='v'>1530</div></div>"
    bx+="<div class='bx g'><div class='h'>Codes</div><div class='v'>Yankee 4 · Delta 2</div></div>"
    return bx
def hrs(c):
    import re
    m=re.search(r'(\d+\.\d)',c);n=re.match(r'(\d)x',c)
    return float(m.group(1))*(int(n.group(1)) if n else 1)
def page(fl,dark,hv,sc,sb_n,area):
    u=0.8 if not hv else 0.58; rh=42 if not hv else 27
    cg="<colgroup><col style='width:150px'><col style='width:84px'><col style='width:150px'>"+"<col style='width:126px'>"*6+"<col style='width:170px'><col style='width:62px'><col style='width:62px'><col style='width:62px'><col style='width:62px'><col style='width:62px'><col style='width:118px'><col></colgroup>"
    th="".join("<th>%s</th>"%x for x in ["Callsign","Tail","Sortie","AC","Pilot","LM","TACCO","SUP 1","SUP 2","AO / Area time","Brief","ETD","ETA","ATD","ATA","Hours","Remarks"])
    rows="";last=None;cnt={}
    for f in fl: cnt[f[0]]=cnt.get(f[0],0)+1
    for f in fl:
        if f[0]!=last: rows+="<tr class='band %s'><td colspan='17'>%s<small>%d flight%s</small></td></tr>"%(f[0],f[0],cnt[f[0]],"" if cnt[f[0]]==1 else "s");last=f[0]
        rows+=("<tr class='fl'><td class='cl'><b>%s</b></td><td class='tl'>%s%s</td><td class='so'>%s<small>aircraft %s</small></td>"%(html.escape(f[1]),f[4],("<small>standby %s</small>"%f[5]) if f[5] else "",html.escape(f[2]),f[3])
          +"".join(seat(x) for x in f[10])+"<td class='t2'>%s</td><td class='t2'>%s</td><td class='t2'>%s</td><td class='t2'>%s</td><td class='t2'>–</td><td class='t2'>–</td><td class='hr'><span>PLAN</span><b>%s</b><br><span>ACTUAL</span> –</td><td class='rm'>%s</td></tr>"%(html.escape(f[6]),f[7],f[8],f[9],'%.1f'%hrs(f[1]),html.escape(f[11])))
    rows+="<tr class='band SB'><td colspan='17'><div style='display:flex;align-items:center'>Standby Duty<span class='seg'><span class='on'>1 Set</span><span>2 Set</span></span></div></td></tr>"
    for lab,tail,s_ in STANDBY[:sb_n]:
        rows+="<tr class='fl sb'><td class='cl'><b>%s</b></td><td class='tl'>%s</td><td class='so'>%s</td>%s<td colspan='8'></td></tr>"%(lab,tail,"Alert status" if lab=="P2" else "","".join(seat(x) for x in s_))
    gp="".join("<div class='col'><span class='sh %s'>%s</span>%s</div>"%(sh,sh,"".join("<div class='ln'><b>%s</b> <span class='m'>%s</span><br>%s <span class='m'>· %s</span></div>"%(html.escape(a_),html.escape(t),(", ".join(cs(x) for x in w.split(", ")) if w!="All crew" else "All crew"),html.escape(p_)) for a_,t,w,p_ in it)) for sh,it in GROUND.items())
    lv="".join("<div class='dep'><b>%s</b><span>%s</span></div>"%(d,"".join("%s<i>%s</i>"%(cs(c),k) for c,k in p) or "<span style='color:var(--line)'>–</span>") for d,p in LEAVE)
    ar="".join("<div class='ar'><b>%s</b>%s</div>"%(n,cs(v)) for n,v in area)
    ac="<div class='ar'><b>Codes</b><span class='cs c-A'>Yankee 4 · Delta 2</span></div>"
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>Ops Room v5</title><style>{CSS}
.hr{{font-size:calc(var(--u)*13px);color:var(--mut);line-height:1.15}}.hr b{{font-size:calc(var(--u)*19px);margin-left:6px;color:var(--ink)}}.bot{{display:grid;grid-template-columns:690px 330px 300px 1fr;gap:10px;flex:none;height:236px}}.bot .card{{overflow:hidden}}
.gp3{{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}}.gp .col .ln{{font-size:15px}}.gp .ln b{{font-size:16px}}.gp .m{{font-size:12px}}
.stack{{display:flex;flex-direction:column;gap:10px}}.stack .card{{flex:1;padding:8px 12px}}
.ar{{display:flex;gap:10px;align-items:baseline;font-size:19px;padding:2px 0;border-bottom:1px solid var(--line)}}.ar b{{min-width:70px;font-size:13px;color:var(--mut);text-transform:uppercase;letter-spacing:1px}}
.dc .row{{font-size:17px}}.lv .dep{{font-size:16px}}.rem .v{{font-size:17px}}.ar{{font-size:16px!important}}
</style></head><body class="{'dark' if dark else ''}">
<div id="stage" style="--u:{u};--rh:{rh}px"><div class="top"><span class="t">Wednesday, 28 October 2026</span><div class="nav"><span>‹</span><span class="on">Today</span><span>Tomorrow</span><span>›</span></div><div class="sp"></div><span class="chip">{'Dark' if dark else 'Light'} · tap to switch</span><span class="clock">14:32</span></div>
<div class="stats"><span class="chip"><b>{len(fl)}</b>Flights</span><span class="chip"><b>{len(fl)+1}</b>Sorties</span><span class="chip"><b>0</b>Flown</span><span class="chip"><b>0</b>Cancelled</span></div>
<div class="board">{band_html()}</div>
<div class="card" style="padding:4px 8px;flex:1;min-height:0;overflow:hidden"><table>{cg}<thead><tr>{th}</tr></thead><tbody>{rows}</tbody></table></div>
<div class="bot"><div class="card gp"><div class="hd">Ground programme</div><div class="gp3">{gp}</div></div><div class="card lv"><div class="hd">Leave and MC</div>{lv}</div>
<div class="stack"><div class="card dc"><div class="hd">Down-chit</div><div class="row"><span class="tag">AY</span><span>SUP 2</span></div><small>since Thu 1 Oct · not cleared to fly</small></div>{('<div class="card"><div class="hd">Area</div>'+ar+'</div>') if ar else ''}</div>
<div class="card rem"><div class="hd">Remarks</div><div class="v">HAWK takes over BDO from VIPER at 1600.  Fuel bowser unavailable 1300–1500.  RAPTOR to brief the new SUP 2 crew at 1700.</div></div></div>
<div class="note">Cat: <span class="cs c-A">A</span><span class="cs c-B">B</span><span class="cs c-C">C</span><span class="cs c-D">D</span><span class="cs c-T">OCU</span><span class="cs c-S">SANS / NSMEN</span> · MC = mission commander, CR = CRMO · The Area card (Oscar, Echo, Nov) shows only when filled · ATD, ATA and Actual hours are filled in by the Ops Room on the day · Mock-up only, invented crew</div></div>
<script>const s={sc};document.getElementById("stage").style.transform="scale("+s+")";document.body.style.width=(1920*s)+"px";document.body.style.height=(1080*s)+"px";</script></body></html>"""
AREA=[("Oscar","VIPER"),("Echo","ADDER")]
for name,fl,dark,hv,sc in [("normal",NORMAL,False,False,1.0),("normal_dark",NORMAL,True,False,1.0),("10flights",HEAVY,False,True,1.0),("10flights_dark",HEAVY,True,True,1.0),("terminal_1280",NORMAL,False,False,1280/1920)]:
    open(OUT+"OpsRoom_v5_"+name+".html","w").write(page(fl,dark,hv,sc,3,AREA if name!="normal" else []))
print("ok")
