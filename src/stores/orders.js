import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

const LEGACY_KEY = 'stockos_pedidos'
const ORDERS_KEY = 'stockos_orders'

function migrateStorage() {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy && !localStorage.getItem(ORDERS_KEY)) {
      localStorage.setItem(ORDERS_KEY, legacy)
    }
    localStorage.removeItem(LEGACY_KEY)
  } catch { /* noop */ }
}

function migrateOrderKeys() {
  try {
    const raw = localStorage.getItem(ORDERS_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    const orders = Array.isArray(parsed) ? parsed : parsed?.orders
    if (!Array.isArray(orders)) return
    const needsMigration = orders.some(o => 'nombre' in o || 'estado' in o || 'monto' in o || 'enCurso' in o)
    if (!needsMigration) {
      if (Array.isArray(parsed)) {
        localStorage.setItem(ORDERS_KEY, JSON.stringify({ orders: parsed, _seeded: true }))
      }
      return
    }
    const migrated = orders.map(o => ({
      ...o,
      ...(('nombre'  in o) && { name:   o.nombre,   nombre:   undefined }),
      ...(('estado'  in o) && { status: o.estado,   estado:   undefined }),
      ...(('monto'   in o) && { amount: o.monto,    monto:    undefined }),
      ...(('enCurso' in o) && { active: o.enCurso,  enCurso:  undefined }),
    })).map(o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)))
    localStorage.setItem(ORDERS_KEY, JSON.stringify({ orders: migrated, _seeded: true }))
  } catch { /* noop */ }
}

migrateStorage()
migrateOrderKeys()

export const useOrdersStore = defineStore('orders', () => {

  const ordersSeed = [
    { id: 1, name: 'Polli — Reposición salsas',  ref: 'PO-2025-031', status: 'enviado hace 2 días', amount: 4820,  color: '#C07828', active: true  },
    { id: 2, name: 'Baqué — Cápsulas y molidos', ref: 'PO-2025-032', status: 'en preparación',       amount: 6340,  color: '#791132', active: true  },
    { id: 3, name: 'Borges — Aceites EVOO',       ref: 'PO-2025-028', status: 'recibido 3 may.',      amount: 9619,  color: '#2D8A5F', active: false },
    { id: 4, name: 'Kaiserdom — Cervezas lata',   ref: 'PO-2025-027', status: 'recibido 28 abr.',     amount: 5318,  color: '#2D8A5F', active: false },
    { id: 5, name: 'Botran — Rones Guatemala',    ref: 'PO-2025-026', status: 'recibido 20 abr.',     amount: 41820, color: '#2D8A5F', active: false },
  ]

  function loadOrders() {
    try {
      const raw = localStorage.getItem(ORDERS_KEY)
      if (!raw) return ordersSeed
      const parsed = JSON.parse(raw)
      return parsed._seeded ? parsed.orders : ordersSeed
    } catch {
      return ordersSeed
    }
  }

  const orders = ref(loadOrders())

  watch(orders, (val) => {
    localStorage.setItem(ORDERS_KEY, JSON.stringify({ orders: val, _seeded: true }))
  }, { deep: true, immediate: true })

  const activeOrders = computed(() => orders.value.filter(p => p.active))
  const orderHistory = computed(() => orders.value.filter(p => !p.active))

  function addOrder(datos) {
    const newId = orders.value.length ? Math.max(...orders.value.map(p => p.id)) + 1 : 1
    orders.value.unshift({ ...datos, id: newId })
  }

  function editOrder(id, datos) {
    const idx = orders.value.findIndex(p => p.id === Number(id))
    if (idx !== -1) orders.value[idx] = { ...orders.value[idx], ...datos }
  }

  const pendingDeleteOrder = ref(null)
  let deleteOrderTimer = null

  function markDeleteOrder(id) {
    const idx = orders.value.findIndex(p => p.id === Number(id))
    if (idx === -1) return
    const snapshot = { ...orders.value[idx], _idx: idx }
    pendingDeleteOrder.value = snapshot
    orders.value.splice(idx, 1)
    clearTimeout(deleteOrderTimer)
    deleteOrderTimer = setTimeout(() => { confirmDeleteOrder() }, 5000)
  }

  function undoDeleteOrder() {
    if (!pendingDeleteOrder.value) return
    clearTimeout(deleteOrderTimer)
    const { _idx, ...order } = pendingDeleteOrder.value
    orders.value.splice(_idx, 0, order)
    pendingDeleteOrder.value = null
  }

  function confirmDeleteOrder() {
    clearTimeout(deleteOrderTimer)
    pendingDeleteOrder.value = null
  }

  return {
    orders, activeOrders, orderHistory,
    addOrder, editOrder,
    pendingDeleteOrder, markDeleteOrder, undoDeleteOrder, confirmDeleteOrder,
  }
})
