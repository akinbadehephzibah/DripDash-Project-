/* ==========================================================================
   BAG  (Role 10, Bag Developer)
   What the shopper is about to buy on DripDash. The API checks every line
   again (still sold? enough stock? same price?) each time the bag loads.
   ========================================================================== */
const ui = DD.ui;
const api = DD.api;
let bag = null;

function line(item) {
  const href = ui.link("product.html", { slug: item.product.slug, colour: item.colour });
  return `
    <article class="line${item.problem ? " has-problem" : ""}" data-id="${item.id}">
      <a class="line-img" href="${href}"><img src="${ui.esc(item.product.image)}" alt=""></a>
      <div class="line-info">
        <span class="small faint">${ui.esc(item.product.brand.name)}</span>
        <a class="line-name" href="${href}">${ui.esc(item.product.name)}</a>
        <span class="small muted">${ui.esc(item.colour_name)}, size ${ui.esc(item.size)} · ${ui.esc(item.unit_price_label)} each</span>
        ${item.problem ? `<p class="notice error small">${ui.icon("alert")}<span>${ui.esc(item.problem)}</span></p>` : ""}
      </div>
      <div class="qty" role="group" aria-label="Quantity">
        <button type="button" data-qty="-1" aria-label="One less">${ui.icon("minus")}</button>
        <span>${item.qty}</span>
        <button type="button" data-qty="1" aria-label="One more"${item.qty >= item.stock ? " disabled" : ""}>${ui.icon("plus")}</button>
      </div>
      <span class="money line-total">${ui.esc(item.line_total_label)}</span>
      <button class="icon-btn" type="button" data-remove aria-label="Remove ${ui.esc(item.product.name)}">${ui.icon("trash")}</button>
    </article>`;
}

/* Put the whole bag on the page (given). */
function render(data) {
  bag = data;
  const lines = ui.$("#lines");
  if (!data.items.length) {
    ui.$("#bag").classList.add("is-empty");
    ui.empty(lines, "Your bag is empty", "Find something you love, or try it on first.", "bag", ["Start shopping", "shop.html"]);
    ui.$("#summary").innerHTML = "";
    ui.$("#notices").innerHTML = "";
    return;
  }
  ui.$("#bag").classList.remove("is-empty");
  lines.innerHTML = data.items.map(line).join("");
  ui.$("#notices").innerHTML = (data.price_changes || []).map((c) =>
    `<p class="notice warn">${ui.icon("tag")}<span><strong>${ui.esc(c.name)}</strong> is now ${ui.esc(c.now_label)} (was ${ui.esc(c.was_label)} when you added it).</span></p>`).join("");
  summary(data);
}

ui.$("#lines").addEventListener("click", async (e) => {
  const button = e.target.closest("[data-qty], [data-remove]");
  if (!button) return;
  const item = bag.items.find((i) => i.id === Number(button.closest(".line").dataset.id));
  button.disabled = true;
  try {
    let data;
    if (button.hasAttribute("data-remove")) {
      data = await api.removeFromBag(item.id);
      ui.toast("Removed from your bag");
    } else {
      data = await api.setQty(item.id, item.qty + Number(button.dataset.qty));
    }
    render(data);
    ui.refreshCounts();
  } catch (err) {
    ui.toast(err.message);
    button.disabled = false;
  }
});

function summary(data) {
  const t = data.totals;
  const pct = Math.min(100, Math.round((t.subtotal / t.free_delivery_from) * 100));
  ui.$("#summary").innerHTML = `
    <h3>Summary</h3>
    <div class="sum-row"><span>Subtotal (${ui.plural(t.items, "item")})</span><b class="money">${ui.esc(t.subtotal_label)}</b></div>
    <div class="sum-row"><span>Delivery</span><span class="muted">Worked out at checkout</span></div>
    <div class="free">
      ${t.to_free_delivery > 0
        ? `<p class="small">Add <b>${ui.money(t.to_free_delivery)}</b> more for free delivery.</p>`
        : `<p class="small volt">${ui.icon("check")} You get free delivery.</p>`}
      <div class="progress"><span style="width:${pct}%"></span></div>
    </div>
    <a class="btn btn-lg btn-block${data.can_checkout ? "" : " is-disabled"}" href="checkout.html"${data.can_checkout ? "" : ' aria-disabled="true"'}>Checkout ${ui.icon("arrow")}</a>
    ${data.can_checkout ? "" : '<p class="small" style="color:var(--danger)">Fix the items marked in red first.</p>'}
    <p class="small faint">${ui.icon("lock")} ${ui.esc(data.returns_policy)}</p>`;
  const go = ui.$("#summary .btn");
  if (!data.can_checkout) go.addEventListener("click", (e) => e.preventDefault());
}

async function load() {
  ui.$("#lines").innerHTML = '<div class="skeleton" style="height:120px"></div><div class="skeleton" style="height:120px;margin-top:12px"></div>';
  try {
    render(await api.bag());
  } catch (err) {
    ui.problem(ui.$("#lines"), err);
  }
}

if (ui.needSignIn("bag")) load();
