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

/**
 * Formatea una fecha de vencimiento para mostrar.
 * YYYY-MM-DD → DD/MM/YYYY
 * YYYY-MM    → MM/YYYY (legado, sin día)
 * @param {string} expiry
 * @returns {string}
 */
export function formatExpiry(expiry) {
  if (!expiry) return ''
  const parts = expiry.split('-')
  if (parts.length === 3) {
    const [year, month, day] = parts
    return `${day}/${month}/${year}`
  }
  const [year, month] = parts
  return `${month}/${year}`
}

/**
 * Calcula días hasta la fecha de vencimiento.
 * Si el valor tiene día (YYYY-MM-DD) usa la fecha exacta.
 * Si solo tiene mes (YYYY-MM, legado) usa el último día del mes.
 * Usa medianoche del día actual para que el resultado no varíe según la hora.
 * @param {string} expiry - Formato YYYY-MM-DD o YYYY-MM (legado)
 * @returns {number} días restantes (negativo si ya venció)
 */
function daysUntilExpiry(expiry) {
  const parts = expiry.split('-').map(Number)
  const [y, m, d] = parts
  // Con día explícito usamos la fecha exacta; sin día, último día del mes (legado)
  const expiryDate = d ? new Date(y, m - 1, d) : new Date(y, m, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
}

/**
 * Devuelve la clase CSS de badge según los días hasta el vencimiento.
 * @param {string} yyyymm
 * @returns {'badge--ok' | 'badge--expiry' | 'badge--low' | 'badge--out'}
 */
export function expiryBadgeClass(yyyymm) {
  if (!yyyymm) return 'badge--ok'
  const diffDays = daysUntilExpiry(yyyymm)
  if (diffDays < 0)   return 'badge--out'
  if (diffDays < 60)  return 'badge--expiry'
  if (diffDays < 180) return 'badge--low'
  return 'badge--ok'
}

/**
 * Devuelve el texto del badge de vencimiento.
 * @param {string} yyyymm
 * @returns {string}
 */
export function expiryBadgeLabel(yyyymm) {
  if (!yyyymm) return 'S/F'
  const diffDays = daysUntilExpiry(yyyymm)
  if (diffDays < 0)   return 'Vencido'
  if (diffDays < 60)  return `${diffDays} ${diffDays === 1 ? 'día' : 'días'}`
  if (diffDays < 180) return 'Próximo'
  return 'OK'
}

/**
 * Devuelve el icono Tabler correspondiente al badge de vencimiento.
 * @param {string} yyyymm
 * @returns {string}  clase CSS del icono (ej: 'ti-clock-x')
 */
export function expiryBadgeIcon(yyyymm) {
  if (!yyyymm) return 'ti-clock'
  const diffDays = daysUntilExpiry(yyyymm)
  if (diffDays < 0)   return 'ti-clock-x'
  if (diffDays < 60)  return 'ti-clock-exclamation'
  if (diffDays < 180) return 'ti-clock'
  return 'ti-clock-check'
}