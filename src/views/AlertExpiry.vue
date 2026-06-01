<template>
  <div class="screen">
    <TopBar variant="breadcrumb" :title="title" :breadcrumbs="breadcrumbs" />

    <AlertSearchBar v-model="searchQuery" input-id="alerts-expiry-search" />

    <div class="scroll-content">
      <!-- Years -->
      <template v-if="level === 'years'">
        <p class="section-label">Años</p>
        <div class="alerts__folder-list">
          <AlertFolderRow
            v-for="year in filteredYears"
            :key="year"
            :label="String(year)"
            :meta="yearMeta(year)"
            :to="`/alerts/expiry/${year}`"
            icon="ti-calendar"
            icon-bg="#EDE8F5"
            icon-color="#534AB7"
            stripe="#534AB7"
          />
        </div>
      </template>

      <!-- Months -->
      <template v-else-if="level === 'months'">
        <p class="section-label">Meses · {{ year }}</p>
        <div class="alerts__folder-list">
          <AlertFolderRow
            v-for="month in filteredMonths"
            :key="month"
            :label="monthLabel(month)"
            :meta="monthMeta(year, month)"
            :to="`/alerts/expiry/${year}/${monthKey(month)}`"
            icon="ti-calendar-month"
            icon-bg="#EDE8F5"
            icon-color="#534AB7"
            stripe="#534AB7"
          />
        </div>
      </template>

      <!-- Brands -->
      <template v-else-if="level === 'brands'">
        <p class="section-label">{{ monthLabel(monthNum) }} {{ year }}</p>
        <template v-for="catEntry in filteredBrandsByCat" :key="catEntry.id ?? '__uncategorized__'">
          <CatalogCatSep
            v-if="catEntry.id"
            :cat-id="catEntry.id"
            :cat-name="catEntry.cat"
            :show-migrate="false"
            @delete="handleDeleteCat(catEntry.id)"
            @renamed="(n) => handleRenameCat(catEntry.id, n)"
          />
          <div v-else class="catalog__cat-sep catalog__cat-sep--no-actions">
            <span class="catalog__cat-label">{{ catEntry.cat }}</span>
          </div>
          <div class="alerts__brand-list">
            <BrandRow
              v-for="b in catEntry.brands"
              :key="b.id"
              :brand="b"
              :to="`/alerts/expiry/${year}/${monthParam}/${b.id}`"
              :meta="`${brandProductCount(b.id)} producto${brandProductCount(b.id) > 1 ? 's' : ''} · ${b.origin}`"
              stripe="#534AB7"
            >
              <template #badges>
                <span class="badge badge--expiry"><i class="ti ti-clock"></i>Por vencer</span>
              </template>
            </BrandRow>
          </div>
        </template>
      </template>

      <!-- Products -->
      <template v-else-if="level === 'products'">
        <div v-if="brand" class="brand-summary">
          <div class="brand-summary__icon" :style="{ background: brand.bg }">
            <i :class="`ti ${brand.ic}`" :style="{ color: brand.col }" aria-hidden="true"></i>
          </div>
          <div>
            <div class="brand-summary__name">{{ brand.name }} · {{ brand.origin }}</div>
            <div class="brand-summary__meta">{{ monthLabel(monthNum) }} {{ year }}</div>
          </div>
        </div>

        <div
          v-for="p in filteredProducts"
          :key="p.id"
          @click.capture.stop="openProduct(p.id)"
          @keydown.enter.capture.stop="openProduct(p.id)"
        >
          <ProductCard :product="p" />
        </div>
      </template>

      <p v-if="isEmpty" class="home__empty">
        {{ searchQuery.trim() ? `Sin resultados para "${searchQuery.trim()}"` : 'Sin productos en esta carpeta' }}
      </p>
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
import { monthLabel, matchesProductSearch, matchesBrandSearch } from '../utils/alerts.js'
import { productRouteFromAlerts } from '../composables/useAlertNavigation.js'
import TopBar         from '../components/layout/TopBar.vue'
import BottomNav      from '../components/layout/BottomNav.vue'
import BrandRow       from '../components/ui/BrandRow.vue'
import ProductCard    from '../components/ui/ProductCard.vue'
import AlertFolderRow from '../components/ui/AlertFolderRow.vue'
import AlertSearchBar from '../components/ui/AlertSearchBar.vue'
import CatalogCatSep  from '../components/ui/CatalogCatSep.vue'

const route    = useRoute()
const router   = useRouter()
const store    = useProductsStore()
const catStore = useBrandCategoriesStore()
const searchQuery = ref('')

const year       = computed(() => route.params.year ? Number(route.params.year) : null)
const monthParam = computed(() => route.params.month ?? '')
const brandId    = computed(() => route.params.brandId ?? '')

const monthNum = computed(() => Number(monthParam.value) || Number.parseInt(monthParam.value, 10))

const level = computed(() => {
  if (!year.value)        return 'years'
  if (!monthParam.value)  return 'months'
  if (!brandId.value)     return 'brands'
  return 'products'
})

const years    = computed(() => store.expiryYears)
const months   = computed(() => (year.value ? store.expiryMonths(year.value) : []))
const brands   = computed(() =>
  year.value && monthParam.value ? store.expiryBrands(year.value, monthParam.value) : []
)
const brand    = computed(() => store.getBrand(brandId.value))
const products = computed(() =>
  year.value && monthParam.value && brandId.value
    ? store.expiryProducts(year.value, monthParam.value, brandId.value)
    : []
)

