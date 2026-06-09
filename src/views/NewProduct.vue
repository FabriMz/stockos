<template>
  <div class="screen">
    <TopBar variant="back" :back-label="batchContext ? brand?.name ?? 'Marca' : 'Cancelar'" :back-to="backTo"
      title="Nuevo producto" />

    <div class="scroll-content">
      <div class="form-view__photo-picker">
        <input ref="photoInput" id="np-photo" name="np-photo" type="file" accept="image/*" capture="environment"
          class="form-view__photo-input" aria-label="Tomar foto del producto" @change="onPhotoChange" />
        <label for="np-photo" class="form-view__photo-trigger">
          <img v-if="form.img" :src="form.img" alt="Foto del producto" class="form-view__photo-img" />
          <i v-else class="ti ti-camera" aria-hidden="true"></i>
        </label>
        <button v-if="form.img" type="button" class="form-view__photo-remove" aria-label="Quitar imagen"
          @click="removePhoto">
          <i class="ti ti-x" aria-hidden="true"></i>
        </button>
      </div>

      <div class="section-label-row">
        <p class="section-label">Identificación</p>
        <button
          type="button"
          class="scanner-trigger"
          aria-label="Escanear código de barras"
          @click="openScanner"
        >
          <i class="ti ti-barcode" aria-hidden="true"></i>
        </button>
      </div>

      <Teleport to="body">
        <div
          v-if="scannerOpen"
          class="scanner-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Escáner de código de barras"
        >
          <div class="scanner-overlay__header">
            <span class="scanner-overlay__title">Apuntar al código</span>
            <button
              type="button"
              class="scanner-overlay__close"
              aria-label="Cerrar escáner"
              @click="closeScanner"
            >
              <i class="ti ti-x" aria-hidden="true"></i>
            </button>
          </div>
          <div class="scanner-overlay__viewport">
            <video
              ref="scannerVideo"
              id="scanner-video"
              class="scanner-overlay__video"
              autoplay
              muted
              playsinline
              aria-label="Vista de cámara para escaneo"
            ></video>
            <div class="scanner-overlay__reticle" aria-hidden="true"></div>
          </div>
          <p v-if="scannerError" class="scanner-overlay__error" role="alert">{{ scannerError }}</p>
        </div>
      </Teleport>

      <div class="form-section">
        <div class="form-group">
          <label class="form-label" for="np-sku">Código / SKU</label>
          <input class="form-input" :class="{ 'form-input--error': requiredErrors.sku }" id="np-sku" name="np-sku"
            type="text" v-model="form.sku" placeholder="Ej. 160533BM" maxlength="15" />
          <span v-if="requiredErrors.sku" class="form-hint form-hint--error" role="alert">{{ requiredErrors.sku
            }}</span>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="np-name">Nombre del producto</label>
            <input class="form-input" :class="{ 'form-input--error': requiredErrors.name }" id="np-name" name="np-name"
              type="text" v-model="form.name" placeholder="Ej. Pesto Alla Genovese 190gr" />
            <span v-if="requiredErrors.name" class="form-hint form-hint--error" role="alert">{{ requiredErrors.name
              }}</span>
          </div>
          <div class="form-group">
            <label class="form-label" for="np-category">Categoría</label>
            <select v-if="!creatingCategory" class="form-select" id="np-category" name="np-category"
              :value="form.category === '' ? '__sin_categoria__' : form.category" @change="onCategoryChange">
              <option value="" disabled>Seleccionar…</option>
              <option value="__sin_categoria__">Sin categoría</option>
              <option v-for="c in availableCategories" :key="c" :value="c">{{ c }}</option>
              <option value="__nueva__">+ Crear categoría…</option>
            </select>
            <div v-else class="discount-custom">
              <input class="form-input discount-custom__input" id="np-category" name="np-category" type="text"
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
            <label class="form-label" for="np-brand">Marca</label>
            <input v-if="batchContext" class="form-input" id="np-brand" name="np-brand" type="text"
              :value="brand?.name ?? ''" readonly aria-label="Marca (fijada por el lote)" />
            <select v-else-if="!creatingBrand" class="form-select" id="np-brand" name="np-brand" :value="form.bid"
              @change="onBrandChange">
              <option value="">Seleccionar…</option>
              <option v-for="b in store.sortedBrands" :key="b.id" :value="b.id">{{ b.name }}</option>
              <option value="__nueva__">+ Crear marca…</option>
            </select>
            <div v-else class="discount-custom">
              <input class="form-input discount-custom__input" id="np-brand" name="np-brand" type="text"
                v-model="newBrand" placeholder="Nombre de marca" @keydown.enter="confirmNewBrand"
                @keydown.escape="cancelNewBrand" ref="newBrandInput" aria-label="Nombre de nueva marca" />
              <button type="button" class="discount-custom__reset" @click="cancelNewBrand"
                aria-label="Cancelar nueva marca">
                <i class="ti ti-x" aria-hidden="true"></i>
              </button>
            </div>
            <span v-if="requiredErrors.bid" class="form-hint form-hint--error" role="alert">{{ requiredErrors.bid
              }}</span>

          </div>
          <div class="form-group">
            <label class="form-label" for="np-origin">Origen</label>
            <input class="form-input" id="np-origin" name="np-origin" type="text" :value="form.origin"
              placeholder="Ej. Italia"
              @input="e => { form.origin = sanitizeOrigin(e.target.value); e.target.value = form.origin }" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="np-size">Contenido</label>
            <div class="size-field">
              <input class="form-input size-field__qty" id="np-size" name="np-size" type="number" v-model="sizeQty"
                placeholder="Ej. 190" inputmode="decimal" min="0" step="any" aria-label="Cantidad de contenido" />
              <select class="form-select size-field__unit-select" id="np-size-unit" name="np-size-unit"
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
          <div class="form-group">
            <label class="form-label" for="np-udscaja">Uds. por caja</label>
            <input class="form-input" :class="{ 'form-input--error': errors.unitsPerBox }" id="np-udscaja"
              name="np-udscaja" type="number" :value="form.unitsPerBox" placeholder="Ej. 12" inputmode="numeric" min="1"
              :max="MAX_UNITS_BOX" step="1" @blur="validateUnitsPerBox"
              @input="e => { const v = sanitizeInteger(e.target.value, MAX_UNITS_BOX); form.unitsPerBox = v === '' ? '' : Number(v); e.target.value = v; validateUnitsPerBox() }" />
            <span v-if="errors.unitsPerBox" class="form-hint form-hint--error" role="alert">{{ errors.unitsPerBox
              }}</span>
          </div>
        </div>
      </div>

      <p class="section-label">Precios</p>
      <div class="form-section">
        <!-- Fila 1: Precio neto + IVA% -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="np-cost">Precio neto</label>
            <div class="size-field">
              <input class="form-input size-field__qty" :class="{ 'form-input--error': errors.cost }" id="np-cost"
                name="np-cost" type="number" v-model.number="form.cost" placeholder="Valor" inputmode="decimal" min="0"
                :max="MAX_PRICE" step="0.01" @blur="validateCost" @input="onCostInput"
                @keydown="e => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()" aria-label="Precio neto" />
              <select class="form-select size-field__unit-select" id="np-price-currency" name="np-price-currency"
                v-model="form.priceCurrency" aria-label="Moneda del precio">
                <option value="UYU">UYU</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <span v-if="errors.cost" class="form-hint form-hint--error" role="alert">{{ errors.cost }}</span>
          </div>
          <div class="form-group">
            <label class="form-label" for="np-vat-rate">IVA %</label>
            <input class="form-input" :class="{ 'form-input--error': errors.vatRate }" id="np-vat-rate"
              name="np-vat-rate" type="number" :value="form.vatRate" placeholder="Ej. 21" inputmode="numeric" min="0"
              :max="MAX_VAT" step="1" @blur="validateVatRate" @input="onVatRateInput"
              @keydown="e => ['-', '+', 'e', 'E', '.', ','].includes(e.key) && e.preventDefault()" />
            <span v-if="errors.vatRate" class="form-hint form-hint--error" role="alert">{{ errors.vatRate }}</span>
          </div>
        </div>

        <!-- Fila 2: Descuento + Margen -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="np-discount">Descuento</label>
            <select v-if="discountMode !== 'custom'" class="form-select" id="np-discount" name="np-discount"
              :value="discountSelectValue" @change="onDiscountAndCalc">
              <option value="none">Sin descuento</option>
              <option value="custom">Personalizado</option>
            </select>
            <div v-else class="discount-custom">
              <input class="form-input discount-custom__input" id="np-discount" name="np-discount" type="number"
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
            <label class="form-label" for="np-margin">Margen %</label>
            <input class="form-input" :class="{ 'form-input--error': errors.margin }" id="np-margin" name="np-margin"
              type="number" :value="form.margin" placeholder="Ej. 30" inputmode="numeric" min="0" :max="MAX_MARGIN"
              step="1" @blur="validateMargin" @input="onMarginInput"
              @keydown="e => ['-', '+', 'e', 'E', '.', ','].includes(e.key) && e.preventDefault()" />
            <span v-if="errors.margin" class="form-hint form-hint--error" role="alert">{{ errors.margin }}</span>
          </div>
        </div>

        <!-- Fila 3: PVP (calculado o manual) -->
        <div class="form-row form-row--half">
          <div class="form-group">
            <label class="form-label" for="np-price">
              PVP sugerido
              <span v-if="priceLabel" class="form-hint form-hint--inline">{{ priceLabel }}</span>
            </label>
            <input class="form-input" id="np-price" name="np-price" type="number" :value="form.price"
              placeholder="Resultado" inputmode="decimal" readonly aria-readonly="true" />
          </div>
        </div>
      </div>

      <p class="section-label">Fecha de vencimiento</p>
      <div class="expiry-block">
        <div class="expiry-block__head">
          <i class="ti ti-calendar-event" aria-hidden="true"></i>
          <span>Vencimiento</span>
        </div>
        <div class="expiry-block__row">
          <div class="form-group">
            <label class="form-label" for="np-expiry">Fecha</label>
            <input class="form-input" id="np-expiry" name="np-expiry" type="date" v-model="form.expiry" :min="todayIso"
              @input="handleExpiryInput" />
            <span v-if="form.expiry && expiryYearError" class="form-hint form-hint--error" role="alert">{{ expiryYearError }}</span>
          </div>
          <div class="form-group">
            <label class="form-label" for="np-batch">Nro. de lote</label>
            <input class="form-input" id="np-batch" name="np-batch" type="text" :value="form.batch"
              placeholder="Ej. L2503" maxlength="20"
              @input="e => { form.batch = e.target.value.replace(/[^A-Za-z0-9\-]/g, ''); e.target.value = form.batch }" />
          </div>
        </div>
        <label class="form-label" for="np-alert-days">Avisar con anticipación</label>
        <div class="expiry-block__footer">
          <select class="form-select" id="np-alert-days" name="np-alert-days" v-model.number="form.alertDays">
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

      <p class="section-label">Stock inicial</p>
      <StockAdjuster v-model="form.stock" label="Unidades en stock"
        hint="Puedes actualizar el stock después desde los detalles" input-id="np-stock" :max-stock="MAX_STOCK"
        :error="errors.stock" @validate="validateStock" />

      <div class="spacer--sm"></div>
    </div>

    <div class="btn-group btn-group--row">
      <button class="btn btn--secondary" @click="$router.push('/catalog')">Cancelar</button>
      <button class="btn btn--primary" @click="save">
        <i class="ti ti-device-floppy" aria-hidden="true"></i>Guardar
      </button>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProductsStore } from '../stores/products.js'
