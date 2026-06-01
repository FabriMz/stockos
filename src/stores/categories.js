import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useUndo } from '../composables/useUndo.js'

const LEGACY_KEY     = 'stockos_v1'
const CATEGORIES_KEY = 'stockos_categories'

const DEFAULT_CATEGORIES = [
  'Salsas', 'Aceites', 'Vinagres', 'Conservas', 'Café',
  'Cervezas', 'Rones', 'Whisky', 'Vodka', 'Licores',
  'Vinos', 'Untables', 'Golosinas', 'Infusiones',
]

function loadCategories() {
  try {
    const own = localStorage.getItem(CATEGORIES_KEY)
    if (own !== null) return JSON.parse(own)

    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) {
      const parsed = JSON.parse(legacy)
      if (parsed?._seeded && Array.isArray(parsed.categories)) {
        return parsed.categories
      }
    }
  } catch { /* noop */ }
  return DEFAULT_CATEGORIES
}

function saveCategories(categories) {
  try {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories))
  } catch { /* noop */ }
}

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref(loadCategories())

  watch(categories, val => saveCategories(val), { deep: true })

  const sortedCategories = computed(() =>
    [...categories.value].sort((a, b) => a.localeCompare(b, 'es'))
  )

  function addCategory(name) {
    const n = name.trim()
    if (n && !categories.value.includes(n)) categories.value.push(n)
  }

  function editCategory(oldName, newName) {
    const name = newName.trim()
    if (!name || name === oldName) return
    if (categories.value.includes(name)) return
    const idx = categories.value.indexOf(oldName)
    if (idx === -1) return
    categories.value[idx] = name
  }

  function deleteCategory(name) {
    const idx = categories.value.indexOf(name)
    if (idx !== -1) categories.value.splice(idx, 1)
  }

  // ─── UNDO ────────────────────────────────────────────────────────────────────
  const { pending: pendingDeleteCategory, mark: _mark, take: _take, confirm: confirmDeleteCategory } = useUndo()

  /**
   * Elimina la categoría con soporte undo.
   * Recibe opcionalmente los ids de productos afectados para poder restaurarlos.
   * La propagación a productos la orquesta useProductsStore (fachada).
   */
  function markDeleteCategory(name, affectedProductIds = []) {
    const idx = categories.value.indexOf(name)
    if (idx === -1) return
    categories.value.splice(idx, 1)
    _mark({ name, _idx: idx, _affectedProductIds: affectedProductIds })
  }

  function undoDeleteCategory(restoreProductsCb) {
    const snapshot = _take()
    if (!snapshot) return
    categories.value.splice(snapshot._idx, 0, snapshot.name)
    if (typeof restoreProductsCb === 'function' && snapshot._affectedProductIds.length) {
      restoreProductsCb(snapshot._affectedProductIds, snapshot.name)
    }
  }

  return {
    categories, sortedCategories,
    addCategory, deleteCategory,
    pendingDeleteCategory, markDeleteCategory, undoDeleteCategory, confirmDeleteCategory,
  }
})