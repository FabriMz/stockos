<template>
  <div class="screen">
    <TopBar variant="title" title="Pedidos">
      <template #actions>
        <button class="btn-new" aria-label="Nuevo pedido" @click="$router.push('/orders/new')">
          <i class="ti ti-plus" aria-hidden="true"></i>Nuevo
        </button>
      </template>
    </TopBar>

    <div class="scroll-content">
      <template v-if="store.activeOrders.length">
        <p class="section-label">En curso</p>
        <div class="orders__list">
          <div v-for="p in store.activeOrders" :key="p.id" class="order-row order-row--interactive" role="button"
            :aria-label="`Editar pedido ${p.name}`" @click="$router.push(`/orders/${p.id}/edit`)">
            <div class="order-row__dot" :style="{ background: p.color }"></div>
            <div class="order-row__info">
              <div class="order-row__name">{{ p.name }}</div>
              <div class="order-row__sub">{{ p.ref }} · {{ p.status }}</div>
            </div>
            <div class="order-row__amount">{{ currencyStore.formatPrice(p.amount) }}</div>
          </div>
        </div>
      </template>

      <template v-if="store.orderHistory.length">
        <p class="section-label">Historial reciente</p>
        <div class="orders__list">
          <div v-for="p in store.orderHistory" :key="p.id" class="order-row order-row--interactive" role="button"
            :aria-label="`Editar pedido ${p.name}`" @click="$router.push(`/orders/${p.id}/edit`)">
            <div class="order-row__dot" :style="{ background: p.color }"></div>
            <div class="order-row__info">
              <div class="order-row__name">{{ p.name }}</div>
              <div class="order-row__sub">{{ p.ref }} · {{ p.status }}</div>
            </div>
            <div class="order-row__amount">{{ currencyStore.formatPrice(p.amount) }}</div>
          </div>
        </div>
      </template>

      <p v-if="!store.orders.length" class="orders__empty">No hay pedidos registrados.</p>

      <div class="spacer--sm"></div>
    </div>

    <BottomNav />
  </div>
</template>

<script setup>
import TopBar from '../components/layout/TopBar.vue'
import BottomNav from '../components/layout/BottomNav.vue'
import { useOrdersStore } from '../stores/orders.js'
import { useCurrencyStore } from '../stores/currency.js'

const store = useOrdersStore()
const currencyStore = useCurrencyStore()
</script>