const title = computed(() => {
  if (level.value === 'years')   return 'Vencimientos'
  if (level.value === 'months')  return String(year.value)
  if (level.value === 'brands')  return `${monthLabel(monthNum.value)} ${year.value}`
  return brand.value?.name ?? 'Productos'
})

const breadcrumbs = computed(() => {
  if (level.value === 'years') return [
    { label: 'Alertas', to: '/alerts' },
  ]
  if (level.value === 'months') return [
    { label: 'Alertas', to: '/alerts' },
    { label: 'Años',    to: '/alerts/expiry' },
  ]
  if (level.value === 'brands') return [
    { label: 'Alertas', to: '/alerts' },
    { label: 'Años',    to: '/alerts/expiry' },
    { label: `${monthLabel(monthNum.value)} ${year.value}`, to: `/alerts/expiry/${year.value}` },
  ]
  return [
    { label: 'Alertas', to: '/alerts' },
    { label: 'Años',    to: '/alerts/expiry' },
    { label: `${monthLabel(monthNum.value)} ${year.value}`, to: `/alerts/expiry/${year.value}` },
    { label: brand.value?.name ?? brandId.value,           to: `/alerts/expiry/${year.value}/${monthParam.value}` },
  ]
})

const filteredYears = computed(() => {
  const q = searchQuery.value.trim()
  if (!q) return years.value
  return years.value.filter(y => productsInYear(y).some(p => matchesProductSearch(p, q)))
})

const filteredMonths = computed(() => {
  const q = searchQuery.value.trim()
  if (!q) return months.value
  return months.value.filter(m => productsInMonth(year.value, m).some(p => matchesProductSearch(p, q)))
})

const filteredBrands = computed(() => {
  const q = searchQuery.value.trim()
  if (!q) return brands.value
  return brands.value.filter(b =>
    matchesBrandSearch(b, q, store.expiryProducts(year.value, monthParam.value, b.id))
  )
})

const filteredBrandsByCat = computed(() => {
  const brandMap = new Map(filteredBrands.value.map(b => [b.id, b]))
  const result = catStore.sortedCategories.reduce((acc, cat) => {
    const catBrands = cat.brandIds
      .filter(bid => brandMap.has(bid))
      .sort((a, b) => (brandMap.get(a)?.name ?? '').localeCompare(brandMap.get(b)?.name ?? '', 'es'))
      .map(bid => brandMap.get(bid))
    if (catBrands.length) acc.push({ id: cat.id, cat: cat.name, brands: catBrands })
    return acc
  }, [])

  const categorizedIds = new Set(catStore.categories.flatMap(c => c.brandIds))
  const uncategorized  = filteredBrands.value.filter(b => !categorizedIds.has(b.id))
  if (uncategorized.length) result.push({ id: null, cat: 'Sin categoría', brands: uncategorized })

  return result
})

const filteredProducts = computed(() => {
  const q = searchQuery.value.trim()
  if (!q) return products.value
  return products.value.filter(p => matchesProductSearch(p, q))
})

const isEmpty = computed(() => {
  if (level.value === 'years')    return !filteredYears.value.length
  if (level.value === 'months')   return !filteredMonths.value.length
  if (level.value === 'brands')   return !filteredBrands.value.length
  return !filteredProducts.value.length
})

function productsInYear(y) {
  const monthsObj = store.expiryTree[y] ?? {}
  const all = []
  for (const byBrand of Object.values(monthsObj)) {
    for (const list of Object.values(byBrand)) all.push(...list)
  }
  return all
}

function productsInMonth(y, m) {
  const key     = monthKey(m)
  const byBrand = store.expiryTree[y]?.[key] ?? {}
  return Object.values(byBrand).flat()
}

function openProduct(id) {
  router.push(productRouteFromAlerts(id, {
    alert  : 'expiry',
    brandId: brandId.value,
    year   : year.value,
    month  : monthParam.value,
  }))
}

function monthKey(m) {
  return String(m).padStart(2, '0')
}

function yearMeta(y) {
  const monthsObj  = store.expiryTree[y] ?? {}
  let n = 0
  for (const byBrand of Object.values(monthsObj)) {
    for (const list of Object.values(byBrand)) n += list.length
  }
  const monthCount = Object.keys(monthsObj).length
  return `${n} producto${n > 1 ? 's' : ''} · ${monthCount} mes${monthCount > 1 ? 'es' : ''}`
}

function monthMeta(y, m) {
  const key        = monthKey(m)
  const n          = Object.values(store.expiryTree[y]?.[key] ?? {}).flat().length
  const brandCount = Object.keys(store.expiryTree[y]?.[key] ?? {}).length
  return `${n} producto${n > 1 ? 's' : ''} · ${brandCount} marca${brandCount > 1 ? 's' : ''}`
}

function brandProductCount(bid) {
  return store.expiryProducts(year.value, monthParam.value, bid).length
}

function handleDeleteCat(id) {
  catStore.markDeleteCat(id)
}

function handleRenameCat(id, newName) {
  catStore.renameCategory(id, newName)
}
</script>