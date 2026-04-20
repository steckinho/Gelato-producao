import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { ref, onValue, push, set, remove, update } from "firebase/database";

export default function App() {
  const [tab, setTab] = useState("vendas");

  const [products, setProducts] = useState({});
  const [orders, setOrders] = useState([]);
  const [stock, setStock] = useState({});

  const [newProduct, setNewProduct] = useState("");
  const [category, setCategory] = useState("Sorvetes");

  const [selectedOrder, setSelectedOrder] = useState(null);

  const [sale, setSale] = useState({
    customer: "",
    items: [],
    deliveryDate: "",
  });

  // 🔥 LOAD DATA
  useEffect(() => {
    onValue(ref(db, "products"), (snap) => {
      setProducts(snap.val() || {});
    });

    onValue(ref(db, "orders"), (snap) => {
      const data = snap.val() || {};
      setOrders(Object.entries(data).map(([id, v]) => ({ id, ...v })));
    });

    onValue(ref(db, "stock"), (snap) => {
      setStock(snap.val() || {});
    });
  }, []);

  // ➕ ADD PRODUCT
  const addProduct = () => {
    if (!newProduct) return;
    const path = `products/${category}`;
    push(ref(db, path), { name: newProduct });
    set(ref(db, `stock/${newProduct}`), 0);
    setNewProduct("");
  };

  // ❌ REMOVE PRODUCT
  const removeProduct = (cat, id, name) => {
    remove(ref(db, `products/${cat}/${id}`));
    remove(ref(db, `stock/${name}`));
  };

  // 🛒 ADD SALE
  const addSale = () => {
    const newOrder = {
      ...sale,
      date: new Date().toISOString(),
      delivered: false,
    };

    const refOrder = push(ref(db, "orders"), newOrder);

    // update stock
    sale.items.forEach((item) => {
      const current = stock[item.name] || 0;
      set(ref(db, `stock/${item.name}`), current - item.qty);
    });

    setSale({ customer: "", items: [], deliveryDate: "" });
  };

  // 🚚 MARK DELIVERED
  const markDelivered = (id) => {
    update(ref(db, `orders/${id}`), { delivered: true });
  };

  // 📋 DELIVERY LIST
  const deliveries = orders
    .filter((o) => !o.delivered)
    .sort((a, b) => new Date(a.deliveryDate) - new Date(b.deliveryDate));

  // 🔀 MANUAL ORDER
  const moveOrder = (index, dir) => {
    const newList = [...deliveries];
    const target = index + dir;
    if (target < 0 || target >= newList.length) return;

    [newList[index], newList[target]] = [newList[target], newList[index]];
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Controle de Sorvetes</h1>

      {/* HEADER */}
      <div>
        <button onClick={() => setTab("vendas")}>Vendas</button>
        <button onClick={() => setTab("entregas")}>Entregas</button>
        <button onClick={() => setTab("produtos")}>Produtos</button>
        <button onClick={() => setTab("estoque")}>Estoque</button>
      </div>

      {/* VENDAS */}
      {tab === "vendas" && (
        <>
          <h2>Nova Venda</h2>

          <input
            placeholder="Cliente"
            value={sale.customer}
            onChange={(e) =>
              setSale({ ...sale, customer: e.target.value })
            }
          />

          <input
            type="date"
            value={sale.deliveryDate}
            onChange={(e) =>
              setSale({ ...sale, deliveryDate: e.target.value })
            }
          />

          <button onClick={addSale}>Salvar Venda</button>

          <h2>Lista de Vendas</h2>
          {orders.map((o) => (
            <div
              key={o.id}
              onClick={() => setSelectedOrder(o)}
              style={{
                border: "1px solid",
                margin: 5,
                padding: 10,
                background: o.delivered ? "#d1fae5" : "#fee2e2",
              }}
            >
              {o.customer} - {o.deliveryDate}
            </div>
          ))}
        </>
      )}

      {/* MODAL */}
      {selectedOrder && (
        <div style={{ background: "#000000aa", padding: 20 }}>
          <div style={{ background: "#fff", padding: 20 }}>
            <h2>Detalhes</h2>
            <p>Cliente: {selectedOrder.customer}</p>
            <p>Entrega: {selectedOrder.deliveryDate}</p>
            <p>Status: {selectedOrder.delivered ? "Entregue" : "Pendente"}</p>

            {selectedOrder.items?.map((i, idx) => (
              <p key={idx}>
                {i.name} - {i.qty}
              </p>
            ))}

            {!selectedOrder.delivered && (
              <button onClick={() => markDelivered(selectedOrder.id)}>
                Marcar como entregue
              </button>
            )}

            <button onClick={() => setSelectedOrder(null)}>Fechar</button>
          </div>
        </div>
      )}

      {/* ENTREGAS */}
      {tab === "entregas" && (
        <>
          <h2>Entregas Pendentes</h2>

          {deliveries.map((o, i) => (
            <div key={o.id} style={{ border: "1px solid", margin: 5 }}>
              {o.customer} - {o.deliveryDate}

              <button onClick={() => moveOrder(i, -1)}>↑</button>
              <button onClick={() => moveOrder(i, 1)}>↓</button>

              <button onClick={() => markDelivered(o.id)}>
                Entregue
              </button>
            </div>
          ))}
        </>
      )}

      {/* PRODUTOS */}
      {tab === "produtos" && (
        <>
          <h2>Produtos</h2>

          <input
            placeholder="Novo produto"
            value={newProduct}
            onChange={(e) => setNewProduct(e.target.value)}
          />

          <button onClick={addProduct}>Adicionar</button>

          {Object.entries(products).map(([cat, list]) => (
            <div key={cat}>
              <h3>{cat}</h3>
              {Object.entries(list).map(([id, p]) => (
                <div key={id}>
                  {p.name}
                  <button onClick={() => removeProduct(cat, id, p.name)}>
                    Excluir
                  </button>
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      {/* ESTOQUE */}
      {tab === "estoque" && (
        <>
          <h2>Estoque</h2>

          {Object.entries(stock).map(([name, qty]) => (
            <div key={name}>
              {name}: {qty}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
