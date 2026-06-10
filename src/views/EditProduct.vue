<template>
  <div class="screen" v-if="product">
    <TopBar variant="back" :back-label="backLabel" :back-to="backTo" title="Editar" />

    <div class="scroll-content">

      <div class="form-view__preview">
        <div class="form-view__photo-picker">
          <input ref="photoInput" id="ep-photo" name="ep-photo" type="file" accept="image/*" capture="environment"
            class="form-view__photo-input" aria-label="Tomar foto del producto" @change="onPhotoChange" />
          <label for="ep-photo" class="form-view__photo-trigger">
            <img v-if="form.img" :src="form.img" :alt="product.name" class="form-view__photo-img" />
            <i v-else class="ti ti-camera" aria-hidden="true"></i>
          </label>
          <button v-if="form.img" type="button" class="form-view__photo-remove" aria-label="Quitar imagen"
            @click="removePhoto">
            <i class="ti ti-x" aria-hidden="true"></i>
          </button>
        </div>
        <div class="form-view__preview-name">{{ product.name }}</div>
        <StockBadge :product="product" />
      </div>

      <p class="section-label">Identificación</p>
      <div class="form-section">
        <div class="form-group">
          <label class="form-label" for="ep-sku">Código / SKU</label>
          <input class="form-input" id="ep-sku" name="ep-sku" type="text" :value="product.sku" readonly />
          <span class="form-hint">El SKU no puede modificarse</span>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="ep-name">Nombre del producto</label>
            <input class="form-input" id="ep-name" name="ep-name" type="text" v-model="form.name" />
          </div>
          <div class="form-group">
            <label class="form-label" for="ep-category">Categoría</label>
            <select v-if="!creatingCategory" class="form-select" id="ep-category" name="ep-category"
              :value="form.category === '' ? '__sin_categoria__' : form.category" @change="onCategoryChange">
              <option value="" disabled>Seleccionar…</option>
              <option value="__sin_categoria__">Sin categoría</option>
              <option v-for="c in availableCategories" :key="c" :value="c">{{ c }}</option>
              <option value="__nueva__">+ Crear categoría…</option>
            </select>
            <div v-else class="discount-custom">
              <input class="form-input discount-custom__input" id="ep-category" name="ep-category" type="text"
                v-model="newCategory" placeholder="Nombre de categoría" @keydown.enter="confirmNewCategory"
                @keydown.escape="cancelNewCategory" ref="newCatInput" aria-label="Nombre de nueva categoría" />
              <button type="button" class="discount-custom__reset" @click="cancelNewCategory"
                aria-label="Cancelar nueva categoría">
                <i class="ti ti-x" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="ep-brand">Marca</label>
            <select v-if="!creatingBrand" class="form-select" id="ep-brand" name="ep-brand" :value="form.bid"
              @change="onBrandChange">
              <option value="">Seleccionar…</option>
              <option v-for="b in store.sortedBrands" :key="b.id" :value="b.id">{{ b.name }}</option>
              <option value="__nueva__">+ Crear marca…</option>
            </select>
            <div v-else class="discount-custom">
              <input class="form-input discount-custom__input" id="ep-brand" name="ep-brand" type="text"
                v-model="newBrand" placeholder="Nombre de marca" @keydown.enter="confirmNewBrand"
                @keydown.escape="cancelNewBrand" ref="newBrandInput" aria-label="Nombre de nueva marca" />
              <button type="button" class="discount-custom__reset" @click="cancelNewBrand"
                aria-label="Cancelar nueva marca">
                <i class="ti ti-x" aria-hidden="true"></i>
              </button>
            </div>

          </div>
          <div class="form-group">
            <label class="form-label" for="ep-origin">Origen</label>
            <input class="form-input" id="ep-origin" name="ep-origin" type="text" :value="form.origin"
              placeholder="Ej. Italia"
              @input="e => { form.origin = sanitizeOrigin(e.target.value); e.target.value = form.origin }" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="ep-size">Contenido</label>
            <div class="size-field">
              <input class="form-input size-field__qty" id="ep-size" name="ep-size" type="number" v-model="sizeQty"
                placeholder="Ej. 190" inputmode="decimal" min="0" step="any" aria-label="Cantidad de contenido" />
              <select class="form-select size-field__unit-select" id="ep-size-unit" name="ep-size-unit"
                v-model="sizeUnit" aria-label="Unidad de medida">
                <optgroup label="Sólidos">
                  <option value="gr">gr</option>
                  <option value="Kg">Kg</option>
                  <option value="mg">mg</option>
                  <option value="oz">oz</option>
                  <option value="lb">lb</option>
                </optgroup>
                <optgroup label="Líquidos">
                  <option value="ml">ml</option>
                  <option value="Lt">Lt</option>
                  <option value="cl">cl</option>
                  <option value="fl oz">fl oz</option>
                </optgroup>
                <optgroup label="Otros">
                  <option value="cm">cm</option>
                  <option value="m">m</option>
                  <option value="ud">ud</option>
                </optgroup>
              </select>
            </div>
          </div>
          <div v-if="isBoxMode" class="form-group">
            <label class="form-label" for="ep-units-per-box">Uds. por caja</label>
            <input class="form-input" :class="{ 'form-input--error': errors.unitsPerBox }" id="ep-units-per-box"
              name="ep-units-per-box" type="number" :value="form.unitsPerBox" inputmode="numeric" min="1"
              :max="MAX_UNITS_BOX" step="1" :disabled="minStockManual && !!form.minStock" @blur="validateUnitsPerBox"
              @input="e => { const v = sanitizeInteger(e.target.value, MAX_UNITS_BOX); form.unitsPerBox = v === '' ? '' : Number(v); e.target.value = v; minStockManual.value = false; validateUnitsPerBox() }" />
            <span v-if="errors.unitsPerBox" class="form-hint form-hint--error" role="alert">{{ errors.unitsPerBox
            }}</span>
          </div>
        </div>
        <div class="form-row form-row--half">
          <div class="form-group">
            <label class="form-label" for="ep-min-stock">Stock mínimo</label>
            <input
              class="form-input"
              :class="{ 'form-input--error': errors.minStock, 'form-input--auto': !minStockManual && form.unitsPerBox > 0 }"
              id="ep-min-stock"
              name="ep-min-stock"
              type="number"
              :value="form.minStock"
              :placeholder="form.unitsPerBox > 0 ? String(form.unitsPerBox) : 'Ej. 5'"
              inputmode="numeric"
              min="1"
              :max="MAX_STOCK"
              step="1"
              @input="e => { const v = sanitizeInteger(e.target.value, MAX_STOCK); form.minStock = v === '' ? '' : Number(v); e.target.value = v; minStockManual.value = v !== ''; validateMinStock() }"
              @blur="validateMinStock"
            />
            <span v-if="errors.minStock" class="form-hint form-hint--error" role="alert">{{ errors.minStock }}</span>
            <span v-else-if="!minStockManual && form.unitsPerBox > 0" class="form-hint">Calculado de uds. por caja</span>
            <span v-else class="form-hint">Avisar cuando baje de este número</span>
          </div>
        </div>
      </div>

      <p class="section-label">Precios</p>
      <div class="form-section">
        <!-- Fila 1: Precio neto + IVA% -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="ep-cost">Precio neto</label>
            <div class="size-field">
              <input class="form-input size-field__qty" :class="{ 'form-input--error': errors.cost }" id="ep-cost"
                name="ep-cost" type="number" v-model.number="form.cost" placeholder="Valor" inputmode="decimal" min="0"
                :max="MAX_PRICE" step="0.01" @blur="validateCost" @input="onCostInput"
                @keydown="e => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()" aria-label="Precio neto" />
              <select class="form-select size-field__unit-select" id="ep-price-currency" name="ep-price-currency"
                v-model="form.priceCurrency" aria-label="Moneda del precio">
                <option value="USD">USD</option>
                <option value="UYU">UYU</option>
              </select>
            </div>
            <span v-if="errors.cost" class="form-hint form-hint--error" role="alert">{{ errors.cost }}</span>
          </div>
          <div class="form-group">
            <label class="form-label" for="ep-vat-rate">IVA %</label>
            <input class="form-input" :class="{ 'form-input--error': errors.vatRate }" id="ep-vat-rate"
              name="ep-vat-rate" type="number" :value="form.vatRate" inputmode="numeric" min="0" :max="MAX_VAT" step="1"
              placeholder="Ej. 21" @blur="validateVatRate" @input="onVatRateInput"
              @keydown="e => ['-', '+', 'e', 'E', '.', ','].includes(e.key) && e.preventDefault()" />
            <span v-if="errors.vatRate" class="form-hint form-hint--error" role="alert">{{ errors.vatRate }}</span>
          </div>
        </div>

        <!-- Fila 2: Descuento + Margen -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="ep-discount">Descuento</label>
            <select v-if="discountMode !== 'custom'" class="form-select" id="ep-discount" name="ep-discount"
              :value="discountSelectValue" @change="onDiscountAndCalc">
              <option value="none">Sin descuento</option>
              <option value="custom">Personalizado</option>
            </select>
            <div v-else class="discount-custom">
              <input class="form-input discount-custom__input" id="ep-discount" name="ep-discount" type="number"
                :value="customDiscountValue" @input="e => { onCustomDiscountInput(e); calcPrice(e.target.value) }"
                @blur="e => { onCustomDiscountBlur(e); calcPrice(form.discount) }" inputmode="decimal" min="1" max="100"
                step="0.1" placeholder="Ej. 15" aria-label="Descuento personalizado (1-100%)" />
              <button type="button" class="discount-custom__reset" @click="onResetDiscount"
                aria-label="Volver a opciones predefinidas">
                <i class="ti ti-x" aria-hidden="true"></i>
              </button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="ep-margin">Margen %</label>
            <input class="form-input" :class="{ 'form-input--error': errors.margin }" id="ep-margin" name="ep-margin"
              type="number" :value="form.margin" inputmode="numeric" min="0" :max="MAX_MARGIN" step="1"
              placeholder="Ej. 30" @blur="validateMargin" @input="onMarginInput"
              @keydown="e => ['-', '+', 'e', 'E', '.', ','].includes(e.key) && e.preventDefault()" />
            <span v-if="errors.margin" class="form-hint form-hint--error" role="alert">{{ errors.margin }}</span>
          </div>
        </div>

        <!-- Fila 3: PVP (calculado, readonly) -->
        <div class="form-row form-row--half">
          <div class="form-group">
            <label class="form-label" for="ep-price">PVP sugerido</label>
            <input class="form-input" id="ep-price" name="ep-price" type="number" :value="form.price"
              placeholder="Resultado" inputmode="decimal" readonly aria-readonly="true" />
          </div>
        </div>
      </div>

      <p class="section-label">Vencimiento</p>
      <div class="expiry-block">
        <div class="expiry-block__head">
          <i class="ti ti-calendar-event" aria-hidden="true"></i>
          <span>Fecha de vencimiento</span>
        </div>
        <div class="expiry-block__row">
          <div class="form-group">
            <label class="form-label" for="ep-expiry">Fecha</label>
            <input class="form-input" id="ep-expiry" name="ep-expiry" type="date" v-model="form.expiry" :min="todayIso"
              @input="handleExpiryInput" />
            <span v-if="form.expiry && expiryYearError" class="form-hint form-hint--error">{{ expiryYearError }}</span>
          </div>
          <div class="form-group">
            <label class="form-label" for="ep-batch">Nro. de lote</label>
            <input class="form-input" id="ep-batch" name="ep-batch" type="text" :value="form.batch"
              placeholder="Ej. L2503" :readonly="isBatchContext" maxlength="20"
              @input="e => { if (!isBatchContext) { form.batch = e.target.value.replace(/[^A-Za-z0-9\-]/g, ''); e.target.value = form.batch } }" />
            <span v-if="isBatchContext" class="form-hint">El nro. de lote se edita desde la carpeta del lote</span>
          </div>
        </div>
        <label class="form-label" for="ep-alert-days">Avisar con anticipación</label>
        <div class="expiry-block__footer">
          <select class="form-select" id="ep-alert-days" name="ep-alert-days" v-model.number="form.alertDays">
            <option :value="30">30 días antes</option>
            <option :value="60">60 días antes</option>
            <option :value="90">90 días antes</option>
          </select>
          <div v-if="expiryLevel !== 'ok'" :class="`expiry-block__alert expiry-block__alert--${expiryLevel}`"
            role="alert">
            <i :class="`ti ${expiryLevelIcon}`" aria-hidden="true"></i>
            <p>{{ expiryLevelMessage }}</p>
          </div>
        </div>
      </div>

      <div class="spacer--sm"></div>
    </div>

    <div class="btn-group btn-group--row">
      <button class="btn btn--secondary" @click="$router.push(detailPathWithQuery(product.id, route.query))">Descartar
        cambios</button>
      <button class="btn btn--primary" @click="save">
        <i class="ti ti-device-floppy" aria-hidden="true"></i>Guardar cambios
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductsStore } from '../stores/products.js'
import { DEFAULT_PRESET } from '../stores/discounts.js'
import { useDtoSelector } from '../composables/useDtoSelector.js'
import { detailPathWithQuery, resolveAlertBack } from '../composables/useAlertNavigation.js'
import { useProductFieldValidation, sanitizeInteger, sanitizeOrigin } from '../composables/useProductFieldValidation.js'
import TopBar from '../components/layout/TopBar.vue'
import StockBadge from '../components/ui/StockBadge.vue'

