import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useUndo } from '../composables/useUndo.js'
import { brandCategories as SEED } from '../data/brandCategories.js'

const LS_KEY = 'stockos_brand_categories'

function genId() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
}

function seedFromStatic() {
  return Object.entries(SEED).map(([name, brandIds]) => ({
    id  : genId(),
    name,
    brandIds: [...brandIds],
  }))
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw !== null) return JSON.parse(raw)
  } catch { /* noop */ }
  return seedFromStatic()
}

function save(data) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data))
  } catch { /* noop */ }
}

export const useBrandCategoriesStore = defineStore('brandCategories', () => {
  const categories = ref(load())

  watch(categories, val => save(val), { deep: true })

  const sortedCategories = computed(() =>
    [...categories.value].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  )

  function addCategory(name) {
    const n = name.trim()
    if (!n || categories.value.some(c => c.name === n)) return false
    categories.value.push({ id: genId(), name: n, brandIds: [] })
    return true
  }

  function renameCategory(id, newName) {
    const n = newName.trim()
    if (!n) return 'El nombre no puede quedar vacío'
    if (categories.value.some(c => c.name === n && c.id !== id)) return 'Ya existe un grupo con ese nombre'
    const cat = categories.value.find(c => c.id === id)
    if (!cat) return 'Grupo no encontrado'
    cat.name = n
    return null
  }

  function getCategoryForBrand(brandId) {
    return categories.value.find(c => c.brandIds.includes(brandId)) ?? null
  }

  /**
   * fromId = null -> brands vienen de Sin categoría (solo se agregan al destino).
   * toId   = null -> brands pasan a Sin categoría (solo se usan en undo).
   */
  function moveBrands(brandIds, fromId, toId) {
    if (fromId !== null) {
      const from = categories.value.find(c => c.id === fromId)
      if (from) from.brandIds = from.brandIds.filter(b => !brandIds.includes(b))
    }
    if (toId !== null) {
      const to = categories.value.find(c => c.id === toId)
      if (!to) return
      for (const bid of brandIds) {
        if (!to.brandIds.includes(bid)) to.brandIds.push(bid)
      }
    }
  }

  const {
    pending: pendingDeleteCat,
    mark  : _markDel,
    take  : _takeDel,
    confirm: confirmDeleteCat,
  } = useUndo()

  function markDeleteCat(id) {
    const idx = categories.value.findIndex(c => c.id === id)
    if (idx === -1) return
    const snap = { ...categories.value[idx], brandIds: [...categories.value[idx].brandIds], _idx: idx }
    categories.value.splice(idx, 1)
    _markDel(snap)
  }

  function undoDeleteCat() {
    const snap = _takeDel()
    if (!snap) return
    const { _idx, ...cat } = snap
    categories.value.splice(_idx, 0, cat)
  }

  const {
    pending: pendingMoveBrands,
    mark  : _markMove,
    take  : _takeMove,
    confirm: confirmMoveBrands,
  } = useUndo()

  function markMoveBrands(brandIds, fromId, toId) {
    moveBrands(brandIds, fromId, toId)
    _markMove({ brandIds: [...brandIds], fromId, toId })
  }

  function undoMoveBrands() {
    const snap = _takeMove()
    if (!snap) return
    moveBrands(snap.brandIds, snap.toId, snap.fromId)
  }

  return {
    categories,
    sortedCategories,
    addCategory,
    renameCategory,
    getCategoryForBrand,
    moveBrands,
    pendingDeleteCat, markDeleteCat, undoDeleteCat, confirmDeleteCat,
    pendingMoveBrands, markMoveBrands, undoMoveBrands, confirmMoveBrands,
  }
})