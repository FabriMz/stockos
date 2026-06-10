import { computed } from 'vue'
import { parseExpiry } from '../utils/alerts.js'

/**
 * Computeds y helpers de alertas, derivados puramente de los refs
 * de productos y marcas. Sin estado propio, sin side effects.
 *
 * @param {Ref<Product[]>} products
 * @param {Ref<Brand[]>}   brands
 */
export function useAlerts(products, brands) {

  // ─── Predicados y helpers ───────────────────────────────────────────────────
  const pct          = p => {
    const threshold = p.minStock || p.unitsPerBox || 0
    return threshold > 0 ? Math.round((p.stock / threshold) * 100) : 100
  }
  const isOutOfStock = p => p.stock === 0
  const isLowStock   = p => {
    if (p.stock <= 0) return false
    const threshold = p.minStock || p.unitsPerBox || 0
    if (!threshold) return false
    return p.stock < threshold
  }
  const isExpiring   = p => !!p.expiry
  const hasAlert     = p => isOutOfStock(p) || isLowStock(p) || isExpiring(p)
  const stockColor   = p => isOutOfStock(p) ? '#791132' : isLowStock(p) ? '#90542f' : '#2D8A5F'

  const alerts           = computed(() => products.value.filter(hasAlert))
  const outOfStockAlerts = computed(() => products.value.filter(isOutOfStock))
  const lowStockAlerts   = computed(() => products.value.filter(isLowStock))
  const expiryAlerts     = computed(() => products.value.filter(isExpiring))

  const alertBrands = computed(() => {
    const bids = new Set(alerts.value.map(p => p.bid).filter(Boolean))
    return brands.value.filter(b => bids.has(b.id))
  })
  const outOfStockBrands = computed(() => {
    const bids = new Set(outOfStockAlerts.value.map(p => p.bid).filter(Boolean))
    return brands.value.filter(b => bids.has(b.id))
  })
  const lowStockBrands = computed(() => {
    const bids = new Set(lowStockAlerts.value.map(p => p.bid).filter(Boolean))
    return brands.value.filter(b => bids.has(b.id))
  })

  // Productos sin marca con alerta de stock
  const outOfStockUnbranded = computed(() => outOfStockAlerts.value.filter(p => !p.bid))
  const lowStockUnbranded   = computed(() => lowStockAlerts.value.filter(p => !p.bid))

  // ─── Árbol de vencimientos ───────────────────────────────────────────────────
  const UNBRANDED_KEY = '__unbranded__'

  const expiryTree = computed(() => {
    const tree = {}
    for (const p of expiryAlerts.value) {
      const parsed = parseExpiry(p.expiry)
      if (!parsed) continue
      const { year, monthKey } = parsed
      const key = p.bid ?? UNBRANDED_KEY
      tree[year] ??= {}
      tree[year][monthKey] ??= {}
      tree[year][monthKey][key] ??= []
      tree[year][monthKey][key].push(p)
    }
    return tree
  })

  const expiryYears = computed(() =>
    Object.keys(expiryTree.value).map(Number).sort((a, b) => a - b)
  )

  function expiryMonths(year) {
    const months = expiryTree.value[year]
    if (!months) return []
    return Object.keys(months)
      .map(k => Number(k))
      .sort((a, b) => a - b)
  }

  function expiryBrands(year, monthKey) {
    const bids = Object.keys(expiryTree.value[year]?.[monthKey] ?? {})
    return bids
      .map(bid => brands.value.find(b => b.id === bid))
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }

  function expiryHasUnbranded(year, monthKey) {
    return UNBRANDED_KEY in (expiryTree.value[year]?.[monthKey] ?? {})
  }

  function expiryProducts(year, monthKey, brandId) {
    const key = brandId === UNBRANDED_KEY || !brandId ? UNBRANDED_KEY : brandId
    return expiryTree.value[year]?.[monthKey]?.[key] ?? []
  }

  return {
    pct, isOutOfStock, isLowStock, isExpiring, hasAlert, stockColor,
    alerts, outOfStockAlerts, lowStockAlerts, expiryAlerts,
    alertBrands, outOfStockBrands, lowStockBrands,
    outOfStockUnbranded, lowStockUnbranded,
    expiryTree, expiryYears, expiryMonths, expiryBrands, expiryHasUnbranded, expiryProducts,
    UNBRANDED_KEY,
  }
}