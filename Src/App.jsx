import { useState, useEffect } from "react";
import { ref, onValue, set, get, push } from "firebase/database";
import { db } from "./firebase.js";

const USERS = ["Você", "Thiago Ramon", "Álvaro"];
const FIELDS = [
  { id: "mediaMensal", label: "Média Mensal", icon: "📊", unit: "un/mês" },
  { id: "estoque", label: "Em Estoque", icon: "📦", unit: "un" },
  { id: "entregasFuturas", label: "Entregas Futuras", icon: "🚚", unit: "un" },
  { id: "vendasSemEntrega", label: "Vendas s/ Entrega", icon: "🏷️", unit: "un" },
];

const ALL_PRODUCTS = [
  "Spumoni 12 caixas", "Spumoni 20 caixas", "Neapolitan 12 caixas", "Neapolitan 20 caixas",
  "Vanilla", "Chocolate", "Banana", "Mint Choc Chips", "Cookies and Cream", "Chocolate Chips",
  "12 pints Lemon Sorbet", "12 pints Raspberry Sorbet", "12 pints Pineapple Sorbet", "12 pints Mango Sorbet",
  "Detroit Milk Choc", "Almonds", "Dark Chocolate", "Toffee",
];

const PROD_CATEGORY = {
  "Spumoni 12 caixas": "Slices", "Spumoni 20 caixas": "Slices",
  "Neapolitan 12 caixas": "Slices", "Neapolitan 20 caixas": "Slices",
  "Vanilla": "🍦 Sorvetes", "Chocolate": "🍦 Sorvetes",
  "Banana": "🍦 Sorvetes", "Mint Choc Chips": "🍦 Sorvetes",
  "Cookies and Cream": "🍦 Sorvetes", "Chocolate Chips": "🍦 Sorvetes",
  "12 pints Lemon Sorbet": "🧊 Italian Ice", "12 pints Raspberry Sorbet": "🧊 Italian Ice",
  "12 pints Pineapple Sorbet": "🧊 Italian Ice", "12 pints Mango Sorbet": "🧊 Italian Ice",
  "Detroit Milk Choc": "🍫 Chocolates", "Almonds": "🍫 Chocolates",
  "Dark Chocolate": "🍫 Chocolates", "Toffee": "🍫 Chocolates",
};

const PRODUCTS_BY_TAB = {
  "Slices": ["Spumoni 12 caixas", "Spumoni 20 caixas", "Neapolitan 12 caixas", "Neapolitan 20 caixas"],
  "🍦 Sorvetes": ["Vanilla", "Chocolate", "Banana", "Mint Choc Chips", "Cookies and Cream", "Chocolate Chips"],
  "🧊 Italian Ice": ["12 pints Lemon Sorbet", "12 pints Raspberry Sorbet", "12 pints Pineapple Sorbet", "12 pints Mango Sorbet"],
  "🍫 Chocolates": ["Detroit Milk Choc", "Almonds", "Dark Chocolate", "Toffee"],
};

const TAB_ACCENT = {
  "Slices": "#b5297a",
  "🍦 Sorvetes": "#1565c0",
  "🧊 Italian Ice": "#0891b2",
  "🍫 Chocolates": "#6b2d0f",
  "🛒 Vendas": "#0f766e",
};

const TAB_ICON = {
  "Slices": "🍨",
  "🍦 Sorvetes": "🍦",
  "🧊 Italian Ice": "🧊",
  "🍫 Chocolates": "🍫",
  "🛒 Vendas": "🛒",
};

function slugUser(u) {
  return u.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
}

function fmtCurrency(v) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "USD" });
}

