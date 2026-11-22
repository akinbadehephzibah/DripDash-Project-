/* ==========================================================================
   TRY-ON STUDIO  (Role 7, Try-On Studio Developer)
   tryon.html                              pick a piece that supports try-on
   tryon.html?product=SLUG&colour=KEY      make a preview of it on you
   The rules (PRD 8.4): show the credit cost and confirm it BEFORE starting,
   show every job state (queued, processing, complete, failed), and always
   show the result next to the real product with the AI-preview label.
   ========================================================================== */
const ui = DD.ui;
const api = DD.api;
let product = null;
let colour = null;
let quote = null;
let profile = null;

function mode() { return ui.$('input[name="mode"]:checked').value; }

/* Pick a piece (given). */
async function showPicker() {
  ui.$("#picker").hidden = false;
  const grid = ui.$("#pickGrid");
  ui.loading(grid, 8);
  const data = await api.products({ tryon: 1, per: 48 });
  grid.innerHTML = data.products.map((p) => ui.productCard(p, { fav: false }).replace(/href="product\.html\?slug=([^"&]+)[^"]*"/g, 'href="tryon.html?product=$1"')).join("");
}

/* The piece, its colours and your photo on the stage (given). */
function showItem() {
  ui.$("#title").textContent = product.name;
  const c = product.colours.find((x) => x.key === colour);
  ui.$("#item").href = ui.link("product.html", { slug: product.slug, colour });
  ui.$("#item").innerHTML = `<img src="${ui.esc(c.image)}" alt=""><span><span class="small faint">${ui.esc(product.brand.name)}</span><b>${ui.esc(product.name)}</b><span class="money">${ui.esc(product.price_label)}</span></span>${ui.icon("arrow")}`;
  ui.$("#colours").innerHTML = product.colours.map((x) => `
    <label class="option swatch-option" title="${ui.esc(x.name)}"><input type="radio" name="colour" value="${ui.esc(x.key)}"${x.key === colour ? " checked" : ""} aria-label="${ui.esc(x.name)}"><span style="--c:${ui.esc(x.hex)}"></span></label>`).join("");
}
function showPhoto() {
  ui.$("#stageImg").src = profile.photo.url;
  ui.$("#stageImg").alt = "Your try-on photo";
  ui.$("#stage").classList.remove("has-result");
  ui.$("#resultBar").innerHTML = "";
}

async function loadQuote() {
  const box = ui.$("#quote");
  const start = ui.$("#startBtn");
  start.disabled = true;
  try {
    const data = await api.tryonQuote(product.slug, colour, mode());
    quote = data.quote;
    ui.$("#balance span").textContent = quote.balance;
    start.innerHTML = `${ui.icon("sparkle")} Make my preview`;
    if (!quote.allowed) {
      box.innerHTML = `<p class="notice warn">${ui.icon("alert")}<span>${ui.esc(quote.reasons[0])}</span></p>`;
    } else if (quote.cached_job) {
      box.innerHTML = `<p class="notice volt">${ui.icon("check")}<span>You already made this preview. Opening it is free.</span></p>`;
      start.disabled = false;
      start.innerHTML = `${ui.icon("eye")} Open my preview`;
    } else {
      box.innerHTML = `<div class="cost"><span>This uses</span><b>${ui.plural(quote.credits, "credit")}</b><span>You have ${quote.balance}</span></div>` +
        (quote.enough ? "" : `<a class="link-arrow" href="account.html#wallet">Top up credits ${ui.icon("arrow")}</a>`);
      start.disabled = !quote.enough;
    }
  } catch (err) {
    ui.problem(box, err);
  }
}
ui.$("#colours").addEventListener("change", (e) => { colour = e.target.value; showItem(); showPhoto(); loadQuote(); });
ui.$("#modes").addEventListener("change", () => loadQuote());

ui.$("#startBtn").addEventListener("click", async (e) => {
  const button = e.currentTarget;
  const wait = ui.$("#wait");
  ui.busy(button, true);
  wait.hidden = false;
  ui.$("#resultBar").innerHTML = "";
  try {
    const data = await api.startTryon(product.slug, colour, mode(), quote.credits);
    const job = await api.waitForJob(data.job.id, (j) => {
      ui.$("#waitStep").textContent = j.step || j.status_label;
      ui.$("#waitBar").style.width = Math.max(5, j.progress) + "%";
    });
    showResult(job);
  } catch (err) {
    ui.toast(err.message);
    if (err.status === 409 && err.data && err.data.next === "profile") ui.go("profile.html");
  }
  wait.hidden = true;
  ui.busy(button, false);
  loadQuote();
});

function showResult(job) {
  const bar = ui.$("#resultBar");
  if (job.status !== "complete") {
    bar.innerHTML = `<p class="notice error">${ui.icon("alert")}<span>${ui.esc(job.error || "We could not make this preview.")}${job.refunded ? " Your credit is back." : ""}</span></p>`;
    return;
  }
  const img = ui.$("#stageImg");
  img.src = job.motion || job.image;
  img.alt = `You wearing ${job.product.name}`;
  ui.$("#stage").classList.add("has-result");
  bar.innerHTML = `
    <span class="pill tryon">${ui.icon("sparkle")}${ui.esc(job.provider_label || "Preview")}</span>
    <a class="btn" href="${ui.link("product.html", { slug: job.product.slug, colour: job.colour.key })}">${ui.icon("bag")} Buy this look</a>
    <a class="btn btn-ghost" href="looks.html">All my looks</a>
    <button class="btn btn-ghost" type="button" id="reportBtn">${ui.icon("flag")} Something looks wrong</button>`;
  ui.$("#reportBtn").addEventListener("click", () => ui.go("looks.html", { open: job.id, report: 1 }));
}

async function start() {
  if (!ui.needSignIn("tryon")) return;
  const slug = ui.param("product");
  try {
    const me = await api.profile();
    profile = me.profile;
    if (profile.next !== "ready") {
      ui.$("#picker").hidden = false;
      ui.$("#picker").innerHTML = `<div class="empty"><div class="icon-tile">${ui.icon("camera")}</div><h4>First, your try-on profile</h4>
        <p class="small">One photo and four marks, once. Then you can try on anything with the Try-On badge.</p>
        <a class="btn btn-sm" href="profile.html">Set it up (2 minutes)</a></div>`;
      return;
    }
    if (!slug) { await showPicker(); return; }
    const data = await api.product(slug);
    product = data.product;
    if (!product.tryon.available) {
      ui.$("#picker").hidden = false;
      ui.empty(ui.$("#picker"), "This piece cannot be tried on yet", product.tryon.reason, "info", ["See pieces you can try", "tryon.html"]);
      return;
    }
    const wanted = ui.param("colour");
    colour = (product.colours.find((c) => c.key === wanted) || product.colours[0]).key;
    ui.$("#studio").hidden = false;
    ui.$("#disclaimer").textContent = product.disclaimer;
    showItem();
    showPhoto();
    loadQuote();
  } catch (err) {
    ui.problem(ui.$(".page-head"), err);
  }
}

start();
