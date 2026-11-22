/* ==========================================================================
   SAVED LOOKS  (Role 8, Saved Looks Developer)
   looks.html                       every preview I made
   looks.html?open=ID&report=1      open one (and its report form)
   looks.html?share=TOKEN           a look someone shared (no sign-in needed)
   ========================================================================== */
const ui = DD.ui;
const api = DD.api;
let jobs = [];
let filter = "all";
let reasons = {};

function lookCard(j) {
  let media;
  if (j.status === "complete") {
    media = `<div class="look-img"><img src="${ui.esc(j.image)}" alt="You wearing ${ui.esc(j.product.name)}" loading="lazy">
      <span class="look-badges"><span class="pill tryon">${ui.icon("sparkle")}${ui.esc(j.provider_label)}</span>
      ${j.mode === "motion" ? '<span class="pill info">Motion</span>' : ""}
      ${j.shared ? `<span class="pill light">${ui.icon("share")}Shared</span>` : ""}</span></div>`;
  } else if (j.status === "failed" || j.status === "cancelled") {
    media = `<div class="look-img failed">${ui.icon("alert")}<span>${j.status === "failed" ? "Could not make it" : "Cancelled"}</span>${j.refunded ? '<span class="small">Credit back</span>' : ""}</div>`;
  } else {
    media = `<div class="look-img wait"><span class="dot on"></span>Making it...</div>`;
  }
  return `<button class="look card" type="button" data-open="${ui.esc(j.id)}">${media}
    <div class="look-info"><b>${ui.esc(j.product.name)}</b><span class="small faint">${ui.esc(j.colour ? j.colour.name : "")}, ${ui.ago(j.created_at)}</span></div></button>`;
}

async function load() {
  const grid = ui.$("#grid");
  ui.loading(grid, 4);
  try {
    const data = await api.jobs();
    jobs = data.jobs;
    render();
  } catch (err) {
    ui.problem(grid, err);
  }
}

function render() {
  const grid = ui.$("#grid");
  const list = jobs.filter((j) => filter === "all" || (filter === "shared" ? j.shared : j.mode === filter));
  if (!list.length) {
    ui.empty(grid, "No looks here yet", "Pick a piece with the Try-On badge and see it on you.", "sparkle", ["Try something on", "tryon.html"]);
    return;
  }
  grid.innerHTML = list.map(lookCard).join("");
}

ui.$("#filters").addEventListener("click", (e) => {
  const b = e.target.closest(".chip");
  if (!b) return;
  ui.$$("#filters .chip").forEach((c) => c.classList.toggle("on", c === b));
  filter = b.dataset.filter;
  render();
});

/* The viewer (given): the big picture, the product, and the actions. */
function openLook(id, report) {
  const j = jobs.find((x) => x.id === id);
  if (!j) return;
  const body = ui.$("#viewerBody");
  const done = j.status === "complete";
  body.innerHTML = `
    <div class="look-big">${done ? `<img src="${ui.esc(j.motion || j.image)}" alt="You wearing ${ui.esc(j.product.name)}">` : lookCard(j)}</div>
    <div class="look-side stack-lg">
      <div class="row between"><span class="pill tryon">${ui.icon("sparkle")}${ui.esc(j.provider_label || j.status_label)}</span>
        <button class="icon-btn" type="button" data-act="close" aria-label="Close">${ui.icon("x")}</button></div>
      <a class="item-line" href="${ui.link("product.html", { slug: j.product.slug, colour: j.colour.key })}">
        <img src="${ui.esc(j.product.image)}" alt=""><span><b>${ui.esc(j.product.name)}</b><span class="small faint">${ui.esc(j.colour.name)} · ${ui.esc(j.product.price_label)}</span></span></a>
      <p class="ai-label">${ui.icon("info")}<span>${ui.esc(j.disclaimer)}</span></p>
      <div class="row">
        <a class="btn" href="${ui.link("product.html", { slug: j.product.slug, colour: j.colour.key })}">${ui.icon("bag")} Buy this look</a>
        ${done ? `<button class="btn btn-ghost" type="button" data-act="share">${ui.icon("share")} ${j.shared ? "Stop sharing" : "Share"}</button>` : ""}
      </div>
      <div id="shareBox">${j.shared ? shareLine(j) : ""}</div>
      ${done ? `<form class="form report" id="reportForm"${report ? "" : " hidden"}>
        <h4>What is wrong with this preview?</h4>
        <div class="field"><select name="reason">${Object.keys(reasons).map((k) => `<option value="${k}">${ui.esc(reasons[k])}</option>`).join("")}</select></div>
        <div class="field"><textarea name="note" placeholder="Tell support what you noticed (optional)"></textarea></div>
        <button class="btn btn-sm" type="submit">Send to support</button></form>
        <button class="btn btn-ghost btn-sm" type="button" data-act="report"${report ? " hidden" : ""}>${ui.icon("flag")} Something looks wrong</button>` : ""}
      <button class="btn btn-danger btn-sm" type="button" data-act="delete">${ui.icon("trash")} Delete this look</button>
    </div>`;
  body.dataset.id = id;
  ui.$("#viewer").showModal();
}
function shareLine(j) {
  // On the live site this is a full address; inside the Code preview (about:srcdoc) it stays relative.
  const base = /^https?:/.test(location.href) ? location.href.split("?")[0].replace(/[^/]*$/, "") : "";
  const link = ui.link(base + "looks.html", { share: j.share_url.split("/").pop() });
  return `<div class="share-line"><input class="input" readonly value="${ui.esc(link)}" aria-label="Share link"><button class="btn btn-sm btn-dark" type="button" data-act="copy">Copy</button></div>
    <p class="small faint">Anyone with this link can see this one picture. Turn sharing off to end the link.</p>`;
}

