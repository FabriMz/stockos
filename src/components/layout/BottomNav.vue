<template>
  <nav class="bottom-nav" aria-label="Navegación principal">
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="fabOpen" class="sheet-overlay" role="dialog" aria-modal="true" aria-label="Acciones rápidas" @click.self="fabOpen = false">
          <div class="sheet">
            <div class="sheet__handle" aria-hidden="true"></div>
            <div class="sheet__body sheet__body--scroll">
              <button class="fab-sheet__action" aria-label="Nuevo lote" @click="goNewBatch">
                <span class="fab-sheet__action-icon">
                  <i class="ti ti-folder-plus" aria-hidden="true"></i>
                </span>
                <span class="fab-sheet__action-label">Nuevo lote</span>
              </button>
              <button class="fab-sheet__action" aria-label="Nuevo producto" @click="goNewProduct">
                <span class="fab-sheet__action-icon">
                  <i class="ti ti-box" aria-hidden="true"></i>
                </span>
                <span class="fab-sheet__action-label">Nuevo producto</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <button v-for="item in items.slice(0, 2)" :key="item.to" class="bottom-nav__tab"
      :class="{ 'bottom-nav__tab--active': isActive(item.to) }" :aria-label="item.label"
      :aria-current="isActive(item.to) ? 'page' : undefined" @click="$router.push(item.to)">
      <div class="bottom-nav__tab-icon">
        <i :class="`ti ${item.ic}`" aria-hidden="true"></i>
      </div>
      <div v-if="item.dot && alerts.length" class="bottom-nav__dot"></div>
      <span>{{ item.label }}</span>
    </button>

    <button class="bottom-nav__fab" :class="{ 'bottom-nav__fab--open': fabOpen }"
      :aria-label="fabOpen ? 'Cerrar menú' : 'Acciones rápidas'" :aria-expanded="String(fabOpen)"
      @click="fabOpen = !fabOpen">
      <div class="bottom-nav__fab-inner">
        <i class="ti ti-plus" aria-hidden="true"></i>
      </div>
    </button>

    <button v-for="item in items.slice(2)" :key="item.to" class="bottom-nav__tab"
      :class="{ 'bottom-nav__tab--active': isActive(item.to) }" :aria-label="item.label"
      :aria-current="isActive(item.to) ? 'page' : undefined" @click="$router.push(item.to)">
      <div class="bottom-nav__tab-icon">
        <i :class="`ti ${item.ic}`" aria-hidden="true"></i>
      </div>
      <div v-if="item.dot && alerts.length" class="bottom-nav__dot"></div>
      <span>{{ item.label }}</span>
    </button>
  </nav>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductsStore } from '../../stores/products.js'

const route = useRoute()
const router = useRouter()
const store = useProductsStore()
const alerts = computed(() => store.alerts)
const fabOpen = ref(false)

const items = [
  { to: '/', label: 'Inicio', ic: 'ti-layout-dashboard' },
  { to: '/catalog', label: 'Catálogo', ic: 'ti-package' },
  { to: '/alerts', label: 'Alertas', ic: 'ti-alert-triangle', dot: true },
  { to: '/settings', label: 'Ajustes', ic: 'ti-settings' },
]

const isActive = to => {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}

function goNewProduct() {
  fabOpen.value = false
  router.push('/product/new')
}

function goNewBatch() {
  fabOpen.value = false
  router.push({ path: '/catalog', query: { tab: 'batches', newBatch: '1' } })
}
</script>