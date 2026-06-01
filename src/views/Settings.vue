<template>
  <div class="screen">
    <TopBar variant="title" title="Ajustes" />

    <div class="scroll-content">

      <div class="settings__profile">
        <div class="settings__avatar" aria-label="Perfil de usuario">CI</div>
        <div>
          <div class="settings__name">Compañía de Indias</div>
          <div class="settings__email">admin@companiadeindias.com</div>
        </div>
      </div>

      <p class="section-label">Catálogo</p>
      <div class="settings__group">
        <div class="settings__item" role="button" tabindex="0">
          <div class="settings__item-left">
            <div class="settings__item-icon" style="background: #E1F5EE">
              <i class="ti ti-package" style="color: #2D8A5F" aria-hidden="true"></i>
            </div>
            <div>
              <div class="settings__item-label">Importar productos</div>
              <div class="settings__item-sub">CSV / Excel</div>
            </div>
          </div>
          <i class="ti ti-chevron-right settings__item-chevron" aria-hidden="true"></i>
        </div>
        <div class="settings__item" role="button" tabindex="0">
          <div class="settings__item-left">
            <div class="settings__item-icon" style="background: #FAEEDA">
              <i class="ti ti-download" style="color: #C07828" aria-hidden="true"></i>
            </div>
            <div>
              <div class="settings__item-label">Exportar inventario</div>
              <div class="settings__item-sub">Excel o PDF</div>
            </div>
          </div>
          <i class="ti ti-chevron-right settings__item-chevron" aria-hidden="true"></i>
        </div>
        <div class="settings__item">
          <div class="settings__item-left">
            <div class="settings__item-icon" style="background: #E7F3FF">
              <i class="ti ti-calendar" style="color: #2563EB" aria-hidden="true"></i>
            </div>
            <div>
              <div class="settings__item-label">Vigencia</div>
              <div class="settings__item-sub">Mes y año del catálogo</div>
            </div>
          </div>
          <div class="settings__item-right">
            <span v-if="catalogExpiryLabel !== '—'">{{ catalogExpiryLabel }}</span>
            <button
              id="settings-catalog-expiry-toggle"
              name="settings-catalog-expiry-toggle"
              class="settings__calendar-btn"
              type="button"
              :aria-expanded="catalogValidityOpen"
              :aria-label="catalogValidityOpen ? 'Cerrar selector de mes' : 'Abrir selector de mes'"
              @click.stop="toggleCatalogValidity"
            >
              <i class="ti ti-calendar-month" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <div v-if="catalogValidityOpen" class="settings__sublist settings__month-picker" role="dialog" aria-label="Seleccionar mes de vigencia">
          <div class="settings__month-picker-header">
            <button
              id="settings-year-prev"
              name="settings-year-prev"
              class="settings__month-picker-nav"
              type="button"
              aria-label="Año anterior"
              @click.stop="prevYear"
            >
              <i class="ti ti-chevron-left" aria-hidden="true"></i>
            </button>
            <span class="settings__month-picker-year">{{ tempCatalogYear }}</span>
            <button
              id="settings-year-next"
              name="settings-year-next"
              class="settings__month-picker-nav"
              type="button"
              aria-label="Año siguiente"
              @click.stop="nextYear"
            >
              <i class="ti ti-chevron-right" aria-hidden="true"></i>
            </button>
          </div>
          <div class="settings__month-picker-grid">
            <button
              v-for="(name, idx) in monthOptions"
              :key="name"
              :id="`settings-month-${idx + 1}`"
              :name="`settings-month-${idx + 1}`"
              class="settings__month-btn"
              :class="{ 'settings__month-btn--active': isSelectedMonth(idx + 1) }"
              type="button"
              :aria-label="name"
              :aria-pressed="isSelectedMonth(idx + 1)"
              @click.stop="selectMonth(idx + 1)"
            >{{ name.slice(0, 3) }}</button>
          </div>
        </div>
      </div>

      <p class="section-label">Gestión</p>
      <div class="settings__group">

        <!-- ── MARCAS ─────────────────────────────────────────────────────── -->
        <div
          class="settings__item"
          role="button"
          tabindex="0"
          :aria-expanded="openSection === 'brands'"
          @click="toggleSection('brands')"
          @keyup.enter="toggleSection('brands')"
        >
          <div class="settings__item-left">
            <div class="settings__item-icon" style="background: #EDE8F5">
              <i class="ti ti-building-store" style="color: #534AB7" aria-hidden="true"></i>
            </div>
            <div class="settings__item-label">Marcas</div>
          </div>
          <div class="settings__item-right">
            <span>{{ productsStore.brands.length }}</span>
            <i
              class="ti ti-chevron-right settings__item-chevron"
              :class="{ 'settings__item-chevron--open': openSection === 'brands' }"
              aria-hidden="true"
            ></i>
          </div>
        </div>

        <div v-if="openSection === 'brands'" class="settings__sublist" role="list">
          <div
            v-for="brand in productsStore.sortedBrands"
            :key="brand.id"
            class="settings__sublist-item"
            role="listitem"
          >
            <template v-if="editingItem?.type === 'brand' && editingItem?.id === brand.id">
              <input
                class="settings__edit-input"
                type="text"
                :id="`settings-edit-brand-${brand.id}`"
                :name="`settings-edit-brand-${brand.id}`"
                v-model="editValue"
                :aria-label="`Editar marca ${brand.name}`"
                :aria-describedby="editError ? `settings-edit-brand-error-${brand.id}` : null"
                @input="clearEditError"
                @keydown.enter.stop.prevent="confirmEdit"
                @keydown.escape.stop.prevent="cancelEdit"
              />
              <button
                class="settings__confirm-yes"
                type="button"
                @click.stop="confirmEdit"
              >Guardar</button>
              <button
                class="settings__confirm-no"
                type="button"
                @click.stop="cancelEdit"
              >Cancelar</button>
              <p
                v-if="editError"
                class="settings__edit-error"
                :id="`settings-edit-brand-error-${brand.id}`"
              >{{ editError }}</p>
            </template>
            <template v-else>
              <span class="settings__sublist-name">{{ brand.name }}</span>
              <div class="settings__sublist-actions">
                <button
                  class="icon-btn settings__edit-btn"
                  type="button"
                  :aria-label="`Editar marca ${brand.name}`"
                  :title="`Editar ${brand.name}`"
                  @click.stop="startEdit('brand', brand.id, brand.name)"
                >
                  <i class="ti ti-edit" aria-hidden="true"></i>
                </button>
                <button
                  :id="`settings-trash-brand-${brand.id}`"
                  :name="`settings-trash-brand-${brand.id}`"
                  class="settings__trash-btn"
                  :aria-label="`Eliminar marca ${brand.name}`"
                  :title="`Eliminar ${brand.name}`"
                  @click.stop="requestDelete('brand', brand.id)"
                >
                  <i class="ti ti-trash" aria-hidden="true"></i>
                </button>
              </div>
              <div
                v-if="confirmingItem?.type === 'brand' && confirmingItem?.id === brand.id"
                class="settings__confirm"
              >
                <span class="settings__confirm-label">¿Eliminar?</span>
                <button
                  id="settings-confirm-brand-yes"
                  name="settings-confirm-brand-yes"
                  class="settings__confirm-yes"
                  @click.stop="executeDelete"
                >Sí</button>
                <button
                  id="settings-confirm-brand-no"
                  name="settings-confirm-brand-no"
                  class="settings__confirm-no"
                  @click.stop="cancelConfirm"
                >No</button>
              </div>
            </template>
          </div>
        </div>

        <!-- ── DESCUENTOS ─────────────────────────────────────────────────── -->
        <div
          class="settings__item"
          role="button"
          tabindex="0"
          :aria-expanded="openSection === 'discounts'"
          @click="toggleSection('discounts')"
          @keyup.enter="toggleSection('discounts')"
        >
          <div class="settings__item-left">
            <div class="settings__item-icon" style="background: #EEF2FF">
              <i class="ti ti-discount" style="color: #4338CA" aria-hidden="true"></i>
            </div>
            <div class="settings__item-label">Descuentos</div>
          </div>
          <div class="settings__item-right">
            <span>{{ discountsStore.discounts.length }}</span>
            <i
              class="ti ti-chevron-right settings__item-chevron"
              :class="{ 'settings__item-chevron--open': openSection === 'discounts' }"
              aria-hidden="true"
            ></i>
          </div>
        </div>

        <div v-if="openSection === 'discounts'" class="settings__sublist" role="list">
          <div
            v-for="d in discountsStore.sortedDiscounts"
            :key="d"
            class="settings__sublist-item"
            role="listitem"
          >
            <span class="settings__sublist-name">{{ d }}%</span>
            <div class="settings__sublist-actions">
              <button
                :id="`settings-trash-discount-${d}`"
                :name="`settings-trash-discount-${d}`"
                class="settings__trash-btn"
                :aria-label="`Eliminar descuento ${d}%`"
                :disabled="discountsStore.discounts.length === 1"
                @click.stop="requestDelete('discount', d)"
              >
                <i class="ti ti-trash" aria-hidden="true"></i>
              </button>
            </div>
            <div
              v-if="confirmingItem?.type === 'discount' && confirmingItem?.value === d"
              class="settings__confirm"
            >
              <span class="settings__confirm-label">¿Eliminar?</span>
              <button
                :id="`settings-confirm-discount-yes-${d}`"
                :name="`settings-confirm-discount-yes-${d}`"
                class="settings__confirm-yes"
                @click.stop="executeDelete"
              >Sí</button>
              <button
                :id="`settings-confirm-discount-no-${d}`"
                :name="`settings-confirm-discount-no-${d}`"
                class="settings__confirm-no"
                @click.stop="cancelConfirm"
              >No</button>
            </div>
          </div>

          <!-- Fila para agregar nuevo descuento -->
          <div class="settings__sublist-item settings__sublist-item--add">
            <div class="discount-custom">
              <input
                class="settings__edit-input discount-custom__input"
                id="settings-new-discount"
                name="settings-new-discount"
                type="number"
                v-model="newDiscountValue"
                inputmode="decimal"
                min="1"
                max="100"
                step="0.1"
                placeholder="Ej. 20"
                aria-label="Nuevo porcentaje de descuento"
                @keydown.enter.stop.prevent="addDiscount"
              />
              <button
                v-if="newDiscountValue"
                type="button"
                class="discount-custom__reset"
                aria-label="Limpiar"
                @click="newDiscountValue = ''"
              >
                <i class="ti ti-x" aria-hidden="true"></i>
              </button>
            </div>
            <button
              id="settings-add-discount-btn"
              name="settings-add-discount-btn"
              class="settings__confirm-yes"
              type="button"
              :disabled="!newDiscountValue"
              @click.stop="addDiscount"
            >Agregar</button>
          </div>
          <p v-if="newDiscountError" class="settings__sublist-item settings__discount-error">{{ newDiscountError }}</p>
        </div>
      </div>

      <p class="section-label">Notificaciones</p>
      <div class="settings__group">
        <div class="settings__item">
          <div class="settings__item-left">
            <div class="settings__item-icon" style="background: #F5E8E8">
              <i class="ti ti-alert-triangle" style="color: #791132" aria-hidden="true"></i>
            </div>
            <div class="settings__item-label">Alertas de stock bajo</div>
          </div>
          <button class="settings__toggle" aria-label="Activar alertas de stock bajo"></button>
        </div>
        <div class="settings__item">
          <div class="settings__item-left">
            <div class="settings__item-icon" style="background: #FAEEDA">
              <i class="ti ti-calendar-event" style="color: #C07828" aria-hidden="true"></i>
            </div>
            <div class="settings__item-label">Vencimientos próximos</div>
          </div>
          <button class="settings__toggle" aria-label="Activar alertas de vencimiento"></button>
        </div>
      </div>

      <div class="spacer--sm"></div>
    </div>

    <BottomNav />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import TopBar    from '../components/layout/TopBar.vue'
