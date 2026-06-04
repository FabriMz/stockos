<template>
  <div class="screen" v-if="product">
    <TopBar variant="back" :back-label="backLabel" :back-to="backTo" title="Editar" />

    <div class="scroll-content">

      <div class="form-view__preview">
        <div class="form-view__preview-icon" :style="{ background: product.bg }">
          <img v-if="product.img" :src="product.img" :alt="product.name" class="form-view__preview-img">
          <i v-else :class="`ti ${product.ic}`" :style="{ color: product.col }" aria-hidden="true"></i>
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
        <div class="form-group">
          <label class="form-label" for="ep-name">Nombre del producto</label>
          <input class="form-input" id="ep-name" name="ep-name" type="text" v-model="form.name" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="ep-brand">Marca</label>
            <select
              v-if="!creatingBrand"
              class="form-select"
              id="ep-brand"
              name="ep-brand"
              :value="form.bid"
              @change="onBrandChange"
            >
              <option value="">Seleccionar…</option>
              <option v-for="b in store.sortedBrands" :key="b.id" :value="b.id">{{ b.name }}</option>
              <option value="__nueva__">+ Crear marca…</option>
            </select>
            <div v-else class="discount-custom">
              <input
                class="form-input discount-custom__input"
                id="ep-brand"
                name="ep-brand"
                type="text"
                v-model="newBrand"
                placeholder="Nombre de marca"
                @keydown.enter="confirmNewBrand"
                @keydown.escape="cancelNewBrand"
                ref="newBrandInput"
                aria-label="Nombre de nueva marca"
              />
              <button type="button" class="discount-custom__reset" @click="cancelNewBrand" aria-label="Cancelar nueva marca">
                <i class="ti ti-x" aria-hidden="true"></i>
              </button>
            </div>

          </div>
          <div class="form-group">
            <label class="form-label" for="ep-origin">Origen</label>
            <input class="form-input" id="ep-origin" name="ep-origin" type="text" v-model="form.origin" placeholder="Ej. Italia" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="ep-size">Contenido</label>
            <input class="form-input" id="ep-size" name="ep-size" type="text" v-model="form.size" />
          </div>
          <div class="form-group">
            <label class="form-label" for="ep-units-per-box">Uds. por caja</label>
            <input
              class="form-input"
              :class="{ 'form-input--error': errors.unitsPerBox }"
              id="ep-units-per-box"
              name="ep-units-per-box"
              type="number"
              v-model.number="form.unitsPerBox"
              inputmode="numeric"
              min="1"
              :max="MAX_UNITS_BOX"
              step="1"
              @blur="validateUnitsPerBox"
              @input="validateUnitsPerBox"
            />
            <span v-if="errors.unitsPerBox" class="form-hint form-hint--error" role="alert">{{ errors.unitsPerBox }}</span>
          </div>
        </div>
        <div class="form-row form-row--half">
          <div class="form-group">
            <label class="form-label" for="ep-category">Categoría</label>
            <select
              v-if="!creatingCategory"
              class="form-select"
              id="ep-category"
              name="ep-category"
              :value="form.category === '' ? '__sin_categoria__' : form.category"
              @change="onCategoryChange"
            >
              <option value="" disabled>Seleccionar…</option>
              <option value="__sin_categoria__">Sin categoría</option>
              <option v-for="c in brandCategories" :key="c" :value="c">{{ c }}</option>
              <option value="__nueva__">+ Crear categoría…</option>
            </select>
            <div v-else class="discount-custom">
              <input
                class="form-input discount-custom__input"
                id="ep-category"
                name="ep-category"
                type="text"
                v-model="newCategory"
                placeholder="Nombre de categoría"
                @keydown.enter="confirmNewCategory"
                @keydown.escape="cancelNewCategory"
                ref="newCatInput"
                aria-label="Nombre de nueva categoría"
              />
              <button type="button" class="discount-custom__reset" @click="cancelNewCategory" aria-label="Cancelar nueva categoría">
                <i class="ti ti-x" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <p class="section-label">Precios</p>
      <div class="form-section">
        <!-- Fila 1: Precio neto + IVA% -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="ep-cost">Precio neto</label>
            <input
              class="form-input"
              :class="{ 'form-input--error': errors.cost }"
              id="ep-cost"
              name="ep-cost"
              type="number"
              v-model.number="form.cost"
              inputmode="decimal"
              min="0"
              :max="MAX_PRICE"
              step="0.01"
              @blur="validateCost"
              @input="onCostInput"
            />
            <span v-if="errors.cost" class="form-hint form-hint--error" role="alert">{{ errors.cost }}</span>
          </div>
          <div class="form-group">
            <label class="form-label" for="ep-vat-rate">IVA %</label>
            <input
              class="form-input"
              :class="{ 'form-input--error': errors.vatRate }"
              id="ep-vat-rate"
              name="ep-vat-rate"
              type="number"
              v-model.number="form.vatRate"
              inputmode="decimal"
              min="0"
              max="30"
              step="0.1"
              placeholder="Ej. 21"
              @blur="validateVatRate"
              @input="onVatRateInput"
            />
            <span v-if="errors.vatRate" class="form-hint form-hint--error" role="alert">{{ errors.vatRate }}</span>
          </div>
        </div>

        <!-- Fila 2: Descuento + Margen -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="ep-discount">Descuento</label>
            <select
              v-if="discountMode !== 'custom'"
              class="form-select"
              id="ep-discount"
              name="ep-discount"
              :value="discountSelectValue"
              @change="onDiscountAndCalc"
            >
              <option value="none">Sin descuento</option>
              <option value="custom">Personalizado</option>
            </select>
            <div v-else class="discount-custom">
              <input
                class="form-input discount-custom__input"
                id="ep-discount"
                name="ep-discount"
                type="number"
                :value="customDiscountValue"
                @input="e => { onCustomDiscountInput(e); calcPrice(e.target.value) }"
                @blur="e => { onCustomDiscountBlur(e); calcPrice(form.discount) }"
                inputmode="decimal"
                min="1"
                max="100"
                step="0.1"
                placeholder="Ej. 15"
                aria-label="Descuento personalizado (1-100%)"
              />
              <button type="button" class="discount-custom__reset" @click="resetDiscountToPreset" aria-label="Volver a opciones predefinidas">
                <i class="ti ti-x" aria-hidden="true"></i>
              </button>
            </div>
            <span class="form-hint" v-if="discountMode === 'custom'">Entre 1% y 100%</span>
          </div>
          <div class="form-group">
            <label class="form-label" for="ep-margin">Margen %</label>
            <input
              class="form-input"
              :class="{ 'form-input--error': errors.margin }"
              id="ep-margin"
              name="ep-margin"
              type="number"
              v-model.number="form.margin"
              inputmode="decimal"
              min="0"
              max="999"
              step="0.1"
              placeholder="Ej. 30"
              @blur="validateMargin"
              @input="onMarginInput"
            />
            <span v-if="errors.margin" class="form-hint form-hint--error" role="alert">{{ errors.margin }}</span>
          </div>
        </div>

        <!-- Fila 3: PVP (calculado o manual) -->
        <div class="form-row form-row--half">
          <div class="form-group">
            <label class="form-label" for="ep-price">
              PVP sugerido
              <span v-if="priceLabel" class="form-hint form-hint--inline">{{ priceLabel }}</span>
            </label>
            <input
              class="form-input"
              :class="{ 'form-input--error': errors.price }"
              id="ep-price"
              name="ep-price"
              type="number"
              v-model.number="form.price"
              inputmode="decimal"
              min="0"
              :max="MAX_PRICE"
              step="0.01"
              @blur="validatePrice"
              @input="onPriceManualInput"
            />
            <span v-if="errors.price" class="form-hint form-hint--error" role="alert">{{ errors.price }}</span>
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
            <input class="form-input" id="ep-expiry" name="ep-expiry" type="date" v-model="form.expiry" />
          </div>
          <div class="form-group">
            <label class="form-label" for="ep-batch">Nro. de lote</label>
            <input class="form-input" id="ep-batch" name="ep-batch" type="text" v-model="form.batch" placeholder="Ej. L2503" :readonly="isBatchContext" />
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
          <div v-if="expiryLevel !== 'ok'" :class="`expiry-block__alert expiry-block__alert--${expiryLevel}`" role="alert">
            <i :class="`ti ${expiryLevelIcon}`" aria-hidden="true"></i>
            <p>{{ expiryLevelMessage }}</p>
          </div>
        </div>
      </div>

      <p class="section-label">Actualizar stock</p>
      <StockAdjuster
        v-model="form.stock"
        label="Unidades actuales"
        :max="product.max"
        :show-bar="true"
        input-id="ep-stock"
        :max-stock="MAX_STOCK"
        :error="errors.stock"
        @validate="validateStock"
      />

      <div class="spacer--sm"></div>
    </div>

    <div class="btn-group btn-group--row">
      <button class="btn btn--secondary" @click="$router.push(detailPathWithQuery(product.id, route.query))">Descartar cambios</button>
      <button class="btn btn--primary" @click="save">
        <i class="ti ti-device-floppy" aria-hidden="true"></i>Guardar cambios
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductsStore }  from '../stores/products.js'
import { DEFAULT_PRESET } from '../stores/discounts.js'
import { useDtoSelector }    from '../composables/useDtoSelector.js'
import { detailPathWithQuery, resolveAlertBack } from '../composables/useAlertNavigation.js'
import { useProductFieldValidation } from '../composables/useProductFieldValidation.js'
import TopBar        from '../components/layout/TopBar.vue'
import StockBadge    from '../components/ui/StockBadge.vue'
import StockAdjuster from '../components/ui/StockAdjuster.vue'