import { DEFAULT_PRESET } from '../stores/discounts.js'
import { useDtoSelector } from '../composables/useDtoSelector.js'
import { useProductFieldValidation, sanitizeInteger, sanitizeOrigin } from '../composables/useProductFieldValidation.js'
import TopBar from '../components/layout/TopBar.vue'
import StockAdjuster from '../components/ui/StockAdjuster.vue'

const router = useRouter()
const route = useRoute()
const store = useProductsStore()

const batchContext = route.query.batchNumber || null

const sizeQty = ref('')
const sizeUnit = ref('gr')

const form = reactive({
  sku: '', name: '', bid: route.query.bid || '', origin: '', size: '',
  category: '', cost: '', vatRate: '', margin: '', price: '', discount: DEFAULT_PRESET, unitsPerBox: '',
  expiry: '', batch: batchContext ?? '', stock: 0,
  ic: 'ti-box', bg: '#F0EAE4', col: '#791132', max: 100, img: '',
  alertDays: 30,
  priceCurrency: 'UYU',
})

watch([sizeQty, sizeUnit], ([qty, unit]) => {
  form.size = qty !== '' && qty !== null ? `${qty} ${unit}` : ''
})

// ─── Lógica de auto-cálculo del PVP ──────────────────────────────────────────
// Fórmula: PVP = neto × (1 + IVA/100) × (1 + margen/100) × (1 - descuento/100)
// "26+5" se resuelve sumando todos los números del string → 31%
// Si el usuario edita price manualmente, se deja de sobrescribir.
const priceIsAutoCalc = ref(false)

