/* ==========================================================================
   HOME PAGE  (Role 1, Lead Developer)
   Fills the hero numbers, the category tiles, the featured products and the
   brand strip, all from the real DripDash API.
   ========================================================================== */
const ui = DD.ui;
const api = DD.api;

/* Category tiles (given: you do not need to change this). */
async function loadCategories() {
  const box = ui.$("#categories");
  try {
    const data = await api.categories();
    box.innerHTML = data.categories.map((c) => `
      <a class="cat" href="${ui.link("shop.html", { category: c.key })}">
        <img src="${ui.esc(c.image)}" alt="" loading="lazy">
        <span class="cat-name">${ui.esc(c.name)}</span>
        <span class="cat-count">${ui.plural(c.count, "piece")}</span>
      </a>`).join("");
  } catch (err) {
    ui.problem(box, err);
  }
}

async function loadFeatured() {
  const grid = ui.$("#featured");
  ui.loading(grid, 8);
  try {
    const data = await api.products({ sort: "featured", per: 8 });
    grid.innerHTML = data.products.map((p) => ui.productCard(p)).join("");
  } catch (err) {
    ui.problem(grid, err);
  }
}

async function loadStats() {
  try {
    const data = await api.stats();
    ui.$$("#stats [data-stat]").forEach((dd) => {
      const n = data[dd.dataset.stat];
      if (n != null) dd.textContent = Number(n).toLocaleString();
    });
  } catch (err) {
    /* the dashes stay */
  }
}

/* The brand strip (given). */
async function loadBrands() {
  const strip = ui.$("#brands");
  try {
    const data = await api.brands();
    strip.innerHTML = data.brands.map((b) =>
      `<a href="${ui.link("brands.html", { slug: b.slug })}" style="--c:${ui.esc(b.colour)}">${ui.esc(b.name)}</a>`).join("");
  } catch (err) {
    strip.hidden = true;
  }
}

loadStats();
loadCategories();
loadFeatured();
loadBrands();
