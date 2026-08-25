const BASE_PROCESSES = ["Diagnóstico", "Horma", "Desmanchado", "Limpieza", "Secado", "Restauración de color", "Control de calidad", "Listo para entrega"];
const SERVICE_NAMES = ["Horma", "Desmanchado", "Limpieza", "Secado", "Restauración de color"];
const DEFAULT_PRICES = { "Horma": 15000, "Desmanchado": 12000, "Limpieza": 25000, "Secado": 5000, "Restauración de color": 30000 };
const ITEM_TYPES = ["Tenis", "Gorra", "Accesorio", "Camisa", "Pantalón"];
const storeKey = "tenis-clean-control-v2";
const photoDbName = "tenis-clean-control-files";
const photoStoreName = "photos";
const maxPhotoBytes = 100 * 1024 * 1024;
const $ = (selector) => document.querySelector(selector);
let deferredPrompt;
let state = loadState();
let serviceDrafts = { 0: { services: ["Desmanchado", "Limpieza", "Secado"], prices: {} } };
const ACCOUNTS = { Admin01: { password: "2010", role: "admin" }, Trabajador01: { password: "Zapato", role: "worker" } };
function serviceNames() { return state.serviceNames || SERVICE_NAMES; }

function loadState() {
  const saved = localStorage.getItem(storeKey);
  if (saved) return normalizeState(JSON.parse(saved));
  return normalizeState({ companyName: "Dixort Cleaning", accent: "#126b57", role: "admin", prices: DEFAULT_PRICES, orders: [demoOrder()] });
}
function normalizeState(value) {
  value.role ||= "admin";
  value.theme ||= "system";
  if (value.companyName === "Tenis Clean Control") value.companyName = "Dixort Cleaning";
  value.serviceNames = [...new Set([...(value.serviceNames || SERVICE_NAMES), ...Object.keys(value.prices || {})])];
  value.prices = { ...DEFAULT_PRICES, ...(value.prices || {}) };
  value.orders ||= [];
  value.orders.forEach((order) => {
    order.services = (order.services || []).map((service) => service === "Lavado" ? "Limpieza" : service);
    order.processes = (order.processes || []).map((process) => ({ ...process, name: process.name === "Lavado" ? "Limpieza" : process.name }));
    order.servicePrices ||= Object.fromEntries(order.services.map((service) => [service, value.prices[service] || 0]));
    order.customerAddress ||= "";
    order.deliveryFee = Number(order.deliveryFee || 0);
    order.items ||= [{ type: "Tenis", brand: order.brand || "", model: order.model || "", color: order.color || "", size: order.size || "" }];
    order.items.forEach((item) => { item.services ||= [...(order.services || [])]; item.servicePrices ||= { ...(order.servicePrices || {}) }; item.photos ||= []; });
    order.photos ||= [];
  });
  return value;
}
function demoOrder() {
  const selected = new Set(["Desmanchado", "Limpieza", "Secado"]);
  const processes = BASE_PROCESSES.filter((name) => ["Diagnóstico", "Control de calidad", "Listo para entrega"].includes(name) || selected.has(name)).map((name, index) => ({ name, state: index < 3 ? "Completada" : index === 3 ? "En proceso" : "Pendiente", updatedAt: index < 3 ? new Date().toISOString() : null, updatedBy: index < 3 ? "Trabajador" : null }));
  return { id: crypto.randomUUID(), code: "#237659", customerName: "Cliente de prueba", customerPhone: "573001234567", brand: "Nike", model: "Air Force 1", color: "Blanco", size: "40", notes: "Revisar suela y cordones.", estimatedDate: futureDate(4), createdAt: new Date().toISOString(), services: [...selected], servicePrices: { "Desmanchado": 12000, "Limpieza": 25000, "Secado": 5000 }, photos: [], processes, history: [] };
}
function saveState() { localStorage.setItem(storeKey, JSON.stringify(state)); }
function futureDate(days) { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }
function formatDate(value) { return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`)); }
function formatMoney(value) { return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(value) || 0); }
function currentProcess(order) { return order.processes.find((process) => process.state === "En proceso") || order.processes.find((process) => process.state === "Pendiente") || null; }
function orderStatus(order) { const current = currentProcess(order); if (!current) return "Entregado"; if (current.name === "Listo para entrega") return "Listo para entrega"; return `${current.name} ${current.state.toLowerCase()}`; }
function servicesTotal(order) { return (order.items || []).reduce((total, item) => total + Object.values(item.servicePrices || {}).reduce((sum, price) => sum + Number(price || 0), 0), 0); }
function orderTotal(order) { return servicesTotal(order) + Number(order.deliveryFee || 0); }
function escapeHtml(text) { return String(text ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]); }
function showToast(message) { const toast = $("#toast"); toast.textContent = message; toast.classList.add("visible"); setTimeout(() => toast.classList.remove("visible"), 2800); }
function hexToRgb(hex) { const normalized = hex.replace("#", ""); const value = normalized.length === 3 ? normalized.split("").map((part) => part + part).join("") : normalized; return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)]; }
function rgbToHex([red, green, blue]) { return `#${[red, green, blue].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0")).join("")}`; }
function mixColor(source, target, amount) { return source.map((value, index) => value + (target[index] - value) * amount); }
function relativeLuminance([red, green, blue]) { return [red, green, blue].map((value) => { const channel = value / 255; return channel <= .03928 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4; }).reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0); }
function contrastRatio(first, second) { const [light, dark] = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a); return (light + .05) / (dark + .05); }
function applyBrandColor(hex) { const color = hexToRgb(hex); const darkMode = state.theme === "dark" || (state.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches); const dark = darkMode ? mixColor(color, [255, 255, 255], .3) : mixColor(color, [0, 0, 0], .32); const soft = darkMode ? mixColor(color, [9, 25, 20], .72) : mixColor(color, [255, 255, 255], .86); const contrast = contrastRatio(color, [255, 255, 255]) >= contrastRatio(color, [19, 44, 39]) ? "#ffffff" : "#132c27"; const root = document.documentElement.style; root.setProperty("--accent", hex); root.setProperty("--accent-dark", rgbToHex(dark)); root.setProperty("--accent-soft", rgbToHex(soft)); root.setProperty("--accent-contrast", contrast); }
function applyTheme(theme) { const root = document.documentElement; if (theme === "system") delete root.dataset.theme; else root.dataset.theme = theme; document.querySelectorAll("[data-theme-choice]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.themeChoice === theme))); }
function openPhotoDb() { return new Promise((resolve, reject) => { const request = indexedDB.open(photoDbName, 1); request.onupgradeneeded = () => request.result.createObjectStore(photoStoreName, { keyPath: "id" }); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
async function savePhotos(orderId, files) { if (!files.length) return []; const db = await openPhotoDb(); const stamp = Date.now(); const ids = files.map((_, index) => `${orderId}-${stamp}-${index}`); await new Promise((resolve, reject) => { const transaction = db.transaction(photoStoreName, "readwrite"); files.forEach((file, index) => transaction.objectStore(photoStoreName).put({ id: ids[index], file })); transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error); }); db.close(); return ids; }
async function getPhotos(photoRefs) { const oldPhotos = (photoRefs || []).filter((photo) => String(photo).startsWith("data:")); const ids = (photoRefs || []).filter((photo) => !String(photo).startsWith("data:")); if (!ids.length) return oldPhotos; const db = await openPhotoDb(); const photos = await Promise.all(ids.map((id) => new Promise((resolve) => { const request = db.transaction(photoStoreName, "readonly").objectStore(photoStoreName).get(id); request.onsuccess = () => resolve(request.result?.file ? URL.createObjectURL(request.result.file) : null); request.onerror = () => resolve(null); }))); db.close(); return [...oldPhotos, ...photos.filter(Boolean)]; }
async function clearPhotoDb() { const db = await openPhotoDb(); await new Promise((resolve, reject) => { const transaction = db.transaction(photoStoreName, "readwrite"); transaction.objectStore(photoStoreName).clear(); transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error); }); db.close(); }
async function deletePhotos(photoRefs) { const ids = (photoRefs || []).filter((photo) => !String(photo).startsWith("data:")); if (!ids.length) return; const db = await openPhotoDb(); await new Promise((resolve, reject) => { const transaction = db.transaction(photoStoreName, "readwrite"); ids.forEach((id) => transaction.objectStore(photoStoreName).delete(id)); transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error); }); db.close(); }

function render() {
  applyTheme(state.theme);
  applyBrandColor(state.accent);
  document.body.classList.toggle("worker-mode", state.role === "worker");
  $("#companyName").textContent = state.companyName;
  document.title = state.companyName;
  $("#companyInput").value = state.companyName;
  $("#accentInput").value = state.accent;
  $("#roleSelect").value = state.role;
  renderPriceInputs();
  renderOrders();
}
function updateAuthentication() { const session = sessionStorage.getItem("dixort-session"); const loggedIn = Boolean(session); document.body.classList.toggle("authenticated", loggedIn); if (loggedIn) { const account = JSON.parse(session); state.role = account.role; $("#roleSelect").value = account.role; } }
function login(event) { event.preventDefault(); const username = $("#loginUsername").value.trim(); const password = $("#loginPassword").value; const account = ACCOUNTS[username]; if (!account || account.password !== password) { $("#loginError").hidden = false; return; } sessionStorage.setItem("dixort-session", JSON.stringify({ username, role: account.role })); state.role = account.role; saveState(); $("#loginForm").reset(); $("#loginError").hidden = true; updateAuthentication(); render(); showView("dashboardView"); }
function renderPriceInputs() {
  $(".service-list").innerHTML = serviceNames().map((service) => `<label><span><input type="checkbox" name="services" value="${escapeHtml(service)}" /> ${escapeHtml(service)}</span><input class="service-price" name="price-${escapeHtml(service)}" type="number" min="0" step="1000" inputmode="decimal" /></label>`).join("");
  serviceNames().forEach((service) => { const field = $(`[name="price-${service}"]`); if (field) field.value = state.prices[service] || 0; });
  $("#priceSettings").innerHTML = serviceNames().map((service) => `<label>${escapeHtml(service)}<input name="setting-${service}" type="number" min="0" step="1000" value="${state.prices[service] || 0}" /></label>`).join("");
  restoreServiceDraft(Number($("#serviceArticleSelect")?.value || 0));
}
function captureServiceDraft() { const selected = Number($("#serviceArticleSelect")?.value || 0); serviceDrafts[selected] = { services: serviceNames().filter((service) => $(`[name="services"][value="${service}"]`)?.checked), prices: Object.fromEntries(serviceNames().map((service) => [service, Number($(`[name="price-${service}"]`)?.value || 0)])) }; }
function restoreServiceDraft(index) { const draft = serviceDrafts[index] || { services: ["Desmanchado", "Limpieza", "Secado"], prices: {} }; serviceNames().forEach((service) => { const checkbox = $(`[name="services"][value="${service}"]`); const price = $(`[name="price-${service}"]`); checkbox.checked = draft.services.includes(service); price.value = draft.prices[service] ?? state.prices[service] ?? 0; }); updatePricePreview(); }
function updatePricePreview() {
  captureServiceDraft();
  const services = Object.values(serviceDrafts).reduce((total, draft) => total + draft.services.reduce((sum, service) => sum + Number(draft.prices[service] || 0), 0), 0);
  const delivery = Number($("[name=deliveryFee]")?.value || 0);
  $("#pricePreview").textContent = `Total del servicio: ${formatMoney(services + delivery)}`;
}
function itemFields(index) { return `<article class="extra-item"><div class="extra-item-head"><strong>Artículo ${index + 2}</strong><button class="remove-item" type="button">Quitar</button></div><label>Tipo de artículo<select name="extra-item-type"><option value="Tenis">Tenis</option><option value="Gorra">Gorra</option><option value="Accesorio">Accesorio</option><option value="Camisa">Camisa</option><option value="Pantalón">Pantalón</option></select></label><div class="two-columns"><label>Marca<input name="extra-item-brand" placeholder="Marca" /></label><label>Modelo<input name="extra-item-model" placeholder="Modelo" /></label></div><div class="two-columns"><label>Color<input name="extra-item-color" placeholder="Color" /></label><label>Talla<input name="extra-item-size" placeholder="Talla" /></label></div></article>`; }
function refreshServiceArticleSelect() { const select = $("#serviceArticleSelect"); if (!select) return; captureServiceDraft(); const previous = select.value; const extraItems = [...$("#extraItems").children]; select.innerHTML = `<option value="0">Artículo principal</option>${extraItems.map((item, index) => { const type = item.querySelector("[name=extra-item-type]")?.value || "Artículo"; const brand = item.querySelector("[name=extra-item-brand]")?.value?.trim(); return `<option value="${index + 1}">${escapeHtml(`${type}${brand ? ` - ${brand}` : ` ${index + 2}`}`)}</option>`; }).join("")}`; select.value = [...select.options].some((option) => option.value === previous) ? previous : "0"; restoreServiceDraft(Number(select.value)); }
function addItem() { const container = $("#extraItems"); container.insertAdjacentHTML("beforeend", itemFields(container.children.length)); serviceDrafts[container.children.length] = { services: [], prices: {} }; const item = container.lastElementChild; item.querySelector(".remove-item").addEventListener("click", () => { item.remove(); serviceDrafts = { 0: serviceDrafts[0] || { services: [], prices: {} } }; [...container.children].forEach((_, index) => { serviceDrafts[index + 1] ||= { services: [], prices: {} }; }); refreshServiceArticleSelect(); renderPhotoAssignments(); }); item.addEventListener("input", refreshServiceArticleSelect); item.addEventListener("change", refreshServiceArticleSelect); refreshServiceArticleSelect(); renderPhotoAssignments(); }
function renderPhotoAssignments() { const files = [...$("#orderPhotos").files]; const container = $("#photoAssignments"); const itemLabels = ["Artículo principal", ...[...$("#extraItems").children].map((item, index) => item.querySelector("[name=extra-item-type]")?.value || `Artículo ${index + 2}`)]; container.hidden = !files.length; container.innerHTML = files.map((file, index) => `<label>${escapeHtml(file.name)}<select data-photo-index="${index}">${itemLabels.map((label, itemIndex) => `<option value="${itemIndex}">${escapeHtml(label)}</option>`).join("")}</select></label>`).join(""); }
function photoFilesByItem(files) { const grouped = {}; [...files].forEach((file, index) => { const target = Number($(`[data-photo-index="${index}"]`)?.value || 0); (grouped[target] ||= []).push(file); }); return grouped; }
function collectItems(data) { captureServiceDraft(); const items = [{ type: data.get("itemType"), brand: data.get("brand"), model: data.get("model"), color: data.get("color"), size: data.get("size") }]; const types = data.getAll("extra-item-type"); const brands = data.getAll("extra-item-brand"); const models = data.getAll("extra-item-model"); const colors = data.getAll("extra-item-color"); const sizes = data.getAll("extra-item-size"); types.forEach((type, index) => items.push({ type, brand: brands[index], model: models[index], color: colors[index], size: sizes[index] })); return items.map((item, index) => ({ ...item, services: serviceDrafts[index]?.services || [], servicePrices: Object.fromEntries((serviceDrafts[index]?.services || []).map((service) => [service, Number(serviceDrafts[index].prices[service] || 0)])) })); }
function renderOrders(filter = "all") {
  let orders = [...state.orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (filter === "mine" && state.role === "worker") orders = orders.filter((order) => currentProcess(order));
  if (filter === "ready") orders = orders.filter((order) => orderStatus(order) === "Listo para entrega");
  $("#queueTitle").textContent = filter === "mine" ? "Órdenes pendientes" : filter === "ready" ? "Listos para entrega" : "Tenis en proceso";
  $("#orderList").innerHTML = orders.length ? orders.map((order) => orderCard(order, true)).join("") : '<div class="empty-state">No hay tenis en esta vista.</div>';
  document.querySelectorAll("[data-order-id]").forEach((button) => button.addEventListener("click", () => openOrder(button.dataset.orderId)));
  document.querySelectorAll("[data-delete-order]").forEach((button) => button.addEventListener("click", () => deleteOrder(button.dataset.deleteOrder)));
}
function orderCard(order, showDelete = false) {
  const status = orderStatus(order); const css = status === "Listo para entrega" ? "ready" : status.includes("proceso") ? "warn" : "";
  const remove = showDelete && state.role === "admin" ? `<button class="delete-order" data-delete-order="${order.id}" aria-label="Borrar orden ${order.code}">Eliminar</button>` : "";
  return `<article class="order-entry"><button class="order-card" data-order-id="${order.id}"><div class="order-card-top"><div><span class="order-code">${order.code}</span><h3 class="order-title">${escapeHtml(order.brand)} ${escapeHtml(order.model)}</h3><p class="order-meta">${escapeHtml(order.color)} · Entrega: ${formatDate(order.estimatedDate)}</p></div><span class="status-chip ${css}">${escapeHtml(status)}</span></div></button>${remove}</article>`;
}
function searchItemCard(order, item) { const status = orderStatus(order); return `<button class="order-card" data-order-id="${order.id}"><div class="order-card-top"><div><span class="order-code">${order.code}</span><h3 class="order-title">${escapeHtml(item.brand)} ${escapeHtml(item.model)}</h3><p class="order-meta">${escapeHtml(item.type)} · ${escapeHtml(item.color)} · Ingreso: ${formatDate(order.createdAt.slice(0, 10))}</p></div><span class="status-chip">${escapeHtml(status)}</span></div></button>`; }
async function deleteOrder(id) { if (state.role !== "admin") return; const order = state.orders.find((item) => item.id === id); if (!order || !confirm(`¿Eliminar la orden ${order.code}? Esta acción no se puede deshacer.`)) return; try { await deletePhotos(order.photos); state.orders = state.orders.filter((item) => item.id !== id); saveState(); renderOrders(); showToast("Orden eliminada."); } catch (error) { console.error(error); showToast("No se pudo eliminar la orden."); } }
function serviceSummary(order) {
  const rows = order.items.flatMap((item, index) => item.services.map((service) => `<p>${escapeHtml(`${item.type} ${index + 1} - ${service}`)} <strong>${formatMoney(item.servicePrices[service])}</strong></p>`)).join("");
  const delivery = Number(order.deliveryFee || 0) ? `<p>Domicilio <strong>${formatMoney(order.deliveryFee)}</strong></p>` : "";
  return `<section class="service-summary"><p class="eyebrow">SERVICIOS Y VALOR</p>${rows}${delivery}<p class="total-row">Total: ${formatMoney(orderTotal(order))}</p></section>`;
}
function itemsSummary(order, photosByItem = []) { return `<section class="items-summary"><p class="eyebrow">ARTÍCULOS RECIBIDOS</p>${order.items.map((item, index) => `<div class="item-summary"><div><strong>${index + 1}. ${escapeHtml(item.type)}</strong><span>${escapeHtml([item.brand, item.model, item.color, item.size && `Talla ${item.size}`].filter(Boolean).join(" · "))}</span></div>${photosByItem[index]?.[0] ? `<img class="item-preview" src="${photosByItem[index][0]}" alt="Vista previa de ${escapeHtml(item.type)}" />` : ""}</div>`).join("")}</section>`; }
async function openOrder(id) {
  const order = state.orders.find((item) => item.id === id); if (!order) return;
  const current = currentProcess(order); const canChange = Boolean(current);
  const photosByItem = await Promise.all(order.items.map((item) => getPhotos(item.photos || []))); const photos = photosByItem.flat(); const photoMarkup = photos.length ? `<div class="photo-grid">${photos.map((photo) => `<img src="${photo}" alt="Foto de recepción del artículo" />`).join("")}</div>` : "";
  const message = statusMessage(order);
  $("#dialogContent").innerHTML = `<div class="guide-content"><p class="eyebrow">GUÍA DE SERVICIO · ORDEN ${order.code}</p><h2>${escapeHtml(order.brand)} ${escapeHtml(order.model)}</h2><p>${escapeHtml(order.color)}${order.size ? ` · Talla ${escapeHtml(order.size)}` : ""}<br>Cliente: ${escapeHtml(order.customerName)}<br>Fecha de recepción: ${formatDate(order.createdAt.slice(0, 10))}<br>Entrega estimada: ${formatDate(order.estimatedDate)}</p>${order.notes ? `<p><strong>Observaciones:</strong> ${escapeHtml(order.notes)}</p>` : ""}${photoMarkup}${serviceSummary(order)}</div><div class="internal-only"><ul class="process-list">${order.processes.map(processRow).join("")}</ul><div class="detail-actions">${canChange ? `<div class="update-panel"><label>Actualizar ${escapeHtml(current.name)}<select id="processState"><option ${current.state === "En proceso" ? "selected" : ""}>En proceso</option><option>Completada</option></select></label><button class="primary-button" id="updateProcessButton">Guardar estado</button></div>` : ""}<button class="secondary-button" id="generateMessageButton">Generar texto de estado</button><button class="secondary-button" id="whatsappButton">Notificar por WhatsApp</button><button class="secondary-button" id="printButton">Descargar guía / PDF</button><div id="messageArea" hidden><p class="message-preview">${escapeHtml(message)}</p><button class="secondary-button" id="copyMessageButton">Copiar texto</button></div></div></div>`;
  $("#orderDialog").showModal();
  const guide = $("#dialogContent .guide-content"); if (guide) guide.insertAdjacentHTML("beforeend", itemsSummary(order, photosByItem));
  const guideDetails = $("#dialogContent .guide-content > p:not(.eyebrow)");
  if (order.customerAddress && guideDetails) guideDetails.innerHTML = guideDetails.innerHTML.replace("<br>Fecha", `<br>Dirección: ${escapeHtml(order.customerAddress)}<br>Fecha`);
  if (state.role === "admin") addInvoiceEditor(order);
  addDiagnosticPhotoInput(order);
  $("#updateProcessButton")?.addEventListener("click", () => updateCurrentProcess(order.id, $("#processState").value));
  $("#generateMessageButton").addEventListener("click", () => { $("#messageArea").hidden = false; });
  $("#copyMessageButton").addEventListener("click", async () => { await navigator.clipboard?.writeText(message); showToast("Texto copiado."); });
  $("#whatsappButton").addEventListener("click", () => notifyWhatsapp(order));
  $("#printButton").addEventListener("click", () => printGuide(order));
}
function addInvoiceEditor(order) {
  const actions = $("#dialogContent .detail-actions"); if (!actions) return;
  const form = document.createElement("form"); form.className = "invoice-editor";
  form.innerHTML = `<p class="eyebrow">EDITAR FACTURA</p><div class="price-settings">${order.services.map((service) => `<label>${escapeHtml(service)}<input name="edit-price-${escapeHtml(service)}" type="number" min="0" step="1000" value="${Number(order.servicePrices[service] || 0)}" /></label>`).join("")}</div><label>Valor de domicilio<input name="edit-delivery-fee" type="number" min="0" step="1000" value="${Number(order.deliveryFee || 0)}" /></label><label>Fecha estimada de entrega<input name="edit-estimated-date" type="date" value="${order.estimatedDate}" required /></label><button class="primary-button" type="submit">Guardar cambios</button>`;
  form.addEventListener("submit", (event) => updateInvoice(event, order.id)); const updatePanel = actions.querySelector(".update-panel"); if (updatePanel) updatePanel.after(form); else actions.prepend(form);
}
function updateInvoice(event, id) { event.preventDefault(); if (state.role !== "admin") return; const order = state.orders.find((item) => item.id === id); if (!order) return; const data = new FormData(event.currentTarget); order.services.forEach((service) => { order.servicePrices[service] = Number(data.get(`edit-price-${service}`)) || 0; }); order.deliveryFee = Number(data.get("edit-delivery-fee")) || 0; order.estimatedDate = data.get("edit-estimated-date"); saveState(); render(); openOrder(id); showToast("Factura actualizada."); }
function addDiagnosticPhotoInput(order) { const panel = $("#dialogContent .update-panel"); if (!panel) return; const label = document.createElement("label"); label.className = "diagnostic-photos"; label.textContent = "Agregar fotos de diagnóstico (JPG)"; const input = document.createElement("input"); input.type = "file"; input.accept = "image/jpeg,.jpg,.jpeg"; input.multiple = true; input.addEventListener("change", async () => { try { const files = validatePhotoFiles([...input.files]); if (!files.length) return; order.photos.push(...await savePhotos(order.id, files)); saveState(); showToast("Fotos agregadas al diagnóstico."); } catch (error) { showToast(error.message || "No se pudieron guardar las fotos."); } }); label.append(input); panel.append(label); }
function processRow(process) { const className = process.state === "Completada" ? "completed" : process.state === "En proceso" ? "current" : ""; const icon = process.state === "Completada" ? "✓" : process.state === "En proceso" ? "◌" : "○"; return `<li class="process-row ${className}"><span class="process-icon">${icon}</span><span class="process-name">${escapeHtml(process.name)}</span><span class="process-state">${escapeHtml(process.state)}</span></li>`; }
function updateCurrentProcess(id, nextState) {
  const order = state.orders.find((item) => item.id === id); const process = currentProcess(order); if (!process) return;
  process.state = nextState; process.updatedAt = new Date().toISOString(); process.updatedBy = state.role === "admin" ? "Administrador" : "Trabajador";
  order.history.unshift({ process: process.name, state: nextState, at: process.updatedAt, by: process.updatedBy });
  if (nextState === "Completada") { const next = order.processes[order.processes.indexOf(process) + 1]; if (next) next.state = "En proceso"; }
  saveState(); render(); openOrder(id); showToast("Estado actualizado correctamente.");
}
function statusMessage(order) { const process = currentProcess(order)?.name || "entrega"; return `Hola ${order.customerName}.\n\nTus tenis ${order.brand} ${order.model}, ${order.color} ${order.code} están actualmente en proceso de ${process}.\n\nFecha estimada de entrega: ${formatDate(order.estimatedDate)}.`; }
function notifyWhatsapp(order) { window.open(`https://wa.me/${order.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(statusMessage(order))}`, "_blank", "noopener"); }
function printGuide(order) { const originalTitle = document.title; const code = order.code.replace(/\D/g, ""); const customer = order.customerName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, ""); document.title = `${code}_${customer || "Cliente"}`; window.addEventListener("afterprint", () => { document.title = originalTitle; }, { once: true }); window.print(); setTimeout(() => { document.title = originalTitle; }, 2000); }
function validatePhotoFiles(files) {
  const imageFiles = [...files].filter((file) => file.type === "image/jpeg");
  if (imageFiles.length !== files.length) throw new Error("Solo se permiten imágenes JPG.");
  const totalBytes = imageFiles.reduce((total, file) => total + file.size, 0);
  if (totalBytes > maxPhotoBytes) throw new Error("Las fotos superan el límite conjunto de 100 MB.");
  return imageFiles;
}
async function createOrder(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (state.role !== "admin") return;
  try {
    const data = new FormData(form); const items = collectItems(data); const services = [...new Set(items.flatMap((item) => item.services))];
    if (!services.length) { showToast("Selecciona al menos un servicio."); return; }
    const selected = new Set(services); const servicePrices = Object.fromEntries(services.map((service) => [service, 0]));
    const processes = BASE_PROCESSES.filter((name) => ["Diagnóstico", "Control de calidad", "Listo para entrega"].includes(name) || selected.has(name)).map((name, index) => ({ name, state: index === 0 ? "En proceso" : "Pendiente", updatedAt: null, updatedBy: null }));
    const photoFiles = validatePhotoFiles(data.getAll("photos").filter((file) => file.size)); const assignedPhotos = photoFilesByItem(photoFiles);
    const firstItem = items[0];
    const order = { id: crypto.randomUUID(), code: generateCode(), customerName: data.get("customerName"), customerPhone: data.get("customerPhone"), customerAddress: data.get("customerAddress"), brand: firstItem.brand, model: firstItem.model, color: firstItem.color, size: firstItem.size, items, notes: data.get("notes"), estimatedDate: data.get("estimatedDate"), deliveryFee: Number(data.get("deliveryFee")) || 0, createdAt: new Date().toISOString(), services, servicePrices, photos: [], processes, history: [] };
    await Promise.all(order.items.map(async (item, index) => { item.photos = await savePhotos(order.id, assignedPhotos[index] || []); })); order.photos = order.items.flatMap((item) => item.photos);
    state.orders.unshift(order); saveState(); form.reset(); $("#extraItems").innerHTML = ""; $("#photoAssignments").hidden = true; $("#photoAssignments").innerHTML = ""; serviceDrafts = { 0: { services: ["Desmanchado", "Limpieza", "Secado"], prices: {} } }; renderPriceInputs(); restoreServiceDraft(0); $("#registerForm [name=estimatedDate]").value = futureDate(4); showView("dashboardView"); render(); openOrder(order.id); showToast(`Orden ${order.code} creada.`);
  } catch (error) {
    console.error(error);
    showToast(error.message || "No se pudo crear la orden. Intenta de nuevo.");
  }
}
function generateCode() { let code; do { code = `#${Math.floor(100000 + Math.random() * 900000)}`; } while (state.orders.some((order) => order.code === code)); return code; }
function showView(id) { if (state.role === "worker" && ["registerView", "settingsView"].includes(id)) id = "dashboardView"; document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === id)); document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === id)); window.scrollTo({ top: 0, behavior: "smooth" }); }

