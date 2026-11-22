/* ==========================================================================
   BRANDS PAGE  (Role 4, Brands & Partners Developer)
   brands.html            every brand on DripDash
   brands.html?slug=...   one brand: its story, its returns and its products
   #partner               the "Sell on DripDash" request form
   ========================================================================== */
const ui = DD.ui;
const api = DD.api;

function brandCard(b) {
  return `
    <a class="brand-card card card-link" href="${ui.link("brands.html", { slug: b.slug })}" style="--c:${ui.esc(b.colour)}">
      <div class="cover"><img src="${ui.esc(b.cover)}" alt="" loading="lazy"></div>
      <div class="body">
        <span class="pill${b.seller_type === "unverified" ? " warn" : ""}">${ui.esc(b.seller_label)}</span>
        <h3>${ui.esc(b.name)}</h3>
        <p class="muted small">${ui.esc(b.tagline)}</p>
        <p class="small faint">${ui.plural(b.product_count, "piece")}, ${b.tryon_count} with Try-On</p>
      </div>
    </a>`;
}

async function showAll() {
  const view = ui.$("#view");
  try {
    const data = await api.brands();
    view.innerHTML = `
      <div class="wrap">
        <div class="page-head">
          <nav class="crumbs"><a href="index.html">Home</a><span>/</span><span>Brands</span></nav>
          <h1>Brands</h1>
          <p class="lead">Every brand says how it sells: an official store, an authorised retailer, an affiliate listing, or an independent seller we have not verified yet.</p>
        </div>
        <div class="grid grid-3">${data.brands.map(brandCard).join("")}</div>
      </div>`;
  } catch (err) {
    ui.problem(view, err);
  }
}

async function showBrand(slug) {
  const view = ui.$("#view");
  try {
    const { brand, products } = await api.brand(slug);
    document.title = `${brand.name} | DripDash`;
    view.innerHTML = `
      <section class="brand-hero" style="--c:${ui.esc(brand.colour)}">
        <div class="wrap">
          <nav class="crumbs"><a href="index.html">Home</a><span>/</span><a href="brands.html">Brands</a><span>/</span><span>${ui.esc(brand.name)}</span></nav>
          <span class="pill${brand.seller_type === "unverified" ? " warn" : " green"}">${ui.icon("shield")}${ui.esc(brand.seller_label)}</span>
          <h1>${ui.esc(brand.name)}</h1>
          <p class="lead">${ui.esc(brand.tagline)}</p>
          <p class="muted about">${ui.esc(brand.about)}</p>
          <p class="small faint">Since ${ui.esc(brand.since)}, ${ui.esc(brand.city)}</p>
        </div>
      </section>
      <div class="wrap section tight">
        <div class="row between" style="margin-bottom:22px"><h2>The collection</h2><span class="muted small">${ui.plural(products.length, "piece")}</span></div>
        <div class="grid grid-4">${products.map((p) => ui.productCard(p)).join("")}</div>
        <p class="notice" style="margin-top:28px">${ui.icon("shield")}<span><strong>Returns:</strong> ${ui.esc(brand.returns)}</span></p>
      </div>`;
  } catch (err) {
    view.innerHTML = '<div class="wrap section"></div>';
    ui.problem(ui.$("#view .wrap"), err);
  }
}

ui.$("#partnerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  ui.clearErrors(form);
  ui.busy(button, true);
  try {
    const data = await api.applyPartner(ui.values(form));
    form.outerHTML = `<div class="notice volt">${ui.icon("check-circle")}<span><strong>Request sent. Reference ${ui.esc(data.reference)}.</strong> ${ui.esc(data.next)}</span></div>`;
  } catch (err) {
    ui.showError(form, err);
    ui.busy(button, false);
  }
});

const slug = ui.param("slug");
if (slug) showBrand(slug); else showAll();