import BottomNav from '../components/layout/BottomNav.vue'
import { MONTH_NAMES, monthLabel, parseExpiry } from '../utils/alerts.js'
import { useProductsStore } from '../stores/products.js'
import { useDiscountsStore } from '../stores/discounts.js'

const productsStore  = useProductsStore()
const discountsStore = useDiscountsStore()

const newDiscountValue = ref('')
const newDiscountError = ref('')

const openSection         = ref(null)
const confirmingItem      = ref(null)
const editingItem         = ref(null)
const editValue           = ref('')
const editError           = ref('')
const catalogValidityOpen = ref(false)
const currentYear         = new Date().getFullYear()
const monthOptions        = MONTH_NAMES

function getExpiryParts(expiry) {
  const parsed = parseExpiry(expiry)
  const defaultMonth = String(new Date().getMonth() + 1).padStart(2, '0')
  return {
    year: parsed ? parsed.year : currentYear,
    month: parsed ? parsed.monthKey : defaultMonth,
  }
}

const { year: initialYear, month: initialMonth } = getExpiryParts(productsStore.catalogExpiry)
const tempCatalogMonth = ref(initialMonth)
const tempCatalogYear  = ref(initialYear)

const catalogExpiryLabel = computed(() => {
  const [year, month] = String(productsStore.catalogExpiry || '').split('-')
  if (!year || !month) return '—'
  return `${monthLabel(Number(month))} ${year}`
})

