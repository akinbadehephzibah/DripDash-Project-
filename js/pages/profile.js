/* ==========================================================================
   TRY-ON PROFILE PAGE  (Role 6, Try-On Profile Developer)
   Four steps, in order: consent, photo (with quality checks), body marks,
   ready. The API decides which step the shopper is on (profile.next).
   ========================================================================== */
const ui = DD.ui;
const api = DD.api;
let profile = null;
let consent = null;
let chosenFile = null;

/* Show one step and light up the stepper (given). */
function show(step) {
  const order = ["consent", "photo", "fit", "ready"];
  ui.$$("[data-panel]").forEach((p) => { p.hidden = p.dataset.panel !== step; });
  ui.$$("#stepper li").forEach((li) => {
    const i = order.indexOf(li.dataset.step), now = order.indexOf(step);
    li.classList.toggle("done", i < now);
    li.classList.toggle("on", i === now);
  });
  if (step === "fit") fitEditor.load(profile.photo.url, profile.fit);
  if (step === "ready") showReady();
}

async function refresh(step) {
  const data = await api.profile();
  profile = data.profile;
  show(step || profile.next);
}

async function showConsent() {
  const data = await api.consent();
  consent = data.consent;
  ui.$("#consentTitle").textContent = consent.title;
  ui.$("#consentPoints").innerHTML = consent.points.map((p) => `<li>${ui.icon("check")}<span>${ui.esc(p)}</span></li>`).join("");
  ui.$("#guide").innerHTML = data.photo_guide.map((g) => `<li><b>${ui.esc(g.title)}</b><span class="small muted">${ui.esc(g.text)}</span></li>`).join("");
}

ui.$("#consentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  ui.clearErrors(form);
  if (!form.agree.checked) {
    ui.showError(form, { message: "Tick the box to agree first.", field: "agree" });
    return;
  }
  ui.busy(button, true);
  try {
    await api.giveConsent(consent.version, form.adult.checked);
    await refresh();
  } catch (err) {
    ui.showError(form, err);
  }
  ui.busy(button, false);
});

ui.$("#photoInput").addEventListener("change", (e) => {
  chosenFile = e.target.files[0] || null;
  if (!chosenFile) return;
  const img = ui.$("#photoPreview");
  img.src = URL.createObjectURL(chosenFile);
  img.hidden = false;
  ui.$("#dropEmpty").hidden = true;
  ui.$("#checks").innerHTML = "";
  ui.$("#uploadBtn").disabled = false;
});

ui.$("#uploadBtn").addEventListener("click", async (e) => {
  const button = e.currentTarget;
  ui.busy(button, true);
  try {
    const data = await api.uploadPhoto(chosenFile);
    renderChecks(data.checks);
    setTimeout(() => refresh(), 900);
  } catch (err) {
    if (err.data && err.data.checks) renderChecks(err.data.checks);
    else ui.problem(ui.$("#checks"), err);
  }
  ui.busy(button, false);
});

function renderChecks(checks) {
  const icon = { pass: "check", warn: "alert", fail: "x" };
  ui.$("#checks").innerHTML = `<ul class="checks-list">${checks.map((c) => `
    <li class="check-row ${c.status}">${ui.icon(icon[c.status])}<b>${ui.esc(c.label)}</b>${c.tip ? `<span class="small">${ui.esc(c.tip)}</span>` : ""}</li>`).join("")}</ul>`;
}

/* The body-mark editor (given): drag four marks over the photo.
   fitEditor.value() returns { shoulder_l: [x, y], shoulder_r: [x, y], hip_y, ankle_y },
   every number between 0 and 1 (a share of the photo's width or height). */
const fitEditor = (function () {
  const stage = ui.$("#fitStage");
  const img = ui.$("#fitPhoto");
  let fit = null, start = null;
  function place() {
    if (!fit) return;
    const m = (k) => stage.querySelector(`[data-mark="${k}"]`);
    m("shoulder_l").style.cssText = `left:${fit.shoulder_l[0] * 100}%;top:${fit.shoulder_l[1] * 100}%`;
    m("shoulder_r").style.cssText = `left:${fit.shoulder_r[0] * 100}%;top:${fit.shoulder_r[1] * 100}%`;
    m("hip_y").style.cssText = `top:${fit.hip_y * 100}%`;
    m("ankle_y").style.cssText = `top:${fit.ankle_y * 100}%`;
  }
  function move(mark, x, y) {
    const clamp = (v) => Math.max(0.02, Math.min(0.98, v));
    if (mark === "hip_y" || mark === "ankle_y") fit[mark] = clamp(y);
    else fit[mark] = [clamp(x), clamp(y)];
    place();
  }
  stage.addEventListener("pointerdown", (e) => {
    const mark = e.target.closest("[data-mark]");
    if (!mark) return;
    e.preventDefault();
    mark.setPointerCapture(e.pointerId);
    start = mark.dataset.mark;
  });
  stage.addEventListener("pointermove", (e) => {
    if (!start) return;
    const r = img.getBoundingClientRect();
    move(start, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  });
  stage.addEventListener("pointerup", () => { start = null; });
  stage.addEventListener("keydown", (e) => {          // arrow keys move a focused mark
    const mark = e.target.closest("[data-mark]");
    const d = { ArrowLeft: [-0.01, 0], ArrowRight: [0.01, 0], ArrowUp: [0, -0.01], ArrowDown: [0, 0.01] }[e.key];
    if (!mark || !d) return;
    e.preventDefault();
    const k = mark.dataset.mark;
    const cur = Array.isArray(fit[k]) ? fit[k] : [0.5, fit[k]];
    move(k, cur[0] + d[0], cur[1] + d[1]);
  });
  return {
    load(url, value) { img.src = url; fit = JSON.parse(JSON.stringify(value)); place(); },
    value() { return fit; },
    reset() { fit = { shoulder_l: [0.39, 0.24], shoulder_r: [0.61, 0.24], hip_y: 0.52, ankle_y: 0.93 }; place(); },
  };
})();
ui.$("#resetFit").addEventListener("click", () => fitEditor.reset());

ui.$("#saveFit").addEventListener("click", async (e) => {
  const button = e.currentTarget;
  ui.busy(button, true);
  ui.$("#fitMsg").innerHTML = "";
  try {
    await api.saveFit(fitEditor.value());
    await api.approveProfile();
    ui.toast("Your try-on profile is ready");
    await refresh();
  } catch (err) {
    ui.problem(ui.$("#fitMsg"), err);
  }
  ui.busy(button, false);
});

/* The ready step, replace and delete (given). */
function showReady() {
  ui.$("#readyPhoto").src = profile.photo.url;
  ui.$("#readyText").textContent = `Profile made ${ui.date(profile.approved_at)}. ` +
    (profile.last_used_at ? `Last used ${ui.ago(profile.last_used_at)}. ` : "") +
    `We delete your photo after ${profile.retention_days} days without a try-on.`;
}
ui.$("#replaceBtn").addEventListener("click", () => show("photo"));
ui.$("#deleteBtn").addEventListener("click", async () => {
  const yes = await ui.confirm({ title: "Delete your photo?", text: "Your photo and every preview made from it are deleted for good. Your orders and credits stay.", ok: "Delete everything", danger: true });
  if (!yes) return;
  try {
    const d = await api.deleteProfile();
    ui.toast(`Deleted ${ui.plural(d.deleted_pictures, "picture")}`);
    refresh();
  } catch (err) { ui.toast(err.message); }
});

if (ui.needSignIn("tryon")) {
  showConsent().then(() => refresh()).catch((err) => ui.problem(ui.$(".page-head"), err));
}
