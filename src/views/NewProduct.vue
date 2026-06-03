<template>
  <div class="screen">
    <TopBar variant="back" :back-label="batchContext ? brand?.name ?? 'Marca' : 'Cancelar'" :back-to="backTo" title="Nuevo producto" />

    <div class="scroll-content">
      <div class="form-view__photo-picker">
        <input
          ref="photoInput"
          id="np-photo"
          name="np-photo"
          type="file"
          accept="image/*"
          capture="environment"
          class="form-view__photo-input"
          aria-label="Tomar foto del producto"
          @change="onPhotoChange"
        />
        <label for="np-photo" class="form-view__photo-trigger">
          <img v-if="form.img" :src="form.img" alt="Foto del producto" class="form-view__photo-img" />
          <i v-else class="ti ti-camera" aria-hidden="true"></i>
        </label>
      </div>
      <p class="section-label">Identificación</p>
      <div class="form-section">
        <div class="form-group">
          <label class="form-label" for="np-sku">Código / SKU</label>
          <input class="form-input" id="np-sku" name="np-sku" type="text" v-model="form.sku" placeholder="Ej. 160533BM" />
        </div>
        <div class="form-group">
          <label class="form-label" for="np-name">Nombre del producto</label>
          <input class="form-input" id="np-name" name="np-name" type="text" v-model="form.name" placeholder="Ej. Pesto Alla Genovese 190gr" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="np-brand">Marca</label>
            <input
              v-if="batchContext"
              class="form-input"
              id="np-brand"
              name="np-brand"
              type="text"
              :value="brand?.name ?? ''"
              readonly
              aria-label="Marca (fijada por el lote)"
            />
            <select
              v-else-if="!creatingBrand"
              class="form-select"
              id="np-brand"
              name="np-brand"
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
                id="np-brand"
                name="np-brand"
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
            <span v-if="creatingBrand" class="form-hint">Enter para confirmar, Esc para cancelar</span>
          </div>
          <div class="form-group">
            <label class="form-label" for="np-origin">Origen</label>
            <input class="form-input" id="np-origin" name="np-origin" type="text" v-model="form.origin" placeholder="Ej. Italia" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="np-size">Contenido</label>
            <input class="form-input" id="np-size" name="np-size" type="text" v-model="form.size" placeholder="Ej. 190gr" />
          </div>
          <div class="form-group">
            <label class="form-label" for="np-category">Categoría</label>
            <select
              v-if="!creatingCategory"
              class="form-select"
              id="np-category"
              name="np-category"
              :value="form.category === '' ? '__sin_categoria__' : form.category"
              :disabled="!form.bid"
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
                id="np-category"
                name="np-category"
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
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="np-cost">Costo IVA inc.</label>
            <input
              class="form-input"
              :class="{ 'form-input--error': errors.cost }"
              id="np-cost"
              name="np-cost"
              type="number"
              v-model.number="form.cost"
              placeholder="0,00"
              inputmode="decimal"
              min="0"
              :max="MAX_PRICE"
              step="0.01"
              @blur="validateCost"
              @input="validateCost"
            />
            <span v-if="errors.cost" class="form-hint form-hint--error" role="alert">{{ errors.cost }}</span>
          </div>
          <div class="form-group">
            <label class="form-label" for="np-price">PVP sugerido</label>
            <input
              class="form-input"
              :class="{ 'form-input--error': errors.price }"
              id="np-price"
              name="np-price"
              type="number"
              v-model.number="form.price"
              placeholder="0,00"
              inputmode="decimal"
              min="0"
              :max="MAX_PRICE"
              step="0.01"
              @blur="validatePrice"
              @input="validatePrice"
            />
            <span v-if="errors.price" class="form-hint form-hint--error" role="alert">{{ errors.price }}</span>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="np-discount">Descuento</label>
            <select
              v-if="discountMode !== 'custom'"
              class="form-select"
              id="np-discount"
              name="np-discount"
              :value="discountSelectValue"
              @change="onDiscountChange"
            >
              <option v-for="d in discountsStore.sortedDiscounts" :key="d" :value="d">{{ d }}%</option>
              <option value="custom">Personalizado…</option>
            </select>
            <div v-else class="discount-custom">
              <input
                class="form-input discount-custom__input"
                id="np-discount"
                name="np-discount"
                type="number"
                :value="customDiscountValue"
                @input="onCustomDiscountInput"
                @blur="onCustomDiscountBlur"
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
            <label class="form-label" for="np-udscaja">Uds. por caja</label>
            <input
              class="form-input"
              :class="{ 'form-input--error': errors.unitsPerBox }"
              id="np-udscaja"
              name="np-udscaja"
              type="number"
              v-model.number="form.unitsPerBox"
              placeholder="Ej. 12"
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
            <input class="form-input" id="np-expiry" name="np-expiry" type="date" v-model="form.expiry" />
          </div>
          <div class="form-group">
            <label class="form-label" for="np-batch">Nro. de lote</label>
            <input class="form-input" id="np-batch" name="np-batch" type="text" v-model="form.batch" placeholder="Ej. L2503" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="np-alert-days">Avisar con anticipación</label>
          <select class="form-select" id="np-alert-days" name="np-alert-days" v-model.number="form.alertDays">
            <option :value="30">30 días antes</option>
            <option :value="60">60 días antes</option>
            <option :value="90">90 días antes</option>
          </select>
        </div>
        <span class="expiry-block__hint">Opcional. Dejá en blanco si no aplica.</span>
      </div>

      <p class="section-label">Stock inicial</p>
      <StockAdjuster
        v-model="form.stock"
        label="Unidades en stock"
        hint="Podés actualizar el stock después desde el detalle"
        input-id="np-stock"
        :max-stock="MAX_STOCK"
        :error="errors.stock"
        @validate="validateStock"
      />

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
import { reactive, ref, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProductsStore }  from '../stores/products.js'
import { useDiscountsStore, DEFAULT_PRESET } from '../stores/discounts.js'
import { useDtoSelector }    from '../composables/useDtoSelector.js'
import { useProductFieldValidation } from '../composables/useProductFieldValidation.js'
import TopBar        from '../components/layout/TopBar.vue'
import StockAdjuster from '../components/ui/StockAdjuster.vue'

