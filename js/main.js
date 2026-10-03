import { CONFIG } from "./config.js";
import { FLAVORS, SIZES } from "./data.js";
import { BottleScene } from "./three-scene.js";

const state = {
  milkType: "fresh",
  flavor: "murni",
  size: "350",
  qty: 1,
  sugar: "100",
  cart: [],
  distanceKm: 3,
  payment: "qris",
  paymentProof: null,
  lastOrder: null,
  proofPreviewUrl: null,
  customNote: "",
  deliveryMapsUrl: ""
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const fmt = (n) => new Intl.NumberFormat("id-ID", { style:"currency", currency:"IDR", maximumFractionDigits:0 }).format(n).replace(/\s/g,"");
const priceFor = (milkType, size, flavorId = state.flavor) => flavorId === CONFIG.pricing.pureFlavorId ? CONFIG.pricing.products[milkType]?.[size] ?? 0 : CONFIG.pricing.flavorPrice;
const flavorById = (id) => FLAVORS.find(f => f.id === id) || FLAVORS[0];
const productName = () => CONFIG.pricing.products[state.milkType].name;

function showToast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => el.classList.remove("show"), 2200);
}

function getDelivery(distanceKm = state.distanceKm) {
  const km = Number(distanceKm);
  if (!Number.isFinite(km) || km < 0) return { fee: 0, label: "Masukkan jarak valid", manual: true };
  for (const tier of CONFIG.delivery.tiers) {
    if (km <= tier.maxKm) return { fee: tier.fee, label: tier.label, manual: false };
  }
  return { fee: 0, label: "Konfirmasi manual", manual: true };
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => v * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function roadDistanceKm(lat, lng) {
  const o = CONFIG.delivery.storeOrigin;
  const url = `https://router.project-osrm.org/route/v1/driving/${o.lng},${o.lat};${lng},${lat}?overview=false`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    clearTimeout(timer);
    if (!res.ok) throw new Error("routing unavailable");
    const data = await res.json();
    const meters = data?.routes?.[0]?.distance;
    if (!Number.isFinite(meters)) throw new Error("route missing");
    return meters / 1000;
  } catch {
    return haversineKm(o.lat, o.lng, lat, lng);
  }
}

function cartSubtotal() {
  return state.cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
}

function cartDelivery() {
  const d = getDelivery();
  return d.manual ? 0 : d.fee;
}

function cartTotal() {
  return cartSubtotal() + cartDelivery();
}

function productKey() {
  return `${state.milkType}_${state.size}_${state.flavor}_${state.sugar}_${state.customNote.trim().toLowerCase()}`;
}

function renderFlavors() {
  $("#flavorSelector").innerHTML = FLAVORS.map(f => `
    <button type="button" class="flavor-btn ${f.id === state.flavor ? "active":""}" data-flavor="${f.id}" role="radio" aria-checked="${f.id === state.flavor}">
      <span class="swatch" style="background:${f.hex}"></span><span class="flavor-name">${f.name}</span>
    </button>`).join("");
  $$("#flavorSelector .flavor-btn").forEach(btn => btn.addEventListener("click", () => {
    state.flavor = btn.dataset.flavor;
    render();
    document.querySelector(`[data-flavor="${state.flavor}"]`)?.scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"});
  }));
}

function renderSizes() {
  $("#sizeGroup").innerHTML = SIZES.map(s => `
    <button type="button" class="size-btn ${s.id === state.size ? "active":""}" data-size="${s.id}" aria-pressed="${s.id === state.size}">${s.label}</button>`).join("");
  $$("#sizeGroup .size-btn").forEach(btn => btn.addEventListener("click", () => { state.size = btn.dataset.size; render(); }));
}

