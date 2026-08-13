import './styles.css';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { daysUntil, expiryState, matchesProduct, notificationId, sortByExpiry } from './domain.js';

const STORAGE_KEY = 'antes-de-que-caduque.products.v1';
const SETTINGS_KEY = 'antes-de-que-caduque.settings.v1';
const categories = ['Alimentos', 'Medicamentos', 'Cosméticos', 'Limpieza', 'Reactivos', 'Mascotas', 'Otro'];

const state = {
  products: load(STORAGE_KEY, []),
  settings: load(SETTINGS_KEY, { defaultReminderDays: 3 }),
  query: '',
  filter: 'all',
  editingId: null,
  modalOpen: false,
  toast: ''
};

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.products));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${dateValue}T12:00:00`));
}

function plural(count, singular, pluralForm) { return count === 1 ? singular : pluralForm; }

function summary() {
  return state.products.reduce((totals, product) => {
    const current = expiryState(product.expiryDate).key;
    totals.total += 1;
    if (['today', 'urgent', 'soon'].includes(current)) totals.attention += 1;
    if (current === 'expired') totals.expired += 1;
    return totals;
  }, { total: 0, attention: 0, expired: 0 });
}

function filteredProducts() {
  return sortByExpiry(state.products).filter((product) => matchesProduct(product, state.query, state.filter));
}

function categorySymbol(category) {
  return ({
    Alimentos: '●',
    Medicamentos: '✚',
    'Cosméticos': '✦',
    Limpieza: '◇',
    Reactivos: '⚗',
    Mascotas: '♡',
    Otro: '•'
  })[category] || '•';
}

function statusProgress(status) {
  return ({ expired: 100, today: 100, urgent: 86, soon: 58, safe: 24 })[status] || 24;
}

function insightCopy(totals) {
  if (!totals.total) return { title: 'Empieza sin complicaciones.', text: 'Registra tu primer producto y te avisaremos a tiempo.' };
  if (totals.expired) return { title: `${totals.expired} ${plural(totals.expired, 'producto requiere', 'productos requieren')} atención.`, text: 'Revisa los productos caducados antes de usar los demás.' };
  if (totals.attention) return { title: `${totals.attention} ${plural(totals.attention, 'producto vence', 'productos vencen')} pronto.`, text: 'Úsalos primero y evita que terminen en la basura.' };
  return { title: 'Todo está bajo control.', text: 'No tienes productos próximos a caducar.' };
}

function productCard(product) {
  const status = expiryState(product.expiryDate);
  return `
    <button class="product" data-edit="${product.id}" aria-label="Editar ${escapeHtml(product.name)}">
      <div class="product-main">
        <span class="category-icon category-${status.key}" aria-hidden="true">${categorySymbol(product.category)}</span>
        <div class="product-info">
          <div class="product-title-row"><h3>${escapeHtml(product.name)}</h3><span class="state-pill ${status.key}">${status.label}</span></div>
          <div class="product-meta"><span>${escapeHtml(product.category)}</span>${product.quantity ? `<i class="dot"></i><span>${escapeHtml(product.quantity)}</span>` : ''}</div>
        </div>
      </div>
      <div class="expiry-line"><span>Caducidad</span><strong>${formatDate(product.expiryDate)}</strong></div>
      <div class="time-track"><i class="${status.key}" style="width:${statusProgress(status.key)}%"></i></div>
    </button>`;
}

function render() {
  const totals = summary();
  const products = filteredProducts();
  const insight = insightCopy(totals);
  document.querySelector('#app').innerHTML = `
    <main class="app-shell">
      <header class="hero">
        <i class="hero-glow hero-glow-one"></i><i class="hero-glow hero-glow-two"></i>
        <div class="topline">
          <div class="brand"><img class="brand-mark" src="/icon.svg" alt=""><div><p class="eyebrow">Antes de que caduque</p><h1>Caduca</h1></div></div>
          <button class="icon-button" id="notificationButton" aria-label="Configurar avisos" title="Configurar avisos">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>
          </button>
        </div>
        <div class="hero-copy"><span class="hero-kicker"><i></i>Resumen de hoy</span><h2>${insight.title}</h2><p>${insight.text}</p></div>
      </header>
      <section class="summary-grid" aria-label="Resumen">
        <div class="summary-card"><i class="summary-dot total"></i><div><strong>${totals.total}</strong><span>${plural(totals.total, 'producto', 'productos')}</span></div></div>
        <div class="summary-card attention"><i class="summary-dot"></i><div><strong>${totals.attention}</strong><span>por vencer</span></div></div>
        <div class="summary-card expired"><i class="summary-dot"></i><div><strong>${totals.expired}</strong><span>caducados</span></div></div>
      </section>
      <section class="content">
        <button class="primary-action" id="addButtonTop"><span class="action-icon">+</span><span><strong>Agregar producto</strong><small>Registra su fecha manualmente</small></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></button>
        <div class="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input class="search" id="search" value="${escapeHtml(state.query)}" placeholder="Buscar en tu inventario" aria-label="Buscar">
        </div>
        <div class="filters">
          ${[['all','Todos'],['attention','Por vencer'],['expired','Caducados'],['active','Vigentes']].map(([key,label]) => `<button class="filter ${state.filter === key ? 'active' : ''}" data-filter="${key}">${label}</button>`).join('')}
        </div>
        <div class="section-head"><div><p class="section-label">Organiza y utiliza</p><h2>${state.filter === 'attention' ? 'Requieren atención' : 'Tu inventario'}</h2></div><span>${products.length} ${plural(products.length, 'producto', 'productos')}</span></div>
        <div class="product-list">
          ${products.length ? products.map(productCard).join('') : `<div class="empty"><img class="empty-icon" src="/icon.svg" alt=""><h3>${state.products.length ? 'No encontramos resultados' : 'Tu inventario está listo'}</h3><p>${state.products.length ? 'Prueba con otra búsqueda o selecciona otro filtro.' : 'Agrega tu primer producto para comenzar a recibir avisos.'}</p>${!state.products.length ? '<button class="empty-button" id="emptyAddButton">Agregar el primero</button>' : ''}</div>`}
        </div>
      </section>
      <button class="fab" id="addButton" aria-label="Agregar producto"><span>+</span><b>Agregar</b></button>
      ${state.modalOpen ? modalTemplate() : ''}
      ${state.toast ? `<div class="toast" role="status">${escapeHtml(state.toast)}</div>` : ''}
    </main>`;
  bindEvents();
}

function currentProduct() { return state.products.find((product) => product.id === state.editingId); }

function modalTemplate() {
  const product = currentProduct();
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  return `
    <div class="backdrop" id="backdrop">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div class="handle"></div>
        <div class="modal-head"><div><p class="modal-eyebrow">${product ? 'Actualiza la información' : 'Cuida lo que compras'}</p><h2 id="modalTitle">${product ? 'Editar producto' : 'Nuevo producto'}</h2></div><button class="close" id="closeModal" aria-label="Cerrar">×</button></div>
        <form class="form" id="productForm">
          <div class="field"><label for="name">Nombre del producto *</label><input id="name" name="name" maxlength="80" required autofocus placeholder="Ej. Leche deslactosada" value="${escapeHtml(product?.name || '')}"></div>
          <div class="two-cols">
            <div class="field"><label for="category">Categoría</label><select id="category" name="category">${categories.map((category) => `<option ${product?.category === category ? 'selected' : ''}>${category}</option>`).join('')}</select></div>
            <div class="field"><label for="quantity">Cantidad</label><input id="quantity" name="quantity" maxlength="30" placeholder="Ej. 2 piezas" value="${escapeHtml(product?.quantity || '')}"></div>
          </div>
          <div class="field"><label for="expiryDate">Fecha de caducidad *</label><input id="expiryDate" name="expiryDate" type="date" required value="${product?.expiryDate || tomorrow}"></div>
          <div class="field"><label for="notes">Notas</label><textarea id="notes" name="notes" maxlength="250" placeholder="Ubicación, lote o cualquier detalle">${escapeHtml(product?.notes || '')}</textarea></div>
          <div class="switch-row"><div class="switch-copy"><strong>Aviso anticipado</strong><span>${state.settings.defaultReminderDays} días antes de caducar</span></div><input class="switch" type="checkbox" name="reminderEnabled" ${product?.reminderEnabled === false ? '' : 'checked'} aria-label="Activar aviso"></div>
          <div class="actions">${product ? '<button class="button danger" type="button" id="deleteButton">Eliminar</button>' : '<button class="button secondary" type="button" id="closeSecondary">Cancelar</button>'}<button class="button primary" type="submit">${product ? 'Guardar cambios' : 'Agregar producto'}</button></div>
        </form>
      </section>
    </div>`;
}

function bindEvents() {
  document.querySelector('#addButton')?.addEventListener('click', () => openModal());
  document.querySelector('#addButtonTop')?.addEventListener('click', () => openModal());
  document.querySelector('#emptyAddButton')?.addEventListener('click', () => openModal());
  document.querySelector('#notificationButton')?.addEventListener('click', requestNotificationPermission);
  document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => { state.filter = button.dataset.filter; render(); }));
  document.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => openModal(button.dataset.edit)));
  document.querySelector('#search')?.addEventListener('input', (event) => { state.query = event.target.value; renderKeepingSearchFocus(); });
  document.querySelector('#closeModal')?.addEventListener('click', closeModal);
  document.querySelector('#closeSecondary')?.addEventListener('click', closeModal);
  document.querySelector('#backdrop')?.addEventListener('click', (event) => { if (event.target.id === 'backdrop') closeModal(); });
  document.querySelector('#productForm')?.addEventListener('submit', handleSubmit);
  document.querySelector('#deleteButton')?.addEventListener('click', deleteProduct);
}

function renderKeepingSearchFocus() {
  const position = document.querySelector('#search')?.selectionStart ?? state.query.length;
  render();
  const input = document.querySelector('#search');
  input?.focus();
  input?.setSelectionRange(position, position);
}

function openModal(id = null) { state.editingId = id; state.modalOpen = true; render(); }
function closeModal() { state.editingId = null; state.modalOpen = false; render(); }

async function handleSubmit(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const existing = currentProduct();
  const product = {
    id: existing?.id || (crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`),
    name: data.get('name').trim(),
    category: data.get('category'),
    quantity: data.get('quantity').trim(),
    expiryDate: data.get('expiryDate'),
    notes: data.get('notes').trim(),
    reminderEnabled: data.get('reminderEnabled') === 'on',
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (!product.name || !product.expiryDate) return;
  state.products = existing ? state.products.map((item) => item.id === existing.id ? product : item) : [...state.products, product];
  save();
  await scheduleProductNotification(product);
  state.modalOpen = false;
  state.editingId = null;
  showToast(existing ? 'Cambios guardados' : 'Producto agregado');
}

