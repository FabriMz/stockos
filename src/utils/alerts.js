export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

/** @param {string} expiry ISO date (YYYY-MM-DD) */
export function parseExpiry(expiry) {
  if (!expiry) return null
  const [y, m] = expiry.split('-').map(Number)
  if (!y || !m || m < 1 || m > 12) return null
  return { year: y, month: m, monthKey: String(m).padStart(2, '0') }
}

export function monthLabel(month) {
  return MONTH_NAMES[month - 1] ?? ''
}

export function expirySortKey(expiry) {
  if (!expiry) return Infinity
  const [y, m, d] = expiry.split('-').map(Number)
  return new Date(y, m - 1, d || 1).getTime()
}

export function formatTodayDate(date = new Date()) {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export function formatExpiryDate(expiry) {
  const p = parseExpiry(expiry)
  if (!p) return expiry
  const d = new Date(p.year, p.month - 1, Number(expiry.split('-')[2]) || 1)
  return d.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function matchesProductSearch(p, q) {
  if (!q) return true
  const s = q.toLowerCase()
  return (
    p.name.toLowerCase().includes(s) ||
    p.sku.toLowerCase().includes(s) ||
    p.brand.toLowerCase().includes(s)
  )
}

export function matchesBrandSearch(brand, q, productsInBrand) {
  if (!q) return true
  const s = q.toLowerCase()
  if (brand.name.toLowerCase().includes(s)) return true
  return productsInBrand.some(p => matchesProductSearch(p, s))
}