const route   = useRoute()
const router  = useRouter()
const store          = useProductsStore()
const product        = computed(() => store.getProduct(route.params.id))
const isBatchContext = computed(() => route.query.from === 'batch')
const alertBack      = computed(() => resolveAlertBack(route.query, product.value))
const backTo         = computed(() => alertBack.value?.to ?? detailPathWithQuery(route.params.id, route.query))
const backLabel      = computed(() => alertBack.value?.label ?? 'Detalle')

const form = reactive({
  name: '', size: '', unitsPerBox: 0,
  cost: 0, vatRate: '', margin: '', price: 0, discount: DEFAULT_PRESET,
  stock: 0, expiry: '', batch: '',
  bid: '', origin: '', category: '',
  alertDays: 30,
})

const {
  discountMode, customDiscountValue, discountSelectValue,
  initFromValue,
  onDiscountChange, onCustomDiscountInput, onCustomDiscountBlur, resetDiscountToPreset,
} = useDtoSelector(form)

const {
  errors,
  validateCost, validateVatRate, validateMargin, validatePrice, validateUnitsPerBox, validateStock,
  validateNumericFields, hasNumericErrors,
  MAX_STOCK, MAX_UNITS_BOX, MAX_PRICE,
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
const priceLabel  = computed(() => {
  if (!priceIsAutoCalc.value) return null
  return discountPct.value > 0 ? 'con descuento' : 'calculado'
})

function calcPrice(discountRaw) {
  const cost    = form.cost
  const vatRate = form.vatRate
  const margin  = form.margin
  const anyEmpty = cost === '' || cost === null || vatRate === '' || vatRate === null || margin === '' || margin === null
  if (anyEmpty) return
  if (typeof cost !== 'number' || typeof vatRate !== 'number' || typeof margin !== 'number') return
  if (isNaN(cost) || isNaN(vatRate) || isNaN(margin)) return
  const pct         = resolveDiscount(discountRaw !== undefined ? discountRaw : form.discount)
  const costWithVat = cost * (1 + vatRate / 100)
  const pvpBase     = costWithVat * (1 + margin / 100)
  form.price = parseFloat((pvpBase * (1 - pct / 100)).toFixed(2))
  priceIsAutoCalc.value = true
}

function onCostInput()       { priceIsAutoCalc.value = false; validateCost();    calcPrice() }
function onVatRateInput()    { priceIsAutoCalc.value = false; validateVatRate(); calcPrice() }
function onMarginInput()     { priceIsAutoCalc.value = false; validateMargin();  calcPrice() }
function onDiscountAndCalc(e){
  const newDiscount = e.target.value === 'custom' ? form.discount : e.target.value
  onDiscountChange(e)
  calcPrice(newDiscount)
}
function onPriceManualInput() {
  priceIsAutoCalc.value = false
  validatePrice()
}

// ─── Cargar producto al editar ────────────────────────────────────────────────
watch(product, p => {
  if (!p) return
  Object.assign(form, {
    name: p.name, size: p.size, unitsPerBox: p.unitsPerBox,
    cost: p.cost, vatRate: p.vatRate ?? '', margin: p.margin ?? '', price: p.price,
    discount: p.discount || DEFAULT_PRESET,
    stock: p.stock, expiry: p.expiry || '', batch: p.batch || '',
    bid: p.bid || '', origin: p.origin || '', category: p.category || '',
    alertDays: p.alertDays || 30,
  })
  initFromValue(p.discount)
  // Si el producto ya tiene los tres valores, marcar como auto-calc para mostrar el badge
  priceIsAutoCalc.value = p.vatRate != null && p.margin != null
}, { immediate: true })

const creatingBrand = ref(false)
const newBrand      = ref('')
const newBrandInput = ref(null)

const brandCategories = computed(() => store.getCategoriesForBrand(form.bid))

function _resetCategoryIfStale() {
  if (form.category && !brandCategories.value.includes(form.category)) {
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
const newCategory      = ref('')
const newCatInput      = ref(null)

function onCategoryChange(e) {
  if (e.target.value === '__nueva__') {
    creatingCategory.value = true
    newCategory.value = ''
    nextTick(() => newCatInput.value?.focus())
  } else if (e.target.value === '__sin_categoria__') {
    form.category = ''
  } else {
    form.category = e.target.value
  }
}

function confirmNewCategory() {
  const n = newCategory.value.trim()
  if (!n) return
  store.addCategoryToBrand(form.bid, n)
  form.category = n
  creatingCategory.value = false
  newCategory.value = ''
}

function cancelNewCategory() {
  creatingCategory.value = false
  newCategory.value = ''
}

const expiryLevel = computed(() => {
  if (!form.expiry) return 'ok'
  const diff = Math.ceil((new Date(form.expiry) - new Date()) / (1000 * 60 * 60 * 24))
  if (diff < 0)                    return 'critico'
  if (diff < 30)                   return 'atencion'
  if (diff < form.alertDays)       return 'aviso'
  return 'ok'
})

const expiryLevelIcon = computed(() => ({
  aviso:    'ti-info-circle',
  atencion: 'ti-alert-triangle',
  critico:  'ti-circle-x',
}[expiryLevel.value] ?? ''))

const expiryLevelMessage = computed(() => {
  if (!form.expiry) return ''
  const diff = Math.ceil((new Date(form.expiry) - new Date()) / (1000 * 60 * 60 * 24))
  if (diff < 0)  return `Vencido`
  return `Vence en ${diff} día${diff === 1 ? '' : 's'}`
})

const save = () => {
  if (creatingCategory.value) confirmNewCategory()
  if (creatingBrand.value) confirmNewBrand()
  validateNumericFields()
  if (hasNumericErrors.value) return
  store.editProduct(product.value.id, { ...form })
  store.setProductUpdated()
  router.push(detailPathWithQuery(product.value.id, route.query))
}
</script>