import { useState, useEffect } from "react";

const STORAGE_KEY_FLAVORS = "gelato_flavors";
const STORAGE_KEY_SALES = "gelato_sales";
const STORAGE_KEY_DELIVERIES_ORDER = "gelato_deliveries_order";

const defaultFlavors = [
  { id: 1, name: "Chocolate", pricePerLiter: 25 },
  { id: 2, name: "Italian Ice", pricePerLiter: 20 },
];

function loadFromStorage(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export default function App() {
  const [activeTab, setActiveTab] = useState("producao");
  const [flavors, setFlavors] = useState(() => loadFromStorage(STORAGE_KEY_FLAVORS, defaultFlavors));
  const [sales, setSales] = useState(() => loadFromStorage(STORAGE_KEY_SALES, []));
  const [deliveriesOrder, setDeliveriesOrder] = useState(() => loadFromStorage(STORAGE_KEY_DELIVERIES_ORDER, []));

  const [selectedFlavor, setSelectedFlavor] = useState("");
  const [liters, setLiters] = useState("");
  const [productions, setProductions] = useState(() => loadFromStorage("gelato_productions", []));

  const [saleClient, setSaleClient] = useState("");
  const [saleItems, setSaleItems] = useState([{ flavorId: "", liters: "", pricePerLiter: "" }]);
  const [saleDeliveryDate, setSaleDeliveryDate] = useState("");
  const [saleNote, setSaleNote] = useState("");

  const [newFlavorName, setNewFlavorName] = useState("");
  const [newFlavorPrice, setNewFlavorPrice] = useState("");

  const [selectedSale, setSelectedSale] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);

  useEffect(() => { saveToStorage(STORAGE_KEY_FLAVORS, flavors); }, [flavors]);
  useEffect(() => { saveToStorage(STORAGE_KEY_SALES, sales); }, [sales]);
  useEffect(() => { saveToStorage("gelato_productions", productions); }, [productions]);
  useEffect(() => { saveToStorage(STORAGE_KEY_DELIVERIES_ORDER, deliveriesOrder); }, [deliveriesOrder]);

  useEffect(() => {
    const pendingIds = sales.filter(s => !s.delivered).map(s => s.id);
    setDeliveriesOrder(prev => {
      const existing = prev.filter(id => pendingIds.includes(id));
      const newIds = pendingIds.filter(id => !existing.includes(id));
      return [...existing, ...newIds];
    });
  }, [sales]);

  const getFlavorName = (id) => flavors.find(f => f.id === Number(id))?.name || "-";

  const handleAddProduction = () => {
    if (!selectedFlavor || !liters) return;
    const flavor = flavors.find(f => f.id === Number(selectedFlavor));
    if (!flavor) return;
    setProductions(prev => [...prev, {
      id: Date.now(),
      flavorId: flavor.id,
      flavorName: flavor.name,
      liters: Number(liters),
      date: new Date().toLocaleDateString("pt-BR"),
    }]);
    setSelectedFlavor("");
    setLiters("");
  };

  const handleSaleItemChange = (i, field, value) => {
    setSaleItems(prev => {
      const updated = [...prev];
      updated[i] = { ...updated[i], [field]: value };
      return updated;
    });
  };

  const addSaleItem = () => setSaleItems(prev => [...prev, { flavorId: "", liters: "", pricePerLiter: "" }]);
  const removeSaleItem = (i) => setSaleItems(prev => prev.filter((_, idx) => idx !== i));

  const calcSaleTotal = (items) =>
    items.reduce((sum, it) => sum + (Number(it.liters || 0) * Number(it.pricePerLiter || 0)), 0);

  // Obrigatório: cliente, sabor e litros. Preço é opcional.
  const handleAddSale = () => {
    if (!saleClient || saleItems.some(it => !it.flavorId || !it.liters)) return;
    const newSale = {
      id: Date.now(),
      client: saleClient,
      items: saleItems.map(it => ({
        flavorId: Number(it.flavorId),
        flavorName: getFlavorName(it.flavorId),
        liters: Number(it.liters),
        pricePerLiter: it.pricePerLiter !== "" ? Number(it.pricePerLiter) : null,
      })),
      total: calcSaleTotal(saleItems),
      deliveryDate: saleDeliveryDate,
      note: saleNote,
      date: new Date().toLocaleDateString("pt-BR"),
      delivered: false,
    };
    setSales(prev => [...prev, newSale]);
    setSaleClient("");
    setSaleItems([{ flavorId: "", liters: "", pricePerLiter: "" }]);
    setSaleDeliveryDate("");
    setSaleNote("");
  };

  const markDelivered = (id) => {
    setSales(prev => prev.map(s => s.id === id ? { ...s, delivered: true } : s));
    setDeliveriesOrder(prev => prev.filter(did => did !== id));
    setSelectedSale(null);
  };

  const deleteSale = (id) => {
    setSales(prev => prev.filter(s => s.id !== id));
    setDeliveriesOrder(prev => prev.filter(did => did !== id));
    setSelectedSale(null);
  };

  const handleAddFlavor = () => {
    if (!newFlavorName || !newFlavorPrice) return;
    setFlavors(prev => [...prev, { id: Date.now(), name: newFlavorName, pricePerLiter: Number(newFlavorPrice) }]);
    setNewFlavorName("");
    setNewFlavorPrice("");
  };

  const handleDeleteFlavor = (id) => {
    if (!window.confirm("Excluir este sabor?")) return;
    setFlavors(prev => prev.filter(f => f.id !== id));
  };

  const pendingSales = sales.filter(s => !s.delivered);
  const orderedDeliveries = deliveriesOrder
    .map(id => pendingSales.find(s => s.id === id))
    .filter(Boolean);

  const handleDragStart = (i) => setDragIndex(i);
  const handleDragOver = (e, i) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) return;
    setDeliveriesOrder(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(i, 0, moved);
      return updated;
    });
    setDragIndex(i);
  };
  const handleDragEnd = () => setDragIndex(null);

  const totalRevenue = sales.filter(s => s.delivered).reduce((sum, s) => sum + s.total, 0);
  const pendingRevenue = pendingSales.reduce((sum, s) => sum + s.total, 0);

  const tabs = [
    { id: "producao", label: "Produção" },
    { id: "vendas", label: "Vendas" },
    { id: "entregas", label: "Entregas" },
    { id: "sabores", label: "Sabores" },
  ];

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🍦</span>
            <span style={styles.logoText}>Gelato Produções</span>
          </div>
          <nav style={styles.nav}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{ ...styles.navBtn, ...(activeTab === tab.id ? styles.navBtnActive : {}) }}
              >
                {tab.label}
                {tab.id === "entregas" && orderedDeliveries.length > 0 && (
                  <span style={styles.badge}>{orderedDeliveries.length}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.summaryRow}>
          <div style={styles.summaryCard}>
            <span style={styles.summaryLabel}>Receita Recebida</span>
            <span style={styles.summaryValue}>R$ {totalRevenue.toFixed(2)}</span>
          </div>
          <div style={styles.summaryCard}>
            <span style={styles.summaryLabel}>A Receber</span>
            <span style={{ ...styles.summaryValue, color: "#f59e0b" }}>R$ {pendingRevenue.toFixed(2)}</span>
          </div>
          <div style={styles.summaryCard}>
            <span style={styles.summaryLabel}>Entregas Pendentes</span>
            <span style={{ ...styles.summaryValue, color: "#ef4444" }}>{orderedDeliveries.length}</span>
          </div>
        </div>

        {activeTab === "producao" && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Registrar Produção</h2>
            <div style={styles.formRow}>
              <select style={styles.input} value={selectedFlavor} onChange={e => setSelectedFlavor(e.target.value)}>
                <option value="">Selecione o sabor</option>
                {flavors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <input style={styles.input} type="number" placeholder="Litros produzidos" value={liters} onChange={e => setLiters(e.target.value)} />
              <button style={styles.btnPrimary} onClick={handleAddProduction}>Registrar</button>
            </div>
            <h3 style={styles.subTitle}>Histórico de Produções</h3>
            {productions.length === 0 ? <p style={styles.empty}>Nenhuma produção registrada.</p> : (
              <table style={styles.table}>
                <thead><tr>
                  <th style={styles.th}>Data</th>
                  <th style={styles.th}>Sabor</th>
                  <th style={styles.th}>Litros</th>
                </tr></thead>
                <tbody>
                  {[...productions].reverse().map(p => (
                    <tr key={p.id} style={styles.tr}>
                      <td style={styles.td}>{p.date}</td>
                      <td style={styles.td}>{p.flavorName}</td>
                      <td style={styles.td}>{p.liters}L</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "vendas" && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Nova Venda</h2>
            <div style={styles.formCol}>
              <input style={styles.input} placeholder="Nome do cliente *" value={saleClient} onChange={e => setSaleClient(e.target.value)} />
              {saleItems.map((item, i) => (
                <div key={i} style={styles.formRow}>
                  <select style={styles.input} value={item.flavorId} onChange={e => handleSaleItemChange(i, "flavorId", e.target.value)}>
                    <option value="">Sabor *</option>
                    {flavors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  <input
                    style={{ ...styles.input, width: 90 }}
                    type="number"
                    placeholder="Litros *"
                    value={item.liters}
                    onChange={e => handleSaleItemChange(i, "liters", e.target.value)}
                  />
                  <div style={styles.optionalField}>
                    <input
                      style={{ ...styles.input, width: 140, paddingRight: 60 }}
                      type="number"
                      placeholder="R$/litro"
                      value={item.pricePerLiter}
                      onChange={e => handleSaleItemChange(i, "pricePerLiter", e.target.value)}
                    />
                    <span style={styles.optionalTag}>opcional</span>
                  </div>
                  {item.pricePerLiter && item.liters && (
                    <span style={styles.itemTotal}>
                      = R$ {(Number(item.liters) * Number(item.pricePerLiter)).toFixed(2)}
                    </span>
                  )}
                  {saleItems.length > 1 && (
                    <button style={styles.btnDanger} onClick={() => removeSaleItem(i)}>✕</button>
                  )}
                </div>
              ))}
              <button style={styles.btnSecondary} onClick={addSaleItem}>+ Adicionar sabor</button>
              <div style={styles.formRow}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Data de Entrega</label>
                  <input style={styles.input} type="date" value={saleDeliveryDate} onChange={e => setSaleDeliveryDate(e.target.value)} />
                </div>
                <div style={{ ...styles.fieldGroup, flex: 2 }}>
                  <label style={styles.label}>Observações</label>
                  <input style={styles.input} placeholder="Observações (opcional)" value={saleNote} onChange={e => setSaleNote(e.target.value)} />
                </div>
              </div>
              {calcSaleTotal(saleItems) > 0 && (
                <div style={styles.saleFooter}>
                  <span style={styles.totalLabel}>Total: <strong>R$ {calcSaleTotal(saleItems).toFixed(2)}</strong></span>
                </div>
              )}
              <button style={styles.btnPrimary} onClick={handleAddSale}>Registrar Venda</button>
            </div>

            <h3 style={styles.subTitle}>Histórico de Vendas</h3>
            {sales.length === 0 ? <p style={styles.empty}>Nenhuma venda registrada.</p> : (
              <table style={styles.table}>
                <thead><tr>
                  <th style={styles.th}>Data</th>
                  <th style={styles.th}>Cliente</th>
                  <th style={styles.th}>Total</th>
                  <th style={styles.th}>Entrega</th>
                  <th style={styles.th}>Status</th>
                </tr></thead>
                <tbody>
                  {[...sales].reverse().map(s => (
                    <tr
                      key={s.id}
                      style={{ ...styles.tr, cursor: !s.delivered ? "pointer" : "default" }}
                      onClick={() => !s.delivered && setSelectedSale(s)}
                    >
                      <td style={styles.td}>{s.date}</td>
                      <td style={styles.td}>{s.client}</td>
                      <td style={styles.td}>{s.total > 0 ? `R$ ${s.total.toFixed(2)}` : "-"}</td>
                      <td style={styles.td}>{s.deliveryDate ? formatDate(s.deliveryDate) : "-"}</td>
                      <td style={styles.td}>
                        <span style={s.delivered ? styles.badgeGreen : styles.badgeYellow}>
                          {s.delivered ? "Entregue" : "Pendente"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "entregas" && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Entregas Pendentes</h2>
            <p style={styles.hint}>🔄 Arraste os cartões para reordenar conforme prioridade</p>
            {orderedDeliveries.length === 0 ? (
              <p style={styles.empty}>Nenhuma entrega pendente. 🎉</p>
            ) : (
              <div style={styles.deliveryList}>
                {orderedDeliveries.map((sale, i) => (
                  <div
                    key={sale.id}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={e => handleDragOver(e, i)}
                    onDragEnd={handleDragEnd}
                    style={{ ...styles.deliveryCard, opacity: dragIndex === i ? 0.5 : 1 }}
                    onClick={() => setSelectedSale(sale)}
                  >
                    <div style={styles.deliveryCardHeader}>
                      <span style={styles.deliveryNum}>#{i + 1}</span>
                      <span style={styles.deliveryClient}>{sale.client}</span>
                      {sale.total > 0 && <span style={styles.deliveryTotal}>R$ {sale.total.toFixed(2)}</span>}
                    </div>
                    <div style={styles.deliveryCardBody}>
                      <span>📅 Venda: {sale.date}</span>
                      {sale.deliveryDate && <span>🚚 Entrega: {formatDate(sale.deliveryDate)}</span>}
                      <span>🍦 {sale.items.map(it => `${it.flavorName} (${it.liters}L)`).join(", ")}</span>
                    </div>
                    <div style={styles.deliveryCta}>Clique para ver detalhes</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "sabores" && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Gerenciar Sabores</h2>
            <div style={styles.formRow}>
              <input style={styles.input} placeholder="Nome do sabor" value={newFlavorName} onChange={e => setNewFlavorName(e.target.value)} />
              <input style={styles.input} type="number" placeholder="Preço por litro (R$)" value={newFlavorPrice} onChange={e => setNewFlavorPrice(e.target.value)} />
              <button style={styles.btnPrimary} onClick={handleAddFlavor}>Adicionar</button>
            </div>
            <h3 style={styles.subTitle}>Sabores Cadastrados</h3>
            <div style={styles.flavorList}>
              {flavors.map(f => (
                <div key={f.id} style={styles.flavorCard}>
                  <div>
                    <span style={styles.flavorName}>{f.name}</span>
                    <span style={styles.flavorPrice}>R$ {f.pricePerLiter.toFixed(2)}/L</span>
                  </div>
                  <button style={styles.btnDanger} onClick={() => handleDeleteFlavor(f.id)} title="Excluir sabor">🗑️</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {selectedSale && (
        <div style={styles.overlay} onClick={() => setSelectedSale(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Detalhes da Venda</h3>
              <button style={styles.modalClose} onClick={() => setSelectedSale(null)}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.modalRow}><span style={styles.modalLabel}>Cliente</span><span>{selectedSale.client}</span></div>
              <div style={styles.modalRow}><span style={styles.modalLabel}>Data da Venda</span><span>{selectedSale.date}</span></div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>Data de Entrega</span>
                <span style={{ color: selectedSale.deliveryDate ? "#10b981" : "#9ca3af" }}>
                  {selectedSale.deliveryDate ? formatDate(selectedSale.deliveryDate) : "Não informada"}
                </span>
              </div>
              <div style={styles.modalDivider} />
              <span style={styles.modalLabel}>Itens do Pedido</span>
              {selectedSale.items.map((it, i) => (
                <div key={i} style={styles.modalItem}>
                  <span>🍦 {it.flavorName}</span>
                  <span>{it.liters}L</span>
                  {it.pricePerLiter != null ? (
                    <>
                      <span>× R$ {Number(it.pricePerLiter).toFixed(2)}/L</span>
                      <span>= R$ {(it.liters * it.pricePerLiter).toFixed(2)}</span>
                    </>
                  ) : (
                    <span style={{ color: "#9ca3af", fontStyle: "italic" }}>preço não informado</span>
                  )}
                </div>
              ))}
              <div style={styles.modalDivider} />
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>Total</span>
                <span style={styles.modalTotal}>
                  {selectedSale.total > 0 ? `R$ ${selectedSale.total.toFixed(2)}` : "-"}
                </span>
              </div>
              {selectedSale.note && (
                <div style={styles.modalRow}><span style={styles.modalLabel}>Obs.</span><span>{selectedSale.note}</span></div>
              )}
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnDanger} onClick={() => deleteSale(selectedSale.id)}>🗑️ Excluir</button>
              {!selectedSale.delivered && (
                <button style={styles.btnSuccess} onClick={() => markDelivered(selectedSale.id)}>✅ Marcar como Entregue</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

const styles = {
  app: { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI', sans-serif", color: "#1e293b" },
  header: { background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", padding: "0 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.15)" },
  headerInner: { maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 },
  logo: { display: "flex", alignItems: "center", gap: 10 },
  logoIcon: { fontSize: 28 },
  logoText: { color: "#fff", fontWeight: 700, fontSize: 20, letterSpacing: 0.5 },
  nav: { display: "flex", gap: 4 },
  navBtn: { background: "transparent", border: "none", color: "rgba(255,255,255,0.7)", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500, transition: "all 0.2s", position: "relative" },
  navBtnActive: { background: "rgba(255,255,255,0.2)", color: "#fff" },
  badge: { position: "absolute", top: 2, right: 2, background: "#ef4444", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 },
  main: { maxWidth: 960, margin: "0 auto", padding: "24px 16px" },
  summaryRow: { display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" },
  summaryCard: { flex: 1, minWidth: 160, background: "#fff", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", display: "flex", flexDirection: "column", gap: 4 },
  summaryLabel: { fontSize: 12, color: "#64748b", fontWeight: 500 },
  summaryValue: { fontSize: 22, fontWeight: 700, color: "#1e3a5f" },
  section: { background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.07)" },
  sectionTitle: { fontSize: 20, fontWeight: 700, marginBottom: 20, color: "#1e3a5f" },
  subTitle: { fontSize: 16, fontWeight: 600, margin: "24px 0 12px", color: "#334155" },
  formRow: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 },
  formCol: { display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 4, flex: 1 },
  label: { fontSize: 12, color: "#64748b", fontWeight: 500 },
  input: { padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", flex: 1, minWidth: 120, background: "#f8fafc" },
  optionalField: { position: "relative", display: "flex", alignItems: "center" },
  optionalTag: { position: "absolute", right: 10, fontSize: 10, color: "#94a3b8", fontStyle: "italic", pointerEvents: "none" },
  btnPrimary: { padding: "9px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 },
  btnSecondary: { padding: "8px 16px", background: "#f1f5f9", color: "#334155", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 500, fontSize: 14, alignSelf: "flex-start" },
  btnDanger: { padding: "8px 14px", background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 },
  btnSuccess: { padding: "9px 20px", background: "#10b981", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 },
  itemTotal: { fontSize: 14, fontWeight: 600, color: "#2563eb", minWidth: 80, textAlign: "right" },
  saleFooter: { display: "flex", justifyContent: "flex-end", alignItems: "center" },
  totalLabel: { fontSize: 16, color: "#1e3a5f" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "10px 12px", background: "#f1f5f9", fontSize: 12, fontWeight: 600, color: "#64748b", borderBottom: "1px solid #e2e8f0" },
  tr: { borderBottom: "1px solid #f1f5f9" },
  td: { padding: "10px 12px", fontSize: 14, color: "#334155" },
  empty: { color: "#94a3b8", fontSize: 14, textAlign: "center", padding: "32px 0" },
  hint: { fontSize: 13, color: "#64748b", marginBottom: 16 },
  badgeGreen: { background: "#d1fae5", color: "#065f46", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  badgeYellow: { background: "#fef3c7", color: "#92400e", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  deliveryList: { display: "flex", flexDirection: "column", gap: 12 },
  deliveryCard: { background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: 16, cursor: "grab", transition: "box-shadow 0.2s", userSelect: "none" },
  deliveryCardHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 8 },
  deliveryNum: { background: "#2563eb", color: "#fff", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 },
  deliveryClient: { fontWeight: 700, fontSize: 15, color: "#1e3a5f", flex: 1 },
  deliveryTotal: { fontWeight: 700, color: "#10b981", fontSize: 15 },
  deliveryCardBody: { display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13, color: "#475569", marginBottom: 8 },
  deliveryCta: { fontSize: 12, color: "#2563eb", fontWeight: 500 },
  flavorList: { display: "flex", flexDirection: "column", gap: 10 },
  flavorCard: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "12px 16px" },
  flavorName: { fontWeight: 600, fontSize: 15, color: "#1e3a5f", marginRight: 16 },
  flavorPrice: { fontSize: 13, color: "#64748b" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  modal: { background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 8px 40px rgba(0,0,0,0.2)", overflow: "hidden" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#1e3a5f" },
  modalTitle: { color: "#fff", fontWeight: 700, fontSize: 17 },
  modalClose: { background: "transparent", border: "none", color: "#fff", fontSize: 18, cursor: "pointer" },
  modalBody: { padding: 20, display: "flex", flexDirection: "column", gap: 10 },
  modalRow: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 },
  modalLabel: { color: "#64748b", fontWeight: 600, fontSize: 13 },
  modalItem: { display: "flex", justifyContent: "space-between", background: "#f8fafc", padding: "8px 12px", borderRadius: 8, fontSize: 13, flexWrap: "wrap", gap: 8 },
  modalTotal: { fontWeight: 700, fontSize: 18, color: "#2563eb" },
  modalDivider: { height: 1, background: "#e2e8f0", margin: "4px 0" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 20px", borderTop: "1px solid #f1f5f9" },
};