const route = useRoute()
const router = useRouter()
const store = useProductsStore()
const product = computed(() => store.getProduct(route.params.id))
const isBatchContext = computed(() => route.query.from === 'batch')
const alertBack = computed(() => resolveAlertBack(route.query, product.value))
const backTo = computed(() => alertBack.value?.to ?? detailPathWithQuery(route.params.id, route.query))
const backLabel = computed(() => alertBack.value?.label ?? 'Detalle')

const SIZE_UNITS = ['gr', 'Kg', 'mg', 'oz', 'lb', 'ml', 'Lt', 'cl', 'fl oz', 'cm', 'm', 'ud']
const sizeQty = ref('')
const sizeUnit = ref('gr')
const minStockManual = ref(false)
const isBoxMode = computed(() => Number(form.unitsPerBox) > 0)

function parseSizeString(raw) {
  if (!raw) return { qty: '', unit: 'gr' }
  const match = String(raw).match(/^([\d.]+)\s*([a-zA-Z]+)$/)
  if (!match) return { qty: raw, unit: 'gr' }
  const unit = SIZE_UNITS.find(u => u.toLowerCase() === match[2].toLowerCase()) ?? 'gr'
  return { qty: match[1], unit }
}

const form = reactive({
  name: '', size: '', unitsPerBox: 0,
  cost: 0, vatRate: '', margin: '', price: 0, discount: DEFAULT_PRESET,
  stock: 0, expiry: '', batch: '',
  bid: '', origin: '', category: '',
  alertDays: 30,
  img: '',
  priceCurrency: 'USD',
})

