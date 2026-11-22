/* ==========================================================================
   CHECKOUT  (Role 11, Checkout Developer)
   Delivery details, the total checked again by the API, and the order.
   PRD COM-03: the shopper sees the whole total (items + delivery) and the
   refund rules BEFORE they confirm. The pilot has no live payment provider,
   so the API takes a test payment and says so.
   ========================================================================== */
const ui = DD.ui;
const api = DD.api;
let quote = null;

async function load() {
  try {
    const data = await api.checkoutQuote("");
    quote = data;
    if (!data.items.length) { ui.go("bag.html"); return; }
    ui.$("#area").innerHTML = '<option value="">Choose where we deliver</option>' + data.areas.map((a) =>
      `<option value="${ui.esc(a.key)}">${ui.esc(a.name)} (${ui.money(a.fee)}, ${ui.esc(a.days)})</option>`).join("");
    ui.$("#methods").innerHTML = data.payment_methods.map((m, i) =>
      `<label class="pay"><input type="radio" name="payment_method" value="${ui.esc(m.key)}"${i === 0 ? " checked" : ""}> <span>${ui.esc(m.name)}</span></label>`).join("");
    ui.$("#pilotNote").innerHTML = `${ui.icon("info")}<span>${ui.esc(data.pilot_note)}</span>`;
    const me = api.cachedMe();
    if (me) { ui.$("#name").value = me.name || ""; ui.$("#phone").value = me.phone || ""; }
    showSummary(data);
  } catch (err) {
    ui.problem(ui.$("#checkout"), err);
  }
}

/* The order summary on the right (given). */
function showSummary(data) {
  const t = data.totals;
  ui.$("#summary").innerHTML = `
    <h3>Your order</h3>
    <ul class="mini">${data.items.map((i) => `
      <li><img src="${ui.esc(i.product.image)}" alt=""><span><b>${ui.esc(i.product.name)}</b><span class="small faint">${ui.esc(i.colour_name)}, ${ui.esc(i.size)} × ${i.qty}</span></span><span class="money">${ui.esc(i.line_total_label)}</span></li>`).join("")}</ul>
    <div class="sum-row"><span>Subtotal</span><span class="money">${ui.esc(t.subtotal_label)}</span></div>
    <div class="sum-row"><span>Delivery${t.area ? `, ${ui.esc(t.area.days)}` : ""}</span><span class="money">${ui.esc(t.delivery_label)}</span></div>
    <div class="sum-row total"><span>Total</span><span class="money">${t.delivery_fee === null ? "Choose an area" : ui.esc(t.total_label)}</span></div>
    <p class="small faint">${ui.esc(data.returns_policy)}</p>`;
}

ui.$("#area").addEventListener("change", async (e) => {
  try {
    quote = await api.checkoutQuote(e.target.value);
    showSummary(quote);
  } catch (err) {
    ui.toast(err.message);
  }
});

let acceptChanges = false;
ui.$("#orderForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const button = ui.$("#payBtn");
  ui.clearErrors(form);
  ui.busy(button, true);
  const v = ui.values(form);
  try {
    const data = await api.checkout({
      delivery: { name: v.name, phone: v.phone, address: v.address, area: v.area, note: v.note },
      payment_method: v.payment_method, expected_total: quote.totals.delivery_fee === null ? "" : quote.totals.total,
      accept_price_changes: acceptChanges,
    });
    ui.$("#checkout").outerHTML = showDone(data.order, data.next);
    ui.refreshCounts();
  } catch (err) {
    ui.busy(button, false);
    if (err.data && err.data.price_changes) {
      const yes = await ui.confirm({ title: "Some prices changed", text: "A price in your bag changed since you added it. Check the new total and confirm.", ok: "Pay the new total" });
      if (yes) {
        acceptChanges = true;
        quote = await api.checkoutQuote(v.area);
        showSummary(quote);
        form.requestSubmit();
      }
      return;
    }
    if (err.data && err.data.totals) {
      quote.totals = err.data.totals;
      showSummary(quote);
      ui.toast(err.message);
      return;
    }
    ui.showError(form, err);
  }
});

/* The thank-you panel (given). */
function showDone(order, next) {
  return `<section class="done card pad-lg">
    <div class="icon-tile">${ui.icon("check-circle")}</div>
    <p class="eyebrow">Order placed</p>
    <h2>Thank you. You are fresh.</h2>
    <p class="ref">${ui.esc(order.reference)}</p>
    <p class="muted">${ui.esc(next)}</p>
    <p class="small faint">${ui.plural(order.item_count, "item")}, ${ui.esc(order.total_label)} paid (pilot test payment).</p>
    <div class="row"><a class="btn" href="${ui.link("orders.html", { ref: order.reference })}">Track this order</a><a class="btn btn-ghost" href="shop.html">Keep shopping</a></div>
  </section>`;
}

if (ui.needSignIn("bag")) load();
