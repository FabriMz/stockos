<template>
  <div class="screen" v-if="brand || isSinMarca">
    <TopBar variant="back" :back-label="config.title" :back-to="config.basePath" :title="isSinMarca ? 'Sin marca' : brand.name" />

    <AlertSearchBar
      v-model="searchQuery"
      input-id="alerts-brand-products-search"
      placeholder="Buscar producto…"
    />

    <div class="scroll-content">
      <!-- Cabecera de marca -->
      <div class="brand-summary">
        <div class="brand-summary__icon" :style="isSinMarca ? {} : { background: brand.bg }">
          <i :class="`ti ${isSinMarca ? 'ti-box' : brand.ic}`" :style="isSinMarca ? {} : { color: brand.col }" aria-hidden="true"></i>
        </div>
        <div>
          <div class="brand-summary__name">{{ isSinMarca ? 'Sin marca' : `${brand.name} · ${brand.origin}` }}</div>
          <div class="brand-summary__meta">
            {{ totalAlertProducts }} producto{{ totalAlertProducts !== 1 ? 's' : '' }}
          </div>
        </div>
      </div>

      <!-- Barra expandir / colapsar -->
      <div class="brand-toolbar">
        <button
          class="brand-toolbar__btn"
          aria-label="Expandir todas las categorías"
          @click="expandAll"
        >
          <i class="ti ti-arrows-vertical" aria-hidden="true"></i>
          <span>Expandir</span>
        </button>
        <button
          class="brand-toolbar__btn"
          aria-label="Colapsar todas las categorías"
          @click="collapseAll"
        >
          <i class="ti ti-layout-distribute-vertical" aria-hidden="true"></i>
          <span>Colapsar</span>
        </button>
      </div>

      <!-- Grupos por categoría -->
      <template v-if="categorizedAlertProducts.length">
        <div
          v-for="group in categorizedAlertProducts"
          :key="group.cat ?? '__sin_cat__'"
          class="cat-accordion"
          :class="{ 'cat-accordion--open': catOpen.isOpen(route.params.brandId, group.cat ?? '__sin_cat__') }"
        >
          <!-- Header del acordeón -->
          <div
            class="cat-accordion__header"
            role="button"
            tabindex="0"
            :aria-expanded="String(catOpen.isOpen(route.params.brandId, group.cat ?? '__sin_cat__'))"
            :aria-controls="`alerts-cat-body-${group.cat ?? '__sin_cat__'}`"
            :aria-label="catOpen.isOpen(route.params.brandId, group.cat ?? '__sin_cat__')
              ? `Colapsar ${group.cat ?? 'Sin categoría'}`
              : `Expandir ${group.cat ?? 'Sin categoría'}`"
            @click="catOpen.toggle(route.params.brandId, group.cat ?? '__sin_cat__')"
            @keydown.enter.prevent="catOpen.toggle(route.params.brandId, group.cat ?? '__sin_cat__')"
            @keydown.space.prevent="catOpen.toggle(route.params.brandId, group.cat ?? '__sin_cat__')"
          >
            <span class="cat-accordion__title">{{ group.cat ?? 'Sin categoría' }}</span>
            <span class="cat-accordion__dots" aria-hidden="true"></span>
            <span
              class="cat-accordion__count"
              :aria-label="`${group.items.length} productos`"
            >{{ group.items.length }}</span>
            <i class="ti ti-chevron-down cat-accordion__chevron" aria-hidden="true"></i>
          </div>

          <!-- Cuerpo colapsable -->
          <div
            :id="`alerts-cat-body-${group.cat ?? '__sin_cat__'}`"
            class="cat-accordion__body"
            role="region"
            :aria-label="group.cat ?? 'Sin categoría'"
          >
            <div
              v-for="p in group.items"
              :key="p.id"
              class="brand-row"
              role="button"
              tabindex="0"
              :aria-label="p.name"
              @click="openProduct(p)"
              @keydown.enter="openProduct(p)"
            >
              <div class="brand-row__stripe" :style="{ background: config.stripe }"></div>
              <div class="brand-row__body">
                <div class="brand-row__header">
                  <div class="brand-row__icon" :style="isSinMarca ? {} : { background: brand.bg }">
                    <img
                      v-if="p.img"
                      :src="p.img"
                      :alt="p.name"
                      class="brand-row__icon-img"
                    />
                    <i
                      v-else
                      :class="`ti ${isSinMarca ? 'ti-box' : brand.ic}`"
                      :style="isSinMarca ? {} : { color: brand.col }"
                      aria-hidden="true"
                    ></i>
                  </div>
                  <div class="brand-row__info brand-row__info--wrap">
                    <div class="brand-row__name">{{ p.name }}</div>
                    <div class="brand-row__meta">
                      SKU {{ p.sku }} · Lote {{ p.batch || 'S/N' }}<template v-if="config.showStock"> · {{ p.stock }} uds.</template>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <p v-if="!categorizedAlertProducts.length" class="home__empty">
        {{ searchQuery.trim()
          ? `Sin resultados para "${searchQuery.trim()}"`
          : 'Sin productos con alerta en esta marca' }}
      </p>

      <div class="spacer--sm"></div>
    </div>

    <BottomNav />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductsStore }      from '../stores/products.js'