watch([sizeQty, sizeUnit], ([qty, unit]) => {
  form.size = qty !== '' && qty !== null ? `${qty} ${unit}` : ''
})

const {
  discountMode, customDiscountValue, discountSelectValue,
  initFromValue,
  onDiscountChange, onCustomDiscountInput, onCustomDiscountBlur, resetDiscountToPreset,
} = useDtoSelector(form)

const {
  errors,
  validateCost, validateVatRate, validateMargin, validatePrice, validateUnitsPerBox, validateMinStock,
  validateNumericFields, hasNumericErrors,
  MAX_STOCK, MAX_UNITS_BOX, MAX_PRICE, MAX_VAT, MAX_MARGIN,
} = useProductFieldValidation(form)

// ─── Lógica de auto-cálculo del PVP ──────────────────────────────────────────
// Fórmula: PVP = neto × (1 + IVA/100) × (1 + margen/100) × (1 - descuento/100)
// "26+5" se resuelve sumando todos los números del string → 31%
const priceIsAutoCalc = ref(false)

function resolveDiscount(raw) {
  if (!raw) return 0
  const nums = String(raw).match(/[\d.]+/g)
  if (!nums) return 0
  return nums.reduce((acc, n) => acc + parseFloat(n), 0)
}

const discountPct = computed(() => resolveDiscount(form.discount))

