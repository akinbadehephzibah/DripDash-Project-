/* ==========================================================================
   SHOP PAGE  (Role 2, Catalogue Developer)
   Search, filters, sort and pages over the whole catalogue. The filters live
   in `state`, which is also written into the page address so a filtered page
   can be shared or reloaded.
   ========================================================================== */
const ui = DD.ui;
const api = DD.api;
const CATEGORY_NAMES = { tops: "Tops", outerwear: "Outerwear", dresses: "Dresses", bottoms: "Bottoms", shoes: "Shoes", accessories: "Accessories" };
const COLOURS = { black: "#151515", white: "#F2F2EE", grey: "#8A8D91", green: "#2FA84F", blue: "#3D5A99", red: "#C0392B", orange: "#FF7A59", yellow: "#C9A24B", brown: "#7A4A2A", beige: "#CDBB98", purple: "#6E1F33", pink: "#F6A6B8" };
const LIST_KEYS = ["category", "brand", "size", "colour"];
let state = {};

function readState() {
  const list = (k) => (ui.param(k) ? ui.param(k).split(",").filter(Boolean) : []);
  state = {
    q: ui.param("q") || "", min: ui.param("min") || "", max: ui.param("max") || "",
    sort: ui.param("sort") || "featured", page: Number(ui.param("page")) || 1,
    tryon: ui.param("tryon") === "1",
    category: list("category"), brand: list("brand"), size: list("size"), colour: list("colour"),
  };
}

/* The page title follows the filters (given). */
function setTitle(total) {
  const one = state.category.length === 1 ? CATEGORY_NAMES[state.category[0]] : null;
  ui.$("#title").textContent = state.q ? `Results for "${state.q}"` : one || (state.tryon ? "Try-On ready" : "Shop everything");
  ui.$("#count").textContent = `${total} piece${total === 1 ? "" : "s"}`;
  document.title = `${ui.$("#title").textContent} | DripDash`;
}

async function load() {
  const grid = ui.$("#grid");
  ui.loading(grid, 6);
  try {
    const data = await api.products({ ...state, per: 12 });
    if (!data.products.length) {
      ui.empty(grid, "Nothing matches yet", "Try fewer filters, or clear them all.", "search");
    } else {
      grid.innerHTML = data.products.map((p) => ui.productCard(p)).join("");
    }
    setTitle(data.total);
    renderFacets(data);
    renderPager(data.page, data.pages);
  } catch (err) {
    ui.problem(grid, err);
  }
}

/* The facet lists in the sidebar, with live counts (given). */
function renderFacets(data) {
  const f = data.facets;
  const box = (key, label, value, count, extra) => {
    const on = state[key].includes(value);
    return `<label class="facet-item${extra ? " " + extra : ""}${count ? "" : " none"}">
      <input type="checkbox" name="${key}" value="${ui.esc(value)}"${on ? " checked" : ""}>
      ${label}<span class="count">${count || 0}</span></label>`;
  };
  ui.$("#fCategory").innerHTML = Object.keys(CATEGORY_NAMES)
    .map((k) => box("category", `<span>${CATEGORY_NAMES[k]}</span>`, k, f.categories[k])).join("");
  ui.$("#fColour").innerHTML = Object.keys(COLOURS).filter((k) => f.colours[k] || state.colour.includes(k))
    .map((k) => box("colour", `<span class="swatch" style="background:${COLOURS[k]}"></span><span>${k[0].toUpperCase() + k.slice(1)}</span>`, k, f.colours[k])).join("");
  ui.$("#fSize").innerHTML = Object.keys(f.sizes).sort(sizeOrder)
    .map((k) => box("size", `<span>${ui.esc(k)}</span>`, k, f.sizes[k], "pillbox")).join("");
  ui.$("#fBrand").innerHTML = Object.keys(data.brand_names)
    .map((k) => box("brand", `<span>${ui.esc(data.brand_names[k])}</span>`, k, f.brands[k])).join("");
  const form = ui.$("#filterForm");
  form.q.value = state.q; form.min.value = state.min; form.max.value = state.max; form.tryon.checked = state.tryon;
  ui.$("#sort").value = state.sort;
}
const SIZE_RANK = ["XS", "S", "S/M", "M", "L", "L/XL", "XL", "XXL"];
function sizeOrder(a, b) {
  const ia = SIZE_RANK.indexOf(a), ib = SIZE_RANK.indexOf(b);
  if (ia >= 0 && ib >= 0) return ia - ib;
  if (ia >= 0 || ib >= 0) return ia >= 0 ? -1 : 1;
  return (parseFloat(a) || 999) - (parseFloat(b) || 999);
}

/* Write the state back into the address bar (given). */
function writeState() {
  const params = {};
  Object.keys(state).forEach((k) => {
    const v = state[k];
    if (Array.isArray(v) ? v.length : v && !(k === "page" && v === 1) && !(k === "sort" && v === "featured")) params[k] = Array.isArray(v) ? v.join(",") : v === true ? 1 : v;
  });
  const url = ui.link("shop.html", params);
  if (window.__w3) window.__w3.search = url.slice(url.indexOf("?") >= 0 ? url.indexOf("?") : url.length);
  else history.replaceState(null, "", url);
}

function renderPager(page, pages) {
  const pager = ui.$("#pager");
  if (pages <= 1) { pager.innerHTML = ""; return; }
  let html = "";
  for (let n = 1; n <= pages; n++) html += `<button class="chip${n === page ? " on" : ""}" type="button" data-page="${n}" aria-label="Page ${n}"${n === page ? ' aria-current="page"' : ""}>${n}</button>`;
  pager.innerHTML = html;
}

ui.$("#filterForm").addEventListener("change", (e) => {
  const form = e.currentTarget;
  state.q = form.q.value.trim(); state.min = form.min.value; state.max = form.max.value;
  state.tryon = form.tryon.checked;
  LIST_KEYS.forEach((key) => { state[key] = ui.$$(`input[name="${key}"]:checked`, form).map((i) => i.value); });
  state.page = 1;
  writeState();
  load();
});
ui.$("#filterForm").addEventListener("submit", (e) => e.preventDefault());
ui.$("#sort").addEventListener("change", (e) => { state.sort = e.target.value; state.page = 1; writeState(); load(); });
ui.$("#pager").addEventListener("click", (e) => {
  const b = e.target.closest("[data-page]");
  if (!b) return;
  state.page = Number(b.dataset.page);
  writeState();
  load();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
ui.$("#clear").addEventListener("click", () => {
  state = { q: "", min: "", max: "", sort: state.sort, page: 1, tryon: false, category: [], brand: [], size: [], colour: [] };
  writeState();
  load();
});

/* On a phone the filters open as a drawer (given). */
ui.$("#showFilters").addEventListener("click", () => ui.$("#filters").classList.toggle("open"));

readState();
load();
