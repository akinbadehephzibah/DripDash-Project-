/* ==========================================================================
   ORDERS  (Role 12, Orders Developer)
   orders.html            every order the shopper placed on DripDash
   orders.html?ref=DD-... one order: the delivery tracker, the timeline,
                          the items, and cancel or return when allowed
   ========================================================================== */
const ui = DD.ui;
const api = DD.api;
const TONE = { placed: "info", confirmed: "info", packed: "wait", out_for_delivery: "wait", delivered: "good",
               cancelled: "bad", return_requested: "wait", refunded: "bad" };

async function showList() {
  const view = ui.$("#view");
  ui.loading(view, 1, false);
  try {
    const data = await api.orders();
    if (!data.orders.length) {
      ui.empty(view, "No orders yet", "When you buy on DripDash, your orders show here.", "box", ["Start shopping", "shop.html"]);
      return;
    }
    view.innerHTML = `<div class="order-list">${data.orders.map((o) => `
      <a class="order-row card card-link" href="${ui.link("orders.html", { ref: o.reference })}">
        <div class="thumbs">${o.items.slice(0, 3).map((i) => `<img src="${ui.esc(i.image)}" alt="">`).join("")}</div>
        <div class="order-id"><b>${ui.esc(o.reference)}</b><span class="small faint">${ui.date(o.created_at)}, ${ui.plural(o.item_count, "item")}</span></div>
        <span class="status ${TONE[o.status] || "info"}">${ui.esc(o.status_label)}</span>
        <span class="money">${ui.esc(o.total_label)}</span>
      </a>`).join("")}</div>`;
  } catch (err) {
    ui.problem(view, err);
  }
}

async function showOrder(ref) {
  const view = ui.$("#view");
  ui.loading(view, 1, false);
  try {
    const { order } = await api.order(ref);
    ui.$("#title").textContent = `Order ${order.reference}`;
    ui.$("#crumbs").innerHTML += `<span>/</span><span>${ui.esc(order.reference)}</span>`;
    const stopped = order.status === "cancelled" || order.status === "refunded";
    view.innerHTML = `
      <div class="order-grid">
        <section class="card pad-lg stack-lg">
          <div class="row between"><span class="status ${TONE[order.status] || "info"}">${ui.esc(order.status_label)}</span><span class="small faint">Placed ${ui.time(order.created_at)}</span></div>
          ${stopped ? `<p class="notice error">${ui.icon("info")}<span>This order was ${ui.esc(order.status_label.toLowerCase())}. Any payment is refunded.</span></p>`
            : `<ol class="tracker">${order.steps.map((s) => `<li class="${s.done ? "done" : ""}"><span class="dot"></span><b>${ui.esc(s.label)}</b></li>`).join("")}</ol>`}
          <div><h3>History</h3><ul class="timeline">${order.timeline.slice().reverse().map((t) => `
            <li><b>${ui.esc(t.label)}</b><span class="small faint">${ui.time(t.at)}</span>${t.note ? `<span class="small muted">${ui.esc(t.note)}</span>` : ""}</li>`).join("")}</ul></div>
        </section>
        <aside class="card pad stack">
          <h3>Items</h3>
          <ul class="mini">${order.items.map((i) => `
            <li><img src="${ui.esc(i.image)}" alt=""><span><a href="${ui.link("product.html", { slug: i.slug, colour: i.colour_key })}"><b>${ui.esc(i.name)}</b></a>
              <span class="small faint">${ui.esc(i.colour)}, ${ui.esc(i.size)} × ${i.qty}</span></span><span class="money">${ui.esc(i.line_total_label)}</span></li>`).join("")}</ul>
          <div class="sum-row"><span>Subtotal</span><span class="money">${ui.esc(order.subtotal_label)}</span></div>
          <div class="sum-row"><span>Delivery</span><span class="money">${ui.esc(order.delivery_label)}</span></div>
          <div class="sum-row total"><span>Total</span><span class="money">${ui.esc(order.total_label)}</span></div>
          <hr class="divider">
          <h4>Delivering to</h4>
          <p class="muted small">${ui.esc(order.delivery.name)}<br>${ui.esc(order.delivery.address || "")}<br>${ui.esc(order.area ? order.area.name : "")}</p>
          <div id="orderActions"></div>
        </aside>
      </div>`;
    showActions(order);
  } catch (err) {
    ui.problem(view, err);
  }
}

function showActions(order) {
  const box = ui.$("#orderActions");
  box.innerHTML = (order.can_cancel ? `<button class="btn btn-danger btn-block" type="button" id="cancelBtn">Cancel this order</button>` : "") +
    (order.can_return ? `<button class="btn btn-ghost btn-block" type="button" id="returnBtn">Return items</button>` : "") +
    (!order.can_cancel && !order.can_return ? '<p class="small faint">Need help with this order? hello@dripdash.ng</p>' : "");
  const again = () => { ui.$("#crumbs").innerHTML = '<a href="index.html">Home</a><span>/</span><a href="orders.html">Orders</a>'; showOrder(order.reference); };
  const cancel = ui.$("#cancelBtn");
  if (cancel) cancel.addEventListener("click", async () => {
    if (!(await ui.confirm({ title: "Cancel this order?", text: "You get a full refund to the way you paid.", ok: "Cancel order", danger: true }))) return;
    try { await api.cancelOrder(order.reference); ui.toast("Order cancelled"); again(); } catch (err) { ui.toast(err.message); }
  });
  const ret = ui.$("#returnBtn");
  if (ret) ret.addEventListener("click", async () => {
    const reason = prompt("Why are you returning it? (for example: too small)");
    if (!reason) return;
    try { const d = await api.returnOrder(order.reference, reason); ui.toast(d.next); again(); } catch (err) { ui.toast(err.message); }
  });
}

if (ui.needSignIn("orders")) {
  const ref = ui.param("ref");
  if (ref) showOrder(ref); else showList();
}