function calcPrice(discountRaw) {
  const cost = form.cost
  const vatRate = form.vatRate
  const margin = form.margin
  const anyEmpty = cost === '' || cost === null || vatRate === '' || vatRate === null || margin === '' || margin === null
  if (anyEmpty) return
  if (typeof cost !== 'number' || typeof vatRate !== 'number' || typeof margin !== 'number') return
  if (isNaN(cost) || isNaN(vatRate) || isNaN(margin)) return
  const pct = resolveDiscount(discountRaw !== undefined ? discountRaw : form.discount)
  const costWithVat = cost * (1 + vatRate / 100)
  const pvpBase = costWithVat * (1 + margin / 100)
  form.price = parseFloat((pvpBase * (1 - pct / 100)).toFixed(2))
  priceIsAutoCalc.value = true
}

function onCostInput(e) {
  const raw = e.target.value.replace(/[^0-9.]/g, '')
  const parts = raw.split('.')
  const clean = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('').slice(0, 2) : raw
  e.target.value = clean
  validateCost()
  calcPrice()
}
function onVatRateInput(e) {
  const clean = sanitizeInteger(e.target.value, MAX_VAT)
  e.target.value = clean
  form.vatRate = clean === '' ? '' : Number(clean)
  validateVatRate()
  calcPrice()
}
function onMarginInput(e) {
  const clean = sanitizeInteger(e.target.value, MAX_MARGIN)
  e.target.value = clean
  form.margin = clean === '' ? '' : Number(clean)
  validateMargin()
  calcPrice()
}
function onDiscountAndCalc(e) {
  const newDiscount = e.target.value === 'custom' ? form.discount : e.target.value
  onDiscountChange(e)
  calcPrice(newDiscount)
}
function onResetDiscount() {
  resetDiscountToPreset()
  calcPrice('0')
}

