import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { storageGet, scheduleStorageSet, storageRemove } from '../utils/storage.js'

const ORDERS_KEY     = 'stockos_orders_v2'
const ORDERS_KEY_OLD = 'stockos_orders'

export const useOrdersStore = defineStore('orders', () => {

  const orders = ref([])
  const _ready = ref(false)

  async function _init() {
    try {
      // Migrar datos viejos si existen
      const rawOld = await storageGet(ORDERS_KEY_OLD)
      if (rawOld) {
        const parsed = JSON.parse(rawOld)
        const list = Array.isArray(parsed) ? parsed : (parsed?.orders ?? [])
        const migrated = list.map(o => ({
          id:     o.id,
          name:   o.name   ?? o.nombre  ?? '',
          ref:    o.ref    ?? '',
          status: o.status ?? o.estado  ?? '',
          amount: o.amount ?? o.monto   ?? 0,
          color:  o.color  ?? '#C07828',
          active: o.active ?? o.enCurso ?? false,
        }))
        await storageSet(ORDERS_KEY, JSON.stringify({ orders: migrated, _seeded: true }))
        await storageRemove(ORDERS_KEY_OLD)
        orders.value = migrated
        return
      }
      const raw = await storageGet(ORDERS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        orders.value = parsed._seeded ? (parsed.orders ?? []) : []
      }
    } catch { /* noop */ } finally {
      _ready.value = true
    }
  }

  _init()

  watch(orders, (val) => {
    if (!_ready.value) return
    scheduleStorageSet(ORDERS_KEY, JSON.stringify({ orders: val, _seeded: true }))
  }, { deep: true })

  const activeOrders = computed(() => orders.value.filter(p => p.active))
  const orderHistory = computed(() => orders.value.filter(p => !p.active))

  function addOrder(data) {
    const newId = orders.value.length ? Math.max(...orders.value.map(p => p.id)) + 1 : 1
    orders.value.unshift({ ...data, id: newId })
  }

  function editOrder(id, data) {
    const idx = orders.value.findIndex(p => p.id === Number(id))
    if (idx !== -1) orders.value[idx] = { ...orders.value[idx], ...data }
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
    _ready,
    orders, activeOrders, orderHistory,
    addOrder, editOrder,
    pendingDeleteOrder, markDeleteOrder, undoDeleteOrder, confirmDeleteOrder,
  }
})