async function deleteProduct() {
  const product = currentProduct();
  if (!product || !confirm(`¿Eliminar “${product.name}”?`)) return;
  state.products = state.products.filter((item) => item.id !== product.id);
  save();
  await cancelProductNotification(product);
  state.modalOpen = false;
  state.editingId = null;
  showToast('Producto eliminado');
}

function showToast(message) {
  state.toast = message;
  render();
  window.setTimeout(() => { state.toast = ''; render(); }, 2200);
}

async function requestNotificationPermission() {
  if (!Capacitor.isNativePlatform()) {
    showToast('Los avisos se activarán en la aplicación Android');
    return;
  }
  const permission = await LocalNotifications.requestPermissions();
  showToast(permission.display === 'granted' ? 'Avisos activados' : 'Permiso de avisos no concedido');
  if (permission.display === 'granted') await rescheduleAllNotifications();
}

async function cancelProductNotification(product) {
  if (!Capacitor.isNativePlatform()) return;
  await LocalNotifications.cancel({ notifications: [{ id: notificationId(product.id, state.settings.defaultReminderDays) }] });
}

async function scheduleProductNotification(product) {
  if (!Capacitor.isNativePlatform()) return;
  await cancelProductNotification(product);
  if (!product.reminderEnabled) return;
  const daysBefore = state.settings.defaultReminderDays;
  const target = new Date(`${product.expiryDate}T09:00:00`);
  target.setDate(target.getDate() - daysBefore);
  if (target <= new Date() || daysUntil(product.expiryDate) < 0) return;
  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted') return;
  await LocalNotifications.schedule({ notifications: [{
    id: notificationId(product.id, daysBefore),
    title: 'Antes de que caduque',
    body: `${product.name} caduca en ${daysBefore} ${plural(daysBefore, 'día', 'días')}.`,
    schedule: { at: target, allowWhileIdle: true },
    extra: { productId: product.id }
  }] });
}

async function rescheduleAllNotifications() {
  for (const product of state.products) await scheduleProductNotification(product);
}

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
render();
