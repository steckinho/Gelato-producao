import { useState, useEffect } from "react";
import { ref, onValue, set, get } from "firebase/database";
import { db } from "./firebase.js";

const USERS = ["Você", "Thiago Ramon", "Álvaro"];
const FIELDS = [
  { id: "mediaMensal", label: "Média Mensal", icon: "📊", unit: "un/mês" },
  { id: "estoque", label: "Em Estoque", icon: "📦", unit: "un" },
  { id: "entregasFuturas", label: "Entregas Futuras", icon: "🚚", unit: "un" },
  { id: "vendasSemEntrega", label: "Vendas s/ Entrega", icon: "🏷️", unit: "un" },
];

function slugUser(u) {
  return u.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
}

export default function App() {
  const [data, setData] = useState({});
  const [user, setUser] = useState(USERS[0]);
  const [edits, setEdits] = useState({});
  const [flash, setFlash] = useState("");

  useEffect(() => {
    const r = ref(db, "gelato");
    return onValue(r, (snap) => setData(snap.val() || {}));
  }, []);

  function getVal(path) {
    return path.reduce((o, k) => (o && o[k] !== undefined ? o[k] : ""), data);
  }

  async function save(prod, flavor, field) {
    const key = prod + "|" + flavor + "|" + field;
    const val = edits[key];
    if (!val) return;
    await set(ref(db, "gelato/" + prod + "/" + flavor + "/" + slugUser(user) + "/" + field), val);
    setEdits((e) => { const n = { ...e }; delete n[key]; return n; });
    setFlash("✓ Salvo!");
    setTimeout(() => setFlash(""), 1500);
  }

  const products = {
    "🍨 Spumoni": ["Spumoni box12", "Spumoni box8", "Neapolitan box12", "Neapolitan box8"],
    "🍦 Sorvetes": ["Vanilla", "Chocolate", "Banana", "Mint Choc Chips", "Lemon Sorbet", "Raspberry Sorbet", "Pineapple Sorbet", "Mango Sorbet"],
    "🍫 Chocolates": ["Detroit Milk Choc", "Almonds", "Dark Chocolate", "Toffee"],
  };

  const [tab, setTab] = useState("🍨 Spumoni");
  const accent = tab.includes("Spumoni") ? "#b5297a" : tab.includes("Sorvet") ? "#1565c0" : "#6b2d0f";

  return (
    <div style={{ minHeight: "100vh", background: "#f0ede9", fontFamily: "sans-serif" }}>
      <div style={{ background: accent, padding: "16px 20px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ color: "#fff", fontSize: 18, fontWeight: 900, marginBottom: 10 }}>🍨 Controle de Produção</div>
        <div style={{ display: "flex", gap: 8 }}>
          {Object.keys(products).map((p) => (
            <button key={p} onClick={() => setTab(p)} style={{
              flex: 1, padding: "7px 4px", borderRadius: 8, border: "none", cursor: "pointer",
              background: tab === p ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.2)",
              color: tab === p ? accent : "#fff", fontWeight: 700, fontSize: 12,
            }}>{p}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: 14 }}>
        {flash && <div style={{ background: "#d1fae5", borderRadius: 8, padding: "8px 14px", marginBottom: 12, color: "#065f46", fontWeight: 700 }}>{flash}</div>}

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#999", alignSelf: "center" }}>Editando:</span>
          {USERS.map((u) => (
            <button key={u} onClick={() => setUser(u)} style={{
              padding: "6px 14px", borderRadius: 20, border: "2px solid " + (user === u ? accent : "#ddd"),
              background: user === u ? "#fce8f5" : "#fff", color: user === u ? accent : "#888",
              fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}>{u}</button>
          ))}
        </div>

        {products[tab].map((flavor) => (
          <div key={flavor} style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 10, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
            <div style={{ fontWeight: 700, color: "#222", marginBottom: 12 }}>{flavor}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {FIELDS.map(({ id, label, icon, unit }) => {
                const key = tab + "|" + flavor + "|" + id;
                const saved = getVal(["gelato", tab, flavor, slugUser(user), id]) || getVal([tab, flavor, slugUser(user), id]);
                const dirty = edits[key] !== undefined;
                return (
                  <div key={id}>
                    <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700, marginBottom: 4 }}>{icon} {label}</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <input type="number" min="0"
                        value={dirty ? edits[key] : ""}
                        placeholder={saved || "—"}
                        onChange={(e) => setEdits((ed) => ({ ...ed, [key]: e.target.value }))}
                        style={{ width: 70, padding: "6px 8px", borderRadius: 7, border: "1.5px solid " + (dirty ? accent : "#e0e0e0"), fontSize: 14, fontWeight: 700, outline: "none" }}
                      />
                      <button onClick={() => save(tab, flavor, id)} disabled={!dirty}
                        style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: dirty ? accent : "#eee", color: dirty ? "#fff" : "#ccc", fontWeight: 900, cursor: dirty ? "pointer" : "default" }}>
                        ✓
                      </button>
                    </div>
                    {saved && !dirty && <div style={{ fontSize: 11, color: accent, marginTop: 2 }}>{saved} {unit}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