document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
$("#registerForm").addEventListener("submit", createOrder);
$("#addItemButton").addEventListener("click", addItem);
$("#orderPhotos").addEventListener("change", renderPhotoAssignments);
$("#registerForm [name=estimatedDate]").value = futureDate(4);
$("#registerForm").addEventListener("input", updatePricePreview);
$("#loginForm").addEventListener("submit", login);
$("#serviceArticleSelect").addEventListener("change", (event) => { captureServiceDraft(); restoreServiceDraft(Number(event.target.value)); });
$("#myProcessButton").addEventListener("click", () => renderOrders("mine"));
$("#readyButton").addEventListener("click", () => renderOrders("ready"));
$("#showAllButton").addEventListener("click", () => renderOrders("all"));
$("#searchForm").addEventListener("submit", (event) => { event.preventDefault(); const rawCode = $("#searchInput").value.trim(); const code = rawCode ? rawCode.replace(/^#?/, "#") : ""; const from = $("#filterDateFrom").value; const to = $("#filterDateTo").value; const type = $("#filterItemType").value; const matches = state.orders.flatMap((order) => order.items.filter((item) => (!code || order.code === code) && (!from || order.createdAt.slice(0, 10) >= from) && (!to || order.createdAt.slice(0, 10) <= to) && (!type || item.type === type)).map((item) => ({ order, item }))); $("#searchResult").innerHTML = matches.length ? matches.map(({ order, item }) => searchItemCard(order, item)).join("") : '<div class="empty-state">No encontramos artículos con esos filtros.</div>'; document.querySelectorAll("[data-order-id]").forEach((button) => button.addEventListener("click", () => openOrder(button.dataset.orderId))); });
$("#closeDialog").addEventListener("click", () => $("#orderDialog").close());
$("#settingsForm").addEventListener("submit", (event) => { event.preventDefault(); state.companyName = $("#companyInput").value.trim(); state.accent = $("#accentInput").value; serviceNames().forEach((service) => { state.prices[service] = Number($(`[name="setting-${service}"]`).value) || 0; }); saveState(); render(); showToast("Configuración guardada."); });
$("#addServiceButton").addEventListener("click", () => { const name = $("#newServiceName").value.trim(); const price = Number($("#newServicePrice").value) || 0; if (!name) { showToast("Escribe el nombre del servicio."); return; } if (serviceNames().some((service) => service.toLocaleLowerCase() === name.toLocaleLowerCase())) { showToast("Ese servicio ya existe."); return; } state.serviceNames.push(name); state.prices[name] = price; saveState(); $("#newServiceName").value = ""; $("#newServicePrice").value = ""; render(); restoreServiceDraft(Number($("#serviceArticleSelect").value || 0)); showToast("Servicio agregado."); });
document.querySelectorAll("[data-theme-choice]").forEach((button) => button.addEventListener("click", () => { state.theme = button.dataset.themeChoice; saveState(); render(); showToast(`Modo ${state.theme === "dark" ? "oscuro" : "claro"} aplicado.`); }));
$("#resetButton").addEventListener("click", async () => { if (confirm("Se eliminarán las órdenes registradas en este navegador.")) { localStorage.removeItem(storeKey); await clearPhotoDb(); state = loadState(); render(); showToast("Datos restablecidos."); } });
window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); deferredPrompt = event; $("#installButton").hidden = false; });
$("#installButton").addEventListener("click", async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; $("#installButton").hidden = true; });
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js"));
updateAuthentication();
render();
