<template>
  <nav class="bottom-nav" aria-label="Navegación principal">
    <Teleport to="body">
      <div v-if="fabOpen" class="fab-backdrop" @click="fabOpen = false" aria-hidden="true"></div>
      <Transition name="fab-menu">
        <div v-if="fabOpen" class="fab-menu" role="menu">
          <div class="fab-menu__item">
            <button class="fab-menu__btn" aria-label="Nuevo lote" @click="goNewBatch">
              <i class="ti ti-folder-plus" aria-hidden="true"></i>
              <span>Nuevo lote</span>
            </button>
          </div>
          <div class="fab-menu__item">
            <button class="fab-menu__btn" aria-label="Nuevo producto" @click="goNewProduct">
              <i class="ti ti-box" aria-hidden="true"></i>
              <span>Nuevo producto</span>
            </button>
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