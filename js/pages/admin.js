/* ==========================================================================
   ADMIN DASHBOARD  (Role 14, Admin Dashboard Developer)
   Staff only. The pilot scoreboard (PRD section 15), reported previews,
   the try-on switches, orders, the job queue, partners and the audit log.
   Roles: admin (everything), support (reports, orders, jobs),
   catalogue (products, try-on, partners). The API refuses what a role may not do.
   ========================================================================== */
const ui = DD.ui;
const api = DD.api;
let staff = null;

/* Sign-in, tabs and sign-out (given). */
ui.$("#staffForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const v = ui.values(form);
  ui.clearErrors(form);
  try {
    const d = await api.staffLogin(v.email, v.password);
    start(d.staff);
  } catch (err) { ui.showError(form, err); }
});
ui.$$("[data-login]").forEach((b) => b.addEventListener("click", () => {
  const [email, password] = b.dataset.login.split("|");
  const form = ui.$("#staffForm");
  form.email.value = email; form.password.value = password;
  form.requestSubmit();
}));
ui.$("#staffOut").addEventListener("click", () => { api.staffLogout(); location.reload(); });
ui.$("#tabs").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tab]");
  if (!b) return;
  ui.$$("#tabs button").forEach((x) => x.classList.toggle("on", x === b));
  ui.$$("[data-pane]").forEach((p) => { p.hidden = p.dataset.pane !== b.dataset.tab; });
  ({ overview: loadOverview, reports: loadReports, tryon: loadTryon, orders: loadOrders, jobs: loadJobs, partners: loadPartners, audit: loadAudit })[b.dataset.tab]();
});
ui.$("#days").addEventListener("change", () => loadOverview());

function pct(n) { return n == null ? "-" : n + "%"; }
function secs(n) { return n == null ? "-" : n + "s"; }
function guard(el) { return (err) => ui.problem(el, err.status === 403 ? { message: `Your role (${staff.role}) cannot see this.` } : err); }

async function loadOverview() {
  const tiles = ui.$("#tiles");
  try {
    const { metrics: m } = await api.admin.overview(ui.$("#days").value);
    const providers = Object.entries(m.providers).map(([k, n]) => `${k} ${n}`).join(", ") || "no previews yet";
    const t = [
      ["Shoppers", m.shoppers, `${m.new_shoppers} new`],
      ["Activation", pct(m.activation_rate), "new shoppers who tried something on"],
      ["Try-on success", pct(m.success_rate), `${m.jobs_complete} of ${m.jobs} jobs`],
      ["Still preview time", secs(m.latency.static.p50_s), `p95 ${secs(m.latency.static.p95_s)}`],
      ["Cost per usable preview", m.cost_per_usable_usd == null ? "-" : "$" + m.cost_per_usable_usd, providers],
      ["Try-on to commerce", pct(m.tryon_to_commerce), "bag, order or outbound after a try-on"],
      ["Orders", m.orders, `${m.revenue_label} paid`],
      ["Open reports", m.reports_open, `${pct(m.report_rate)} of previews reported`],
    ];
    tiles.innerHTML = t.map(([k, v, s]) => `<div class="card stat"><div class="k">${ui.esc(k)}</div><div class="v">${ui.esc(v)}</div><div class="s">${ui.esc(s)}</div></div>`).join("");
    showDaily(m.daily);
    showTop(m.top_tried);
  } catch (err) { guard(tiles)(err); }
}

function showDaily(days) {
  const max = Math.max(1, ...days.map((d) => d.previews));
  ui.$("#daily").innerHTML = days.map((d) => `<div class="bar" title="${d.date}: ${d.previews} previews, ${d.orders} orders">
    <span style="height:${Math.round((d.previews / max) * 100)}%"></span><em>${d.orders || ""}</em><small>${new Date(d.date).getDate()}</small></div>`).join("");
}
function showTop(rows) {
  ui.$("#top").innerHTML = rows.map((r) => `<li><img src="${ui.esc(r.image)}" alt=""><span>${ui.esc(r.name)}</span><b>${r.previews}</b></li>`).join("") || '<li class="muted">No previews yet.</li>';
}