const router = useRouter()
const route  = useRoute()
const store  = useProductsStore()
const discountsStore = useDiscountsStore()

const batchContext = route.query.batchNumber || null

const form = reactive({
  sku: '', name: '', bid: route.query.bid || '', origin: '', size: '',
  category: '', cost: '', price: '', discount: DEFAULT_PRESET, unitsPerBox: '',
  expiry: '', batch: batchContext ?? '', stock: 0,
  ic: 'ti-box', bg: '#F0EAE4', col: '#791132', max: 100, img: '',
  alertDays: 30,
})

const photoInput = ref(null)

function onPhotoChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = ev => { form.img = ev.target.result }
  reader.readAsDataURL(file)
}

const brand  = computed(() => form.bid ? store.getBrand(form.bid) : null)
const backTo = computed(() =>
  batchContext
    ? `/catalog/batch/${encodeURIComponent(batchContext)}/${form.bid}`
    : '/catalog'
)

const {
  discountMode, customDiscountValue, discountSelectValue,
  onDiscountChange, onCustomDiscountInput, onCustomDiscountBlur, resetDiscountToPreset,
} = useDtoSelector(form)

const {
  errors,
  validateCost, validatePrice, validateUnitsPerBox, validateStock,
  validateNumericFields, hasNumericErrors,
  MAX_STOCK, MAX_UNITS_BOX, MAX_PRICE,
} = useProductFieldValidation(form)

const creatingCategory = ref(false)
const newCategory      = ref('')
const newCatInput      = ref(null)

const creatingBrand    = ref(false)
const newBrand         = ref('')
const newBrandInput    = ref(null)

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
  form.category = ''
}

const save = () => {
  if (creatingCategory.value) confirmNewCategory()
  validateNumericFields()
  if (!form.name || !form.bid) return
  if (!batchContext && !form.sku) return
  if (hasNumericErrors.value) return
  if (batchContext) {
    store.addProductToBatch({ ...form }, batchContext)
    router.push(`/catalog/batch/${encodeURIComponent(batchContext)}/${form.bid}`)
  } else {
    store.addProduct({ ...form })
    router.push(`/catalog/${form.bid}`)
  }
}
</script>