function renderSugarLevels() {
  const levels = [
    { id: "100", label: "100%", hint: "Normal" },
    { id: "50", label: "50%", hint: "Less sweet" },
    { id: "0", label: "0%", hint: "No added sugar" }
  ];
  $("#sugarGroup").innerHTML = levels.map(s => `
    <button type="button" class="size-btn ${s.id === state.sugar ? "active": ""}" data-sugar="${s.id}" aria-pressed="${s.id === state.sugar}">${s.label}<small>${s.hint}</small></button>`).join("");
  $$("#sugarGroup .size-btn").forEach(btn => btn.addEventListener("click", () => { state.sugar = btn.dataset.sugar; render(); }));
}

function renderFlavorCards() {
  $("#flavorCards").innerHTML = FLAVORS.map(f => `
    <article class="flavor-card">
      <div class="card-top"><div><h3>${f.name}</h3><p>${f.subtitle}</p></div><span class="big-swatch" style="background:${f.hex}"></span></div>
      <button type="button" data-card-flavor="${f.id}">Use ${f.name} <span>↗</span></button>
    </article>`).join("");
  $$("#flavorCards [data-card-flavor]").forEach(btn => btn.addEventListener("click", () => {
    state.flavor = btn.dataset.cardFlavor;
    render();
    $("#product").scrollIntoView({behavior:"smooth"});
  }));
}

function renderProductSummary() {
  const f = flavorById(state.flavor);
  const price = priceFor(state.milkType, state.size, state.flavor);
  $("#selectedName").textContent = `${f.name} · ${state.size} ml`;
  $("#selectedPrice").textContent = fmt(price);
  $("#selectedSubtitle").textContent = f.subtitle;
  $("#milkPill").textContent = productName();
  $("#sizePill").textContent = `${state.size} ml`;
  $("#sugarPill").textContent = `${state.sugar}% sugar`;
  $("#artPrice").textContent = fmt(price);
  $("#stageFlavor").textContent = f.name;
  $("#qtyOutput").textContent = state.qty;
  const customWrap = $("#customFlavorWrap");
  if (customWrap) {
    customWrap.classList.toggle("hidden", !f.custom);
    const input = $("#customFlavorNote");
    if (input && input.value !== state.customNote) input.value = state.customNote;
  }
  scene?.setFlavor(f.hex);
}

function addCurrentToCart() {
  if (state.flavor === "lainnya" && !state.customNote.trim()) { showToast("Tulis request rasa untuk Lainnya dulu."); return; }
  const key = productKey();
  const existing = state.cart.find(i => i.key === key);
  const item = {
    key,
    milkType: state.milkType,
    milkName: productName(),
    flavor: state.flavor,
    flavorName: flavorById(state.flavor).name,
    size: state.size,
    unitPrice: priceFor(state.milkType, state.size, state.flavor),
    sugar: state.sugar,
    customNote: state.customNote.trim(),
    qty: state.qty
  };
  if (existing) existing.qty += state.qty;
  else state.cart.push(item);
  state.qty = 1;
  renderCart();
  showToast("Added to cart");
}

function renderCart() {
  const count = state.cart.reduce((n, i) => n + i.qty, 0);
  $("#cartCount").textContent = count;
  if (!state.cart.length) {
    $("#cartItems").innerHTML = `<div class="receipt-box"><b>Your bag is empty.</b><p class="muted">Pilih produk terlebih dahulu.</p></div>`;
  } else {
    $("#cartItems").innerHTML = state.cart.map((i, idx) => `
      <div class="cart-row">
        <div>
          <strong>${i.milkName}</strong>
          <small>${i.flavorName}${i.customNote ? ` · ${i.customNote}` : ""} · ${i.size} ml · ${i.sugar}% sugar · ${fmt(i.unitPrice)}</small>
        </div>
        <div class="cart-row-actions">
          <button data-cart-minus="${idx}" aria-label="Kurangi ${i.flavorName}">−</button>
          <span>${i.qty}</span>
          <button data-cart-plus="${idx}" aria-label="Tambah ${i.flavorName}">+</button>
        </div>
      </div>`).join("");
  }
  $$("#cartItems [data-cart-minus]").forEach(b => b.addEventListener("click", () => updateCartQty(Number(b.dataset.cartMinus), -1)));
  $$("#cartItems [data-cart-plus]").forEach(b => b.addEventListener("click", () => updateCartQty(Number(b.dataset.cartPlus), 1)));
  $("#cartSubtotal").textContent = fmt(cartSubtotal());
  const d = getDelivery();
  $("#cartDelivery").textContent = d.manual ? "Konfirmasi" : fmt(d.fee);
  $("#cartTotal").textContent = d.manual ? fmt(cartSubtotal()) : fmt(cartTotal());
  updateCheckoutSummary();
}

