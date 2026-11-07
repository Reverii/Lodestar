// Makes the three user guide PDFs (Master Planner, Department Planner, Ops Room) from the one source, LODESTAR_Guide.html.
// Run: node guide/make_pdf.js   (after make_shots.js and make_shots_more.js; needs the dashboard built for those)
// Each guide = Getting started + its own parts, renumbered from 1, with a contents page (page numbers) and the date.
// Page numbers: pass 1 renders with hidden markers in each heading, python/pypdf finds their pages, pass 2 fills them in.
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path"), os = require("os");
const DATE = process.env.GUIDE_DATE || "7 November 2026";
// source parts: 1 Getting started, 2 Department planners, 3 Master Planner, 4 Duty Planner, 5 Ops Room
const ELSEWHERE = { 2: "the Department Planner guide", 3: "the Master Planner guide", 4: "the Department Planner guide", 5: "the Ops Room guide" };
const GUIDES = [
  { out: "LODESTAR_Guide_Master_Planner.pdf", title: "Master Planner", sub: "Planning the squadron's flights, squadron events and flight codes", parts: [1, 3],
    who: "This guide is for the person who keeps the squadron's flight programme: the flights, no-flying days, squadron events, alert states, flight codes and the Crew Matrix." },
  { out: "LODESTAR_Guide_Department_Planner.pdf", title: "Department Planner", sub: "Planning your department's crew, duties, currency and training", parts: [1, 2, 4],
    who: "This guide is for the planners of SUP 1, SUP 2, TACCO, Loadmaster and Pilot. Every department's file is built from the same template, so it works for all five. It also covers the Duty Planner (BDO and SDO)." },
  { out: "LODESTAR_Guide_Ops_Room.pdf", title: "Ops Room", sub: "Running the day board", parts: [1, 5],
    who: "This guide is for the SDO / AOS on duty and the Ops Room staff: the day's flight board, the seats, closing flights, Ops Add, the AFP and the daily ATOM export." },
];