// ─── Cargar producto al editar ────────────────────────────────────────────────
watch(() => form.unitsPerBox, (val) => {
  if (!minStockManual.value) {
    form.minStock = (val && Number(val) > 0) ? Number(val) : ''
  }
})

watch(product, p => {
  if (!p) return
  Object.assign(form, {
    name: p.name, size: p.size, unitsPerBox: p.unitsPerBox,
    cost: p.cost, vatRate: p.vatRate ?? '', margin: p.margin ?? '', price: p.price,
    discount: p.discount || DEFAULT_PRESET,
    stock: p.stock, expiry: p.expiry || '', batch: p.batch || '',
    bid: p.bid || '', origin: p.origin || '', category: p.category || '',
    alertDays: p.alertDays || 30,
    img: p.img || '',
    priceCurrency: p.priceCurrency || 'USD',
    minStock: p.minStock || p.unitsPerBox || '',
  })
  const parsed = parseSizeString(p.size)
  sizeQty.value = parsed.qty
  sizeUnit.value = parsed.unit
  initFromValue(p.discount)
  priceIsAutoCalc.value = p.vatRate != null && p.margin != null
}, { immediate: true })

// ─── Photo ────────────────────────────────────────────────────────────────────
const photoInput = ref(null)
function onPhotoChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = ev => { form.img = ev.target.result }
  reader.readAsDataURL(file)
}
function removePhoto() {
  form.img = ''
  if (photoInput.value) photoInput.value.value = ''
}

/**
 * Valida que el año tenga máximo 4 dígitos.
 * Si el usuario intenta escribir más dígitos, los trunca.
 */
function handleExpiryInput() {
  const val = form.expiry
  if (!val) return

  const parts = val.split('-')
  if (parts.length !== 3) return

  const [year, month, day] = parts

  // Si el año tiene más de 4 dígitos, truncar a 4
  if (year.length > 4) {
    form.expiry = `${year.substring(0, 4)}-${month}-${day}`
  }
}

