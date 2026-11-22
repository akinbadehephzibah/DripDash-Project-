/* ==========================================================================
   PRODUCT PAGE  (Role 3, Product Page Developer)
   product.html?slug=kora-wrap-dress&colour=coral
   The gallery, the colour and size pickers, an honest availability line,
   who takes the payment, Add to bag (or Shop at the partner store), the
   wishlist heart and the Try-On button.
   ========================================================================== */
const ui = DD.ui;
const api = DD.api;
let product = null;
let colour = null;     // the colour key picked, e.g. "coral"
let size = null;       // the size picked, e.g. "M"

/* The page skeleton for one product (given). Your steps fill its parts. */
function layout(p) {
  return `
    <div class="gallery">
      <div class="main-img"><img id="mainImg" alt=""></div>
      <div class="thumbs" id="thumbs"></div>
    </div>
    <div class="buy">
      <a class="brand-line" href="${ui.link("brands.html", { slug: p.brand.slug })}">${ui.esc(p.brand.name)}</a>
      <span class="pill ${p.brand.seller_type === "unverified" ? "warn" : "green"}">${ui.icon("shield")}${ui.esc(p.brand.seller_label)}</span>
      <h1 class="pdp-title">${ui.esc(p.name)}</h1>
      <p class="price-line"><span class="money">${ui.esc(p.price_label)}</span>${p.was_price ? ` <span class="strike">${ui.esc(p.was_price_label)}</span>` : ""}</p>
      <p class="muted">${ui.esc(p.summary)}</p>
      <div class="picker"><p class="label">Colour: <span id="colourName"></span></p><div class="options" id="colours"></div></div>
      <div class="picker"><p class="label">Size <span class="faint">(${ui.esc(p.fit || "")})</span></p><div class="options" id="sizes"></div></div>
      <p class="avail" id="avail"></p>
      <div class="actions" id="actions"></div>
      <div id="tryonBox"></div>
      <div class="paid-by"><span class="small">${ui.icon("lock")} ${ui.esc(p.purchase.note)}</span></div>
      <details class="more" open><summary>Details</summary><ul>${p.details.map((d) => `<li>${ui.esc(d)}</li>`).join("")}</ul></details>
      <details class="more"><summary>Returns</summary><p class="muted small">${ui.esc(p.returns)}</p></details>
      <details class="more"><summary>About the try-on</summary><p class="muted small">${ui.esc(p.disclaimer)}</p></details>
    </div>`;
}

function showGallery() {
  const pics = product.gallery.filter((g) => g.colour === colour);
  const main = ui.$("#mainImg");
  main.src = pics[0].url;
  main.alt = pics[0].alt;
  ui.$("#thumbs").innerHTML = pics.map((g, i) =>
    `<button class="thumb${i === 0 ? " on" : ""}" type="button" data-src="${ui.esc(g.url)}" aria-label="${ui.esc(g.alt)}"><img src="${ui.esc(g.url)}" alt=""></button>`).join("");
}

function showColours() {
  ui.$("#colours").innerHTML = product.colours.map((c) => `
    <label class="option swatch-option" title="${ui.esc(c.name)}">
      <input type="radio" name="colour" value="${ui.esc(c.key)}"${c.key === colour ? " checked" : ""} aria-label="${ui.esc(c.name)}">
      <span style="--c:${ui.esc(c.hex)}"></span>
    </label>`).join("");
  ui.$("#colourName").textContent = product.colours.find((c) => c.key === colour).name;
}

function wireGallery() {
  ui.$("#thumbs").addEventListener("click", (e) => {
    const b = e.target.closest(".thumb");
    if (!b) return;
    ui.$("#mainImg").src = b.dataset.src;
    ui.$$(".thumb").forEach((t) => t.classList.toggle("on", t === b));
    api.track("gallery", { product: product.slug });
  });
  ui.$("#colours").addEventListener("change", (e) => {
    colour = e.target.value;
    size = null;
    showGallery();
    showColours();
    showSizes();
    showTryOn();
  });
}