async function loadReports() {
  const box = ui.$("#reports");
  try {
    const data = await api.admin.reports();
    const open = data.reports.filter((r) => r.status === "open").length;
    ui.$("#reportCount").textContent = open || "";
    box.innerHTML = data.reports.map((r) => `
      <article class="report card pad${r.status === "resolved" ? " resolved" : ""}">
        ${r.job && r.job.image ? `<img src="${ui.esc(r.job.image)}" alt="Reported preview">` : '<div class="noimg">Picture deleted</div>'}
        <div class="stack">
          <div class="row"><span class="pill warn">${ui.esc(r.reason_label)}</span>${r.status === "resolved" ? '<span class="pill green">Resolved</span>' : ""}</div>
          <b>${ui.esc(r.job ? `${r.job.product.name}, ${r.job.colour.name}` : "Deleted preview")}</b>
          <p class="muted small">${r.note ? `"${ui.esc(r.note)}" ` : ""}from ${ui.esc(r.shopper || "a shopper")}, ${ui.ago(r.created_at)}${r.job && r.job.refunded ? ". Credit already refunded." : ""}</p>
          ${r.status === "open" ? `<form class="form" data-resolve="${r.id}">
              <div class="field"><select name="action"><option value="none">No action</option><option value="refund">Refund the credit</option><option value="refund_and_review">Refund and send the product for review</option></select></div>
              <div class="field"><textarea name="resolution" placeholder="What did you find?"></textarea></div>
              <div><button class="btn btn-sm" type="submit">Resolve</button></div></form>`
            : `<p class="small">${ui.esc(r.action)} by ${ui.esc(r.resolved_by)}: ${ui.esc(r.resolution)}</p>`}
        </div>
      </article>`).join("") || '<div class="empty"><h4>No reports</h4><p class="small">Reported previews show here.</p></div>';
  } catch (err) { guard(box)(err); }
}
ui.$("#reports").addEventListener("submit", async (e) => {
  const form = e.target.closest("[data-resolve]");
  if (!form) return;
  e.preventDefault();
  const v = ui.values(form);
  try {
    await api.admin.resolve(form.dataset.resolve, v.action, v.resolution);
    ui.toast("Report resolved");
    loadReports();
  } catch (err) { ui.showError(form, err); }
});

async function loadTryon() {
  const sw = ui.$("#switches");
  try {
    const s = (await api.admin.settings()).settings;
    sw.innerHTML = `<h3>Site-wide switches</h3>
      <label class="check"><input type="checkbox" data-setting="tryon_enabled"${s.tryon_enabled ? " checked" : ""}> <span><b>Try-on is on for everyone</b><br><span class="small faint">Off: shopping still works, the Try-On buttons say it is paused.</span></span></label>
      <label class="check"><input type="checkbox" data-setting="motion_enabled"${s.motion_enabled ? " checked" : ""}> <span><b>Motion previews (beta)</b></span></label>`;
  } catch (err) {
    sw.innerHTML = `<p class="small faint">Site-wide switches are for the admin role.</p>`;
  }
  try {
    const data = await api.admin.products();
    ui.$("#productRows").innerHTML = data.products.map((p) => `
      <tr><td><b>${ui.esc(p.name)}</b><br><span class="small faint">${ui.esc(p.brand.name)}</span></td>
        <td>${ui.esc(p.category)}</td><td>${p.stock_total}</td>
        <td class="small">${ui.date(p.stock_updated_at)}${p.stale ? ' <span class="pill warn">Stale</span>' : ""}</td>
        <td><select class="input" data-tryon="${ui.esc(p.slug)}">${Object.keys(data.tryon_statuses).map((k) =>
          `<option value="${k}"${k === p.tryon_status ? " selected" : ""}>${ui.esc(data.tryon_statuses[k])}</option>`).join("")}</select></td></tr>`).join("");
  } catch (err) { guard(ui.$("#productRows"))(err); }
}
ui.$("#switches").addEventListener("change", async (e) => {
  const box = e.target.closest("[data-setting]");
  if (!box) return;
  try { await api.admin.settings({ [box.dataset.setting]: box.checked }); ui.toast("Saved"); } catch (err) { ui.toast(err.message); box.checked = !box.checked; }
});
ui.$("#productRows").addEventListener("change", async (e) => {
  const sel = e.target.closest("[data-tryon]");
  if (!sel) return;
  try { await api.admin.setTryon(sel.dataset.tryon, sel.value); ui.toast("Try-on updated"); } catch (err) { ui.toast(err.message); }
});