function toggleSection(section) {
  openSection.value = openSection.value === section ? null : section
  confirmingItem.value = null
  cancelEdit()
}

function startEdit(type, key, name) {
  confirmingItem.value = null
  editError.value = ''
  editingItem.value = { type, ...type === 'brand' ? { id: key } : { name: key } }
  editValue.value = name
}

function cancelEdit() {
  editingItem.value = null
  editValue.value = ''
  editError.value = ''
}

function clearEditError() {
  editError.value = ''
}

function requestDelete(type, key) {
  cancelEdit()
  if (type === 'brand')         confirmingItem.value = { type: 'brand',    id: key }
  else if (type === 'discount') confirmingItem.value = { type: 'discount', value: key }
}

function cancelConfirm() {
  confirmingItem.value = null
}

function toggleCatalogValidity() {
  catalogValidityOpen.value = !catalogValidityOpen.value
  const { year, month } = getExpiryParts(productsStore.catalogExpiry)
  tempCatalogMonth.value = month
  tempCatalogYear.value  = year
}

function prevYear() {
  tempCatalogYear.value--
}

function nextYear() {
  tempCatalogYear.value++
}

function isSelectedMonth(monthNum) {
  const [savedYear, savedMonth] = String(productsStore.catalogExpiry || '').split('-')
  return (
    String(monthNum).padStart(2, '0') === savedMonth &&
    String(tempCatalogYear.value) === savedYear
  )
}