function ProductionTab({ tab, data, user, setUser, accent }) {
  const [edits, setEdits] = useState({});
  const [flash, setFlash] = useState("");

  function getVal(prod, flavor, u, field) {
    return data?.[prod]?.[flavor]?.[slugUser(u)]?.[field] ?? "";
  }

  async function save(prod, flavor, field) {
    const key = prod + "|" + flavor + "|" + field;
    const val = edits[key];
    if (!val) return;
    await set(ref(db, "gelato/" + prod + "/" + flavor + "/" + slugUser(user) + "/" + field), val);
    setEdits((e) => { const n = { ...e }; delete n[key]; return n; });
    setFlash("Salvo!");
    setTimeout(() => setFlash(""), 1500);
  }

  const flavors = PRODUCTS_BY_TAB[tab];
  const totals = {};
  FIELDS.forEach(({ id }) => {
    totals[id] = flavors.reduce((sum, flavor) => {
      return sum + USERS.reduce((s2, u) => s2 + (Number(getVal(tab, flavor, u, id)) || 0), 0);
    }, 0);
  });

  return (
    <div style={{ padding: 14 }}>
      {flash && <div style={{ background: "#d1fae5", borderRadius: 8, padding: "8px 14px", marginBottom: 12, color: "#065f46", fontWeight: 700 }}>{flash}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {FIELDS.map(({ id, label, icon, unit }) => (
          <div key={id} style={{ flex: "1 1 120px", background: "#fff", borderRadius: 12, padding: "10px 14px", borderLeft: "4px solid " + accent }}>
            <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", fontWeight: 700 }}>{icon} {label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: accent }}>{totals[id] > 0 ? totals[id].toLocaleString("pt-BR") : "—"}</div>
            <div style={{ fontSize: 10, color: "#bbb" }}>{unit}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#aaa", fontWeight: 700 }}>EDITANDO:</span>
        {USERS.map((u) => (
          <button key={u} onClick={() => setUser(u)} style={{
            padding: "6px 14px", borderRadius: 20,
            border: "2px solid " + (user === u ? accent : "#ddd"),
            background: user === u ? accent + "18" : "#fff",
            color: user === u ? accent : "#888",
            fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>{u}</button>
        ))}
      </div>
      {flavors.map((flavor) => (
        <div key={flavor} style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 10, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", borderLeft: "3px solid " + accent + "44" }}>
          <div style={{ fontWeight: 700, color: "#222", marginBottom: 12 }}>{flavor}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {FIELDS.map(({ id, label, icon, unit }) => {
              const key = tab + "|" + flavor + "|" + id;
              const saved = getVal(tab, flavor, user, id);
              const dirty = edits[key] !== undefined;
              return (
                <div key={id}>
                  <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700, marginBottom: 4 }}>{icon} {label}</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <input type="number" min="0"
                      value={dirty ? edits[key] : ""}
                      placeholder={saved || "—"}
                      onChange={(e) => setEdits((ed) => ({ ...ed, [key]: e.target.value }))}
                      style={{ width: 70, padding: "6px 8px", borderRadius: 7, border: "1.5px solid " + (dirty ? accent : "#e0e0e0"), fontSize: 14, fontWeight: 700, outline: "none", background: dirty ? accent + "10" : "#fafafa" }}
                    />
                    <button onClick={() => save(tab, flavor, id)} disabled={!dirty}
                      style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: dirty ? accent : "#eee", color: dirty ? "#fff" : "#ccc", fontWeight: 900, cursor: dirty ? "pointer" : "default", fontSize: 15 }}>
                      V
                    </button>
                  </div>
                  {saved && !dirty && <div style={{ fontSize: 11, color: accent, marginTop: 2 }}>{saved} {unit}</div>}
                </div>
              );
            })}
          </div>
          {USERS.filter((u) => u !== user).map((u) => {
            const parts = FIELDS.map(({ id, icon }) => {
              const v = getVal(tab, flavor, u, id);
              return v ? icon + " " + v : null;
            }).filter(Boolean);
            if (!parts.length) return null;
            return (
              <div key={u} style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #f0f0f0", fontSize: 11, color: "#aaa" }}>
                <span style={{ fontWeight: 700, color: "#999" }}>{u}: </span>{parts.join("  ")}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
function OrderCard({ order, accent, onDeliver, delivered }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: "#fff", borderRadius: 12, marginBottom: 10, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", overflow: "hidden", borderLeft: "3px solid " + accent }}>
      <div onClick={() => setOpen(!open)} style={{ padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, color: "#222", fontSize: 14 }}>{order.client}</div>
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
            {new Date(order.date).toLocaleDateString("pt-BR")} · {order.user} · {order.items?.length} produto(s)
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 900, color: accent, fontSize: 15 }}>{fmtCurrency(order.total)}</div>
          <div style={{ fontSize: 12, color: "#ccc" }}>{open ? "▴" : "▾"}</div>
        </div>
      </div>
      {open && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 10 }}>
            {order.items?.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", color: "#555" }}>
                <span>{it.product} x {it.qty}</span>
                <span style={{ fontWeight: 700 }}>{fmtCurrency(it.qty * it.price)}</span>
              </div>
            ))}
          </div>
          {!delivered && onDeliver && (
            <button onClick={onDeliver} style={{ width: "100%", marginTop: 12, padding: "10px", borderRadius: 9, border: "none", background: accent, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              Marcar como Entregue
            </button>
          )}
          {delivered && order.deliveredDate && (
            <div style={{ marginTop: 10, fontSize: 12, color: "#aaa", textAlign: "center" }}>
              Entregue em {new Date(order.deliveredDate).toLocaleDateString("pt-BR")} por {order.deliveredBy}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function SalesTab({ data, salesData, currentUser }) {
  const accent = "#0f766e";
  const [view, setView] = useState("list");
  const [cliente, setCliente] = useState("");
  const [items, setItems] = useState([{ product: ALL_PRODUCTS[0], qty: "", price: "" }]);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");

  const orders = salesData ? Object.entries(salesData).map(([id, v]) => ({ id, ...v })).sort((a, b) => new Date(b.date) - new Date(a.date)) : [];
  const pending = orders.filter((o) => !o.delivered);
  const delivered = orders.filter((o) => o.delivered);

  function addItem() { setItems((prev) => [...prev, { product: ALL_PRODUCTS[0], qty: "", price: "" }]); }
  function removeItem(i) { setItems((prev) => prev.filter((_, idx) => idx !== i)); }
  function updateItem(i, field, val) { setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item)); }

  async function handleSubmit() {
    if (!cliente.trim()) { setFlash("Informe o nome do cliente!"); setTimeout(() => setFlash(""), 2000); return; }
    if (items.some((it) => !it.qty || !it.price)) { setFlash("Preencha quantidade e preco de todos os itens!"); setTimeout(() => setFlash(""), 2500); return; }
    setSaving(true);
    const order = {
      client: cliente.trim(),
      date: new Date().toISOString(),
      user: currentUser,
      delivered: false,
      items: items.map((it) => ({ product: it.product, qty: Number(it.qty), price: Number(it.price), category: PROD_CATEGORY[it.product] })),
      total: items.reduce((s, it) => s + Number(it.qty) * Number(it.price), 0),
    };
    await push(ref(db, "sales"), order);
    for (const it of order.items) {
      const cat = PROD_CATEGORY[it.product];
      const path = "gelato/" + cat + "/" + it.product + "/" + slugUser(currentUser) + "/entregasFuturas";
      const snap = await get(ref(db, path));
      const current = Number(snap.val()) || 0;
      await set(ref(db, path), String(current + it.qty));
    }
    setCliente("");
    setItems([{ product: ALL_PRODUCTS[0], qty: "", price: "" }]);
    setSaving(false);
    setView("list");
    setFlash("Venda cadastrada! Entregas Futuras atualizado.");
    setTimeout(() => setFlash(""), 3000);
  }

  async function markDelivered(order) {
    await set(ref(db, "sales/" + order.id + "/delivered"), true);
    await set(ref(db, "sales/" + order.id + "/deliveredDate"), new Date().toISOString());
    await set(ref(db, "sales/" + order.id + "/deliveredBy"), currentUser);
    for (const it of order.items) {
      const cat = PROD_CATEGORY[it.product];
      const basePath = "gelato/" + cat + "/" + it.product + "/" + slugUser(order.user);
      const snapEF = await get(ref(db, basePath + "/entregasFuturas"));
      const currentEF = Number(snapEF.val()) || 0;
      await set(ref(db, basePath + "/entregasFuturas"), String(Math.max(0, currentEF - it.qty)));
      const snapVSE = await get(ref(db, basePath + "/vendasSemEntrega"));
      const currentVSE = Number(snapVSE.val()) || 0;
      await set(ref(db, basePath + "/vendasSemEntrega"), String(currentVSE + it.qty));
    }
    setFlash("Entregue! Campos atualizados.");
    setTimeout(() => setFlash(""), 2500);
  }

  const orderTotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);

return (
    <div style={{ padding: 14 }}>
      {flash && <div style={{ background: "#d1fae5", borderRadius: 8, padding: "10px 14px", marginBottom: 12, color: "#065f46", fontWeight: 700 }}>{flash}</div>}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, background: "#fff", borderRadius: 12, padding: "10px 14px", borderLeft: "4px solid " + accent }}>
          <div style={{ fontSize: 10, color: "#999", fontWeight: 700, textTransform: "uppercase" }}>Pendentes</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: accent }}>{pending.length}</div>
        </div>
        <div style={{ flex: 1, background: "#fff", borderRadius: 12, padding: "10px 14px", borderLeft: "4px solid #6b7280" }}>
          <div style={{ fontSize: 10, color: "#999", fontWeight: 700, textTransform: "uppercase" }}>Entregues</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#6b7280" }}>{delivered.length}</div>
        </div>
        <div style={{ flex: 1, background: "#fff", borderRadius: 12, padding: "10px 14px", borderLeft: "4px solid " + accent }}>
          <div style={{ fontSize: 10, color: "#999", fontWeight: 700, textTransform: "uppercase" }}>Total</div>
          <div style={{ fontSize: 14, fontWeight: 900, color: accent }}>{fmtCurrency(orders.reduce((s, o) => s + (o.total || 0), 0))}</div>
        </div>
      </div>
      {view === "list" ? (
        <>
          <button onClick={() => setView("new")} style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: accent, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", marginBottom: 16 }}>
            + Nova Venda
          </button>
          {pending.length > 0 && (
            <>
              <div style={{ fontSize: 12, color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Entregas Pendentes</div>
              {pending.map((order) => <OrderCard key={order.id} order={order} accent={accent} onDeliver={() => markDelivered(order)} />)}
            </>
          )}
          {delivered.length > 0 && (
            <>
              <div style={{ fontSize: 12, color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 16 }}>Entregues</div>
              {delivered.map((order) => <OrderCard key={order.id} order={order} accent="#6b7280" delivered />)}
            </>
          )}
          {orders.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#ccc" }}>
              <div style={{ fontSize: 40 }}>🛒</div>
              <div style={{ marginTop: 8 }}>Nenhuma venda cadastrada ainda</div>
            </div>
          )}
        </>
      ) : (
        <div>
          <button onClick={() => setView("list")} style={{ background: "none", border: "none", color: accent, fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 14, padding: 0 }}>
            Voltar
          </button>
          <div style={{ background: "#fff", borderRadius: 14, padding: 18, marginBottom: 12, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#555", marginBottom: 10 }}>Cliente</div>
            <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do cliente"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 9, border: "1.5px solid #e0e0e0", fontSize: 15, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>
          <div style={{ background: "#fff", borderRadius: 14, padding: 18, marginBottom: 12, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#555", marginBottom: 12 }}>Produtos</div>
            {items.map((item, i) => (
              <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < items.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: "#aaa", fontWeight: 700 }}>Item {i + 1}</span>
                  {items.length > 1 && <button onClick={() => removeItem(i)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 16, padding: 0 }}>X</button>}
                </div>
                <select value={item.product} onChange={(e) => updateItem(i, "product", e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid #e0e0e0", fontSize: 14, marginBottom: 8, outline: "none", fontFamily: "inherit", background: "#fafafa" }}>
                  <optgroup label="Slices">
                    <option>Spumoni 12 caixas</option>
                    <option>Spumoni 20 caixas</option>
                    <option>Neapolitan 12 caixas</option>
                    <option>Neapolitan 20 caixas</option>
                  </optgroup>
                  <optgroup label="Sorvetes">
                    <option>Vanilla</option>
                    <option>Chocolate</option>
                    <option>Banana</option>
                    <option>Mint Choc Chips</option>
                    <option>Cookies and Cream</option>
                    <option>Chocolate Chips</option>
                  </optgroup>
                  <optgroup label="Italian Ice">
                    <option>12 pints Lemon Sorbet</option>
                    <option>12 pints Raspberry Sorbet</option>
                    <option>12 pints Pineapple Sorbet</option>
                    <option>12 pints Mango Sorbet</option>
                  </optgroup>
                  <optgroup label="Chocolates">
                    <option>Detroit Milk Choc</option>
                    <option>Almonds</option>
                    <option>Dark Chocolate</option>
                    <option>Toffee</option>
                  </optgroup>
                </select>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700, marginBottom: 4 }}>QTD</div>
                    <input type="number" min="1" value={item.qty} onChange={(e) => updateItem(i, "qty", e.target.value)} placeholder="0"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e0e0e0", fontSize: 14, fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700, marginBottom: 4 }}>PRECO UNIT.</div>
                    <input type="number" min="0" step="0.01" value={item.price} onChange={(e) => updateItem(i, "price", e.target.value)} placeholder="0.00"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e0e0e0", fontSize: 14, fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700, marginBottom: 4 }}>SUBTOTAL</div>
                    <div style={{ padding: "8px 10px", fontSize: 14, fontWeight: 700, color: accent }}>
                      {item.qty && item.price ? fmtCurrency(item.qty * item.price) : "—"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addItem} style={{ width: "100%", padding: "9px", borderRadius: 9, border: "1.5px dashed #d1d5db", background: "none", color: "#888", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              + Adicionar produto
            </button>
          </div>
          {orderTotal > 0 && (
            <div style={{ background: accent + "12", borderRadius: 12, padding: "12px 18px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, color: "#555" }}>Total do pedido</span>
              <span style={{ fontWeight: 900, fontSize: 18, color: accent }}>{fmtCurrency(orderTotal)}</span>
            </div>
          )}
          <button onClick={handleSubmit} disabled={saving} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: saving ? "#d1d5db" : accent, color: "#fff", fontWeight: 700, fontSize: 15, cursor: saving ? "default" : "pointer" }}>
            {saving ? "Salvando..." : "Confirmar Venda"}
          </button>
        </div>
      )}
    </div>
  );
}
export default function App() {
  const [tab, setTab] = useState("Slices");
  const [user, setUser] = useState(USERS[0]);
  const [data, setData] = useState({});
  const [salesData, setSalesData] = useState({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const unsub1 = onValue(ref(db, "gelato"), (snap) => { setData(snap.val() || {}); setConnected(true); }, () => setConnected(false));
    const unsub2 = onValue(ref(db, "sales"), (snap) => setSalesData(snap.val() || {}));
    return () => { unsub1(); unsub2(); };
  }, []);

  const tabs = ["Slices", "🍦 Sorvetes", "🧊 Italian Ice", "🍫 Chocolates", "🛒 Vendas"];
  const accent = TAB_ACCENT[tab];

  return (
    <div style={{ minHeight: "100vh", background: "#f0ede9", fontFamily: "sans-serif" }}>
      <div style={{ background: accent, padding: "16px 20px 0", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 4px 20px " + accent + "66" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ color: "#fff", fontSize: 17, fontWeight: 900 }}>
              {TAB_ICON[tab]} Controle de Producao
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: connected ? "#4ade80" : "#fbbf24" }} />
              {connected ? "Sincronizado" : "Conectando..."}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, overflowX: "auto" }}>
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              flexShrink: 0,
              padding: "8px 10px",
              borderRadius: "8px 8px 0 0",
              border: "none",
              cursor: "pointer",
              background: tab === t ? "#f0ede9" : "rgba(255,255,255,0.18)",
              color: tab === t ? accent : "rgba(255,255,255,0.85)",
              fontWeight: 700,
              fontSize: 11,
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}>{t}</button>
          ))}
        </div>
      </div>
      {tab === "🛒 Vendas" ? (
        <SalesTab data={data} salesData={salesData} currentUser={user} />
      ) : (
        <ProductionTab tab={tab} data={data} user={user} setUser={setUser} accent={accent} />
      )}
    </div>
  );
}
