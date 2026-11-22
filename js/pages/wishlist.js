/* ==========================================================================
   WISHLIST  (Role 9, Wishlist Developer)
   The products a shopper saved with the heart, with quick actions:
   try it on, view it, or remove it (with an Undo).
   ========================================================================== */
const ui = DD.ui;
const api = DD.api;
let items = [];
let view = "all";

async function load() {
  const grid = ui.$("#grid");
  ui.loading(grid, 4);
  try {
    const data = await api.wishlist();
    items = data.items;
    render();
  } catch (err) {
    ui.problem(grid, err);
  }
}

function render() {
  const grid = ui.$("#grid");
  const list = items.filter(keep);
  const tryable = items.filter((p) => p.tryon.available).length;
  ui.$("#summary").textContent = items.length
    ? `${ui.plural(items.length, "piece")} saved, ${tryable} you can try on.`
    : "The pieces you saved for later.";
  if (!list.length) {
    if (items.length) ui.empty(grid, "Nothing in this view", "Try another tab.", "filter");
    else ui.empty(grid, "Nothing saved yet", "Tap the heart on any piece to keep it here.", "heart", ["Start shopping", "shop.html"]);
    return;
  }
  grid.innerHTML = list.map((p) => `
    <div class="wish">
      ${ui.productCard(p, { fav: false })}
      <div class="wish-actions">
        ${p.tryon.available
          ? `<a class="btn btn-sm" href="${ui.link("tryon.html", { product: p.slug })}">${ui.icon("sparkle")} Try on</a>`
          : `<a class="btn btn-sm btn-dark" href="${ui.link("product.html", { slug: p.slug })}">View</a>`}
        <button class="icon-btn" type="button" data-remove="${ui.esc(p.slug)}" aria-label="Remove ${ui.esc(p.name)}">${ui.icon("trash")}</button>
      </div>
    </div>`).join("");
}

ui.$("#grid").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-remove]");
  if (!b) return;
  const slug = b.dataset.remove;
  const index = items.findIndex((p) => p.slug === slug);
  const removed = items[index];
  items.splice(index, 1);
  render();
  try {
    await api.unwish(slug);
    ui.refreshCounts();
    ui.toast(`Removed ${removed.name}`);
    const toast = ui.$(".toast");
    const undo = document.createElement("button");
    undo.className = "undo";
    undo.type = "button";
    undo.textContent = "Undo";
    toast.appendChild(undo);
    undo.addEventListener("click", async () => {
      await api.wish(slug);
      items.splice(index, 0, removed);
      render();
      ui.refreshCounts();
      toast.classList.remove("on");
    });
  } catch (err) {
    items.splice(index, 0, removed);
    render();
    ui.toast(err.message);
  }
});

function keep(p) {
  if (view === "tryon") return p.tryon.available;
  if (view === "sale") return !!p.was_price;
  if (view === "stock") return p.stock_status !== "out_of_stock";
  return true;
}
ui.$("#tabs").addEventListener("click", (e) => {
  const b = e.target.closest(".chip");
  if (!b) return;
  ui.$$("#tabs .chip").forEach((c) => c.classList.toggle("on", c === b));
  view = b.dataset.view;
  render();
});

if (ui.needSignIn("save")) load();
