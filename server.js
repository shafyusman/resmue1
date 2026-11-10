const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
fs.mkdirSync(DATA_DIR, { recursive: true });

const initial = {
  settings: { businessType: "", businessName: "", ownerName: "", currency: "PKR" },
  products: [],
  customers: [],
  suppliers: [],
  sales: [],
  expenses: [],
  purchases: [],
  appointments: [],
  patients: [],
  tables: [],
  categories: ["General", "Food", "Drinks", "Medical", "Grocery", "Clothing", "Electronics"]
};
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));

function readDB() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch { return structuredClone(initial); }
}
function writeDB(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "X-Content-Type-Options": "nosniff" });
  res.end(type.startsWith("application/json") ? JSON.stringify(body) : body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => { raw += chunk; if (raw.length > 1e6) reject(new Error("Request too large")); });
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}
function id(prefix) { return prefix + "-" + crypto.randomBytes(4).toString("hex").toUpperCase(); }
function routeCollection(db, key, prefix) {
  return {
    list: () => db[key],
    create: item => { const row = { id: id(prefix), createdAt: new Date().toISOString(), ...item }; db[key].unshift(row); return row; },
    remove: rid => { const before = db[key].length; db[key] = db[key].filter(x => x.id !== rid); return before !== db[key].length; }
  };
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/")) {
    try {
      const db = readDB();
      const parts = url.pathname.split("/").filter(Boolean);
      const resource = parts[1];
      const rid = parts[2];

      if (req.method === "GET" && url.pathname === "/api/health") return send(res, 200, { ok: true, message: "Smart POS API is running" });
      if (req.method === "GET" && url.pathname === "/api/data") return send(res, 200, db);

      if (req.method === "PUT" && resource === "settings") {
        db.settings = { ...db.settings, ...(await readBody(req)) };
        writeDB(db); return send(res, 200, db.settings);
      }

      const map = {
        products: ["products", "PRD"], customers: ["customers", "CUS"],
        suppliers: ["suppliers", "SUP"], sales: ["sales", "INV"],
        expenses: ["expenses", "EXP"], purchases: ["purchases", "PUR"],
        appointments: ["appointments", "APT"], patients: ["patients", "PAT"]
      };
      if (map[resource]) {
        const [key, prefix] = map[resource];
        const col = routeCollection(db, key, prefix);
        if (req.method === "GET" && !rid) return send(res, 200, col.list());
        if (req.method === "POST" && !rid) {
          const item = await readBody(req);
          if (!item || typeof item !== "object") return send(res, 400, { error: "Invalid record" });
          const row = col.create(item);
          writeDB(db); return send(res, 201, row);
        }
        if (req.method === "DELETE" && rid) {
          const ok = col.remove(rid);
          writeDB(db); return send(res, ok ? 200 : 404, { ok });
        }
      }

      if (req.method === "POST" && resource === "checkout") {
        const body = await readBody(req);
        if (!Array.isArray(body.items) || !body.items.length) return send(res, 400, { error: "Cart is empty" });
        for (const item of body.items) {
          const product = db.products.find(p => p.id === item.productId);
          if (!product) return send(res, 400, { error: "Product not found: " + item.productId });
          if (Number(product.stock) < Number(item.qty)) return send(res, 400, { error: "Insufficient stock for " + product.name });
        }
        let subtotal = 0, cost = 0;
        for (const item of body.items) {
          const product = db.products.find(p => p.id === item.productId);
          const qty = Number(item.qty);
          product.stock -= qty;
          subtotal += Number(product.price) * qty;
          cost += Number(product.cost || 0) * qty;
        }
        const discount = Math.max(0, Math.min(subtotal, Number(body.discount || 0)));
        const sale = {
          id: id("INV"), createdAt: new Date().toISOString(),
          customer: body.customer || "Walk-in Customer",
          items: body.items, subtotal, discount, total: subtotal - discount,
          cost, payment: body.payment || "Cash"
        };
        db.sales.unshift(sale); writeDB(db); return send(res, 201, sale);
      }

      if (req.method === "POST" && resource === "purchase-stock") {
        const body = await readBody(req);
        const p = db.products.find(x => x.id === body.productId);
        const qty = Number(body.qty), unitCost = Number(body.unitCost);
        if (!p || !Number.isInteger(qty) || qty < 1 || unitCost < 0) return send(res, 400, { error: "Invalid purchase details" });
        p.stock += qty; p.cost = unitCost;
        const row = { id: id("PUR"), createdAt: new Date().toISOString(), product: p.name, qty, unitCost, total: qty * unitCost, supplier: body.supplier || "Not selected" };
        db.purchases.unshift(row); writeDB(db); return send(res, 201, row);
      }

      if (req.method === "POST" && resource === "reset") {
        const fresh = structuredClone(initial);
        writeDB(fresh); return send(res, 200, { ok: true });
      }

      return send(res, 404, { error: "API route not found" });
    } catch (e) { return send(res, 400, { error: e.message || "Request failed" }); }
  }

  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const target = path.normalize(path.join(ROOT, pathname));
  if (!target.startsWith(ROOT)) return send(res, 403, "Forbidden", "text/plain");
  fs.readFile(target, (err, data) => {
    if (err) return send(res, 404, "File not found", "text/plain; charset=utf-8");
    const ext = path.extname(target);
    const types = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".json":"application/json; charset=utf-8", ".svg":"image/svg+xml" };
    send(res, 200, data, types[ext] || "application/octet-stream");
  });
});
server.listen(PORT, () => console.log(`Smart POS running at http://localhost:${PORT}`));