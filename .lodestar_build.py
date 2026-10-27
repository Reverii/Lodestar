#!/usr/bin/env python3
# LODESTAR build driver. Runs the dotted builder scripts in this folder from a temp copy under their import names
# (seedplan.py, realdata.py, app.html, package/umd/index.js), so nothing outside this folder is needed.
#
#   python3 .lodestar_build.py dashboard            rebuild Flight_Ops_Planner_Dashboard.html (DEV build) from .dashboard_source.html
#                                                   and the Excel files in this folder (SUP 2 = template, others = embedded samples)
#   python3 .lodestar_build.py dashboard --release  release build into release/ (only when Brandon says so; stay in dev mode)
#   python3 .lodestar_build.py excel OUTDIR [--data input/LODESTAR_Data_Input.xlsx] [--only sup2,master,duty,ops,others]
#                                                   rebuild the Excel files into OUTDIR. Fresh files: EVERY PLAN IS EMPTY.
#                                                   Never point OUTDIR at this folder unless Brandon agreed to lose typed plans.
#
# Needs Python 3 with openpyxl (pip install openpyxl). Verified with openpyxl 3.1.5.
import os, shutil, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
STAGE = {".build_planner.py": "build_planner.py", ".build_planner_other_depts.py": "build_planner_other_depts.py",
         ".build_master_planner.py": "build_master_planner.py", ".build_duty_roster.py": "build_duty_roster.py",
         ".build_ops_room.py": "build_ops_room.py", ".seedplan.py": "seedplan.py", ".realdata.py": "realdata.py",
         ".assemble_dashboard.py": "assemble.py", ".dashboard_source.html": "app.html", ".fflate_umd.js": "package/umd/index.js"}
OTHER_DEPTS = [("SUP 1", "SUP1"), ("TACCO", "TACCO"), ("Loadmaster", "Loadmaster"), ("Pilot", "Pilot")]


def stage():
    tmp = tempfile.mkdtemp(prefix="lodestar_")
    for src, dst in STAGE.items():
        os.makedirs(os.path.dirname(os.path.join(tmp, dst)) or tmp, exist_ok=True)
        shutil.copy(os.path.join(HERE, src), os.path.join(tmp, dst))
    return tmp


def run(tmp, args, env=None):
    print("+", " ".join(args))
    subprocess.run([sys.executable] + args, cwd=tmp, check=True, env={**os.environ, **(env or {})})


def dashboard(release):
    tmp = stage()
    f = lambda n: os.path.join(HERE, n)
    out = os.path.join(HERE, "release" if release else "", "Flight_Ops_Planner_Dashboard.html")
    others = [f(f"Flight_Ops_Planner_{n}.xlsx") for _, n in OTHER_DEPTS] + [f("Duty_Roster.xlsx"), f("Master_Planner.xlsx"), f("Ops_Room.xlsx")]
    run(tmp, ["assemble.py"] + (["--release"] if release else []) + [f("Flight_Ops_Planner_SUP2.xlsx"), out] + others)
    shutil.rmtree(tmp)
    print("wrote", out)


def excel(outdir, data, only):
    tmp = stage()
    outdir = os.path.abspath(outdir)
    os.makedirs(outdir, exist_ok=True)
    env = {"LODESTAR_INPUT": os.path.abspath(data)} if data else {}
    o = lambda n: os.path.join(outdir, n)
    if "sup2" in only: run(tmp, ["build_planner.py", o("Flight_Ops_Planner_SUP2.xlsx"), "SUP 2"], env)
    if "others" in only:   # scaled up 2026-10-26: every department is built from the same template (build_planner.py)
        for dept, n in OTHER_DEPTS: run(tmp, ["build_planner.py", o(f"Flight_Ops_Planner_{n}.xlsx"), dept], env)
    if "master" in only: run(tmp, ["build_master_planner.py", o("Master_Planner.xlsx")], env)
    if "duty" in only: run(tmp, ["build_duty_roster.py", o("Duty_Roster.xlsx")], env)
    if "ops" in only: run(tmp, ["build_ops_room.py", o("Ops_Room.xlsx")], env)
    shutil.rmtree(tmp)


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["dashboard"]:
        dashboard("--release" in a)
    elif a[:1] == ["excel"] and len(a) > 1:
        data = a[a.index("--data") + 1] if "--data" in a else None
        only = set(a[a.index("--only") + 1].split(",")) if "--only" in a else {"sup2", "others", "master", "duty", "ops"}
        if os.path.abspath(a[1]) == HERE: sys.exit("refusing to overwrite the live files in this folder; build elsewhere and copy")
        excel(a[1], data, only)
    else:
        sys.exit(__doc__ or open(__file__).read().split("import os")[0])