function showSizes() {
  const variants = product.variants.filter((v) => v.colour === colour);
  ui.$("#sizes").innerHTML = variants.map((v) => `
    <label class="option" title="${ui.esc(v.label)}">
      <input type="radio" name="size" value="${ui.esc(v.size)}" data-variant="${v.id}"${v.available ? "" : " disabled"}${v.size === size ? " checked" : ""}>
      <span>${ui.esc(v.size)}</span>
    </label>`).join("");
  const a = product.availability;
  const any = variants.some((v) => v.available);
  ui.$("#avail").innerHTML = `<span class="status ${any ? (a.status === "low_stock" ? "wait" : "good") : "bad"}">${any ? ui.esc(a.label) : "Out of stock in this colour"}</span>` +
    (a.stale ? ` <span class="pill warn">${ui.icon("clock")}Last checked ${ui.date(a.updated_at)}</span><span class="small faint stale-note">${ui.esc(a.note)}</span>` : "");
  showActions();
}

function showActions() {
  const box = ui.$("#actions");
  box.innerHTML = (product.purchase.route === "dripdash"
    ? `<button class="btn btn-lg" type="button" id="addBtn">${ui.icon("bag")} Add to bag</button>`
    : `<button class="btn btn-lg" type="button" id="outBtn">${ui.esc(product.purchase.label)} ${ui.icon("external")}</button>`) +
    `<button class="icon-btn big${product.in_wishlist ? " on" : ""}" type="button" id="wishBtn" aria-label="Save to wishlist">${ui.icon("heart")}</button>`;
}

function wireBuying() {
  ui.$("#sizes").addEventListener("change", (e) => { size = e.target.value; });
  ui.$("#actions").addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.id === "wishBtn") {
      if (!ui.needSignIn("save")) return;
      product.in_wishlist = !product.in_wishlist;
      b.classList.toggle("on", product.in_wishlist);
      try {
        await (product.in_wishlist ? api.wish(product.slug) : api.unwish(product.slug));
        ui.toast(product.in_wishlist ? "Saved to your wishlist" : "Removed from your wishlist");
        ui.refreshCounts();
      } catch (err) { ui.toast(err.message); }
      return;
    }
    if (b.id === "outBtn") {
      try {
        const d = await api.outbound(product.slug, colour);
        window.open(d.url, "_blank", "noopener");
      } catch (err) { ui.toast(err.message); }
      return;
    }
    const picked = ui.$('#sizes input[name="size"]:checked');
    if (!picked) { ui.toast("Choose your size first"); return; }
    if (!ui.needSignIn("bag")) return;
    ui.busy(b, true);
    try {
      await api.addToBag(Number(picked.dataset.variant), 1);
      ui.toast(`Added to your bag: ${product.name}, ${picked.value}`);
      ui.refreshCounts();
    } catch (err) {
      ui.toast(err.message);
    }
    ui.busy(b, false);
  });
}

function showTryOn() {
  const box = ui.$("#tryonBox");
  if (product.tryon.available) {
    box.innerHTML = `
      <a class="btn btn-lg btn-ghost tryon-btn" id="tryBtn" href="${ui.link("tryon.html", { product: product.slug, colour })}">${ui.icon("sparkle")} Try it on me</a>
      <p class="small faint">First 3 previews free, then 1 credit each. A preview is a guide, not a fitting.</p>`;
    ui.$("#tryBtn").addEventListener("click", () => api.track("tryon_cta", { product: product.slug }));
  } else {
    box.innerHTML = `<p class="notice">${ui.icon("info")}<span>${ui.esc(product.tryon.reason)}</span></p>`;
  }
}

async function load() {
  const slug = ui.param("slug");
  const box = ui.$("#product");
  if (!slug) { ui.empty(box, "Pick a product", "Open a product from the shop.", "hanger", ["Go to the shop", "shop.html"]); return; }
  try {
    const data = await api.product(slug);
    product = data.product;
    const wanted = ui.param("colour");
    colour = (product.colours.find((c) => c.key === wanted) || product.colours.find((c) => c.in_stock) || product.colours[0]).key;
    document.title = `${product.name} | DripDash`;
    ui.$("#crumbs").innerHTML += `<span>/</span><a href="${ui.link("shop.html", { category: product.category })}">${ui.esc(product.category[0].toUpperCase() + product.category.slice(1))}</a><span>/</span><span>${ui.esc(product.name)}</span>`;
    box.innerHTML = layout(product);
    showGallery();
    showColours();
    showSizes();
    showTryOn();
    wireGallery();
    wireBuying();
    ui.$("#related").innerHTML = data.related.map((p) => ui.productCard(p)).join("");
  } catch (err) {
    ui.problem(box, err);
  }
}

load();
