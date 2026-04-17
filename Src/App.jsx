mimport { useState, useEffect } from "react";
import { ref, onValue, set, get } from "firebase/database";
import { db } from "./firebase.js";

// ─── CATALOG ─────────────────────────────────────────────────────────────────
const USERS = ["Você", "Thiago Ramon", "Álvaro"];

const CATALOG = {
  Spumoni: {
    icon: "🍨",
    color: { bg: "#fce8f5", accent: "#b5297a", light: "#fdf0fa", muted: "#f7d6ef" },
    categories: [
      {
        id: "spumoni_cat", label: "Spumoni",
        flavors: [
          { id: "spumoni_f",    name: "Spumoni",    variants: [{ id: "box12", label: "Caixa c/ 12 unid." }, { id: "box8", label: "Caixa c/ 8 unid." }] },
          { id: "neapolitan_f", name: "Neapolitan", variants: [{ id: "box12", label: "Caixa c/ 12 unid." }, { id: "box8", label: "Caixa c/ 8 unid." }] },
        ],
      },
    ],
  },
  Sorvetes: {
    icon: "🍦",
    color: { bg: "#e6f3ff", accent: "#1565c0", light: "#eef6ff", muted: "#d0e8ff" },
    categories: [
      {
        id: "tub_cat", label: "Tub (3 Gallon)", allowAdd: true,
        flavors: [
          { id: "vanilla_f",  name: "Vanilla",              variants: [{ id: "tub3g", label: "3 Gallon" }] },
          { id: "choc_f",     name: "Chocolate",            variants: [{ id: "tub3g", label: "3 Gallon" }] },
          { id: "banana_f",   name: "Banana",               variants: [{ id: "tub3g", label: "3 Gallon" }] },
          { id: "mintchoc_f", name: "Mint Chocolate Chips", variants: [{ id: "tub3g", label: "3 Gallon" }] },
        ],
      },
      {
        id: "sorbet_cat", label: "Italian Sorbet",
        flavors: [
          { id: "lemon_f",     name: "Lemon",     variants: [{ id: "tub3g", label: "3 Gallon" }] },
          { id: "raspberry_f", name: "Raspberry", variants: [{ id: "tub3g", label: "3 Gallon" }] },
          { id: "pineapple_f", name: "Pineapple", variants: [{ id: "tub3g", label: "3 Gallon" }] },
          { id: "mango_f",     name: "Mango",     variants: [{ id: "tub3g", label: "3 Gallon" }] },
        ],
      },
    ],
  },
  Chocolates: {
    icon: "🍫",
    color: { bg: "#f5ece0", accent: "#6b2d0f", light: "#fdf4ec", muted: "#edd9c5" },
    categories: [
      {
        id: "choc_cat", label: "Chocolates",
        flavors: [
          { id: "detroit_f", name: "Detroit (Milk Chocolate)", variants: [{ id: "unit", label: "Unidade" }] },
          { id: "almonds_f", name: "Almonds",                  variants: [{ id: "unit", label: "Unidade" }] },
          { id: "dark_f",    name: "Dark Chocolate",           variants: [{ id: "unit", label: "Unidade" }] },
          { id: "toffee_f",  name: "Toffee",                   variants: [{ id: "unit", label: "Unidade" }] },
        ],
      },
    ],
  },
};

const FIELDS = [
  { id: "mediaMensal",      label: "Média Mensal",      icon: "📊", unit: "un/mês" },
  { id: "estoque",          label: "Em Estoque",        icon: "📦", unit: "un" },
  { id: "entregasFuturas",  label: "Entregas Futuras",  icon: "🚚", unit: "un" },
  { id: "vendasSemEntrega", label: "Vendas s/ Entrega", icon: "🏷️", unit: "un" },
];

function num(v) { return Number(v) || 0; }
function fmt(v) { return v && num(v) ? Number(v).toLocaleString("pt-BR") : "—"; }
function slugUser(u) { return u.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, ""); }

// ─── UI ATOMS ────────────────────────────────────────────────────────────────

function Badge({ children, color }) {
  return (
    <span style={{
      background: color.muted, color: color.accent, borderRadius: 20,
      padding: "2px 10px", fontSize: 11, fontWeight: 700,
    }}>{children}</span>
  );
}

