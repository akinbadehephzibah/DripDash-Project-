/* ==========================================================================
   DRIPDASH API CLIENT  (shared file: do not edit. The Lead Developer owns it)

   Every page talks to the real DripDash backend through these functions.
   Each one returns a Promise:

       const data = await DD.api.products({ category: "tops" });
       console.log(data.products);           // the list

   When the API says no (a missing field, a sold-out size, not enough
   credits), the Promise rejects with an Error:
       err.message   a friendly sentence you can show the shopper
       err.field     the form field to fix (when there is one)
       err.status    401 = not signed in, 402 = needs credits, 409 = conflict
       err.data      everything else the API sent back

   Full list of what each call returns: API.md in this project.
   ========================================================================== */
(function () {
  "use strict";

  /* Where the API lives. The preview, the saved site link and the platform all
     sit on webbo3.com (or localhost while testing). Anywhere else (GitHub Pages,
     a laptop) uses webbo3.com. */
  function apiBase() {
    if (window.DRIPDASH_API) return window.DRIPDASH_API;
    var tries = [location.href, document.baseURI, document.referrer];
    for (var i = 0; i < tries.length; i++) {
      try {
        var u = new URL(tries[i]);
        if (/^https?:$/.test(u.protocol) && /(^|\.)webbo3\.(com|xyz)$|^localhost$|^127\.0\.0\.1$/.test(u.hostname)) {
          return u.origin + "/dripdash/api/v1";
        }
      } catch (e) { /* not a URL */ }
    }
    return "https://webbo3.com/dripdash/api/v1";
  }
  var BASE = apiBase();

  /* Remembering the sign-in. Webbo3 Code's preview blocks localStorage, so we use
     its own store there (window.__w3.store), then window.name as a last resort. */
  var KEY = "dripdash";
  function readAll() {
    var w3 = window.__w3 && window.__w3.store;
    try { if (w3 && w3.get(KEY)) return JSON.parse(w3.get(KEY)); } catch (e) { /* not ours */ }
    try { var v = window.localStorage.getItem(KEY); if (v) return JSON.parse(v); } catch (e) { /* sandboxed */ }
    try { if (String(window.name).indexOf(KEY + ":") === 0) return JSON.parse(window.name.slice(KEY.length + 1)); } catch (e) { /* not ours */ }
    return {};
  }
  function writeAll(obj) {
    var text = JSON.stringify(obj);
    var w3 = window.__w3 && window.__w3.store;
    try { if (w3) w3.set(KEY, text); } catch (e) { /* ignore */ }
    try { window.localStorage.setItem(KEY, text); } catch (e) { /* sandboxed */ }
    try { window.name = KEY + ":" + text; } catch (e) { /* ignore */ }
  }
  function store(key, value) {
    var all = readAll();
    if (value === undefined) return all[key] === undefined ? null : all[key];
    if (value === null) delete all[key]; else all[key] = value;
    writeAll(all);
    return value;
  }

  function query(params) {
    var parts = [];
    Object.keys(params || {}).forEach(function (k) {
      var v = params[k];
      if (v === undefined || v === null || v === "" || v === false) return;
      if (Array.isArray(v)) { if (!v.length) return; v = v.join(","); }
      parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(v === true ? 1 : v));
    });
    return parts.length ? "?" + parts.join("&") : "";
  }

  function request(method, path, body, opts) {
    opts = opts || {};
    var headers = { "Accept": "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    var token = store(opts.staff ? "staff" : "token");
    if (token) headers["Authorization"] = "Bearer " + token;
    if (opts.idem) headers["Idempotency-Key"] = opts.idem;
    return fetch(BASE + path, { method: method, headers: headers, body: body === undefined ? undefined : JSON.stringify(body) })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok || data.ok === false) {
            var err = new Error(data.error || "Something went wrong. Please try again.");
            err.status = res.status;
            err.field = data.field || null;
            err.data = data;
            if (res.status === 401) store(opts.staff ? "staff" : "token", null);
            throw err;
          }
          return data;
        });
      }, function () {
        var err = new Error("We could not reach DripDash. Check your connection and try again.");
        err.status = 0;
        throw err;
      });
  }
  var get = function (path, params, opts) { return request("GET", path + query(params), undefined, opts); };
  var post = function (path, body, opts) { return request("POST", path, body || {}, opts); };
  var enc = encodeURIComponent;
  var staff = { staff: true };

  /* Make a phone photo small before it is sent (long side 1600 px, JPEG),
     so uploads are quick and never too large. Returns a data: URL. */
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      if (!file) return reject(new Error("Choose a photo first."));
      if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type || "image/jpeg")) return reject(new Error("Choose a JPEG, PNG or WebP photo."));
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error("That photo could not be read. Choose it again.")); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error("That file is not a photo we can open.")); };
        img.onload = function () {
          var scale = Math.min(1, 1600 / Math.max(img.width, img.height));
          var c = document.createElement("canvas");
          c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/jpeg", 0.9));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  var api = {
    base: BASE,

    /* ---- the shop: anyone ---- */
    config: function () { return get("/config"); },
    health: function () { return get("/health"); },
    stats: function () { return get("/stats"); },
    faqs: function () { return get("/faqs"); },                       // { faqs, photo_guide }
    categories: function () { return get("/categories"); },           // { categories: [{ key, name, count, image }] }
    brands: function () { return get("/brands"); },                   // { brands: [...] }
    brand: function (slug) { return get("/brands/" + enc(slug)); },   // { brand, products }
    products: function (filters) { return get("/products", filters); }, // { products, total, page, pages, facets }
    product: function (slug) { return get("/products/" + enc(slug)); }, // { product, related }
    suggest: function (q) { return get("/search/suggest", { q: q }); },
    track: function (name, extra) {                                     // page analytics, never blocks the page
      var body = Object.assign({ name: name, anon: anonId() }, extra || {});
      return post("/events", body).catch(function () { /* analytics is optional */ });
    },
    applyPartner: function (details) { return post("/partners/apply", details); }, // { reference }
    sharedLook: function (token) { return get("/looks/" + enc(token)); },

    /* ---- account ---- */
    register: function (details) {
      return post("/auth/register", details).then(function (d) { store("token", d.token); store("me", d.user); return d; });
    },
    login: function (email, password) {
      return post("/auth/login", { email: email, password: password }).then(function (d) { store("token", d.token); store("me", d.user); return d; });
    },
    logout: function () { var p = post("/auth/logout"); store("token", null); store("me", null); return p.catch(function () {}); },
    signedIn: function () { return !!store("token"); },
    me: function () { return get("/auth/me").then(function (d) { store("me", d.user); return d; }); },
    cachedMe: function () { return store("me"); },
    sessions: function () { return get("/auth/sessions"); },
    endSession: function (id) { return post("/auth/sessions/" + enc(id) + "/end"); },
    updateAccount: function (fields) { return post("/account", fields); },
    changePassword: function (current, next) { return post("/account/password", { current: current, new: next }); },
    deleteAccount: function (password) {
      return post("/account/delete", { password: password }).then(function (d) { store("token", null); store("me", null); return d; });
    },

    /* ---- try-on profile ---- */
    consent: function () { return get("/tryon/consent"); },            // { consent: { version, points }, photo_guide }
    profile: function () { return get("/profile"); },                  // { profile: { next, photo, fit, checks } }
    giveConsent: function (version, adult) { return post("/profile/consent", { version: version, agree: true, adult: adult }); },
    uploadPhoto: function (file) { return shrink(file).then(function (url) { return post("/profile/photo", { photo: url }); }); },
    saveFit: function (fit) { return post("/profile/fit", { fit: fit }); },
    approveProfile: function () { return post("/profile/approve"); },
    deleteProfile: function () { return post("/profile/delete"); },

    /* ---- try-on jobs ---- */
    tryonQuote: function (product, colour, mode) { return get("/tryon/quote", { product: product, colour: colour, mode: mode }); },
    startTryon: function (product, colour, mode, confirmCredits, fresh) {
      var key = "TO-" + product + "-" + colour + "-" + mode + "-" + Date.now();
      return post("/tryon/jobs", { product: product, colour: colour, mode: mode, confirm_credits: confirmCredits, fresh: !!fresh }, { idem: key });
    },
    job: function (id) { return get("/tryon/jobs/" + enc(id)); },      // { job: { status, progress, step, image } }
    jobs: function (filters) { return get("/tryon/jobs", filters); },   // { jobs: [...] }
    cancelJob: function (id) { return post("/tryon/jobs/" + enc(id) + "/cancel"); },
    saveJob: function (id, saved) { return post("/tryon/jobs/" + enc(id) + "/save", { saved: saved }); },
    shareJob: function (id, on) { return post("/tryon/jobs/" + enc(id) + "/share", { on: on }); },
    reportJob: function (id, reason, note) { return post("/tryon/jobs/" + enc(id) + "/report", { reason: reason, note: note }); },
    deleteJob: function (id) { return post("/tryon/jobs/" + enc(id) + "/delete"); },
    /* Ask every second until the job is done; onUpdate(job) runs each time. */
    waitForJob: function (id, onUpdate) {
      return new Promise(function (resolve, reject) {
        var tries = 0;
        (function tick() {
          api.job(id).then(function (d) {
            if (onUpdate) onUpdate(d.job);
            if (d.job.done) return resolve(d.job);
            if (++tries > 180) return reject(new Error("This is taking longer than usual. Your preview will be under Saved looks when it is ready."));
            setTimeout(tick, tries < 10 ? 900 : 2000);
          }, reject);
        })();
      });
    },

    /* ---- credits ---- */
    credits: function () { return get("/credits"); },                   // { balance, ledger, packs }
    buyCredits: function (pack) { return post("/credits/buy", { pack: pack }); },

    /* ---- wishlist, bag, checkout, orders ---- */
    wishlist: function () { return get("/wishlist"); },
    wish: function (slug) { return post("/wishlist/" + enc(slug)); },
    unwish: function (slug) { return post("/wishlist/" + enc(slug) + "/remove"); },
    bag: function () { return get("/bag"); },                           // { items, totals, price_changes, can_checkout }
    addToBag: function (variantId, qty) { return post("/bag/items", { variant: variantId, qty: qty || 1 }); },
    setQty: function (itemId, qty) { return post("/bag/items/" + itemId, { qty: qty }); },
    removeFromBag: function (itemId) { return post("/bag/items/" + itemId + "/remove"); },
    checkoutQuote: function (area) { return post("/checkout/quote", { area: area }); },
    checkout: function (details) { return post("/checkout", details); }, // { order }
    orders: function () { return get("/orders"); },
    order: function (ref) { return get("/orders/" + enc(ref)); },
    cancelOrder: function (ref, reason) { return post("/orders/" + enc(ref) + "/cancel", { reason: reason }); },
    returnOrder: function (ref, reason) { return post("/orders/" + enc(ref) + "/return", { reason: reason }); },
    outbound: function (product, colour) { return post("/outbound", { product: product, colour: colour }); }, // { url }

    /* ---- staff (admin.html) ---- */
    staffLogin: function (email, password) {
      return post("/staff/login", { email: email, password: password }).then(function (d) { store("staff", d.token); return d; });
    },
    staffLogout: function () { store("staff", null); },
    staffSignedIn: function () { return !!store("staff"); },
    admin: {
      me: function () { return get("/staff/me", {}, staff); },
      overview: function (days) { return get("/admin/overview", { days: days }, staff); },
      jobs: function (status) { return get("/admin/jobs", { status: status }, staff); },
      reports: function (status) { return get("/admin/reports", { status: status }, staff); },
      resolve: function (id, action, resolution) { return post("/admin/reports/" + id + "/resolve", { action: action, resolution: resolution }, staff); },
      products: function () { return get("/admin/products", {}, staff); },
      editProduct: function (slug, fields) { return post("/admin/products/" + enc(slug), fields, staff); },
      setTryon: function (slug, status) { return post("/admin/products/" + enc(slug) + "/tryon", { status: status }, staff); },
      categoryTryon: function (key, enabled) { return post("/admin/categories/" + enc(key) + "/tryon", { enabled: enabled }, staff); },
      brands: function () { return get("/admin/brands", {}, staff); },
      editBrand: function (slug, fields) { return post("/admin/brands/" + enc(slug), fields, staff); },
      users: function (q) { return get("/admin/users", { q: q }, staff); },
      adjustCredits: function (userId, amount, reason) { return post("/admin/credits/adjust", { user_id: userId, amount: amount, reason: reason }, staff); },
      orders: function (status) { return get("/admin/orders", { status: status }, staff); },
      orderStatus: function (ref, status, note) { return post("/admin/orders/" + enc(ref) + "/status", { status: status, note: note }, staff); },
      partners: function () { return get("/admin/partners", {}, staff); },
      decidePartner: function (ref, decision, note) { return post("/admin/partners/" + enc(ref) + "/decide", { decision: decision, note: note }, staff); },
      audit: function () { return get("/admin/audit", {}, staff); },
      settings: function (changes) { return changes ? post("/admin/settings", changes, staff) : get("/admin/settings", {}, staff); },
      resetDemo: function () { return post("/admin/demo/reset", {}, staff); }
    }
  };

  function anonId() {
    var id = store("anon");
    if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); store("anon", id); }
    return id;
  }

  window.DD = window.DD || {};
  window.DD.api = api;
  window.DD.store = store;
})();
