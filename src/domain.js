export const DAY_MS = 86_400_000;

export function localDate(value) {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function daysUntil(dateValue, today = new Date()) {
  const start = localDate(today);
  const end = localDate(dateValue);
  return Math.round((end - start) / DAY_MS);
}

export function expiryState(dateValue, today = new Date()) {
  const days = daysUntil(dateValue, today);
  if (days < 0) return { key: 'expired', label: 'Caducado', days };
  if (days === 0) return { key: 'today', label: 'Caduca hoy', days };
  if (days <= 7) return { key: 'urgent', label: `${days} ${days === 1 ? 'día' : 'días'}`, days };
  if (days <= 30) return { key: 'soon', label: `${days} días`, days };
  return { key: 'safe', label: `${days} días`, days };
}

export function sortByExpiry(products) {
  return [...products].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
}

export function matchesProduct(product, query, filter, today = new Date()) {
  const state = expiryState(product.expiryDate, today).key;
  const normalized = query.trim().toLocaleLowerCase('es');
  const textMatches = !normalized || `${product.name} ${product.category} ${product.notes || ''}`.toLocaleLowerCase('es').includes(normalized);
  if (!textMatches) return false;
  if (filter === 'all') return true;
  if (filter === 'active') return !['expired'].includes(state);
  if (filter === 'attention') return ['expired', 'today', 'urgent', 'soon'].includes(state);
  return state === filter;
}

export function notificationId(productId, daysBefore) {
  let hash = 0;
  const text = `${productId}:${daysBefore}`;
  for (let index = 0; index < text.length; index += 1) hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  return Math.abs(hash % 2_000_000_000) + 1;
}
