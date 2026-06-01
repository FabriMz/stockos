/** @param {{ alert: string, brandId?: string, year?: number|string, month?: string }} ctx */
export function buildAlertProductQuery(ctx) {
  const q = { from: 'alerts', alert: ctx.alert }
  if (ctx.brandId) q.brand = ctx.brandId
  if (ctx.year != null) q.year = String(ctx.year)
  if (ctx.month) q.month = ctx.month
  return q
}

/** @param {number|string} id @param {{ alert: string, brandId?: string, year?: number|string, month?: string }} ctx */
export function productRouteFromAlerts(id, ctx) {
  return { path: `/product/${id}`, query: buildAlertProductQuery(ctx) }
}

/** @param {Record<string, string>} query */
export function resolveAlertBack(query, product) {
  if (query.from === 'batch') {
    const { batchNum } = query
    return {
      to:    `/catalog/batch/${encodeURIComponent(batchNum)}`,
      label: batchNum,
    }
  }

  if (query.from !== 'alerts') return null

  const alert = query.alert

  if (alert === 'sin-stock' || alert === 'stock-bajo') {
    const brandId = query.brand || product?.bid
    return {
      to:    brandId ? `/alerts/${alert}/${brandId}` : `/alerts/${alert}`,
      label: product?.brand ?? (alert === 'sin-stock' ? 'Sin Stock' : 'Stock Bajo'),
    }
  }

  if (alert === 'expiry') {
    const { year, month, brand } = query
    if (year && month && brand) {
      return {
        to:    `/alerts/expiry/${year}/${month}/${brand}`,
        label: product?.brand ?? 'Productos',
      }
    }
    if (year && month) return { to: `/alerts/expiry/${year}/${month}`, label: String(year) }
    if (year) return { to: `/alerts/expiry/${year}`, label: 'Vencimientos' }
    return { to: '/alerts/expiry', label: 'Vencimientos' }
  }

  return { to: '/alerts', label: 'Alertas' }
}

/** Conserva el contexto de alertas al volver al detalle desde editar. */
export function detailPathWithQuery(id, query) {
  const params = new URLSearchParams()
  for (const key of ['from', 'alert', 'brand', 'year', 'month', 'batchNum']) {
    if (query[key]) params.set(key, query[key])
  }
  const qs = params.toString()
  return qs ? `/product/${id}?${qs}` : `/product/${id}`
}