function selectMonth(monthNum) {
  const month = String(monthNum).padStart(2, '0')
  productsStore.setCatalogExpiry(`${tempCatalogYear.value}-${month}`)
  tempCatalogMonth.value = month
  catalogValidityOpen.value = false
}

function confirmEdit() {
  if (!editingItem.value) return
  const value = editValue.value.trim()
  if (!value) {
    editError.value = 'El nombre no puede quedar vacío'
    return
  }

  if (editingItem.value.type === 'brand') {
    const duplicate = productsStore.brands.some(b => b.name.toLowerCase() === value.toLowerCase() && b.id !== editingItem.value.id)
    if (duplicate) {
      editError.value = 'Ya existe otra marca con ese nombre'
      return
    }
    productsStore.editBrandName(editingItem.value.id, value)
  }

  cancelEdit()
}

function executeDelete() {
  const item = confirmingItem.value
  if (!item) return
  confirmingItem.value = null
  if (item.type === 'brand') {
    productsStore.markDeleteBrand(item.id)
  } else if (item.type === 'discount') {
    discountsStore.markDeleteDiscount(item.value)
  }
}

function addDiscount() {
  newDiscountError.value = ''
  const raw = String(newDiscountValue.value).trim()

  // Strip leading zeros
  const clean = raw.replace(/^0+(\d)/, '$1')
  const num   = parseFloat(clean)

  if (!clean || isNaN(num)) {
    newDiscountError.value = 'Ingresá un número válido'
    return
  }
  if (num <= 0) {
    newDiscountError.value = 'El descuento debe ser mayor a 0'
    return
  }
  if (num > 100) {
    newDiscountError.value = 'El descuento no puede superar 100'
    return
  }
  const val = String(num)
  if (discountsStore.discounts.includes(val)) {
    newDiscountError.value = `${val}% ya existe en la lista`
    return
  }
  discountsStore.addDiscount(val)
  newDiscountValue.value = ''
}
</script>