const creatingBrand = ref(false)
const newBrand = ref('')
const newBrandInput = ref(null)

function _resetCategoryIfStale() {
  if (!form.category) return
  if (!availableCategories.value.includes(form.category)) {
    form.category = ''
  }
}

function onBrandChange(e) {
  if (e.target.value === '__nueva__') {
    creatingBrand.value = true
    newBrand.value = ''
    nextTick(() => newBrandInput.value?.focus())
  } else {
    form.bid = e.target.value
    _resetCategoryIfStale()
  }
}

function confirmNewBrand() {
  const n = newBrand.value.trim()
  if (!n) return
  const id = store.addBrand(n)
  form.bid = id ?? n.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
  creatingBrand.value = false
  newBrand.value = ''
  _resetCategoryIfStale()
}

function cancelNewBrand() {
  creatingBrand.value = false
  newBrand.value = ''
}

const creatingCategory = ref(false)
const newCategory = ref('')
const newCatInput = ref(null)

const availableCategories = computed(() =>
  form.bid ? store.getCategoriesForBrand(form.bid) : []
)

function onCategoryChange(e) {
  if (e.target.value === '__nueva__') {
    creatingCategory.value = true
    newCategory.value = ''
    nextTick(() => newCatInput.value?.focus())
  } else if (e.target.value === '__sin_categoria__') {
    form.category = ''
  } else {
    form.category = e.target.value
    if (form.bid) store.addCategoryToBrand(form.bid, form.category)
  }
}

function confirmNewCategory() {
  const n = newCategory.value.trim()
  if (!n) return
  store.addCategory(n)
  if (form.bid) store.addCategoryToBrand(form.bid, n)
  form.category = n
  creatingCategory.value = false
  newCategory.value = ''
}

function cancelNewCategory() {
  creatingCategory.value = false
  newCategory.value = ''
}

// Fecha mínima para el input (hoy en formato YYYY-MM-DD)
const todayIso = new Date().toLocaleDateString('en-CA') // 'en-CA' produce YYYY-MM-DD con hora local

// Rango de años válidos para vencimiento
const MIN_EXPIRY_YEAR = 2000
const MAX_EXPIRY_YEAR = 2100

/**
 * Devuelve el mensaje de error si el año está fuera del rango [2000, 2100].
 * Devuelve null si el valor está vacío o el año es válido.
 */
const expiryYearError = computed(() => {
  const val = form.expiry
  if (!val) return null
  const year = parseInt(val.split('-')[0], 10)
  if (year < MIN_EXPIRY_YEAR || year > MAX_EXPIRY_YEAR) {
    return `Escribe un año entre ${MIN_EXPIRY_YEAR} y ${MAX_EXPIRY_YEAR}`
  }
  return null
})

// Calcula días restantes usando constructor local para evitar desfase de zona horaria
function daysFromExpiry(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  const expiry = new Date(y, m - 1, d)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
}

const expiryLevel = computed(() => {
  const diff = daysFromExpiry(form.expiry)
  if (diff === null) return 'ok'
  if (diff < 0) return 'critico'
  if (diff < 30) return 'atencion'
  if (diff < form.alertDays) return 'aviso'
  return 'ok'
})

const expiryLevelIcon = computed(() => ({
  aviso: 'ti-info-circle',
  atencion: 'ti-alert-triangle',
  critico: 'ti-circle-x',
}[expiryLevel.value] ?? ''))

const expiryLevelMessage = computed(() => {
  const diff = daysFromExpiry(form.expiry)
  if (diff === null) return ''
  if (diff < 0) return 'Vencido'
  if (diff === 0) return 'Vence hoy'
  return `Vence en ${diff} día${diff === 1 ? '' : 's'}`
})

const save = () => {
  if (creatingCategory.value) confirmNewCategory()
  if (creatingBrand.value) confirmNewBrand()
  validateNumericFields()
  if (hasNumericErrors.value) return
  if (form.category && form.bid) store.addCategoryToBrand(form.bid, form.category)
  store.editProduct(product.value.id, { ...form })
  store.setProductUpdated()
  router.push(detailPathWithQuery(product.value.id, route.query))
}
</script>