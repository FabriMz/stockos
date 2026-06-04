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
  const pct          = p => Math.round((p.stock / p.max) * 100)
  const isOutOfStock = p => p.stock === 0
  const isLowStock   = p => p.stock > 0 && pct(p) < 25
  const isExpiring   = p => !!p.expiry
  const hasAlert     = p => isOutOfStock(p) || isLowStock(p) || isExpiring(p)
  const stockColor   = p => isOutOfStock(p) ? '#791132' : isLowStock(p) ? '#90542f' : '#2D8A5F'

  const alerts           = computed(() => products.value.filter(hasAlert))
  const outOfStockAlerts = computed(() => products.value.filter(isOutOfStock))
  const lowStockAlerts   = computed(() => products.value.filter(isLowStock))
  const expiryAlerts     = computed(() => products.value.filter(isExpiring))

  const alertProductIds = computed(() => new Set(alerts.value.map(p => p.id)))
  const outOfStockIds   = computed(() => new Set(outOfStockAlerts.value.map(p => p.id)))
  const lowStockIds     = computed(() => new Set(lowStockAlerts.value.map(p => p.id)))

  const alertBrands = computed(() =>
    brands.value.filter(b => b.prods.some(id => alertProductIds.value.has(Number(id))))
  )
  const outOfStockBrands = computed(() =>
    brands.value.filter(b => b.prods.some(id => outOfStockIds.value.has(Number(id))))
  )
  const lowStockBrands = computed(() =>
    brands.value.filter(b => b.prods.some(id => lowStockIds.value.has(Number(id))))
  )

  // ─── Árbol de vencimientos ───────────────────────────────────────────────────
  const expiryTree = computed(() => {
    const tree = {}
    for (const p of expiryAlerts.value) {
      const parsed = parseExpiry(p.expiry)
      if (!parsed) continue
      const { year, monthKey } = parsed
      tree[year] ??= {}
      tree[year][monthKey] ??= {}
      tree[year][monthKey][p.bid] ??= []
      tree[year][monthKey][p.bid].push(p)
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

  function expiryProducts(year, monthKey, brandId) {
    return expiryTree.value[year]?.[monthKey]?.[brandId] ?? []
  }

  return {
    pct, isOutOfStock, isLowStock, isExpiring, hasAlert, stockColor,
    alerts, outOfStockAlerts, lowStockAlerts, expiryAlerts,
    alertBrands, outOfStockBrands, lowStockBrands,
    expiryTree, expiryYears, expiryMonths, expiryBrands, expiryProducts,
  }
}