function resolveDiscount(raw) {
  if (!raw) return 0
  const nums = String(raw).match(/[\d.]+/g)
  if (!nums) return 0
  return nums.reduce((acc, n) => acc + parseFloat(n), 0)
}

const discountPct = computed(() => resolveDiscount(form.discount))
const priceLabel = computed(() => {
  if (!priceIsAutoCalc.value) return null
  return discountPct.value > 0 ? 'con descuento' : 'calculado'
})

function calcPrice(discountRaw) {
  const cost = form.cost
  const vatRate = form.vatRate
  const margin = form.margin
  const anyEmpty = cost === '' || cost === null || vatRate === '' || vatRate === null || margin === '' || margin === null
  if (anyEmpty) return
  if (typeof cost !== 'number' || typeof vatRate !== 'number' || typeof margin !== 'number') return
  if (isNaN(cost) || isNaN(vatRate) || isNaN(margin)) return
  // Usar el descuento pasado explícitamente (caso cambio de selector) o leer form.discount
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

// Rango de años válidos para vencimiento
const MIN_EXPIRY_YEAR = 2000
const MAX_EXPIRY_YEAR = 2100

const expiryYearError = computed(() => {
  const val = form.expiry
  if (!val) return null
  const year = parseInt(val.split('-')[0], 10)
  if (year < MIN_EXPIRY_YEAR || year > MAX_EXPIRY_YEAR) {
    return `Escribe un año entre ${MIN_EXPIRY_YEAR} y ${MAX_EXPIRY_YEAR}`
  }
  return null
})

const brand = computed(() => form.bid ? store.getBrand(form.bid) : null)
const backTo = computed(() =>
  batchContext
    ? `/catalog/batch/${encodeURIComponent(batchContext)}/${form.bid}`
    : '/catalog'
)

// Fecha mínima para el input (hoy en formato YYYY-MM-DD)
const todayIso = new Date().toLocaleDateString('en-CA') // 'en-CA' produce YYYY-MM-DD con hora local

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
  critico: 'ti-alert-triangle',
}[expiryLevel.value] ?? ''))