async function build(page, g, pages) {
  await page.goto("file://" + path.join(__dirname, "LODESTAR_Guide.html")); await page.waitForLoadState("networkidle");
  await page.evaluate(({ g, ELSEWHERE, DATE, pages }) => {
    const map = {}; g.parts.forEach((p, i) => map[p] = i + 1);
    // tag every section with its source part, drop the parts this guide does not carry
    let part = 0; const secs = [...document.body.children].filter(e => e.tagName === "SECTION");
    for (const s of secs) { if (s.classList.contains("part")) part++; s.dataset.part = s.classList.contains("cover") ? "c" : String(part); }
    secs.forEach(s => { if (s.dataset.part !== "c" && !map[s.dataset.part]) s.remove(); });
    // renumber: heading and contents numbers, PART n labels, then "section x.y" / "Part n" in the text
    const ren = t => t.replace(/^(\d+)(\.\d+)$/, (m, a, b) => map[a] ? map[a] + b : m);
    document.querySelectorAll("h2 .n, .toc span").forEach(e => { e.textContent = ren(e.textContent.trim()); });
    document.querySelectorAll(".pband .pk").forEach(e => { e.textContent = e.textContent.replace(/PART (\d)/, (m, a) => "PART " + map[a]); });
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const nodes = []; while (walk.nextNode()) nodes.push(walk.currentNode);
    for (const n of nodes) n.nodeValue = n.nodeValue
      .replace(/\bsection (\d)\.(\d+)/g, (m, a, b) => map[a] ? "section " + map[a] + "." + b : ELSEWHERE[a])
      .replace(/\bPart (\d)\b/g, (m, a) => map[a] ? "Part " + map[a] : ELSEWHERE[a]);
    // cover
    const c = document.querySelector(".cover");
    c.querySelector(".kicker").textContent = "LODESTAR USER GUIDE · 121 SQN";
    c.querySelector("h1").textContent = g.title;
    c.querySelector(".sub").textContent = g.sub;
    c.querySelector(".draft").textContent = DATE.toUpperCase();   // the cover date (no DRAFT mark since 7 Nov)
    const partsNow = [...document.querySelectorAll("section.part")].map(s => ({ n: s.querySelector(".pk").textContent.replace("PART ", ""), t: s.querySelector("h1").textContent, s: s.querySelector(".ps").textContent }));
    c.querySelector(".who").innerHTML = "<h3>Who this guide is for</h3><p>" + g.who + "</p><h3>In this guide</h3><div class='parts'>" +
      partsNow.map(p => "<div><b>Part " + p.n + "</b>" + p.t + ": " + (/^[A-Z][a-z]/.test(p.s) ? p.s.charAt(0).toLowerCase() + p.s.slice(1) : p.s) + ".</div>").join("") + "</div>" +
      "<p style='margin-top:12px'>Start with <b>Part 1, Getting started</b>. The contents on the next page give the page of every section. Every page in the dashboard also has its own help: press the <b>?</b> button at the right end of the tab bar.</p>";
    c.querySelector(".foot").innerHTML = "LODESTAR · 121 SQN · <b>" + g.title + " guide</b> · Dated " + DATE + " · For dashboard version z200 (BETA) · Screenshots use demo data only: the names, callsigns and flights are made up.";
    // keys + hidden page markers on every part title and section heading
    let k = 0; const ents = [];
    document.querySelectorAll("section.part, section.sec").forEach(s => {
      if (s.classList.contains("part")) { const h = s.querySelector(".pband h1"); const key = "K" + (k++); h.insertAdjacentHTML("beforeend", "<span class='mk'>@@" + key + "@@</span>"); ents.push({ key, lvl: 0, n: s.querySelector(".pk").textContent.replace("PART ", "Part "), t: h.firstChild.nodeValue }); }
      s.querySelectorAll("h2").forEach(h => { const n = h.querySelector(".n"); if (!n) return; const key = "K" + (k++); h.insertAdjacentHTML("beforeend", "<span class='mk'>@@" + key + "@@</span>");
        const pn = s.closest("section.part") ? s.querySelector(".pk").textContent.replace("PART ", "") : null;
        ents.push({ key, lvl: 1, n: n.textContent, t: [...h.childNodes].filter(x => x.nodeType === 3).map(x => x.nodeValue).join("").trim(), qs: n.textContent === "QS" }); });
    });
    const pg = key => "<span class='pg'>" + (pages && pages[key] ? pages[key] : "00") + "</span>";
    // per-part contents boxes get page numbers too
    document.querySelectorAll("section.part").forEach(s => {
      const own = []; let on = false;
      for (const e of ents) { if (e.lvl === 0) on = e.t === s.querySelector(".pband h1").firstChild.nodeValue; else if (on) own.push(e); }
      s.querySelectorAll(".toc div").forEach(d => { const n = d.querySelector("span").textContent; const e = own.find(x => x.n === n); if (e) d.insertAdjacentHTML("beforeend", pg(e.key)); });
    });
    // the contents page after the cover
    let h = "<section class='sec index'><h2>Contents</h2><p class='idate'>" + g.title + " guide · dated " + DATE + "</p><div class='ix'>";
    for (const e of ents) h += e.lvl === 0 ? "<div class='ip'><span class='in'>" + e.n + "</span>" + e.t + pg(e.key) + "</div>"
      : "<div class='is'><span class='in'>" + (e.qs ? "" : e.n) + "</span>" + (e.qs ? "Quick start" : e.t) + pg(e.key) + "</div>";
    h += "</div></section>";
    c.insertAdjacentHTML("afterend", h);
    const st = document.createElement("style");
    st.textContent = ".mk{font-size:3px;color:#fff;letter-spacing:0}.pband .mk{color:var(--navy)}.pg{float:right;color:var(--mute);font-weight:600}.toc div{overflow:hidden}" +
      ".index h2{font-size:20pt;margin-bottom:2px}.idate{color:var(--mute);margin-bottom:14px}.ix .ip{font-weight:800;font-size:12pt;margin-top:12px;padding:6px 0;border-bottom:2px solid var(--navy)}" +
      ".ix .is{padding:3px 0 3px 4px;border-bottom:1px dotted #cbd5e1;font-size:10.5pt}.ix .in{display:inline-block;width:40px;color:var(--blue);font-weight:700}.ix .ip .in{width:66px}";
    document.head.appendChild(st);
    document.title = "LODESTAR Guide: " + g.title;
  }, { g, ELSEWHERE, DATE, pages });
  const file = path.join(__dirname, g.out);
  await page.pdf({ path: file, format: "A4", printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: "<span></span>",
    footerTemplate: "<div style='font-size:8px;color:#64748b;width:100%;padding:0 16mm;display:flex;justify-content:space-between'><span>LODESTAR user guide · " + g.title + " · " + DATE + "</span><span><span class='pageNumber'></span> / <span class='totalPages'></span></span></div>" });
  return file;
}
const PY = "import sys,re,json,subprocess\nt=subprocess.run(['pdftotext',sys.argv[1],'-'],capture_output=True,text=True).stdout;o={}\nfor i,p in enumerate(t.split('\\f')):\n  for k in re.findall(r'@@(K\\d+)@@',p.replace(' ','').replace('\\n','')):\n    o.setdefault(k,i+1)\nprint(json.dumps(o))";
(async () => {
  const b = await chromium.launch(); const page = await b.newPage();
  for (const g of GUIDES) {
    const f = await build(page, g, null);
    const pages = JSON.parse(execFileSync("python3", ["-c", PY, f]).toString());
    await build(page, g, pages);
    const n = JSON.parse(execFileSync("python3", ["-c", "import sys,pypdf;print(len(pypdf.PdfReader(sys.argv[1]).pages))", f]).toString());
    console.log(g.out, n, "pages,", Object.keys(pages).length, "headings found");
  }
  await b.close();
})();
