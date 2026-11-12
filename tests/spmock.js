// A small SharePoint REST mock for the dashboard tests. It serves the built dashboard from a fake document library
// (http://127.0.0.1:<port>/sites/121SQN/Program/Flight_Ops_Planner_Dashboard.html?sptest) and answers the REST calls
// the dashboard makes: contextinfo, folder listing, file metadata, file download ($value), permissions, Files/add,
// folders, currentuser. Files live in memory only; nothing is written to disk.
//
// const m = await startMock({ files: { "Flight_Ops_Planner_SUP2.xlsx": <Buffer>, ... } });
// m.url                       page URL to open
// m.file(name)                current bytes of a file in the folder
// m.put(name, bytes, by)      replace a file as if someone else saved it (bumps TimeLastModified)
// m.lock(name, on)            423 Locked on saves (someone has it open in Excel)
// m.readOnly(name, on)        no edit permission on that file (EffectiveBasePermissions without EditListItems)
// m.failNext(pattern, status) the next request whose path matches pattern gets this status
// m.expireDigests()           every digest handed out so far is refused (403, like an expired form digest)
// m.delayNext(pattern, ms)   the next matching request is answered after ms (its effect lands then too)
// m.fixClock(ms | null)       every save gets this modified time (two saves in the same second); null = real clock
// startMock({ refuseTag: true })  a site that refuses $select=ETag (400): the dashboard falls back to the time alone
// m.secondClock = true        TimeLastModified has whole seconds, like SharePoint (default true)
// m.log                       [{ method, path, user, status }]
// m.saves(name)               the Files/add calls for that file
// m.close()
// Users: the cookie "spuser=<name>" names the person (one browser context per person).
const http = require("http");
const fs = require("fs");
const path = require("path");

const WEB = "/sites/121SQN", FOLDER = WEB + "/Program";