function updateCartQty(index, delta) {
  const item = state.cart[index];
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) state.cart.splice(index, 1);
  renderCart();
}

function updateDeliveryUI() {
  state.distanceKm = Number($("#distanceKm").value || 0);
  const d = getDelivery();
  $("#deliveryResult").innerHTML = d.manual
    ? `<b>Konfirmasi manual</b><span>&gt; ${CONFIG.delivery.manualConfirmationAboveKm} km</span>`
    : `<b>${d.label}</b><span>${state.distanceKm} km</span>`;
  renderCart();
}

function updateCheckoutSummary() {
  $("#checkoutMiniItems").innerHTML = state.cart.map(i => `<div class="item"><span>${i.milkName} · ${i.flavorName}${i.customNote ? ` · ${i.customNote}` : ""} · ${i.size} ml · ${i.sugar}% sugar × ${i.qty}</span><b>${fmt(i.unitPrice*i.qty)}</b></div>`).join("");
  const d = getDelivery();
  $("#checkoutMiniSubtotal").textContent = fmt(cartSubtotal());
  $("#checkoutMiniDelivery").textContent = d.manual ? "Konfirmasi" : fmt(d.fee);
  $("#checkoutMiniTotal").textContent = d.manual ? fmt(cartSubtotal()) : fmt(cartTotal());
}

function openLayer(id) {
  const el = $(id);
  el.setAttribute("aria-hidden","false");
}
function closeLayer(id) {
  const el = $(id);
  el.setAttribute("aria-hidden","true");
}

function paymentTab(pay) {
  state.payment = pay;
  $$(".pay-tab").forEach(b => b.classList.toggle("active", b.dataset.pay === pay));
  $("#paymentQR").classList.toggle("hidden", pay !== "qris");
  $("#paymentBCA").classList.toggle("hidden", pay !== "bca");
  $("#paymentMethod").value = pay;
}

function orderId() {
  const now = new Date();
  const date = now.toISOString().slice(0,10).replaceAll("-","");
  const rnd = Math.random().toString(36).slice(2,6).toUpperCase();
  return `MOVA-${date}-${rnd}`;
}

function buildWhatsAppMessage(order) {
  const lines = [
    "MŌVA FRESH MILK",
    "ORDER RECEIPT",
    "",
    `Order ID: ${order.id}`,
    `Tanggal: ${order.date}`,
    "",
    "Items:"
  ];
  order.items.forEach(i => lines.push(`- ${i.milkName} · ${i.flavorName}${i.customNote ? ` (${i.customNote})` : ""} · ${i.size} ml · sugar ${i.sugar}% · x${i.qty}`));
  lines.push(
    "",
    `Subtotal: ${fmt(order.subtotal)}`,
    `Delivery: ${order.deliveryManual ? "Konfirmasi manual" : fmt(order.delivery)}`,
    `Jarak: ${order.distanceKm} km`,
    order.deliveryMapsUrl ? `Google Maps lokasi: ${order.deliveryMapsUrl}` : "",
    `Payment: ${order.payment === "qris" ? "QRIS" : "BCA"}`,
    `Payment verification: MENUNGGU VERIFIKASI MANUAL`,
    `Bukti pembayaran: ${order.paymentProofName ? "tersedia — mohon lampirkan bila tidak ikut terbagi otomatis" : "belum ada"}`,
    `Total: ${order.deliveryManual ? fmt(order.subtotal) : fmt(order.total)}`,
    "",
    `Customer: ${order.customerName}`,
    `WhatsApp: ${order.customerPhone}`,
    `Address: ${order.address}`,
    order.note ? `Catatan: ${order.note}` : "",
    "",
    "Terima kasih telah order di MŌVA."
  );
  return lines.filter(Boolean).join("\n");
}

