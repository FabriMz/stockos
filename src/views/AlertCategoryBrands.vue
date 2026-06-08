<template>
  <div class="screen">
    <TopBar variant="back" back-label="Alertas" back-to="/alerts" :title="config.title" />

    <AlertSearchBar v-model="searchQuery" :input-id="`alerts-${route.meta.alertType}-brands`" />

    <div class="scroll-content">
      <template v-if="searchQuery.trim()">
        <div
          v-for="p in filteredProducts"
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
              <div class="brand-row__icon" :style="{ background: p.bg }">
                <i :class="`ti ${p.ic}`" :style="{ color: p.col }" aria-hidden="true"></i>
              </div>
              <div class="brand-row__info">
                <div class="brand-row__name">{{ p.name }}</div>
                <div class="brand-row__meta">{{ p.brand }} · {{ p.sku }}</div>
              </div>
              <i class="ti ti-chevron-right brand-row__chevron" aria-hidden="true"></i>
            </div>
            <div class="brand-row__divider" aria-hidden="true"></div>
            <div class="brand-row__badges">
              <span :class="config.badgeClass"><i :class="`ti ${config.badgeIcon}`" aria-hidden="true"></i>{{ config.badgeLabel }}</span>
            </div>
          </div>
        </div>
        <p v-if="!filteredProducts.length" class="home__empty">
          Sin resultados para "{{ searchQuery.trim() }}"
        </p>
      </template>

      <template v-else>
        <template v-for="entry in filteredCategories" :key="entry.id">
          <CatalogCatSep
            :cat-id="entry.id"
            :cat-name="entry.name"
            :show-migrate="false"
            @delete="handleDeleteCat(entry.id)"
            @renamed="(n) => handleRenameCat(entry.id, n)"
          />
          <BrandRow
            v-for="bid in entry.bids"
            :key="bid"
            :brand="getBrand(bid)"
            :to="`${config.basePath}/${bid}`"
            :meta="`${productCount(bid)} producto${productCount(bid) > 1 ? 's' : ''} · ${getBrand(bid).origin}`"
            :stripe="config.stripe"
          >
            <template #badges>
              <span :class="config.badgeClass"><i :class="`ti ${config.badgeIcon}`" aria-hidden="true"></i>{{ config.badgeLabel }}</span>
            </template>
          </BrandRow>
        </template>

        <!-- Marcas con alerta no asignadas a ninguna categoría -->
        <BrandRow
          v-for="bid in uncategorizedAlertBrandIds"
          :key="bid"
          :brand="getBrand(bid)"
          :to="`${config.basePath}/${bid}`"
          :meta="`${productCount(bid)} producto${productCount(bid) > 1 ? 's' : ''} · ${getBrand(bid).origin}`"
          :stripe="config.stripe"
        >
          <template #badges>
            <span :class="config.badgeClass"><i :class="`ti ${config.badgeIcon}`" aria-hidden="true"></i>{{ config.badgeLabel }}</span>
          </template>
        </BrandRow>

        <!-- Productos sin marca con alerta -->
        <template v-if="!searchQuery.trim() && unbrandedAlertProducts.length">
          <div class="catalog__cat-sep catalog__cat-sep--no-actions">
            <span class="catalog__cat-label">Sin marca</span>
          </div>
          <div
            class="brand-row"
            role="button"
            tabindex="0"
            aria-label="Ver productos sin marca"
            @click="$router.push(`${config.basePath}/__sin_marca__`)"
            @keydown.enter="$router.push(`${config.basePath}/__sin_marca__`)"
          >
            <div class="brand-row__stripe" :style="{ background: config.stripe }"></div>
            <div class="brand-row__body">
              <div class="brand-row__header">
                <div class="brand-row__icon">
                  <i class="ti ti-box" aria-hidden="true"></i>
                </div>
                <div class="brand-row__info">
                  <div class="brand-row__name">Sin marca</div>
                  <div class="brand-row__meta">{{ unbrandedAlertProducts.length }} producto{{ unbrandedAlertProducts.length !== 1 ? 's' : '' }}</div>
                </div>
                <i class="ti ti-chevron-right brand-row__chevron" aria-hidden="true"></i>
              </div>
              <div class="brand-row__divider" aria-hidden="true"></div>
              <div class="brand-row__badges">
                <span :class="config.badgeClass"><i :class="`ti ${config.badgeIcon}`" aria-hidden="true"></i>{{ config.badgeLabel }}</span>
              </div>
            </div>
          </div>
        </template>

        <p v-if="!filteredCategories.length && !uncategorizedAlertBrandIds.length && !unbrandedAlertProducts.length" class="home__empty">
          Sin productos en esta carpeta
        </p>
      </template>

      <div class="spacer--sm"></div>
    </div>

    <BottomNav />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductsStore }        from '../stores/products.js'
