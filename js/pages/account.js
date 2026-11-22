/* ==========================================================================
   ACCOUNT  (Role 13, Wallet & Account Developer)
   Details, credits (the wallet), devices, and privacy controls.
   account.html#wallet and account.html#privacy jump straight to a section.
   ========================================================================== */
const ui = DD.ui;
const api = DD.api;

async function loadDetails() {
  const { user } = await api.me();
  ui.$("#hello").textContent = `Hello, ${user.first_name}`;
  const form = ui.$("#detailsForm");
  form.name.value = user.name || "";
  form.phone.value = user.phone || "";
  form.marketing.checked = !!user.marketing;
  ui.$("#email").value = user.email;
}

ui.$("#detailsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const v = ui.values(form);
  ui.clearErrors(form);
  try {
    await api.updateAccount({ name: v.name, phone: v.phone, marketing: v.marketing });
    ui.toast("Saved");
    loadDetails();
  } catch (err) {
    ui.showError(form, err);
  }
});

ui.$("#passwordForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const v = ui.values(form);
  ui.clearErrors(form);
  try {
    await api.changePassword(v.current, v.new);
    form.reset();
    ui.toast("Password changed. Other devices are signed out.");
  } catch (err) {
    ui.showError(form, err);
  }
});

async function loadWallet() {
  const data = await api.credits();
  ui.$("#balance").textContent = data.balance;
  ui.$("#packs").innerHTML = data.packs.map((p) => `
    <div class="pack card pad${p.popular ? " popular" : ""}">
      ${p.popular ? '<span class="pill volt">Most popular</span>' : ""}
      <h3>${ui.esc(p.name)}</h3>
      <p class="pack-credits">${p.credits} credits</p>
      <p class="muted small">${ui.esc(p.note)}</p>
      <p class="money">${ui.money(p.price)}</p>
      <button class="btn btn-block${p.popular ? "" : " btn-dark"}" type="button" data-pack="${ui.esc(p.key)}">Buy</button>
    </div>`).join("");
  ui.$("#ledger").innerHTML = data.ledger.map((r) => `
    <tr><td class="small faint">${ui.time(r.at)}</td><td>${ui.esc(r.reason)}</td>
      <td class="amount ${r.amount > 0 ? "plus" : "minus"}">${r.amount > 0 ? "+" : ""}${r.amount}</td>
      <td style="text-align:right">${r.balance_after}</td></tr>`).join("") || '<tr><td colspan="4" class="muted">No credit history yet.</td></tr>';
}

ui.$("#packs").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-pack]");
  if (!b) return;
  const name = b.closest(".pack").querySelector("h3").textContent;
  if (!(await ui.confirm({ title: `Buy the ${name} pack?`, text: "Pilot: this is a test payment and no money is taken.", ok: "Buy" }))) return;
  ui.busy(b, true);
  try {
    const d = await api.buyCredits(b.dataset.pack);
    ui.toast(`${d.receipt.credits} credits added. ${d.receipt.note}`);
    await loadWallet();
  } catch (err) {
    ui.toast(err.message);
    ui.busy(b, false);
  }
});

async function loadDevices() {
  const data = await api.sessions();
  ui.$("#sessions").innerHTML = data.sessions.map((s) => `
    <li><span class="icon-tile">${ui.icon(/iPhone|Android/.test(s.device) ? "phone" : "grid")}</span>
      <span class="who"><b>${ui.esc(s.device)}</b><span class="small faint">Signed in ${ui.date(s.created_at)}, last active ${ui.ago(s.last_seen)}</span></span>
      ${s.current ? '<span class="pill green">This device</span>' : `<button class="btn btn-ghost btn-sm" type="button" data-end="${ui.esc(s.id)}">Sign out</button>`}</li>`).join("");
}
ui.$("#sessions").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-end]");
  if (!b) return;
  try { await api.endSession(b.dataset.end); ui.toast("Signed out on that device"); loadDevices(); } catch (err) { ui.toast(err.message); }
});

async function loadPrivacy() {
  const { profile } = await api.profile();
  ui.$("#photoState").innerHTML = profile.photo
    ? `<div class="photo-state"><img src="${ui.esc(profile.photo.url)}" alt="Your try-on photo"><div><b>Your try-on photo is saved</b>
        <p class="small muted">Added ${ui.date(profile.approved_at || profile.consent.at)}. Only you can see it. We delete it after ${profile.retention_days} days without a try-on.</p>
        <a class="link-arrow" href="profile.html">Replace it ${ui.icon("arrow")}</a></div></div>`
    : `<p class="notice">${ui.icon("shield")}<span>You have no try-on photo. <a class="volt" href="profile.html">Set one up</a> when you want to try things on.</span></p>`;
}
ui.$("#deletePhotos").addEventListener("click", async () => {
  if (!(await ui.confirm({ title: "Delete your photo and every preview?", text: "This cannot be undone.", ok: "Delete photos", danger: true }))) return;
  try { const d = await api.deleteProfile(); ui.toast(`Deleted ${ui.plural(d.deleted_pictures, "picture")}`); loadPrivacy(); } catch (err) { ui.toast(err.message); }
});
ui.$("#deleteAccount").addEventListener("click", async () => {
  const password = prompt("Type your password to delete your DripDash account for good");
  if (!password) return;
  try { await api.deleteAccount(password); ui.toast("Your account is deleted"); setTimeout(() => ui.go("index.html"), 800); } catch (err) { ui.toast(err.message); }
});

ui.$("#signOut").addEventListener("click", async () => { await api.logout(); ui.go("index.html"); });

if (ui.needSignIn()) {
  Promise.all([loadDetails(), loadWallet(), loadDevices(), loadPrivacy()]).catch((err) => ui.toast(err.message));
}
