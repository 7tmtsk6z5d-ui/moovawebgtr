const FLAVORS = [
  { id: "strawberry", name: "Strawberry", english: "Berry blush", blurb: "Susu strawberry creamy dengan rasa buah yang nyatanya ada.", pitch: "Pink, creamy, and a little bit flirty. Fresh milk folded with real strawberry.", price: 10000, image: "./products/strawberry.jpg" },
  { id: "coklat", name: "Coklat", english: "Cocoa silk", blurb: "Susu coklat kental, manisnya pas, cocok dingin-dingin.", pitch: "Velvet cocoa in cold fresh milk. The one you finish before the straw does.", price: 10000, image: "./products/coklat.jpg" },
  { id: "matcha", name: "Matcha", english: "Green cream", blurb: "Matcha lembut, tidak pahit, nyatu sama susu murni.", pitch: "Ceremonial-soft matcha, milky and calm. Green, but make it dessert.", price: 10000, image: "./products/matcha.jpg" },
  { id: "murni", name: "Murni", english: "Just milk", blurb: "Susu murni tanpa campuran. Harga special — yang paling jujur.", pitch: "Nothing added. Cold, clean, farm-fresh milk in its Sunday clothes.", price: 7000, image: "./products/murni.jpg" },
  { id: "lainnya", name: "Lainnya", english: "Custom sip", blurb: "Punya request sendiri? Tulis ke CS, kami bikinin.", pitch: "Tarik, vanilla, extra coklat, kurang manis — chat aja. CS Moova siap request.", price: 10000, image: "./products/lainnya.jpg", custom: true },
];
const SUGARS = [
  { id: "100", label: "100%", hint: "Normal" },
  { id: "50", label: "50%", hint: "Less sweet" },
  { id: "0", label: "0%", hint: "No added sugar" },
];
const STORE = { lat: -7.8278, lng: 110.3998, address: "Jl. Tegalturi, depan Taman Budaya Giwangan, Yogyakarta" };
const WA = "6287825053557";
const BCA = "4452309711";
const CART_KEY = "moova-static-cart-1567-v8";
const state = {
  flavor: "strawberry",
  sugar: "100",
  qty: 1,
  customNote: "",
  cart: loadCart(),
  delivery: null,
  proof: null,
  proofPreviewUrl: "",
  pay: "qris",
};

const $ = (id) => document.getElementById(id);
const rupiah = (n) => `Rp ${Number(n).toLocaleString("id-ID")}`;
const flavor = () => FLAVORS.find((x) => x.id === state.flavor) || FLAVORS[0];
const sugar = () => SUGARS.find((x) => x.id === state.sugar) || SUGARS[0];

function loadCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}
function saveCart() { localStorage.setItem(CART_KEY, JSON.stringify(state.cart)); }
function keyFor(f, s, sugarId, note) { return `${f}-${s}-${sugarId}-${(note || "").trim().toLowerCase()}`; }
function addCurrent() {
  const f = flavor();
  const note = f.custom ? state.customNote.trim() : "";
  if (f.custom && !note) {
    $("hero-hint").textContent = "Tulis request rasanya dulu ya.";
    $("hero-hint").hidden = false;
    return;
  }
  const key = keyFor(f.id, "350", state.sugar, note);
  const existing = state.cart.find((x) => x.key === key);
  if (existing) existing.qty = Math.min(20, existing.qty + state.qty);
  else state.cart.push({ key, flavorId: f.id, size: "350", sugar: state.sugar, qty: state.qty, note });
  saveCart();
  renderCart();
  openDrawer();
}
function setFlavor(id) { state.flavor = id; renderHero(); }
function cycle(dir) {
  const i = FLAVORS.findIndex((x) => x.id === state.flavor);
  setFlavor(FLAVORS[(i + dir + FLAVORS.length) % FLAVORS.length].id);
}
function setSugar(id) { state.sugar = id; renderHero(); }
function getSugarLabel(id) { return (SUGARS.find((x) => x.id === id) || SUGARS[0]).hint; }
function getDistanceKm(lat, lng) {
  const rad = (d) => d * Math.PI / 180;
  const dLat = rad(lat - STORE.lat), dLng = rad(lng - STORE.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(STORE.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function deliveryFor(km) {
  if (km <= 5) return { fee: 0, label: "Gratis sampai 5 km" };
  if (km <= 8) return { fee: 5000, label: "Ongkir Rp 5.000 (5–8 km)" };
  if (km <= 12) return { fee: 10000, label: "Ongkir Rp 10.000 (8–12 km)" };
  if (km <= 15) return { fee: 15000, label: "Ongkir Rp 15.000 (12–15 km)" };
  return { fee: null, label: "Di atas 15 km · konfirmasi ongkir" };
}
function mapsLocationUrl(lat, lng) { return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`; }
function mapsDirectionsUrl(lat, lng) { return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(STORE.address)}&destination=${lat},${lng}&travelmode=driving`; }
function renderHero() {
  const f = flavor();
  $("hero-stage").dataset.flavor = f.id;
  $("hero-image").src = f.image;
  $("hero-image").alt = `Botol Moova rasa ${f.name}`;
  $("hero-english").textContent = f.english;
  $("hero-name").textContent = f.name;
  $("hero-pitch").textContent = f.pitch;
  $("hero-price").textContent = rupiah(f.price);
  $("hero-qty").textContent = state.qty;
  $("hero-custom-wrap").hidden = !f.custom;
  $("hero-custom").value = state.customNote;
  renderHeroFlavors();
  renderSugar();
  renderFlavorGrid();
}
function renderHeroFlavors() {
  $("hero-flavors").innerHTML = FLAVORS.map((x) => {
    const active = x.id === state.flavor;
    return `<li><button type="button" data-flavor-id="${x.id}" class="flex items-center gap-2 rounded-full px-3 py-2 font-display text-sm whitespace-nowrap transition-colors lg:px-2 ${active ? "bg-[var(--stage-ghost)] font-semibold" : "opacity-70 hover:opacity-100"}"><span class="grid size-3.5 place-items-center rounded-full border border-current ${active ? "bg-foam text-ink" : ""}">${active ? '<span class="size-1.5 rounded-full bg-ink"></span>' : ""}</span>${x.name}</button></li>`;
  }).join("");
  document.querySelectorAll("[data-flavor-id]").forEach((btn) => btn.addEventListener("click", () => setFlavor(btn.dataset.flavorId)));
}
function renderSugar() {
  $("hero-sugar").innerHTML = SUGARS.map((x) => `<button type="button" class="sugar-choice ${x.id === state.sugar ? "is-active" : ""}" data-sugar-id="${x.id}" title="${x.hint}">${x.label}</button>`).join("");
  document.querySelectorAll("[data-sugar-id]").forEach((btn) => btn.addEventListener("click", () => setSugar(btn.dataset.sugarId)));
}
function renderFlavorGrid() {
  const el = $("flavor-grid");
  el.innerHTML = FLAVORS.map((f) => `<article class="overflow-hidden rounded-[1.6rem] bg-foam shadow-[var(--shadow-card)]"><button type="button" data-pick="${f.id}" class="block w-full" aria-label="Lihat ${f.name}"><div class="shot overflow-hidden bg-cream"><img src="${f.image}" alt="" loading="lazy" class="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]" /></div></button><div class="space-y-3 p-5"><div class="flex items-start justify-between gap-3"><div><h3 class="font-display text-2xl font-semibold">${f.name}</h3><p class="text-sm text-ink-soft">${f.blurb}</p></div><p class="font-display text-lg font-semibold tabular-nums">${rupiah(f.price)}</p></div>${f.custom ? '<input class="field" data-custom-card="1" placeholder="Tulis request rasa…" value="" />' : ''}<div class="flex items-center justify-between gap-3"><p class="text-xs text-ink-soft">350 ml · pilihan gula</p><button type="button" data-add="${f.id}" class="foam-btn h-10 bg-ink px-4 text-sm text-foam hover:bg-ink">Tambah</button></div></div></article>`).join("");
  el.querySelectorAll("[data-pick]").forEach((b) => b.addEventListener("click", () => setFlavor(b.dataset.pick)));
  el.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => { setFlavor(b.dataset.add); const f = flavor(); if (f.custom) { const cardInput = el.querySelector('[data-custom-card="1"]'); state.customNote = cardInput ? cardInput.value : state.customNote; } addCurrent(); }));
  const customInput = el.querySelector('[data-custom-card="1"]');
  if (customInput) customInput.addEventListener("input", (e) => { state.customNote = e.target.value; $("hero-custom").value = state.customNote; });
}
function cartSubtotal() { return state.cart.reduce((sum, line) => sum + (FLAVORS.find((x) => x.id === line.flavorId)?.price || 0) * line.qty, 0); }
function renderCart() {
  const count = state.cart.reduce((s, x) => s + x.qty, 0);
  const badge = $("cart-badge");
  badge.textContent = count; badge.hidden = count === 0;
  $("cart-empty").hidden = state.cart.length > 0;
  $("cart-list").innerHTML = state.cart.map((line) => {
    const f = FLAVORS.find((x) => x.id === line.flavorId) || FLAVORS[0];
    const sub = f.price * line.qty;
    return `<li class="flex items-center gap-3 rounded-2xl bg-foam p-3"><img src="${f.image}" alt="" class="size-14 rounded-xl object-cover" /><div class="min-w-0 flex-1"><p class="truncate font-display font-semibold">${f.name}${line.note ? ` · ${escapeHtml(line.note)}` : ""}</p><p class="text-xs text-ink-soft">350 ml · ${getSugarLabel(line.sugar || "100")} · ${rupiah(sub)}</p><div class="mt-1 flex items-center gap-2"><button type="button" class="grid size-7 place-items-center rounded-full bg-cream" data-dec="${line.key}">−</button><span class="min-w-4 text-center font-display text-sm tabular-nums">${line.qty}</span><button type="button" class="grid size-7 place-items-center rounded-full bg-cream" data-inc="${line.key}">+</button></div></div><button type="button" class="grid size-8 place-items-center text-ink-soft" data-remove="${line.key}" aria-label="Hapus">×</button></li>`;
  }).join("");
  const sub = cartSubtotal();
  const fee = state.delivery?.fee ?? 0;
  $("subtotal").textContent = rupiah(sub);
  $("delivery-fee").textContent = state.delivery?.fee === null ? "Konfirmasi" : rupiah(fee);
  $("grand-total").textContent = state.delivery?.fee === null ? "Konfirmasi" : rupiah(sub + fee);
  document.querySelectorAll("[data-dec]").forEach((b) => b.addEventListener("click", () => updateQty(b.dataset.dec, -1)));
  document.querySelectorAll("[data-inc]").forEach((b) => b.addEventListener("click", () => updateQty(b.dataset.inc, 1)));
  document.querySelectorAll("[data-remove]").forEach((b) => b.addEventListener("click", () => removeLine(b.dataset.remove)));
}
function updateQty(key, delta) { const line = state.cart.find((x) => x.key === key); if (!line) return; line.qty += delta; if (line.qty < 1) state.cart = state.cart.filter((x) => x.key !== key); line.qty = Math.min(20, line.qty); saveCart(); renderCart(); }
function removeLine(key) { state.cart = state.cart.filter((x) => x.key !== key); saveCart(); renderCart(); }
function openDrawer() { $("drawer-overlay").hidden = false; $("drawer").hidden = false; document.body.classList.add("modal-scroll-lock"); renderCart(); }
function closeDrawer() { $("drawer-overlay").hidden = true; $("drawer").hidden = true; document.body.classList.remove("modal-scroll-lock"); }
function setPay(method) { state.pay = method; $("qris-box").hidden = method !== "qris"; $("bca-box").hidden = method !== "bca"; $("pay-qris").className = `rounded-2xl border p-3 text-sm ${method === "qris" ? "border-berry bg-foam" : "border-transparent bg-foam/60"}`; $("pay-bca").className = `rounded-2xl border p-3 text-sm ${method === "bca" ? "border-berry bg-foam" : "border-transparent bg-foam/60"}`; }
function useLocation() {
  if (!navigator.geolocation) { showError("Browser ini tidak menyediakan lokasi. Tulis alamat secara manual."); return; }
  showError(""); $("location-status").hidden = false; $("location-status").textContent = "Mencari lokasi…";
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    const distanceKm = getDistanceKm(coords.latitude, coords.longitude);
    const d = deliveryFor(distanceKm);
    state.delivery = { lat: coords.latitude, lng: coords.longitude, distanceKm, ...d, url: mapsLocationUrl(coords.latitude, coords.longitude) };
    $("location-status").innerHTML = `Lokasi terdeteksi sekitar <strong>${distanceKm.toFixed(1)} km</strong> · ${d.label}. <a href="${state.delivery.url}" target="_blank" rel="noreferrer" class="font-semibold underline underline-offset-4">Buka lokasi</a>`;
    renderCart();
    window.open(mapsDirectionsUrl(coords.latitude, coords.longitude), "_blank", "noopener,noreferrer");
  }, () => { $("location-status").textContent = "Lokasi belum bisa diakses. Izinkan lokasi atau tulis alamat manual."; }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
}
function showError(text) { $("drawer-error").textContent = text; $("drawer-error").hidden = !text; }
function escapeHtml(text) { return String(text).replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c])); }
function proofSelected(file) {
  state.proof = file;
  if (state.proofPreviewUrl) URL.revokeObjectURL(state.proofPreviewUrl);
  if (!file) { state.proofPreviewUrl = ""; $("proof-preview").classList.remove("is-visible"); return; }
  state.proofPreviewUrl = URL.createObjectURL(file);
  $("proof-image").src = state.proofPreviewUrl;
  $("proof-preview").classList.add("is-visible");
  $("proof-status").textContent = `${file.name} · ${Math.round(file.size / 1024)} KB`;
}
async function shareProof() {
  if (!state.proof) return;
  try {
    if (navigator.share && navigator.canShare?.({ files: [state.proof] })) {
      await navigator.share({ title: "Bukti pembayaran MŌVA", text: "Bukti pembayaran MŌVA", files: [state.proof] });
      $("proof-status").textContent = "Bukti dibagikan. Lanjutkan chat WhatsApp untuk mengirim pesanan.";
      return;
    }
  } catch {}
  window.open(`https://wa.me/${WA}?text=${encodeURIComponent("Halo Moova, saya akan kirim bukti pembayaran di chat ini.")}`, "_blank", "noopener,noreferrer");
  $("proof-status").textContent = "WhatsApp dibuka. Lampirkan foto bukti di chat.";
}
function buildMessage() {
  const lines = state.cart.map((line) => { const f = FLAVORS.find((x) => x.id === line.flavorId) || FLAVORS[0]; const sub = f.price * line.qty; return `• ${f.name}${line.note ? ` (${line.note})` : ""} 350ml · ${getSugarLabel(line.sugar || "100")} x${line.qty} = ${rupiah(sub)}`; });
  const sub = cartSubtotal(); const delivery = state.delivery ? (state.delivery.fee === null ? "konfirmasi" : rupiah(state.delivery.fee)) : "alamat pelanggan"; const total = state.delivery?.fee === null ? "konfirmasi ongkir" : rupiah(sub + (state.delivery?.fee || 0));
  return ["Halo Moova! Saya mau pesan:", "", ...lines, "", `Subtotal: ${rupiah(sub)}`, `Delivery: ${state.delivery ? `${state.delivery.distanceKm.toFixed(1)} km · ${delivery}` : delivery}`, `Total: ${total}`, `Bayar: ${state.pay === "qris" ? "QRIS" : `Transfer BCA ${BCA}`}`, `Bukti pembayaran: ${state.proof ? "sudah dipilih — lampirkan foto di chat" : "belum dilampirkan"}`, "", `Nama: ${$("customer-name").value || "-"}`, `WA: ${$("customer-phone").value || "-"}`, `Alamat: ${$("customer-address").value || "-"}`, state.delivery ? `Lokasi Maps: ${state.delivery.url}` : "", $("customer-notes").value ? `Catatan: ${$("customer-notes").value}` : ""].filter(Boolean).join("\n");
}
function sendOrder() {
  if (!state.cart.length) { showError("Keranjang masih kosong."); return; }
  if (!$("customer-name").value.trim() || !$("customer-phone").value.trim() || !$("customer-address").value.trim()) { showError("Isi nama, WhatsApp, dan alamat dulu ya."); return; }
  if (!state.proof) { showError("Pilih foto bukti pembayaran dulu ya, supaya CS bisa verifikasi manual."); return; }
  showError("");
  window.open(`https://wa.me/${WA}?text=${encodeURIComponent(buildMessage())}`, "_blank", "noopener,noreferrer");
}

