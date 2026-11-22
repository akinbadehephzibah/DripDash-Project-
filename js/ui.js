/* ==========================================================================
   DRIPDASH UI HELPERS  (shared file: do not edit. The Lead Developer owns it)

   1. Puts the same header and footer on every page. A page only needs:
        <body data-page="shop">
          <header data-dd="header"></header>
          ... your page ...
          <footer data-dd="footer"></footer>
   2. Gives every page small helpers on DD.ui (pages call it `ui`):

        ui.$("#id")  one element           ui.$$(".card")  all of them
        ui.esc(text)                       make text safe for innerHTML
        ui.money(18500)                    "₦18,500"
        ui.date(iso)  ui.ago(iso)          "5 Nov 2026"  "3 hours ago"
        ui.icon("bag")                     an <svg> icon as text
        ui.productCard(product)            the shared product card (HTML text)
        ui.param("slug")                   read ?slug=... from the address
        ui.link("product.html", { slug })  "product.html?slug=..."
        ui.go("bag.html")                  open another page
        ui.needSignIn()                    send a signed-out shopper to sign in, then back
        ui.values(form)                    every field of a form as an object
        ui.showError(form, err)            the API's message next to the right field
        ui.busy(button, true | false)      a spinner on a button while waiting
        ui.toast("Added to your bag")      a small message at the bottom
        ui.loading(el, n)  ui.empty(el, title, text, icon, button)  ui.problem(el, err)
        ui.confirm({ title, text, ok })    a yes/no dialog, returns a Promise<boolean>
        ui.refreshCounts()                 update the bag and wishlist numbers in the header
   ========================================================================== */