ui.$("#viewerBody").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const id = ui.$("#viewerBody").dataset.id;
  const job = jobs.find((x) => x.id === id);
  const act = b.dataset.act;
  try {
    if (act === "close") ui.$("#viewer").close();
    if (act === "share") {
      const d = await api.shareJob(id, !job.shared);
      jobs = jobs.map((x) => (x.id === id ? d.job : x));
      render();
      openLook(id);
      ui.toast(d.job.shared ? "Sharing on: anyone with the link can see it" : "Sharing off");
    }
    if (act === "copy") {
      const input = ui.$(".share-line input");
      input.select();
      await navigator.clipboard.writeText(input.value).catch(() => document.execCommand("copy"));
      ui.toast("Link copied");
    }
    if (act === "report") { ui.$("#reportForm").hidden = false; b.hidden = true; }
    if (act === "delete") {
      if (!(await ui.confirm({ title: "Delete this look?", text: "The picture is deleted for good.", ok: "Delete", danger: true }))) return;
      await api.deleteJob(id);
      jobs = jobs.filter((x) => x.id !== id);
      ui.$("#viewer").close();
      render();
      ui.toast("Look deleted");
    }
  } catch (err) {
    ui.toast(err.message);
  }
});

ui.$("#viewerBody").addEventListener("submit", async (e) => {
  if (e.target.id !== "reportForm") return;
  e.preventDefault();
  const form = e.target;
  const v = ui.values(form);
  try {
    const d = await api.reportJob(ui.$("#viewerBody").dataset.id, v.reason, v.note);
    form.outerHTML = `<p class="notice volt">${ui.icon("check")}<span>${ui.esc(d.next)}</span></p>`;
  } catch (err) {
    ui.showError(form, err);
  }
});

ui.$("#grid").addEventListener("click", (e) => {
  const b = e.target.closest("[data-open]");
  if (b) openLook(b.dataset.open);
});
ui.$("#viewer").addEventListener("click", (e) => { if (e.target.id === "viewer") e.target.close(); });

/* A look someone shared with you (given). */
async function showShared(token) {
  ui.$(".page-head h1").textContent = "A DripDash look";
  ui.$("#filters").parentElement.hidden = true;
  try {
    const { look } = await api.sharedLook(token);
    ui.$(".page-head .lead").textContent = `${look.by} tried on ${look.product.name} with DripDash.`;
    ui.$("#grid").className = "shared-look";
    ui.$("#grid").innerHTML = `<img src="${ui.esc(look.motion || look.image)}" alt="${ui.esc(look.by)} wearing ${ui.esc(look.product.name)}">
      <div class="stack-lg">${ui.productCard(look.product, { fav: false })}<p class="ai-label">${ui.icon("info")}<span>${ui.esc(look.disclaimer)}</span></p>
      <a class="btn" href="tryon.html?product=${ui.esc(look.product.slug)}">${ui.icon("sparkle")} Try it on yourself</a></div>`;
  } catch (err) {
    ui.problem(ui.$("#grid"), err);
  }
}

async function start() {
  if (ui.param("share")) { showShared(ui.param("share")); return; }
  if (!ui.needSignIn("tryon")) return;
  api.config().then((c) => { reasons = c.report_reasons; });
  await load();
  if (ui.param("open")) setTimeout(() => openLook(ui.param("open"), ui.param("report") === "1"), 200);
}

start();
