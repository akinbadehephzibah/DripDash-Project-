/* ==========================================================================
   SIGN IN PAGE  (Role 5, Accounts Developer)
   signin.html?next=bag.html&why=bag
   Sign in or create an account, then go back to the page that sent the
   shopper here (`next`), or to the home page.
   ========================================================================== */
const ui = DD.ui;
const api = DD.api;
const DEMO = { email: "demo@dripdash.ng", password: "dripdash-demo" };
const WHY = {
  bag: "Sign in to add this to your bag.",
  save: "Sign in to save pieces to your wishlist.",
  tryon: "Sign in to try things on. Your first 3 previews are free.",
  orders: "Sign in to see your orders.",
};

/* Where to go after signing in. Only pages of this site, never another website. */
function nextPage() {
  const next = ui.param("next") || "index.html";
  return /^[a-z-]+\.html(\?.*)?$/.test(next) ? next : "index.html";
}
function done(user) {
  ui.toast(`Welcome, ${user.first_name}`);
  setTimeout(() => ui.go(nextPage()), 500);
}

function openTab(name) {
  ui.$$("[data-tab]").forEach((b) => {
    const on = b.dataset.tab === name;
    b.classList.toggle("on", on);
    b.setAttribute("aria-selected", on);
  });
  ui.$$("[data-panel]").forEach((f) => { f.hidden = f.dataset.panel !== name; });
}
ui.$$("[data-tab]").forEach((b) => b.addEventListener("click", () => openTab(b.dataset.tab)));
if (ui.param("tab") === "register") openTab("register");
if (WHY[ui.param("why")]) ui.$("#why").innerHTML = `<p class="notice volt">${ui.icon("sparkle")}<span>${ui.esc(WHY[ui.param("why")])}</span></p>`;

async function submitWith(form, call) {
  const button = form.querySelector('button[type="submit"]');
  ui.clearErrors(form);
  ui.busy(button, true);
  try {
    const data = await call(ui.values(form));
    done(data.user);
  } catch (err) {
    ui.showError(form, err);
    ui.busy(button, false);
  }
}
ui.$("#signinForm").addEventListener("submit", (e) => {
  e.preventDefault();
  submitWith(e.currentTarget, (v) => api.login(v.email, v.password));
});
ui.$("#registerForm").addEventListener("submit", (e) => {
  e.preventDefault();
  submitWith(e.currentTarget, (v) => api.register(v));
});
ui.$("#demoBtn").addEventListener("click", () => {
  const form = ui.$("#signinForm");
  form.email.value = DEMO.email;
  form.password.value = DEMO.password;
  form.requestSubmit();
});
if (api.signedIn()) ui.go(nextPage());
