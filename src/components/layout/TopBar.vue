<template>
  <!-- Topbar con búsqueda (catálogo) -->
  <div v-if="variant === 'home'" class="topbar">
    <div class="topbar__inner">
      <div class="topbar__row">
        <div>
          <div class="topbar__logo">
            STOCK<span class="topbar__logo-dot">.</span>OS
          </div>
          <div class="topbar__subtitle">
            <span class="topbar__company-name">{{ store.companyName }}</span>
            <button
              v-if="showCompanyEdit"
              class="topbar__company-edit"
              @click="emit('edit-company')"
              aria-label="Editar nombre de empresa"
              type="button"
            >
              <i class="ti ti-pencil" aria-hidden="true"></i>
            </button>
            · {{ todayDate }}
          </div>
          <div class="topbar__fx">
            {{ fxDisplay }}
            <span v-if="currencyStore.exchangeRateSource" class="topbar__fx-src">{{ currencyStore.exchangeRateSource }}</span>
          </div>
        </div>
        <div class="topbar__actions">
          <button class="icon-btn" @click="$router.push('/alerts')" aria-label="Alertas">
            <i class="ti ti-bell" aria-hidden="true"></i>
            <span v-if="alerts.length" class="topbar__notification-dot"></span>
          </button>
        </div>
      </div>
      <div v-if="showSearch" class="topbar__search">
        <i class="ti ti-search" aria-hidden="true"></i>
        <input
          :id="searchId"
          :name="searchId"
          type="search"
          :placeholder="searchPlaceholder"
          :aria-label="searchPlaceholder"
          :value="modelValue"
          @input="emit('update:modelValue', $event.target.value)"
        />
        <button
          v-if="modelValue"
          class="topbar__search-clear"
          @click="emit('update:modelValue', '')"
          aria-label="Limpiar búsqueda"
        >
          <i class="ti ti-x" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  </div>

  <!-- Simple topbar with title (alerts, orders, settings) -->
  <div v-else-if="variant === 'title'" class="topbar topbar--simple">
    <div class="topbar__title">{{ title }}</div>
    <div class="topbar__actions">
      <slot name="actions" />
    </div>
  </div>

  <!-- Topbar con back button (vistas de detalle, marcas, formularios) -->
  <div v-else-if="variant === 'back'" class="topbar topbar--simple">
    <div class="topbar__title">{{ title }}</div>
    <button class="topbar__back" @click="handleBack" :aria-label="`Volver a ${backLabel}`">
      <i class="ti ti-chevron-left" aria-hidden="true"></i>
      {{ backLabel }}
    </button>
  </div>

  <!-- Topbar con breadcrumbs (vistas multi-nivel) -->
  <div v-else-if="variant === 'breadcrumb'" class="topbar topbar--breadcrumb">
    <div class="topbar__breadcrumb-row">
      <div class="topbar__title">{{ title }}</div>
      <slot name="actions" />
    </div>
    <nav class="topbar__breadcrumbs" aria-label="Ruta de navegaci�n">
      <template v-for="(crumb, i) in breadcrumbs" :key="i">
        <i v-if="i > 0" class="ti ti-chevron-right topbar__crumb-sep" aria-hidden="true"></i>
        <button
          class="topbar__crumb"
          @click="$router.push(crumb.to)"
          :aria-label="`Volver a ${crumb.label}`"
        >{{ crumb.label }}</button>
      </template>
    </nav>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProductsStore } from '../../stores/products.js'
import { useCurrencyStore }  from '../../stores/currency.js'
import { formatTodayDate } from '../../utils/alerts.js'

const props = defineProps({
  variant:           { type: String, default: 'title' },
  title:             { type: String, default: '' },
  breadcrumbs:       { type: Array,  default: () => [] },
  backLabel:         { type: String, default: 'Atrás' },
  backTo:            { type: String, default: '' },
  searchId:          { type: String, default: 'topbar-search' },
  searchPlaceholder: { type: String, default: 'Buscar…' },
  modelValue:        { type: String, default: '' },
  showSearch:        { type: Boolean, default: true },
  showCompanyEdit:   { type: Boolean, default: false },
})

const emit          = defineEmits(['update:modelValue', 'back', 'edit-company'])
const router        = useRouter()
const store         = useProductsStore()
const currencyStore = useCurrencyStore()
const alerts        = computed(() => store.alerts)
const todayDate     = computed(() => formatTodayDate())
const fxDisplay     = computed(() => `USD · $${currencyStore.exchangeRate.toFixed(2)}`)

const handleBack = () => {
  if (props.backTo) {
    router.push(props.backTo)
  } else {
    router.back()
  }
  emit('back')
}
</script>