function validateCheckout() {
  if (!state.cart.length) return "Cart masih kosong.";
  const name = $("#customerName").value.trim();
  const phone = $("#customerPhone").value.trim();
  const address = $("#customerAddress").value.trim();
  if (!name || !phone || !address) return "Lengkapi nama, WhatsApp, dan alamat.";
  if (!/^(\+62|62|0)8\d{7,13}$/.test(phone.replace(/[\s-]/g,""))) return "Nomor WhatsApp belum valid.";
  if (CONFIG.payment.verification.requireProof && !state.paymentProof) return "Upload bukti pembayaran terlebih dahulu.";
  return "";
}

function confirmOrder() {
  const err = validateCheckout();
  if (err) { showToast(err); return; }
  const d = getDelivery();
  const order = {
    id: orderId(),
    date: new Intl.DateTimeFormat("id-ID", { dateStyle:"medium", timeStyle:"short" }).format(new Date()),
    items: state.cart.map(i => ({...i})),
    subtotal: cartSubtotal(),
    delivery: d.fee,
    deliveryManual: d.manual,
    distanceKm: state.distanceKm,
    deliveryLabel: d.label,
    total: cartTotal(),
    payment: $("#paymentMethod").value,
    paymentVerified: false,
    paymentProofName: state.paymentProof?.name || "",
    customerName: $("#customerName").value.trim(),
    customerPhone: $("#customerPhone").value.trim(),
    address: $("#customerAddress").value.trim(),
    deliveryMapsUrl: state.deliveryMapsUrl,
    note: $("#customerNote").value.trim()
  };
  state.lastOrder = order;

  $("#receiptContent").innerHTML = `
    <div class="receipt-box">
      <div class="receipt-lines">
        <div class="receipt-line"><span>Order ID</span><b>${order.id}</b></div>
        <div class="receipt-line"><span>Date</span><b>${order.date}</b></div>
      </div>
    </div>
    <div class="receipt-box">
      ${order.items.map(i => `<div class="receipt-line"><span>${i.milkName} · ${i.flavorName}${i.customNote ? ` · ${i.customNote}` : ""} · ${i.size} ml · ${i.sugar}% sugar × ${i.qty}</span><b>${fmt(i.unitPrice*i.qty)}</b></div>`).join("")}
      <div class="receipt-line"><span>Subtotal</span><b>${fmt(order.subtotal)}</b></div>
      <div class="receipt-line"><span>Delivery</span><b>${order.deliveryManual ? "Konfirmasi manual" : fmt(order.delivery)}</b></div>
      <div class="receipt-line"><span>Jarak</span><b>${order.distanceKm} km</b></div>
      <div class="receipt-line"><span>Bukti</span><b>${order.paymentProofName || "Tidak ada"}</b></div>
      <div class="receipt-line total"><span>Total</span><b>${order.deliveryManual ? fmt(order.subtotal) : fmt(order.total)}</b></div>
    </div>
    <div class="receipt-box">
      <div class="receipt-line"><span>Payment</span><b>${order.payment === "qris" ? "QRIS" : "BCA"}</b></div>
      <div class="receipt-line"><span>Verification</span><b>Menunggu verifikasi manual</b></div>
      <div class="receipt-line"><span>Customer</span><b>${order.customerName}</b></div>
      <div class="receipt-line"><span>WhatsApp</span><b>${order.customerPhone}</b></div>
      <div class="receipt-line"><span>Address</span><b>${order.address}</b></div>
      ${order.deliveryMapsUrl ? `<div class="receipt-line"><span>Google Maps</span><a href="${order.deliveryMapsUrl}" target="_blank" rel="noopener">Buka lokasi</a></div>` : ""}
    </div>
  `;
  closeLayer("#checkoutModal");
  openLayer("#receiptModal");
}