const expiryLevelMessage = computed(() => {
  const diff = daysFromExpiry(form.expiry)
  if (diff === null) return ''
  if (diff < 0) return 'Vencido'
  if (diff === 0) return 'Vence hoy'
  return `Vence en ${diff} día${diff === 1 ? '' : 's'}`
})

const {
  discountMode, customDiscountValue, discountSelectValue,
  onDiscountChange, onCustomDiscountInput, onCustomDiscountBlur, resetDiscountToPreset,
} = useDtoSelector(form)

const {
  errors,
  validateCost, validateVatRate, validateMargin, validatePrice, validateUnitsPerBox, validateStock,
  validateNumericFields, hasNumericErrors,
  MAX_STOCK, MAX_UNITS_BOX, MAX_PRICE, MAX_VAT, MAX_MARGIN,
} = useProductFieldValidation(form)

const requiredErrors = reactive({ sku: null, name: null, bid: null })

watch(() => form.sku, () => { if (form.sku) requiredErrors.sku = null })
watch(() => form.name, () => { if (form.name) requiredErrors.name = null })
watch(() => form.bid, () => { if (form.bid) requiredErrors.bid = null })

const creatingCategory = ref(false)
const newCategory = ref('')
const newCatInput = ref(null)

const creatingBrand = ref(false)
const newBrand = ref('')
const newBrandInput = ref(null)

