// Renders Master_Planner_Guide.html to the PDF. Run: node guide/make_pdf.js (after node guide/make_shots.js; needs the dashboard built)
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto("file://" + __dirname + "/Master_Planner_Guide.html"); await p.waitForLoadState("networkidle");
  await p.pdf({ path: __dirname + "/LODESTAR_Guide_Master_Planner_DRAFT.pdf", format: "A4", printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true, headerTemplate: "<span></span>", footerTemplate: "<div style='font-size:8px;color:#64748b;width:100%;padding:0 16mm;display:flex;justify-content:space-between'><span>LODESTAR user guide · Master Planner · DRAFT</span><span><span class='pageNumber'></span> / <span class='totalPages'></span></span></div>" });
  await b.close();
})();