/* Orders, the job queue, partners and the audit log (given). */
async function loadOrders() {
  try {
    const data = await api.admin.orders();
    ui.$("#orderRows").innerHTML = data.orders.map((o) => `
      <tr><td><b>${ui.esc(o.reference)}</b><br><span class="small faint">${ui.date(o.created_at)}</span></td>
        <td>${ui.esc(o.delivery ? o.delivery.name : "")}</td><td class="money">${ui.esc(o.total_label)}</td>
        <td>${ui.esc(o.status_label)}</td>
        <td>${o.next_statuses.map((s) => `<button class="btn btn-dark btn-sm" type="button" data-order="${ui.esc(o.reference)}" data-to="${s}">${ui.esc(data.statuses[s])}</button>`).join(" ") || '<span class="faint small">Done</span>'}</td></tr>`).join("");
  } catch (err) { guard(ui.$("#orderRows"))(err); }
}
ui.$("#orderRows").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-order]");
  if (!b) return;
  try { await api.admin.orderStatus(b.dataset.order, b.dataset.to); ui.toast("Order moved"); loadOrders(); } catch (err) { ui.toast(err.message); }
});
async function loadJobs() {
  try {
    const data = await api.admin.jobs();
    ui.$("#jobsNote").textContent = data.note;
    ui.$("#jobRows").innerHTML = data.jobs.map((j) => `
      <tr><td class="small">${ui.esc(j.id)}<br><span class="faint">${ui.ago(j.created_at)}</span></td><td>${ui.esc(j.product.name)}</td>
        <td>${ui.esc(j.mode_name)}</td><td><span class="status ${j.status === "complete" ? "good" : j.status === "failed" ? "bad" : "wait"}">${ui.esc(j.status_label)}</span>${j.error_code ? `<br><span class="small faint">${ui.esc(j.error_code)}</span>` : ""}</td>
        <td>${ui.esc(j.provider || "-")}</td><td>${j.seconds == null ? "-" : j.seconds + "s"}</td><td>${j.credits}${j.refunded ? " (back)" : ""}</td></tr>`).join("");
  } catch (err) { guard(ui.$("#jobRows"))(err); }
}
async function loadPartners() {
  const box = ui.$("#partners");
  try {
    const data = await api.admin.partners();
    box.innerHTML = data.partners.map((p) => `
      <article class="card pad stack"><div class="row between"><b>${ui.esc(p.company)}</b><span class="pill${p.status === "pending" ? " warn" : p.status === "approved" ? " green" : ""}">${ui.esc(p.status)}</span></div>
        <p class="small muted">${ui.esc(p.seller_label)} · ${ui.esc(p.categories.join(", "))} · about ${p.products_estimate} products · ${ui.esc(p.contact_name)}, ${ui.esc(p.email)}</p>
        <p class="small">"${ui.esc(p.rights)}"</p>
        ${p.status === "pending" ? `<div class="row"><button class="btn btn-sm" type="button" data-partner="${ui.esc(p.reference)}" data-decision="approved">Approve</button><button class="btn btn-ghost btn-sm" type="button" data-partner="${ui.esc(p.reference)}" data-decision="declined">Decline</button></div>` : ""}
      </article>`).join("") || '<div class="empty"><h4>No partner requests</h4></div>';
  } catch (err) { guard(box)(err); }
}
ui.$("#partners").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-partner]");
  if (!b) return;
  try { await api.admin.decidePartner(b.dataset.partner, b.dataset.decision); ui.toast(`Request ${b.dataset.decision}`); loadPartners(); } catch (err) { ui.toast(err.message); }
});
async function loadAudit() {
  try {
    const data = await api.admin.audit();
    ui.$("#auditRows").innerHTML = data.audit.map((a) => `<tr><td class="small faint">${ui.time(a.at)}</td><td>${ui.esc(a.actor)}</td><td>${ui.esc(a.action)}</td><td>${ui.esc(a.target || "")}</td><td class="small">${ui.esc(a.note || "")}</td></tr>`).join("")
      || '<tr><td colspan="5" class="muted">Nothing yet.</td></tr>';
  } catch (err) { guard(ui.$("#auditRows"))(err); }
}

function start(who) {
  staff = who;
  ui.$("#gate").hidden = true;
  ui.$("#dash").hidden = false;
  ui.$("#staffOut").hidden = false;
  ui.$("#who").textContent = `${who.name} (${who.role})`;
  loadOverview();
  api.admin.reports().then((d) => { ui.$("#reportCount").textContent = d.reports.filter((r) => r.status === "open").length || ""; }, () => {});
}

if (api.staffSignedIn()) api.admin.me().then((d) => start(d.staff), () => { ui.$("#gate").hidden = false; });
else ui.$("#gate").hidden = false;