function SummaryPill({ label, value, unit, color }) {
  return (
    <div style={{
      background: color.light, borderRadius: 14, padding: "12px 16px",
      borderLeft: `4px solid ${color.accent}`, flex: "1 1 130px",
    }}>
      <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: color.accent, fontFamily: "'Playfair Display', serif", marginTop: 2 }}>
        {value > 0 ? value.toLocaleString("pt-BR") : "—"}
      </div>
      <div style={{ fontSize: 10, color: "#bbb" }}>{unit}</div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────

export default function App() {
  const [activeProd, setActiveProd] = useState("Spumoni");
  const [activeUser, setActiveUser] = useState(USERS[0]);
  const [dbData, setDbData] = useState({});
  const [edits, setEdits] = useState({});
  const [flash, setFlash] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const [showHistory, setShowHistory] = useState(false);
  const [newFlavorText, setNewFlavorText] = useState({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const rootRef = ref(db, "gelato");
    const unsub = onValue(rootRef, (snap) => {
      setDbData(snap.val() || {});
      setConnected(true);
    }, () => setConnected(false));
    return () => unsub();
  }, []);

  const prod = CATALOG[activeProd];
  const color = prod.color;

  function getCustomFlavors(catId) {
    return dbData?.custom?.[`${activeProd}__${catId}`] || [];
  }
  function getAllFlavors(cat) {
    return [...cat.flavors, ...getCustomFlavors(cat.id)];
  }
  function ek(fid, vid, fieldId) { return `${fid}|${vid}|${fieldId}`; }
  function getVal(fid, vid, user, fieldId) {
    return dbData?.[activeProd]?.[`${fid}__${vid}`]?.[slugUser(user)]?.[fieldId] ?? "";
  }

  async function handleSave(fid, vid, fieldId, flavorName, varLabel) {
    const key = ek(fid, vid, fieldId);
    const newVal = edits[key];
    if (newVal === undefined || newVal === "") return;
    const oldVal = getVal(fid, vid, activeUser, fieldId);

    await set(ref(db, `gelato/${activeProd}/${fid}__${vid}/${slugUser(activeUser)}/${fieldId}`), newVal);

    const histEntry = {
      date: new Date().toISOString(),
      product: activeProd,
      flavor: flavorName,
      variant: varLabel,
      user: activeUser,
      field: FIELDS.find((f) => f.id === fieldId)?.label,
      old: oldVal,
      val: newVal,
    };
    const histRef = ref(db, "gelato/__history");
    const snap = await get(histRef);
    const existing = snap.val() || [];
    const arr = Array.isArray(existing) ? existing : Object.values(existing);
    await set(histRef, [histEntry, ...arr].slice(0, 120));

    setEdits((e) => { const n = { ...e }; delete n[key]; return n; });
    setFlash("✓ Salvo!");
    setTimeout(() => setFlash(""), 1500);
  }

  async function addFlavor(catId) {
    const inputKey = `${activeProd}__${catId}`;
    const name = (newFlavorText[inputKey] || "").trim();
    if (!name) return;
    const fid = `custom_${catId}_${Date.now()}`;
    const newFlavor = { id: fid, name, variants: [{ id: "tub3g", label: "3 Gallon" }] };
    const customRef = ref(db, `gelato/custom/${inputKey}`);
    const snap = await get(customRef);
    const existing = snap.val() || [];
    await set(customRef, [...existing, newFlavor]);
    setNewFlavorText((p) => ({ ...p, [inputKey]: "" }));
  }

  function productSummary() {
    const totals = {};
    FIELDS.forEach(({ id }) => (totals[id] = 0));
    const pd = dbData?.[activeProd] || {};
    Object.values(pd).forEach((variantObj) => {
      if (typeof variantObj !== "object" || Array.isArray(variantObj)) return;
      Object.values(variantObj).forEach((userData) => {
        if (typeof userData !== "object") return;
        FIELDS.forEach(({ id }) => { totals[id] += num(userData[id]); });
      });
    });
    return totals;
  }

  const summary = productSummary();
  const history = Array.isArray(dbData?.__history)
    ? dbData.__history
    : Object.values(dbData?.__history || {});

  return (
    <div style={{ minHeight: "100vh", background: "#f0ede9", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={{
        background: `linear-gradient(130deg, ${color.accent} 0%, ${color.accent}dd 100%)`,
        padding: "18px 20px 14px",
        boxShadow: `0 4px 28px ${color.accent}55`,
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 28 }}>{prod.icon}</span>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, color: "#fff", fontWeight: 900 }}>
                  Controle de Produção
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ display:"inline-block", width:7, height:7, borderRadius:"50%", background: connected ? "#22c55e" : "#fbbf24", marginRight:3 }} />
                  {connected ? "Sincronizado em tempo real" : "Conectando..."}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {flash && (
                <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 700 }}>
                  {flash}
                </span>
              )}
              <button onClick={() => setShowHistory(!showHistory)} style={{
                background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)",
                color: "#fff", borderRadius: 20, padding: "6px 14px", fontSize: 12,
                fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>
                {showHistory ? "← Voltar" : "🕐 Histórico"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {Object.keys(CATALOG).map((p) => (
              <button key={p} onClick={() => { setActiveProd(p); setShowHistory(false); }} style={{
                flex: 1, padding: "8px 4px", borderRadius: 10, border: "none", cursor: "pointer",
                background: activeProd === p ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.18)",
                color: activeProd === p ? CATALOG[p].color.accent : "rgba(255,255,255,0.85)",
                fontWeight: 700, fontSize: 13, fontFamily: "inherit",
                boxShadow: activeProd === p ? "0 2px 10px rgba(0,0,0,0.12)" : "none",
                transition: "all 0.15s",
              }}>
                {CATALOG[p].icon} {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "20px 14px 48px" }}>

        {!connected && (
          <div style={{ background: "#fff3cd", borderRadius: 12, padding: "12px 18px", marginBottom: 16, fontSize: 13, color: "#856404" }}>
            ⏳ Conectando ao banco de dados...
          </div>
        )}

        {showHistory ? (
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "#222", marginBottom: 18 }}>
              Histórico de Alterações
            </div>
            {history.length === 0 ? (
              <p style={{ color: "#ccc", textAlign: "center", padding: "28px 0" }}>Nenhuma alteração ainda.</p>
            ) : history.slice(0, 40).map((h, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: "1px solid #f2f2f2", flexWrap: "wrap" }}>
                <div style={{ fontSize: 11, color: "#bbb", minWidth: 95, paddingTop: 2 }}>
                  {new Date(h.date).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </div>
                <div style={{ fontSize: 13, color: "#444" }}>
                  <Badge color={CATALOG[h.product]?.color || color}>{CATALOG[h.product]?.icon} {h.product}</Badge>{" "}
                  <strong>{h.flavor}</strong>
                  {h.variant && h.variant !== "Unidade" && h.variant !== "3 Gallon"
                    ? <> · <em style={{ color: "#999" }}>{h.variant}</em></> : null}
                  {" · "}{h.field}{" "}
                  <span style={{ color: "#bbb" }}>{h.old || "—"}</span>{" → "}
                  <strong style={{ color: CATALOG[h.product]?.color?.accent || "#333" }}>{h.val}</strong>
                  <span style={{ color: "#ccc", fontSize: 11 }}> ({h.user})</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>
                Totais — {activeProd} (todos os colaboradores)
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {FIELDS.map(({ id, label, icon, unit }) => (
                  <SummaryPill key={id} label={`${icon} ${label}`} value={summary[id]} unit={unit} color={color} />
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Editando como:</span>
              {USERS.map((u) => (
                <button key={u} onClick={() => setActiveUser(u)} style={{
                  padding: "7px 16px", borderRadius: 24,
                  border: `2px solid ${activeUser === u ? color.accent : "#ddd"}`,
                  background: activeUser === u ? color.bg : "#fff",
                  color: activeUser === u ? color.accent : "#888",
                  fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.14s",
                }}>
                  {u}
                </button>
              ))}
            </div>

            {prod.categories.map((cat) => {
              const isOpen = collapsed[cat.id] !== true;
              const flavors = getAllFlavors(cat);
              const inputKey = `${activeProd}__${cat.id}`;

              return (
                <div key={cat.id} style={{ marginBottom: 14 }}>
                  <button onClick={() => setCollapsed((c) => ({ ...c, [cat.id]: !c[cat.id] }))} style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: color.muted, border: "none", borderRadius: 12,
                    padding: "11px 18px", cursor: "pointer", fontFamily: "inherit",
                    marginBottom: isOpen ? 8 : 0,
                  }}>
                    <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: color.accent }}>
                      {cat.label}
                    </span>
                    <span style={{ color: color.accent, fontSize: 16 }}>{isOpen ? "▾" : "▸"}</span>
                  </button>

                  {isOpen && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {flavors.map((flavor) =>
                        flavor.variants.map((variant) => {
                          const showBadge = flavor.variants.length > 1 ||
                            (variant.label !== "Unidade" && variant.label !== "3 Gallon");
                          return (
                            <div key={`${flavor.id}__${variant.id}`} style={{
                              background: "#fff", borderRadius: 14, padding: "15px 18px",
                              boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
                              borderLeft: `3px solid ${color.muted}`,
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: "#2a2a2a" }}>{flavor.name}</span>
                                {showBadge && <Badge color={color}>{variant.label}</Badge>}
                              </div>

                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: 14 }}>
                                {FIELDS.map(({ id: fieldId, label, icon, unit }) => {
                                  const key = ek(flavor.id, variant.id, fieldId);
                                  const savedVal = getVal(flavor.id, variant.id, activeUser, fieldId);
                                  const editVal = edits[key];
                                  const dirty = editVal !== undefined;
                                  return (
                                    <div key={fieldId}>
                                      <div style={{ fontSize: 11, color: "#bbb", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 5 }}>
                                        {icon} {label}
                                      </div>
                                      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                                        <input
                                          type="number" min="0"
                                          value={dirty ? editVal : ""}
                                          onChange={(e) => setEdits((ed) => ({ ...ed, [key]: e.target.value }))}
                                          placeholder={savedVal || "—"}
                                          style={{
                                            width: 82, padding: "7px 10px", borderRadius: 9, fontSize: 14, fontWeight: 700,
                                            border: `1.5px solid ${dirty ? color.accent : "#e0e0e0"}`,
                                            background: dirty ? color.light : "#fafafa",
                                            color: "#222", outline: "none", fontFamily: "inherit",
                                            transition: "all 0.15s",
                                          }}
                                        />
                                        <button
                                          onClick={() => handleSave(flavor.id, variant.id, fieldId, flavor.name, variant.label)}
                                          disabled={!dirty}
                                          style={{
                                            width: 30, height: 30, borderRadius: 8, border: "none",
                                            cursor: dirty ? "pointer" : "default",
                                            background: dirty ? color.accent : "#eee",
                                            color: dirty ? "#fff" : "#ccc",
                                            fontWeight: 900, fontSize: 15,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            transition: "all 0.15s", flexShrink: 0,
                                          }}
                                        >✓</button>
                                      </div>
                                      {savedVal && !dirty && (
                                        <div style={{ fontSize: 11, color: color.accent, marginTop: 3, fontWeight: 600 }}>
                                          {fmt(savedVal)} <span style={{ color: "#bbb", fontWeight: 400 }}>{unit}</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {(() => {
                                const rows = USERS.filter((u) => u !== activeUser).map((u) => {
                                  const parts = FIELDS.map(({ id, icon }) => {
                                    const v = getVal(flavor.id, variant.id, u, id);
                                    return v ? `${icon} ${v}` : null;
                                  }).filter(Boolean);
                                  return parts.length ? { u, parts } : null;
                                }).filter(Boolean);
                                if (!rows.length) return null;
                                return (
                                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #f2f2f2", display: "flex", gap: 18, flexWrap: "wrap" }}>
                                    {rows.map(({ u, parts }) => (
                                      <div key={u} style={{ fontSize: 11, color: "#aaa" }}>
                                        <span style={{ fontWeight: 700, color: "#999" }}>{u}: </span>
                                        {parts.join("  ")}
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })
                      )}

                      {cat.allowAdd && (
                        <div style={{
                          display: "flex", gap: 8, alignItems: "center",
                          background: "#fafafa", borderRadius: 14, padding: "10px 16px",
                          border: `1.5px dashed ${color.muted}`,
                        }}>
                          <input
                            placeholder="+ Novo sabor..."
                            value={newFlavorText[inputKey] || ""}
                            onChange={(e) => setNewFlavorText((p) => ({ ...p, [inputKey]: e.target.value }))}
                            onKeyDown={(e) => e.key === "Enter" && addFlavor(cat.id)}
                            style={{ flex: 1, border: "none", background: "transparent", fontSize: 14, color: "#555", outline: "none", fontFamily: "inherit" }}
                          />
                          <button onClick={() => addFlavor(cat.id)} style={{
                            padding: "7px 16px", borderRadius: 8, border: "none",
                            background: color.accent, color: "#fff",
                            fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                          }}>
                            Adicionar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