async function openWhatsApp() {
  if (!state.lastOrder) return;
  const msg = buildWhatsAppMessage(state.lastOrder);
  const url = `https://wa.me/${CONFIG.whatsapp.number}?text=${encodeURIComponent(msg)}`;

  window.open(url, "_blank", "noopener");
  state.cart = [];
  renderCart();
  showToast("WhatsApp dibuka — lampirkan bukti pembayaran jika belum ikut terkirim");
}

async function shareReceiptAndProof() {
  if (!state.lastOrder || !state.paymentProof?.file || !navigator.share) {
    showToast("Perangkat/browser belum mendukung berbagi file langsung");
    return;
  }
  const msg = buildWhatsAppMessage(state.lastOrder);
  try {
    await navigator.share({ title: `MŌVA ${state.lastOrder.id}`, text: msg, files: [state.paymentProof.file] });
    showToast("Receipt + bukti siap dibagikan");
  } catch (err) {
    if (err?.name !== "AbortError") showToast("Gagal membuka menu berbagi");
  }
}

function createOrderQR() {
  const wrap = $("#orderQr");
  const url = new URL(CONFIG.production.orderPath || "/", window.location.origin).href;
  $("#orderUrlLabel").textContent = url;
  // qrcode-generator is loaded only for this non-critical enhancement.
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";
  script.onload = () => {
    try {
      const qr = window.qrcode(0, "M");
      qr.addData(url);
      qr.make();
      wrap.innerHTML = qr.createImgTag(5, 0);
    } catch {
      wrap.textContent = "QR unavailable";
    }
  };
  script.onerror = () => { wrap.textContent = "QR unavailable"; };
  document.head.appendChild(script);
}

let scene = null;
try {
  scene = new BottleScene($("#bottleStage"), ({supported}) => {
    if (!supported) showToast("3D fallback aktif untuk device/browser ini");
  });
} catch {
  $("#bottleStage").innerHTML = `<div class="bottle-fallback"><div class="fallback-bottle"><div class="fallback-liquid"></div><div class="fallback-label"><b>MŌVA</b><span>FRESH MILK</span></div></div></div>`;
}

