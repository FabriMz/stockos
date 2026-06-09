<template>
  <div class="screen">
    <TopBar variant="title" title="Ajustes" />

    <div class="scroll-content">

      <p class="section-label">Catálogo</p>
      <div class="settings__group">
        <div class="settings__item">
          <div class="settings__item-left">
            <div class="settings__item-icon">
              <i class="ti ti-calendar" style="color: #2563EB" aria-hidden="true"></i>
            </div>
            <div>
              <div class="settings__item-label">Vigencia</div>
              <div class="settings__item-sub">Mes y año del catálogo</div>
            </div>
          </div>
          <div class="settings__item-right">
            <span v-if="catalogExpiryLabel !== '—'">{{ catalogExpiryLabel }}</span>
            <button id="settings-catalog-expiry-toggle" name="settings-catalog-expiry-toggle"
              class="settings__calendar-btn" type="button" :aria-expanded="catalogValidityOpen"
              :aria-label="catalogValidityOpen ? 'Cerrar selector de mes' : 'Abrir selector de mes'"
              @click.stop="toggleCatalogValidity">
              <i class="ti ti-calendar-month" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <div v-if="catalogValidityOpen" class="settings__sublist settings__month-picker" role="dialog"
          aria-label="Seleccionar mes de vigencia">
          <div class="settings__month-picker-header">
            <button id="settings-year-prev" name="settings-year-prev" class="settings__month-picker-nav" type="button"
              aria-label="Año anterior" @click.stop="prevYear">
              <i class="ti ti-chevron-left" aria-hidden="true"></i>
            </button>
            <span class="settings__month-picker-year">{{ tempCatalogYear }}</span>
            <button id="settings-year-next" name="settings-year-next" class="settings__month-picker-nav" type="button"
              aria-label="Año siguiente" @click.stop="nextYear">
              <i class="ti ti-chevron-right" aria-hidden="true"></i>
            </button>
          </div>
          <div class="settings__month-picker-grid">
            <button v-for="(name, idx) in monthOptions" :key="name" :id="`settings-month-${idx + 1}`"
              :name="`settings-month-${idx + 1}`" class="settings__month-btn"
              :class="{ 'settings__month-btn--active': isSelectedMonth(idx + 1) }" type="button" :aria-label="name"
              :aria-pressed="isSelectedMonth(idx + 1)" @click.stop="selectMonth(idx + 1)">{{ name.slice(0, 3)
              }}</button>
          </div>
        </div>
      </div>

      <p class="section-label">Notificaciones</p>
      <div class="settings__group">
        <div class="settings__item">
          <div class="settings__item-left">
            <div class="settings__item-icon">
              <i class="ti ti-alert-triangle" style="color: #791132" aria-hidden="true"></i>
            </div>
            <div class="settings__item-label">Alertas de stock bajo</div>
          </div>
          <button class="settings__toggle" aria-label="Activar alertas de stock bajo"></button>
        </div>
        <div class="settings__item">
          <div class="settings__item-left">
            <div class="settings__item-icon">
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
import TopBar from '../components/layout/TopBar.vue'
import BottomNav from '../components/layout/BottomNav.vue'
import { MONTH_NAMES, monthLabel, parseExpiry } from '../utils/alerts.js'
import { useProductsStore } from '../stores/products.js'

const productsStore = useProductsStore()

const catalogValidityOpen = ref(false)
const currentYear = new Date().getFullYear()
const monthOptions = MONTH_NAMES

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
const tempCatalogYear = ref(initialYear)

const catalogExpiryLabel = computed(() => {
  const [year, month] = String(productsStore.catalogExpiry || '').split('-')
  if (!year || !month) return '—'
  return `${monthLabel(Number(month))} ${year}`
})

function toggleCatalogValidity() {
  catalogValidityOpen.value = !catalogValidityOpen.value
  const { year, month } = getExpiryParts(productsStore.catalogExpiry)
  tempCatalogMonth.value = month
  tempCatalogYear.value = year
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
</script>