(function () {
  "use strict";
  var ui = {};

  /* ---------- icons: 24px line icons, 1.8 stroke ---------- */
  var P = {
    bag: '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    "check-circle": '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    sparkle: '<path d="M12 3c.7 4.6 2.4 6.3 7 7-4.6.7-6.3 2.4-7 7-.7-4.6-2.4-6.3-7-7 4.6-.7 6.3-2.4 7-7Z"/><path d="M19 3v4M17 5h4"/>',
    hanger: '<path d="M12 7a2 2 0 1 1 2-2c0 1-1 1.5-2 2.5V9"/><path d="M12 9 3 15.5a1.2 1.2 0 0 0 .7 2.1h16.6a1.2 1.2 0 0 0 .7-2.1L12 9Z"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4V8Z"/><circle cx="12" cy="13" r="3.5"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5L5 20"/>',
    shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>',
    box: '<path d="m12 3 8 4v10l-8 4-8-4V7l8-4Z"/><path d="m4 7 8 4 8-4M12 11v10"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8L3 12Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    wallet: '<path d="M4 7h15a1 1 0 0 1 1 1v11H4a1 1 0 0 1-1-1V6a2 2 0 0 1 2-2h11"/><circle cx="16" cy="13.5" r="1.3"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5c0-1 1.1-1.7 2.5-1.7s2.5.6 2.5 1.7-1 1.5-2.5 1.8-2.5.8-2.5 1.9 1.1 1.8 2.5 1.8 2.5-.7 2.5-1.7M12 6.5v1.3M12 16.2v1.3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    alert: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17h.01"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    play: '<path d="M7 5v14l12-7L7 5Z"/>',
    external: '<path d="M14 4h6v6M20 4 10 14M18 14v6H4V6h6"/>',
    store: '<path d="M4 9 5.5 4h13L20 9M4 9v11h16V9M4 9h16M9 20v-6h6v6"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
    logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>',
    move: '<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    zap: '<path d="M13 3 4 14h7l-1 7 9-11h-7l1-7Z"/>'
  };
  ui.icon = function (name, cls) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' +
      (cls ? ' class="' + cls + '"' : "") + ">" + (P[name] || P.sparkle) + "</svg>";
  };

  /* ---------- small helpers ---------- */
  ui.$ = function (s, root) { return (root || document).querySelector(s); };
  ui.$$ = function (s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); };
  ui.esc = function (v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  };
  ui.money = function (n) { return n == null ? "" : "₦" + Number(n).toLocaleString("en-NG", { maximumFractionDigits: 0 }); };
  ui.date = function (iso, opts) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-GB", opts || { day: "numeric", month: "short", year: "numeric" });
  };
  ui.time = function (iso) {
    if (!iso) return "";
    var d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ", " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };
  ui.ago = function (iso) {
    if (!iso) return "";
    var s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.round(s / 60) + " min ago";
    if (s < 86400) { var h = Math.round(s / 3600); return h + " hour" + (h > 1 ? "s" : "") + " ago"; }
    var d = Math.round(s / 86400);
    return d < 30 ? d + " day" + (d > 1 ? "s" : "") + " ago" : ui.date(iso);
  };
  ui.plural = function (n, one, many) { return n + " " + (n === 1 ? one : (many || one + "s")); };

  /* A picture inside this project (assets/...), working in Webbo3 Code's preview too. */
  ui.asset = function (path) {
    if (!path || /^(https?:|data:|\/\/)/.test(path)) return path;
    return window.__w3 && window.__w3.asset ? window.__w3.asset(path) : path;
  };

  /* The page address. Webbo3 Code's preview passes ?query through window.__w3. */
  ui.params = function () { return new URLSearchParams((window.__w3 && window.__w3.search) || location.search || ""); };
  ui.param = function (name) { return ui.params().get(name); };
  ui.link = function (page, params) {
    var q = new URLSearchParams();
    Object.keys(params || {}).forEach(function (k) { if (params[k] !== undefined && params[k] !== null && params[k] !== "") q.set(k, params[k]); });
    var s = q.toString();
    return page + (s ? "?" + s : "");
  };
  ui.go = function (page, params) {
    var href = ui.link(page, params);
    if (window.__w3 && window.__w3.go) window.__w3.go(href); else location.href = href;
  };
  ui.here = function () {
    var page = ((window.__w3 && window.__w3.page) || location.pathname).split("/").pop() || "index.html";
    return page + ((window.__w3 && window.__w3.search) || location.search || "");
  };
  /* Pages that need a signed-in shopper call this first. Returns true when signed in. */
  ui.needSignIn = function (why) {
    if (DD.api.signedIn()) return true;
    ui.go("signin.html", { next: ui.here(), why: why });
    return false;
  };

  /* ---------- forms ---------- */
  ui.values = function (form) {
    var out = {};
    ui.$$("input, select, textarea", form).forEach(function (el) {
      if (!el.name || el.disabled) return;
      if (el.type === "checkbox") {
        var many = ui.$$('input[type="checkbox"][name="' + el.name + '"]', form).length > 1;
        if (many) { out[el.name] = out[el.name] || []; if (el.checked) out[el.name].push(el.value); }
        else out[el.name] = el.checked;
      } else if (el.type === "radio") {
        if (el.checked) out[el.name] = el.value; else if (!(el.name in out)) out[el.name] = "";
      } else if (el.type !== "file") out[el.name] = el.value.trim();
    });
    return out;
  };
  ui.clearErrors = function (form) {
    ui.$$(".field.has-error", form).forEach(function (f) { f.classList.remove("has-error"); });
    ui.$$(".field .error, .form-error", form).forEach(function (e) { e.remove(); });
  };
  ui.showError = function (form, err) {
    ui.clearErrors(form);
    var input = err && err.field ? form.querySelector('[name="' + err.field + '"]') : null;
    var field = input && input.closest(".field");
    var p = document.createElement("p");
    if (field) {
      p.className = "error"; p.textContent = err.message; field.classList.add("has-error"); field.appendChild(p);
      if (input.focus) input.focus();
    } else {
      p.className = "notice error form-error"; p.innerHTML = ui.icon("alert") + "<span>" + ui.esc(err ? err.message : "Something went wrong.") + "</span>";
      form.prepend(p);
    }
  };
  ui.busy = function (button, on) {
    if (!button) return;
    button.disabled = !!on;
    button.classList.toggle("is-loading", !!on);
  };
  ui.toast = function (text) {
    var t = ui.$(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = text; t.classList.add("on");
    clearTimeout(ui.toast.timer); ui.toast.timer = setTimeout(function () { t.classList.remove("on"); }, 3200);
  };
  ui.loading = function (el, n, tall) {
    if (!el) return;
    var html = "";
    for (var i = 0; i < (n || 4); i++) html += '<div><div class="skeleton" style="aspect-ratio:4/5"></div><div class="skeleton" style="height:14px;margin-top:12px;width:60%"></div><div class="skeleton" style="height:14px;margin-top:8px;width:35%"></div></div>';
    el.innerHTML = tall === false ? '<div class="skeleton" style="height:120px"></div>' : html;
  };
  ui.empty = function (el, title, text, icon, button) {
    if (!el) return;
    el.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="icon-tile">' + ui.icon(icon || "search") + "</div><h4>" + ui.esc(title) + "</h4>" +
      (text ? '<p class="small" style="margin-top:6px">' + ui.esc(text) + "</p>" : "") +
      (button ? '<a class="btn btn-sm" href="' + ui.esc(button[1]) + '">' + ui.esc(button[0]) + "</a>" : "") + "</div>";
  };
  ui.problem = function (el, err) {
    if (el) el.innerHTML = '<div class="notice error" style="grid-column:1/-1">' + ui.icon("alert") + "<span>" + ui.esc(err && err.message ? err.message : String(err)) + "</span></div>";
  };

  /* A yes/no dialog. ui.confirm({ title, text, ok: "Delete", danger: true }).then(yes => ...) */
  ui.confirm = function (o) {
    return new Promise(function (resolve) {
      var d = document.createElement("dialog");
      d.className = "modal";
      d.innerHTML = '<div class="modal-body stack"><h3>' + ui.esc(o.title) + "</h3>" + (o.text ? '<p class="muted">' + ui.esc(o.text) + "</p>" : "") + "</div>" +
        '<div class="modal-foot"><button class="btn btn-ghost btn-sm" value="no">' + ui.esc(o.cancel || "Cancel") + '</button><button class="btn btn-sm' +
        (o.danger ? " btn-danger" : "") + '" value="yes">' + ui.esc(o.ok || "Yes") + "</button></div>";
      document.body.appendChild(d);
      d.addEventListener("click", function (e) {
        var b = e.target.closest("button");
        if (b) { d.close(); d.remove(); resolve(b.value === "yes"); }
        else if (e.target === d) { d.close(); d.remove(); resolve(false); }
      });
      d.addEventListener("cancel", function () { d.remove(); resolve(false); });
      d.showModal();
    });
  };

  /* ---------- the shared product card ---------- */
  ui.productCard = function (p, opts) {
    opts = opts || {};
    var href = ui.link("product.html", { slug: p.slug, colour: opts.colour || "" });
    var badges = "";
    if (p.tryon && p.tryon.available) badges += '<span class="pill tryon">' + ui.icon("sparkle") + "Try-On</span>";
    if (p.new) badges += '<span class="pill light">New</span>';
    if (p.was_price) badges += '<span class="pill volt">Sale</span>';
    if (p.stock_status === "out_of_stock") badges += '<span class="pill light">Sold out</span>';
    var swatches = (p.colours || []).map(function (c) { return '<span class="swatch" title="' + ui.esc(c.name) + '" style="background:' + ui.esc(c.hex) + '"></span>'; }).join("");
    return '<article class="product-card' + (p.stock_status === "out_of_stock" ? " sold-out" : "") + '">' +
      '<a class="media" href="' + href + '"><img src="' + ui.esc(p.image) + '" alt="' + ui.esc(p.image_alt || p.name) + '" loading="lazy" width="800" height="1000">' +
      '<span class="badges">' + badges + "</span></a>" +
      (opts.fav !== false ? '<button class="icon-btn fav' + (opts.saved ? " on" : "") + '" type="button" data-wish="' + ui.esc(p.slug) + '" aria-label="Save ' + ui.esc(p.name) + '">' +
        ui.icon("heart") + "</button>" : "") +
      '<a class="info" href="' + href + '"><span class="brand">' + ui.esc(p.brand ? p.brand.name : "") + '</span>' +
      '<span class="name">' + ui.esc(p.name) + '</span>' +
      '<span class="price"><span class="money">' + ui.esc(p.price_label) + "</span>" + (p.was_price ? '<span class="strike small">' + ui.esc(p.was_price_label) + "</span>" : "") + "</span>" +
      '<span class="swatches">' + swatches + "</span></a></article>";
  };
  /* Hearts on product cards work everywhere: one listener for the whole page. */
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-wish]");
    if (!b) return;
    e.preventDefault();
    if (!ui.needSignIn("save")) return;
    var on = !b.classList.contains("on");
    b.classList.toggle("on", on);
    (on ? DD.api.wish(b.dataset.wish) : DD.api.unwish(b.dataset.wish)).then(function () {
      ui.toast(on ? "Saved to your wishlist" : "Removed from your wishlist");
      ui.refreshCounts();
    }, function (err) { b.classList.toggle("on", !on); ui.toast(err.message); });
  });

  /* ---------- the header and footer every page shares ---------- */
  var NAV = [["shop", "shop.html", "Shop"], ["brands", "brands.html", "Brands"], ["tryon", "tryon.html", "Try-On"], ["looks", "looks.html", "My looks"]];

  function header(page) {
    var me = DD.api.cachedMe();
    var signed = DD.api.signedIn();
    return '<div class="wrap">' +
      '<a class="brand" href="index.html" aria-label="DripDash home"><img src="' + ui.asset("assets/emblem-96.png") + '" alt=""><span>Drip<b>Dash</b></span></a>' +
      '<nav class="nav" aria-label="Main">' +
      NAV.map(function (n) { return '<a href="' + n[1] + '"' + (n[0] === page ? ' class="on" aria-current="page"' : "") + (n[0] === "tryon" ? ' data-tryon' : "") + ">" + n[2] + "</a>"; }).join("") +
      "</nav>" +
      '<div class="head-tools">' +
      '<form class="head-search" role="search" data-search><label class="sr-only" for="q">Search</label>' + ui.icon("search") +
      '<input id="q" name="q" type="search" placeholder="Search DripDash" autocomplete="off"></form>' +
      '<a class="icon-btn hide-sm" href="wishlist.html" aria-label="Wishlist">' + ui.icon("heart") + '<span class="count-badge" data-count="wish" hidden></span></a>' +
      '<a class="icon-btn" href="bag.html" aria-label="Bag">' + ui.icon("bag") + '<span class="count-badge" data-count="bag" hidden></span></a>' +
      '<span data-account>' + accountSlot(signed ? me : null) + "</span>" +
      '<button class="icon-btn menu-btn" type="button" aria-label="Menu" aria-expanded="false">' + ui.icon("menu") + "</button>" +
      "</div></div>";
  }

  function accountSlot(me) {
    return me ? '<a class="avatar" href="account.html" aria-label="Your account" title="' + ui.esc(me.name) + '">' + ui.esc((me.first_name || me.name || "?").charAt(0).toUpperCase()) + "</a>"
      : '<a class="btn btn-sm btn-ghost" href="signin.html">Sign in</a>';
  }

  function footer() {
    return '<div class="wrap"><div class="cols">' +
      '<div><a class="brand" href="index.html"><img src="' + ui.asset("assets/emblem-96.png") + '" alt=""><span>Drip<b>Dash</b></span></a>' +
      '<p class="tagline">Stay fresh. <span class="volt">We\'ll dash.</span></p>' +
      '<p class="small muted" style="margin-top:10px;max-width:34ch">Discover fashion, try it on yourself with AI, and buy in one place.</p></div>' +
      '<div><h4>Shop</h4><ul><li><a href="shop.html?category=tops">Tops</a></li><li><a href="shop.html?category=outerwear">Outerwear</a></li>' +
      '<li><a href="shop.html?category=dresses">Dresses</a></li><li><a href="shop.html?tryon=1">Try-On ready</a></li><li><a href="brands.html">All brands</a></li></ul></div>' +
      '<div><h4>Try-On</h4><ul><li><a href="profile.html">My try-on profile</a></li><li><a href="tryon.html">Try-On studio</a></li>' +
      '<li><a href="looks.html">Saved looks</a></li><li><a href="account.html#wallet">Credits</a></li></ul></div>' +
      '<div><h4>DripDash</h4><ul><li><a href="orders.html">Track an order</a></li><li><a href="brands.html#partner">Sell on DripDash</a></li>' +
      '<li><a href="account.html#privacy">Privacy and photos</a></li><li><a href="admin.html">Staff sign-in</a></li></ul></div>' +
      '</div><div class="legal"><span>© 2026 DripDash. Pilot catalogue: the brands shown are samples made for the pilot.</span>' +
      "<span>Built by Flexbox Pod at Webbo3</span></div></div>";
  }

  ui.refreshCounts = function () {
    if (!DD.api.signedIn()) return Promise.resolve();
    return DD.api.me().then(function (d) {
      ui.$$("[data-account]").forEach(function (el) { el.innerHTML = accountSlot(d.user); });
      setCount("bag", d.user.bag_count);
      setCount("wish", d.user.wishlist_count);
      return d.user;
    }, function () { ui.$$("[data-account]").forEach(function (el) { el.innerHTML = accountSlot(null); }); });
  };
  function setCount(key, n) {
    ui.$$('[data-count="' + key + '"]').forEach(function (el) { el.textContent = n; el.hidden = !n; });
  }

  function mount() {
    var page = document.body.getAttribute("data-page") || "";
    var h = ui.$('[data-dd="header"]');
    if (h) {
      h.classList.add("site-header");
      h.innerHTML = header(page);
      var btn = ui.$(".menu-btn", h), nav = ui.$(".nav", h);
      btn.addEventListener("click", function () { var open = nav.classList.toggle("open"); btn.setAttribute("aria-expanded", open); });
      ui.$("[data-search]", h).addEventListener("submit", function (e) {
        e.preventDefault();
        var q = ui.$("input", e.target).value.trim();
        if (q) ui.go("shop.html", { q: q });
      });
    }
    var f = ui.$('[data-dd="footer"]');
    if (f) { f.classList.add("site-footer"); f.innerHTML = footer(); }
    ui.$$("[data-icon]").forEach(function (el) { el.outerHTML = ui.icon(el.getAttribute("data-icon"), el.className); });
    ui.refreshCounts();
    DD.api.track("page_view", { page: page });
  }

  window.DD = window.DD || {};
  window.DD.ui = ui;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
