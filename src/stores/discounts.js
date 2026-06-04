import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useUndo } from '../composables/useUndo.js'

const DISCOUNTS_KEY = 'stockos_discounts'

const DEFAULT_PRESET = '0'

function loadDiscounts() {
  try {
    const raw = localStorage.getItem(DISCOUNTS_KEY)
    if (raw !== null) return JSON.parse(raw)
  } catch { /* noop */ }
  return []
}

function saveDiscounts(discounts) {
  try {
    localStorage.setItem(DISCOUNTS_KEY, JSON.stringify(discounts))
  } catch { /* noop */ }
}

export { DEFAULT_PRESET }

export const useDiscountsStore = defineStore('discounts', () => {
  const discounts = ref(loadDiscounts())

  watch(discounts, val => saveDiscounts(val), { deep: true })

  const sortedDiscounts = computed(() => [...discounts.value])

  function addDiscount(value) {
    const v = String(value).trim()
    if (v && !discounts.value.includes(v)) discounts.value.push(v)
  }

  function deleteDiscount(value) {
    const idx = discounts.value.indexOf(value)
    if (idx !== -1) discounts.value.splice(idx, 1)
  }

  // ─── UNDO ────────────────────────────────────────────────────────────────────
  const { pending: pendingDeleteDiscount, mark: _mark, take: _take, confirm: confirmDeleteDiscount } = useUndo()

  function markDeleteDiscount(value) {
    const idx = discounts.value.indexOf(value)
    if (idx === -1) return
    discounts.value.splice(idx, 1)
    _mark({ value, _idx: idx })
  }

  function undoDeleteDiscount() {
    const snapshot = _take()
    if (!snapshot) return
    discounts.value.splice(snapshot._idx, 0, snapshot.value)
  }

  return {
    discounts, sortedDiscounts,
    addDiscount, deleteDiscount,
    pendingDeleteDiscount, markDeleteDiscount, undoDeleteDiscount, confirmDeleteDiscount,
  }
})