$("hero-prev").addEventListener("click", () => cycle(-1));
$("hero-next").addEventListener("click", () => cycle(1));
$("hero-minus").addEventListener("click", () => { state.qty = Math.max(1, state.qty - 1); renderHero(); });
$("hero-plus").addEventListener("click", () => { state.qty = Math.min(20, state.qty + 1); renderHero(); });
$("hero-custom").addEventListener("input", (e) => { state.customNote = e.target.value; $("hero-hint").hidden = true; });
$("hero-order").addEventListener("click", addCurrent);
$("nav-order").addEventListener("click", openDrawer);
$("nav-cart").addEventListener("click", openDrawer);
$("shop-order").addEventListener("click", openDrawer);
$("drawer-close").addEventListener("click", closeDrawer);
$("drawer-overlay").addEventListener("click", closeDrawer);
$("use-location").addEventListener("click", useLocation);
$("send-order").addEventListener("click", sendOrder);
$("proof").addEventListener("change", (e) => proofSelected(e.target.files?.[0] || null));
$("share-proof").addEventListener("click", shareProof);
document.querySelectorAll('input[name="pay"]').forEach((radio) => radio.addEventListener("change", () => setPay(radio.value)));
$("copy-account").addEventListener("click", async () => { try { await navigator.clipboard.writeText(BCA); $("copy-status").textContent = "Nomor rekening tersalin · MO*** DAF*** FAK*** · Bank Central Asia"; } catch { $("copy-status").textContent = "Nomor: 4452309711 · MO*** DAF*** FAK*** · Bank Central Asia"; } });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("drawer").hidden) closeDrawer(); if (e.key === "ArrowRight" && $("drawer").hidden) cycle(1); if (e.key === "ArrowLeft" && $("drawer").hidden) cycle(-1); });

renderHero();
renderCart();
setPay("qris");
