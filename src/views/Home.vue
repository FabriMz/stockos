<template>
  <div class="screen">
    <TopBar
      variant="home"
      :show-search="true"
      v-model="searchQuery"
      search-id="home-product-search"
      search-placeholder="Buscar producto…"
    />

    <div v-if="searchQuery" class="home__search-dropdown">
      <ul
        v-if="searchResults.length"
        class="home__search-results"
        role="listbox"
        aria-label="Resultados de búsqueda"
      >
        <li
          v-for="p in searchResults"
          :key="p.id"
          class="home__search-result"
          role="option"
          tabindex="0"
          @click="router.push(`/product/${p.id}`)"
          @keydown.enter="router.push(`/product/${p.id}`)"
        >
          <span class="home__search-result__name">{{ p.name }}</span>
          <span class="home__search-result__meta">{{ p.brand }} · {{ p.stock }} uds</span>
        </li>
      </ul>
      <p v-else class="home__search-empty">
        Sin resultados para "{{ searchQuery }}"
      </p>
    </div>

    <div class="scroll-content">
      <div class="spacer--xs"></div>

      <div class="stat-grid">
        <StatCard
          label="TOTAL SKU"
          :value="totalProds"
          :sub="`${store.brands.length} marcas activas`"
          color="blue"
        />
        <StatCard
          label="VIGENCIA"
          :value="catalogExpiryLabel"
          sub="Dto. 26% / 26+5%"
          color="success"
          value-class="stat-card__value--sm"
        />
        <StatCard
          label="EN STOCK"
          :value="inStock"
          :sub="`de ${totalProds} cargados`"
          :color="inStock === 0 ? 'danger' : 'success'"
          :value-class="inStock === 0 ? 'stat-card__value--danger' : ''"
        />
        <StatCard
          label="TOTAL ALERTAS"
          :value="alerts.length"
          sub="acción requerida"
          color="danger"
          value-class="stat-card__value--danger"
        />
      </div>

      <p class="section-label">Alertas activas</p>

      <div
        class="home__alert-item home__alert-item--out"
        role="button"
        tabindex="0"
        aria-label="Ver alertas sin stock"
        @click="$router.push('/alerts/sin-stock')"
        @keydown.enter="$router.push('/alerts/sin-stock')"
      >
        <span class="home__alert-dot home__alert-dot--out" aria-hidden="true"></span>
        <div class="home__alert-info">
          <span class="home__alert-type">Sin stock</span>
          <span class="home__alert-name">
            {{ outOfStockBrandsCount }} marca{{ outOfStockBrandsCount !== 1 ? 's' : '' }} afectada{{ outOfStockBrandsCount !== 1 ? 's' : '' }}
          </span>
        </div>
        <div class="home__alert-right">
          <span
            class="home__alert-count"
            :class="{ 'home__alert-count--zero': outOfStockCount === 0 }"
          >{{ outOfStockCount }}</span>
          <span v-if="outOfStockCount > 0" class="badge badge--out">Crítica</span>
          <span v-else class="home__alert-ok">Sin alertas</span>
        </div>
      </div>

      <div
        class="home__alert-item home__alert-item--low"
        role="button"
        tabindex="0"
        aria-label="Ver alertas de stock bajo"
        @click="$router.push('/alerts/stock-bajo')"
        @keydown.enter="$router.push('/alerts/stock-bajo')"
      >
        <span class="home__alert-dot home__alert-dot--low" aria-hidden="true"></span>
        <div class="home__alert-info">
          <span class="home__alert-type">Stock bajo</span>
          <span class="home__alert-name">
            {{ lowStockBrandsCount }} marca{{ lowStockBrandsCount !== 1 ? 's' : '' }} afectada{{ lowStockBrandsCount !== 1 ? 's' : '' }}
          </span>
        </div>
        <div class="home__alert-right">
          <span
            class="home__alert-count"
            :class="{ 'home__alert-count--zero': lowStockCount === 0 }"
          >{{ lowStockCount }}</span>
          <span v-if="lowStockCount > 0" class="badge badge--low">Atención</span>
          <span v-else class="home__alert-ok">Sin alertas</span>
        </div>
      </div>

      <div
        class="home__alert-item home__alert-item--expiry"
        role="button"
        tabindex="0"
        aria-label="Ver alertas de vencimiento"
        @click="$router.push('/alerts/expiry')"
        @keydown.enter="$router.push('/alerts/expiry')"
      >
        <span class="home__alert-dot home__alert-dot--expiry" aria-hidden="true"></span>
        <div class="home__alert-info">
          <span class="home__alert-type">Vencimiento</span>
          <span class="home__alert-name">
            {{ expiryBrandsCount }} marca{{ expiryBrandsCount !== 1 ? 's' : '' }} afectada{{ expiryBrandsCount !== 1 ? 's' : '' }}
          </span>
        </div>
        <div class="home__alert-right">
          <span
            class="home__alert-count"
            :class="{ 'home__alert-count--zero': expiryCount === 0 }"
          >{{ expiryCount }}</span>
          <span v-if="expiryCount > 0" class="badge badge--expiry">Próximo</span>
          <span v-else class="home__alert-ok">Sin alertas</span>
        </div>
      </div>

      <div class="spacer--sm"></div>
    </div>

    <BottomNav />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProductsStore } from '../stores/products.js'
import { matchesProductSearch } from '../utils/alerts.js'
import TopBar         from '../components/layout/TopBar.vue'
import BottomNav      from '../components/layout/BottomNav.vue'
import StatCard       from '../components/ui/StatCard.vue'

const router = useRouter()
const store  = useProductsStore()

const alerts     = computed(() => store.alerts)
const totalProds = computed(() => store.products.length)
const inStock    = computed(() => store.products.filter(p => p.stock > 0).length)

const outOfStockCount      = computed(() => store.outOfStockAlerts.length)
const outOfStockBrandsCount = computed(() => store.outOfStockBrands.length)
const lowStockCount        = computed(() => store.lowStockAlerts.length)
const lowStockBrandsCount   = computed(() => store.lowStockBrands.length)
const expiryCount          = computed(() => store.expiryAlerts.length)
const expiryBrandsCount    = computed(() => new Set(store.expiryAlerts.map(p => p.bid)).size)
const catalogExpiryLabel   = computed(() => {
  const [year, month] = String(store.catalogExpiry || '').split('-')
  if (!year || !month) return '—'
  return `${month.padStart(2, '0')}/${year.slice(-2)}`
})

const searchQuery   = ref('')
const searchResults = computed(() => {
  if (!searchQuery.value) return []
  return store.products
    .filter(p => matchesProductSearch(p, searchQuery.value))
    .slice(0, 8)
})
</script>