import { useBrandCategoriesStore } from '../stores/brandCategories.js'
import { matchesProductSearch }    from '../utils/alerts.js'
import { productRouteFromAlerts }  from '../composables/useAlertNavigation.js'
import TopBar         from '../components/layout/TopBar.vue'
import BottomNav      from '../components/layout/BottomNav.vue'
import BrandRow       from '../components/ui/BrandRow.vue'
import AlertSearchBar from '../components/ui/AlertSearchBar.vue'
import CatalogCatSep  from '../components/ui/CatalogCatSep.vue'

const route    = useRoute()
const router   = useRouter()
const store    = useProductsStore()
const catStore = useBrandCategoriesStore()

const { getBrand } = store
const searchQuery  = ref('')

const TYPE_CONFIG = {
  'out-of-stock': {
    title    : 'Sin Stock',
    basePath : '/alerts/out-of-stock',
    stripe   : '#791132',
    badgeClass: 'badge badge--out',
    badgeIcon : 'ti-ban',
    badgeLabel: 'Sin stock',
    brands: () => store.outOfStockBrands,
    filter: store.isOutOfStock,
  },
  'low-stock': {
    title    : 'Stock Bajo',
    basePath : '/alerts/low-stock',
    stripe   : '#90542f',
    badgeClass: 'badge badge--low',
    badgeIcon : 'ti-alert-circle',
    badgeLabel: 'Stock bajo',
    brands: () => store.lowStockBrands,
    filter: store.isLowStock,
  },
}

const config = computed(() => TYPE_CONFIG[route.meta.alertType] ?? TYPE_CONFIG['out-of-stock'])

const unbrandedAlertProducts = computed(() =>
  route.meta.alertType === 'out-of-stock'
    ? store.outOfStockUnbranded
    : store.lowStockUnbranded
)

const alertBrandIds = computed(() => new Set(config.value.brands().map(b => b.id)))

const filteredCategories = computed(() => {
  const result = []
  for (const cat of catStore.sortedCategories) {
    const matching = cat.brandIds
      .filter(bid => alertBrandIds.value.has(bid))
      .sort((a, b) => (getBrand(a)?.name ?? '').localeCompare(getBrand(b)?.name ?? '', 'es'))
    if (matching.length) result.push({ id: cat.id, name: cat.name, bids: matching })
  }
  return result
})

const uncategorizedAlertBrandIds = computed(() => {
  const categorizedIds = new Set(catStore.categories.flatMap(c => c.brandIds))
  return [...alertBrandIds.value]
    .filter(bid => !categorizedIds.has(bid))
    .sort((a, b) => (getBrand(a)?.name ?? '').localeCompare(getBrand(b)?.name ?? '', 'es'))
})

const filteredProducts = computed(() => {
  const q = searchQuery.value.trim()
  if (!q) return []
  const result = []
  for (const bid of [...alertBrandIds.value]) {
    const brand = getBrand(bid)
    const brandMatches = brand?.name.toLowerCase().includes(q.toLowerCase())
    for (const p of store.getByBrand(bid).filter(config.value.filter)) {
      if (brandMatches || matchesProductSearch(p, q)) {
        result.push(p)
      }
    }
  }
  return result
})

function productCount(bid) {
  return store.getByBrand(bid).filter(config.value.filter).length
}

function openProduct(p) {
  router.push(productRouteFromAlerts(p.id, {
    alert  : route.meta.alertType,
    brandId: p.bid,
  }))
}

function handleDeleteCat(id) {
  catStore.markDeleteCat(id)
}

function handleRenameCat(id, newName) {
  catStore.renameCategory(id, newName)
}
</script>