const availableCategories = computed(() =>
  form.bid ? store.getCategoriesForBrand(form.bid) : []
)

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
  form.bid = ''
}

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
  form.category = ''
}

// ─── Barcode Scanner ──────────────────────────────────────────────────────────
const barcodeSupported = ref(typeof BarcodeDetector !== 'undefined')
const scannerOpen = ref(false)
const scannerVideo = ref(null)
const scannerError = ref(null)

let _scannerStream = null
let _scannerDetector = null
let _scannerRAF = null

async function openScanner() {
  scannerError.value = null
  scannerOpen.value = true

  await nextTick()

  if (typeof BarcodeDetector === 'undefined') {
    scannerError.value = 'Tu navegador no soporta el escáner. Usá Chrome en Android o Safari en iOS.'
    return
  }

  try {
    _scannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false,
    })
    if (!scannerVideo.value) return
    scannerVideo.value.srcObject = _scannerStream

    _scannerDetector = new BarcodeDetector({
      formats: [
        'ean_13', 'ean_8', 'upc_a', 'upc_e',
        'code_39', 'code_128', 'itf', 'data_matrix', 'qr_code',
      ],
    })

    const detect = async () => {
      if (!scannerOpen.value) return
      try {
        const results = await _scannerDetector.detect(scannerVideo.value)
        if (results.length > 0) {
          form.sku = results[0].rawValue
          closeScanner()
          return
        }
      } catch { /* frame not ready yet */ }
      _scannerRAF = requestAnimationFrame(detect)
    }

    scannerVideo.value.onloadedmetadata = () => {
      _scannerRAF = requestAnimationFrame(detect)
    }
  } catch (err) {
    scannerError.value = err.name === 'NotAllowedError'
      ? 'Permiso de cámara denegado.'
      : 'No se pudo acceder a la cámara.'
  }
}

function closeScanner() {
  scannerOpen.value = false
  if (_scannerRAF) { cancelAnimationFrame(_scannerRAF); _scannerRAF = null }
  if (_scannerStream) { _scannerStream.getTracks().forEach(t => t.stop()); _scannerStream = null }
  _scannerDetector = null
  scannerError.value = null
}

onUnmounted(() => { if (scannerOpen.value) closeScanner() })

const save = () => {
  if (creatingBrand.value) confirmNewBrand()
  if (creatingCategory.value) confirmNewCategory()
  validateNumericFields()
  requiredErrors.sku = (!batchContext && !form.sku) ? 'Requerido' : null
  requiredErrors.name = !form.name ? 'Requerido' : null
  requiredErrors.bid = !form.bid ? 'Seleccioná una marca' : null
  if (requiredErrors.sku || requiredErrors.name || requiredErrors.bid) return
  if (hasNumericErrors.value) return
  if (expiryYearError.value) return
  if (form.category && form.bid) store.addCategoryToBrand(form.bid, form.category)
  if (batchContext) {
    store.addProductToBatch({ ...form }, batchContext)
    router.push(`/catalog/batch/${encodeURIComponent(batchContext)}/${form.bid}`)
  } else {
    store.addProduct({ ...form })
    router.push(`/catalog/${form.bid}`)
  }
}
</script>