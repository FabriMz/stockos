import { reactive, computed } from 'vue'

// Límites de negocio
const MAX_PRICE      = 99_999.99   // USD — precio / costo
const MAX_UNITS_BOX  = 9_999       // Uds. por caja
const MAX_STOCK      = 99_999      // Unidades en stock

export function useProductFieldValidation(form) {
  // ─── Reglas ────────────────────────────────────────────────────────────────

  const errors = reactive({
    cost:        null,
    price:       null,
    unitsPerBox: null,
    stock:       null,
  })

  // ─── Validadores individuales ───────────────────────────────────────────────

  function validateCost() {
    const v = form.cost
    if (v === '' || v === null || v === undefined) { errors.cost = null; return }
    if (typeof v !== 'number' || isNaN(v))         { errors.cost = 'Ingresá un número válido'; return }
    if (v < 0)                                      { errors.cost = 'No puede ser negativo'; return }
    if (v > MAX_PRICE)                              { errors.cost = `Máximo $${MAX_PRICE.toLocaleString()}`; return }
    // máx 2 decimales
    if (Math.round(v * 1000) % 10 !== 0)           { errors.cost = 'Máx. 2 decimales'; return }
    errors.cost = null
  }

  function validatePrice() {
    const v = form.price
    if (v === '' || v === null || v === undefined) { errors.price = null; return }
    if (typeof v !== 'number' || isNaN(v))         { errors.price = 'Ingresá un número válido'; return }
    if (v < 0)                                     { errors.price = 'No puede ser negativo'; return }
    if (v > MAX_PRICE)                             { errors.price = `Máximo $${MAX_PRICE.toLocaleString()}`; return }
    if (Math.round(v * 1000) % 10 !== 0)           { errors.price = 'Máx. 2 decimales'; return }
    errors.price = null
  }

  function validateUnitsPerBox() {
    const v = form.unitsPerBox
    if (v === '' || v === null || v === undefined) { errors.unitsPerBox = null; return }
    if (typeof v !== 'number' || isNaN(v))         { errors.unitsPerBox = 'Ingresá un número entero'; return }
    if (!Number.isInteger(v))                      { errors.unitsPerBox = 'Solo números enteros'; return }
    if (v < 1)                                     { errors.unitsPerBox = 'Mínimo 1 unidad'; return }
    if (v > MAX_UNITS_BOX)                         { errors.unitsPerBox = `Máximo ${MAX_UNITS_BOX.toLocaleString()} uds.`; return }
    errors.unitsPerBox = null
  }

  function validateStock() {
    const v = form.stock
    if (typeof v !== 'number' || isNaN(v)) { errors.stock = 'Ingresá un número válido'; return }
    if (!Number.isInteger(v))              { errors.stock = 'Solo números enteros'; return }
    if (v < 0)                             { errors.stock = 'No puede ser negativo'; return }
    if (v > MAX_STOCK)                     { errors.stock = `Máximo ${MAX_STOCK.toLocaleString()} uds.`; return }
    errors.stock = null
  }

  // ─── Validar todo ──────────────────────────────────────────────────────────

  function validateNumericFields() {
    validateCost()
    validatePrice()
    validateUnitsPerBox()
    validateStock()
  }

  const hasNumericErrors = computed(() =>
    Object.values(errors).some(e => e !== null)
  )

  return {
    errors,
    validateCost,
    validatePrice,
    validateUnitsPerBox,
    validateStock,
    validateNumericFields,
    hasNumericErrors,
    MAX_STOCK,
    MAX_UNITS_BOX,
    MAX_PRICE,
  }
}

// ─── Helpers de sanitización para @input ────────────────────────────────────

/** Fuerza entero ≥ 0; rechaza decimales, negativos y no-números */
export function sanitizeInteger(rawValue, max = Infinity) {
  const str = String(rawValue).replace(/[^0-9]/g, '')
  if (str === '') return ''
  const n = parseInt(str, 10)
  return isNaN(n) ? '' : Math.min(n, max)
}

/** Fuerza decimal ≥ 0, máx 2 decimales */
export function sanitizeDecimal(rawValue, max = Infinity) {
  // Permitir escribir mientras se tipea (ej. "12.")
  let str = String(rawValue).replace(/[^0-9.]/g, '')
  // Solo un punto
  const parts = str.split('.')
  if (parts.length > 2) str = parts[0] + '.' + parts.slice(1).join('')
  // Máx 2 decimales
  if (parts[1] !== undefined && parts[1].length > 2) {
    str = parts[0] + '.' + parts[1].slice(0, 2)
  }
  return str
}