$("#qtyMinus").addEventListener("click", () => { state.qty = Math.max(1, state.qty - 1); renderProductSummary(); });
$("#qtyPlus").addEventListener("click", () => { state.qty = Math.min(20, state.qty + 1); renderProductSummary(); });
$("#customFlavorNote")?.addEventListener("input", (e) => { state.customNote = e.target.value; });
$("#addCartBtn").addEventListener("click", addCurrentToCart);
$("#cartBtn").addEventListener("click", () => openLayer("#cartSheet"));
$("#closeCart").addEventListener("click", () => closeLayer("#cartSheet"));
$("#checkoutBtn").addEventListener("click", () => {
  if (!state.cart.length) { showToast("Cart masih kosong."); return; }
  closeLayer("#cartSheet"); openLayer("#checkoutModal"); updateCheckoutSummary();
});
$("#closeCheckout").addEventListener("click", () => closeLayer("#checkoutModal"));
$("#confirmOrderBtn").addEventListener("click", confirmOrder);
$("#closeReceipt").addEventListener("click", () => closeLayer("#receiptModal"));
$("#sendReceiptBtn").addEventListener("click", openWhatsApp);
$("#distanceKm").addEventListener("input", updateDeliveryUI);
async function useCurrentLocation({openMaps = false} = {}) {
  if (!navigator.geolocation) { showToast("Browser tidak mendukung lokasi perangkat"); return; }
  const btn = $("#useLocationBtn");
  btn.disabled = true;
  btn.textContent = "Mencari lokasi…";
  navigator.geolocation.getCurrentPosition(async (pos) => {
    try {
      const { latitude, longitude } = pos.coords;
      const km = await roadDistanceKm(latitude, longitude);
      state.distanceKm = Math.max(0, Math.round(km * 10) / 10);
      state.deliveryMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      $("#distanceKm").value = state.distanceKm;
      $("#deliveryNote").textContent = "Lokasi pengiriman sudah ditandai. Link Google Maps ini ikut dikirim ke MŌVA agar kurir lebih mudah menemukan Anda.";
      updateDeliveryUI();
      if (openMaps) window.open(state.deliveryMapsUrl, "_blank", "noopener");
      showToast(`Lokasi tersimpan · ${state.distanceKm} km`);
    } catch {
      showToast("Lokasi ditemukan, tetapi jarak tidak dapat dihitung otomatis");
    } finally {
      btn.disabled = false;
      btn.textContent = "Perbarui lokasi";
    }
  }, (err) => {
    btn.disabled = false;
    btn.textContent = "Gunakan lokasi saya";
    showToast(err.code === 1 ? "Izin lokasi ditolak" : "Lokasi belum tersedia");
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
}

$("#useLocationBtn").addEventListener("click", () => useCurrentLocation());
$("#openMapsBtn").addEventListener("click", () => useCurrentLocation({openMaps: true}));
$("#paymentProof").addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const allowed = file.type.startsWith("image/") || file.type === "application/pdf";
  if (!allowed) { showToast("Gunakan gambar atau PDF sebagai bukti pembayaran"); e.target.value = ""; return; }
  if (file.size > 8 * 1024 * 1024) { showToast("Bukti pembayaran maksimal 8 MB"); e.target.value = ""; return; }
  if (state.proofPreviewUrl) URL.revokeObjectURL(state.proofPreviewUrl);
  state.paymentProof = { file, name: file.name, type: file.type, size: file.size };
  $("#proofStatus").textContent = "Siap diperiksa";
  const preview = $("#proofPreview");
  if (file.type.startsWith("image/")) {
    state.proofPreviewUrl = URL.createObjectURL(file);
    preview.innerHTML = `<img src="${state.proofPreviewUrl}" alt="Preview bukti pembayaran">`;
  } else {
    state.proofPreviewUrl = null;
    preview.innerHTML = `<div class="proof-pdf">PDF siap dikirim: <b>${file.name}</b></div>`;
  }
  $("#shareProofBtn").classList.remove("hidden");
  showToast("Bukti pembayaran siap diverifikasi");
});
$("#shareProofBtn").addEventListener("click", shareReceiptAndProof);
$("#paymentMethod").addEventListener("change", (e) => paymentTab(e.target.value));
$$(".pay-tab").forEach(b => b.addEventListener("click", () => paymentTab(b.dataset.pay)));
$("#paidQRBtn").addEventListener("click", () => { paymentTab("qris"); showToast("Pembayaran QRIS ditandai untuk checkout"); openLayer("#checkoutModal"); });
$("#paidBCABtn").addEventListener("click", () => { paymentTab("bca"); showToast("Pembayaran BCA ditandai untuk checkout"); openLayer("#checkoutModal"); });
$("#heroScanBtn").addEventListener("click", () => $("#scan").scrollIntoView({behavior:"smooth"}));
$("#copyOrderUrl").addEventListener("click", async () => {
  const url = new URL(CONFIG.production.orderPath || "/", window.location.origin).href;
  try { await navigator.clipboard.writeText(url); showToast("Order link copied"); }
  catch { showToast(url); }
});
$$("[data-milk-jump]").forEach(btn => btn.addEventListener("click", () => {
  state.milkType = btn.dataset.milkJump; render(); $("#product").scrollIntoView({behavior:"smooth"});
}));

["#cartSheet","#checkoutModal","#receiptModal"].forEach(sel => {
  $(sel).addEventListener("click", (e) => { if (e.target === $(sel)) closeLayer(sel); });
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") ["#cartSheet","#checkoutModal","#receiptModal"].forEach(closeLayer);
});

$("#bmLink").href = CONFIG.brand.businessManagerUrl;
$("#year").textContent = new Date().getFullYear();

function render() {
  renderFlavors();
  renderSizes();
  renderSugarLevels();
  renderFlavorCards();
  renderProductSummary();
  renderCart();
  updateDeliveryUI();
}

createOrderQR();
render();
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}), { once: true });
}
