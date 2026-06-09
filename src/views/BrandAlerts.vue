<template>
  <div class="screen alerts-view">
    <TopBar variant="title" title="Alertas" />

    <AlertSearchBar v-model="searchQuery" input-id="alerts-root-search" />

    <div class="scroll-content">
      <template v-if="searchQuery.trim()">
        <div v-for="p in filteredAlertProducts" :key="p.id" class="brand-row" @click="openProduct(p)" role="button"
          tabindex="0" :aria-label="p.name" @keydown.enter="openProduct(p)">
          <div class="brand-row__stripe" :style="{ background: alertStripe(p) }"></div>
          <div class="brand-row__body">
            <div class="brand-row__header">
              <div class="brand-row__icon" :style="{ background: p.bg }">
                <i :class="`ti ${p.ic}`" :style="{ color: p.col }" aria-hidden="true"></i>
              </div>
              <div class="brand-row__info brand-row__info--wrap">
                <div class="brand-row__name">{{ p.name }}</div>
                <div class="brand-row__meta">{{ p.brand }} · {{ p.sku }}</div>
              </div>
            </div>
            <div class="brand-row__divider" aria-hidden="true"></div>
            <div class="brand-row__badges">
              <span v-if="store.isOutOfStock(p)" class="badge badge--out"><i class="ti ti-ban"
                  aria-hidden="true"></i>Sin stock</span>
              <span v-else-if="store.isLowStock(p)" class="badge badge--low"><i class="ti ti-alert-circle"
                  aria-hidden="true"></i>Stock bajo</span>
              <span v-else-if="store.isExpiring(p)" class="badge badge--venc"><i class="ti ti-clock"
                  aria-hidden="true"></i>Por vencer</span>
            </div>
          </div>
        </div>
        <p v-if="!filteredAlertProducts.length" class="home__empty">
          Sin resultados para "{{ searchQuery.trim() }}"
        </p>
      </template>

      <template v-else>
        <template v-if="hasFolders">
          <p class="section-label">Carpetas</p>
          <div class="alerts__folder-list">
            <AlertFolderRow v-if="store.outOfStockAlerts.length" label="Sin Stock"
              :meta="folderMeta(store.outOfStockAlerts.length, 'producto')" to="/alerts/out-of-stock" icon="ti-ban"
              icon-bg="#F5E8E8" icon-color="#791132" stripe="#791132" />
            <AlertFolderRow v-if="store.lowStockAlerts.length" label="Stock Bajo"
              :meta="folderMeta(store.lowStockAlerts.length, 'producto')" to="/alerts/low-stock" icon="ti-alert-circle"
              icon-bg="#F5EBE8" icon-color="#90542f" stripe="#90542f" />
            <AlertFolderRow v-if="store.expiryAlerts.length" label="Vencimientos" :meta="expiryMeta" to="/alerts/expiry"
              icon="ti-clock" icon-bg="#EDE8F5" icon-color="#534AB7" stripe="#534AB7" />
          </div>
          <div class="spacer--sm"></div>
        </template>
        <div v-else class="alerts__empty">
          <i class="ti ti-bell-off" aria-hidden="true"></i>
          <p>Sin alertas activas</p>
          <span>Los productos sin stock, con stock bajo o próximos a vencer aparecerán aquí</span>
        </div>
      </template>
    </div>

    <BottomNav />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProductsStore } from '../stores/products.js'
import { matchesProductSearch } from '../utils/alerts.js'
import { productRouteFromAlerts } from '../composables/useAlertNavigation.js'
import TopBar from '../components/layout/TopBar.vue'
import BottomNav from '../components/layout/BottomNav.vue'
import AlertFolderRow from '../components/ui/AlertFolderRow.vue'
import AlertSearchBar from '../components/ui/AlertSearchBar.vue'

const router = useRouter()
const store = useProductsStore()
const searchQuery = ref('')

const hasFolders = computed(() =>
  store.outOfStockAlerts.length || store.lowStockAlerts.length || store.expiryAlerts.length
)

const filteredAlertProducts = computed(() => {
  const q = searchQuery.value.trim()
  if (!q) return []
  return store.alerts.filter(p => matchesProductSearch(p, q))
})

const expiryMeta = computed(() => {
  const n = store.expiryAlerts.length
  const years = store.expiryYears.length
  return `${n} producto${n > 1 ? 's' : ''} · ${years} año${years > 1 ? 's' : ''}`
})

function folderMeta(n, word) {
  return `${n} ${word}${n > 1 ? 's' : ''}`
}

function alertStripe(p) {
  if (store.isOutOfStock(p)) return '#791132'
  if (store.isLowStock(p)) return '#90542f'
  return '#534AB7'
}

function openProduct(p) {
  router.push(productRouteFromAlerts(p.id, { alert: 'root' }))
}
</script>