function startMock(o = {}) {
  const page = o.page || path.join(__dirname, "..", "Flight_Ops_Planner_Dashboard.html");
  const files = new Map();   // name -> { bytes, modified (ms), by }
  let clock = Date.parse(o.start || "2026-10-26T08:00:00Z");
  const m = { log: [], secondClock: o.secondClock !== false, locks: new Set(), ro: new Set(), fails: [], delays: [], digests: new Set(), dead: new Set(), seq: 0, fixed: null };
  const now = () => m.fixed != null ? m.fixed : (clock = Math.max(clock + 1, Date.now()));
  const iso = t => new Date(m.secondClock ? Math.floor(t / 1000) * 1000 : t).toISOString().replace(/\.000Z$/, "Z");
  let ids = 0;
  const store = (n, bytes, modified, by) => { const old = files.get(n); files.set(n, { bytes, modified, by, id: old ? old.id : ++ids, ver: old ? old.ver + 1 : 1 }); };
  for (const [n, b] of Object.entries(o.files || {})) store(n, Buffer.from(b), clock, "Setup");

  const fileInfo = n => { const f = files.get(n); return { Name: n, ServerRelativeUrl: FOLDER + "/" + n, TimeLastModified: iso(f.modified), ETag: m.noTag ? undefined : '"{6F1C2B9A-0000-4000-8000-' + String(f.id).padStart(12, "0") + '},' + f.ver + '"', Length: String(f.bytes.length), ModifiedBy: { Title: f.by } }; };
  const nameFromUrl = u => { const p = decodeURIComponent(u); return p.startsWith(FOLDER + "/") ? p.slice(FOLDER.length + 1) : null; };
  const json = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json;odata=verbose" }); res.end(JSON.stringify(obj)); };
  const err = (res, code, msg) => json(res, code, { error: { code: "-1, Mock", message: { lang: "en-US", value: msg } } });

  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => {
      const di = m.delays.findIndex(f => f.re.test(decodeURIComponent(req.url)) && (!f.method || f.method === req.method));
      if (di >= 0) { const f = m.delays.splice(di, 1)[0]; setTimeout(() => handle(req, res, Buffer.concat(chunks)), f.ms); }
      else handle(req, res, Buffer.concat(chunks));
    });
  });
  function handle(req, res, body) {
    {
      const u = new URL(req.url, "http://x"), p = decodeURIComponent(u.pathname) + (u.search ? decodeURIComponent(u.search) : "");
      const user = ((/(?:^|;\s*)spuser=([^;]+)/.exec(req.headers.cookie || "") || [])[1] || "Test User").replace(/\+/g, " ");
      const entry = { method: req.method, path: p, user, status: 200, at: Date.now() }; m.log.push(entry);
      const send = (code, fn) => { entry.status = code; fn(); };
      const fi = m.fails.findIndex(f => f.re.test(p) && (!f.method || f.method === req.method));
      if (fi >= 0) { const f = m.fails.splice(fi, 1)[0]; return send(f.status, () => err(res, f.status, "Injected failure " + f.status)); }

      // the page itself
      if (req.method === "GET" && u.pathname === FOLDER + "/Flight_Ops_Planner_Dashboard.html") {
        return send(200, () => { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end(fs.readFileSync(page)); });
      }
      if (!u.pathname.includes("/_api/")) return send(404, () => { res.writeHead(404); res.end("not found"); });
      const [webPart, api] = [u.pathname.slice(0, u.pathname.indexOf("/_api/")), decodeURIComponent(u.pathname.slice(u.pathname.indexOf("/_api/") + 5))];
      if (webPart !== WEB) return send(404, () => err(res, 404, "No web at " + webPart));
      const digestOk = () => { const d = req.headers["x-requestdigest"]; return d && m.digests.has(d) && !m.dead.has(d); };

      if (req.method === "POST" && api === "/contextinfo") {
        const d = "0x" + (++m.seq).toString(16).padStart(8, "0") + ",mock"; m.digests.add(d);
        return send(200, () => json(res, 200, { d: { GetContextWebInformation: { FormDigestValue: d, FormDigestTimeoutSeconds: o.digestTtl || 1800, WebFullUrl: "http://" + req.headers.host + WEB } } }));
      }
      if (req.method === "GET" && api === "/web/currentuser") return send(200, () => json(res, 200, { d: { Title: user, Email: "", LoginName: "i:0#.f|membership|" + user } }));
      let mm;
      if (req.method === "GET" && (mm = /^\/web\/GetFolderByServerRelativeUrl\('(.*)'\)\/Files$/.exec(api))) {
        const folder = mm[1].replace(/''/g, "'");
        if (folder !== FOLDER) return send(404, () => err(res, 404, "Folder not found"));
        const expand = /\$expand=ModifiedBy/.test(u.search);
        if (expand && o.refuseExpand) return send(400, () => err(res, 400, "expand refused"));
        const list = [...files.keys()].map(n => { const i = fileInfo(n); if (!expand) delete i.ModifiedBy; return i; });
        return send(200, () => json(res, 200, { d: { results: list } }));
      }
      if ((mm = /^\/web\/GetFileByServerRelativeUrl\('(.*)'\)(\/\$value|\/ListItemAllFields\/EffectiveBasePermissions)?$/.exec(api))) {
        const n = nameFromUrl(mm[1].replace(/''/g, "'"));
        if (!n || !files.has(n)) return send(404, () => err(res, 404, "File Not Found."));
        if (mm[2] === "/$value") return send(200, () => { res.writeHead(200, { "Content-Type": "application/octet-stream" }); res.end(files.get(n).bytes); });
        if (mm[2]) return send(200, () => json(res, 200, { d: { EffectiveBasePermissions: { High: "432", Low: m.ro.has(n) ? "1" : "1011030767" } } }));
        const wantTag = /ETag/.test(u.search);
        if (wantTag && o.refuseTag) return send(400, () => err(res, 400, "The property 'ETag' does not exist"));
        const fi = fileInfo(n), d = { TimeLastModified: fi.TimeLastModified }; if (wantTag && fi.ETag) d.ETag = fi.ETag;
        return send(200, () => json(res, 200, { d }));
      }
      if (req.method === "POST" && (mm = /^\/web\/GetFolderByServerRelativeUrl\('(.*)'\)\/Files\/add\(url='(.*)',overwrite=true\)$/.exec(api))) {
        const folder = mm[1].replace(/''/g, "'"), n = mm[2].replace(/''/g, "'");
        if (!digestOk()) return send(403, () => err(res, 403, "The security validation for this page is invalid and might be corrupted. Please use your web browser's Back button to try your operation again."));
        if (folder !== FOLDER) { store("__other__" + folder + "/" + n, body, now(), user); return send(200, () => json(res, 200, { d: { Name: n, TimeLastModified: iso(clock) } })); }
        if (m.ro.has(n)) return send(403, () => err(res, 403, "Access denied."));
        if (m.locks.has(n)) return send(423, () => err(res, 423, "The file \"" + n + "\" is locked for shared use by someone else."));
        store(n, body, now(), user);
        return send(200, () => json(res, 200, { d: fileInfo(n) }));
      }
      if (req.method === "POST" && api === "/web/folders") {
        if (!digestOk()) return send(403, () => err(res, 403, "The security validation for this page is invalid."));
        return send(200, () => json(res, 200, { d: { ServerRelativeUrl: JSON.parse(body.toString() || "{}").ServerRelativeUrl } }));
      }
      return send(400, () => err(res, 400, "Mock does not know " + req.method + " " + api));
    }
  }
  return new Promise(ok => server.listen(0, "127.0.0.1", () => {
    const port = server.address().port;
    Object.assign(m, {
      opts: o, port, origin: "http://127.0.0.1:" + port, url: "http://127.0.0.1:" + port + FOLDER + "/Flight_Ops_Planner_Dashboard.html?sptest", FOLDER,
      file: n => files.get(n) && files.get(n).bytes,
      info: n => files.has(n) ? fileInfo(n) : null,
      names: () => [...files.keys()],
      put: (n, b, by) => store(n, Buffer.from(b), now(), by || "Someone Else"),
      lock: (n, on = true) => on ? m.locks.add(n) : m.locks.delete(n),
      readOnly: (n, on = true) => on ? m.ro.add(n) : m.ro.delete(n),
      failNext: (re, status, method) => m.fails.push({ re: re instanceof RegExp ? re : new RegExp(re), status, method }),
      delayNext: (re, ms, method) => m.delays.push({ re: re instanceof RegExp ? re : new RegExp(re), ms, method }),
      fixClock: t => { m.fixed = t == null ? null : (typeof t === "string" ? Date.parse(t) : t); },
      expireDigests: () => m.digests.forEach(d => m.dead.add(d)),
      saves: n => m.log.filter(e => e.method === "POST" && /Files\/add/.test(e.path) && (!n || e.path.includes("url='" + n + "'"))),
      close: () => new Promise(z => server.close(z)),
    });
    ok(m);
  }));
}
module.exports = { startMock, WEB, FOLDER };
