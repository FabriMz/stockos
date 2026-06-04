import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCurrencyStore = defineStore('currency', () => {

  const currency            = ref('UYU')
  const exchangeRate        = ref(42.5)
  const exchangeRateSource  = ref(null)
  const priceListValidity   = ref('2026-03') // formato YYYY-MM

  async function fetchExchangeRate() {
    try {
      const res  = await fetch('https://uy.dolarapi.com/v1/cotizaciones/usd')
      const data = await res.json()
      if (data.venta > 0) {
        exchangeRate.value       = data.venta
        exchangeRateSource.value = 'BCU'
        return
      }
    } catch { /* siguiente fuente */ }

    try {
      const fmt   = d => d.toISOString().split('T')[0]
      const hoy   = new Date()
      const desde = new Date(hoy)
      desde.setDate(desde.getDate() - 5)

      const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cot="Cotiza">
  <soapenv:Header/>
  <soapenv:Body>
    <cot:wsbcucotizaciones.Execute>
      <cot:Entrada>
        <cot:Moneda><cot:item>2225</cot:item></cot:Moneda>
        <cot:FechaDesde>${fmt(desde)}</cot:FechaDesde>
        <cot:FechaHasta>${fmt(hoy)}</cot:FechaHasta>
        <cot:Grupo>2</cot:Grupo>
      </cot:Entrada>
    </cot:wsbcucotizaciones.Execute>
  </soapenv:Body>
</soapenv:Envelope>`

      const res   = await fetch(
        'https://cotizaciones.bcu.gub.uy/wscotizaciones/servlet/awsbcucotizaciones',
        { method: 'POST', headers: { 'Content-Type': 'text/xml; charset=utf-8' }, body: soap }
      )
      const doc   = new DOMParser().parseFromString(await res.text(), 'text/xml')
      const items = doc.querySelectorAll('datoscotizaciones')

      if (items.length > 0) {
        const tcv = parseFloat(items[items.length - 1].querySelector('TCV')?.textContent)
        if (tcv > 0) {
          exchangeRate.value       = tcv
          exchangeRateSource.value = 'BCU'
          return
        }
      }
    } catch { /* sin red o CORS: mantiene fallback */ }
  }

  function setPriceListValidity(val) {
    if (val) priceListValidity.value = val
  }

  function setCurrency(val) {
    if (['UYU', 'USD'].includes(val)) currency.value = val
  }

  function toggleCurrency() {
    currency.value = currency.value === 'UYU' ? 'USD' : 'UYU'
  }

  const formatPrice = n => {
    const value = currency.value === 'USD' ? n / exchangeRate.value : n
    const [a, b] = value.toFixed(2).split('.')
    const formatted = a.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + b
    return currency.value === 'USD' ? 'U$S ' + formatted : '$' + formatted
  }

  // Para precios almacenados en USD (ej: product.cost, product.price)
  const formatProductPrice = n => {
    const value = currency.value === 'UYU' ? n * exchangeRate.value : n
    const [a, b] = value.toFixed(2).split('.')
    const formatted = a.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + b
    return currency.value === 'USD' ? 'U$S ' + formatted : '$' + formatted
  }

  // Para precios con moneda explícita guardada (priceCurrency: 'USD' | 'UYU')
  // Convierte al viewCurrency actual si es distinta de la guardada.
  const formatProductPriceWithCurrency = (n, priceCurrency = 'USD') => {
    const stored = priceCurrency ?? 'USD'
    let value
    if (stored === currency.value) {
      value = n
    } else if (stored === 'USD' && currency.value === 'UYU') {
      value = n * exchangeRate.value
    } else {
      // stored === 'UYU' && currency.value === 'USD'
      value = n / exchangeRate.value
    }
    const [a, b] = value.toFixed(2).split('.')
    const formatted = a.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + b
    return currency.value === 'USD' ? 'U$S ' + formatted : '$' + formatted
  }

  fetchExchangeRate()

  return { currency, exchangeRate, exchangeRateSource, priceListValidity, setPriceListValidity, toggleCurrency, setCurrency, formatPrice, formatProductPrice, formatProductPriceWithCurrency }
})