import { useProductCatOpenStore } from '../stores/productCatOpen.js'
import { productRouteFromAlerts } from '../composables/useAlertNavigation.js'
import TopBar         from '../components/layout/TopBar.vue'
import BottomNav      from '../components/layout/BottomNav.vue'
import AlertSearchBar from '../components/ui/AlertSearchBar.vue'

const route    = useRoute()
const router   = useRouter()
const store    = useProductsStore()
const catOpen  = useProductCatOpenStore()

const searchQuery = ref('')

const TYPE_CONFIG = {
  'out-of-stock': {
    title     : 'Sin Stock',
    basePath  : '/alerts/out-of-stock',
    stripe    : '#791132',
    badgeClass: 'badge badge--out',
    badgeIcon : 'ti-ban',
    badgeLabel: 'Sin stock',
    showStock : false,
    filter    : store.isOutOfStock,
  },
  'low-stock': {
    title     : 'Stock Bajo',
    basePath  : '/alerts/low-stock',
    stripe    : '#90542f',
    badgeClass: 'badge badge--low',
    badgeIcon : 'ti-alert-circle',
    badgeLabel: 'Stock bajo',
    showStock : true,
    filter    : store.isLowStock,
  },
}

const config = computed(() => TYPE_CONFIG[route.meta.alertType] ?? TYPE_CONFIG['out-of-stock'])
const brand  = computed(() => store.getBrand(route.params.brandId))

// Todos los productos de la marca que pasan el filtro de alerta
const alertProducts = computed(() =>
  store.getByBrand(route.params.brandId).filter(config.value.filter)
)

// Agrupados por categoría, con búsqueda opcional
const categorizedAlertProducts = computed(() => {
  const q      = searchQuery.value.trim().toLowerCase()
  const source = q
    ? alertProducts.value.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)
      )
    : alertProducts.value

  const groups = new Map()

  for (const p of source) {
    const cat = p.category?.trim() || null
    if (!groups.has(cat)) groups.set(cat, [])
    groups.get(cat).push(p)
  }

  const result = []

  // Categorías con nombre, ordenadas alfabéticamente
  const namedCats = [...groups.keys()]
    .filter(k => k !== null)
    .sort((a, b) => a.localeCompare(b, 'es'))

  for (const cat of namedCats) {
    result.push({ cat, items: groups.get(cat) })
  }

  // Sin categoría al final
  if (groups.has(null)) {
    result.push({ cat: null, items: groups.get(null) })
  }

  return result
})

const totalAlertProducts = computed(() => alertProducts.value.length)

// Expand / Collapse all
function allCatKeys() {
  return categorizedAlertProducts.value.map(g => g.cat ?? '__sin_cat__')
}

function expandAll() {
  catOpen.setAllForBrand(route.params.brandId, allCatKeys(), true)
}

function collapseAll() {
  catOpen.setAllForBrand(route.params.brandId, allCatKeys(), false)
}

function openProduct(p) {
  router.push(productRouteFromAlerts(p.id, {
    alert  : route.meta.alertType,
    brandId: route.params.brandId,
  }))
}
</script>