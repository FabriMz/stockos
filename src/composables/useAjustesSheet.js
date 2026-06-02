import { ref, computed, nextTick } from 'vue'

/**
 * Encapsula el estado y la lógica del sheet de Ajustes del catálogo:
 * búsqueda, renombrado y eliminación de categorías de marca y marcas.
 *
 * @param {ReturnType<import('../stores/products.js').useProductsStore>}         store
 * @param {ReturnType<import('../stores/brandCategories.js').useBrandCategoriesStore>} catStore
 * @param {{ onDeleteCat?: (id: string) => void }} [options]
 */
export function useAjustesSheet(store, catStore, options = {}) {
  const { onDeleteCat } = options

  // ─── Visibilidad y búsqueda ───────────────────────────────────────────────
  const showAjustesSheet   = ref(false)
  const ajustesSearchQuery = ref('')

  // ─── Estado de edición inline ─────────────────────────────────────────────
  const ajustesEditingCatId   = ref(null)
  const ajustesEditingBrandId = ref(null)
  const ajustesEditValue      = ref('')
  const ajustesEditError      = ref('')
  const ajustesInputRefs      = ref({})

  // ─── Computed filtrados ───────────────────────────────────────────────────
  const filteredAjustesCategories = computed(() => {
    const q = ajustesSearchQuery.value.trim().toLowerCase()
    if (!q) return catStore.sortedCategories
    return catStore.sortedCategories.filter(cat => {
      if (cat.name.toLowerCase().includes(q)) return true
      return cat.brandIds.some(bid => {
        const brand = store.getBrand(bid)
        return brand?.name.toLowerCase().includes(q)
      })
    })
  })

  const filteredAjustesBrands = computed(() => {
    const q = ajustesSearchQuery.value.trim().toLowerCase()
    if (!q) return store.sortedBrands
    return store.sortedBrands.filter(brand => brand.name.toLowerCase().includes(q))
  })

  // ─── Abrir / cerrar ───────────────────────────────────────────────────────
  function openAjustesSheet() {
    showAjustesSheet.value = true
  }

  function closeAjustesSheet() {
    showAjustesSheet.value      = false
    ajustesEditingCatId.value   = null
    ajustesEditingBrandId.value = null
    ajustesEditValue.value      = ''
    ajustesEditError.value      = ''
  }

  // ─── Edición inline compartida ────────────────────────────────────────────
  function cancelAjustesEdit() {
    ajustesEditingCatId.value   = null
    ajustesEditingBrandId.value = null
    ajustesEditValue.value      = ''
    ajustesEditError.value      = ''
  }

  // ─── Categorías de marca ──────────────────────────────────────────────────
  function startAjustesCatEdit(cat) {
    ajustesEditingBrandId.value = null
    ajustesEditingCatId.value   = cat.id
    ajustesEditValue.value      = cat.name
    ajustesEditError.value      = ''
    nextTick(() => ajustesInputRefs.value[cat.id]?.focus())
  }

  function confirmAjustesCatRename(id) {
    const val = ajustesEditValue.value.trim()
    if (!val) {
      ajustesEditError.value = 'El nombre no puede quedar vacío'
      return
    }
    const cat = catStore.categories.find(c => c.id === id)
    if (!cat) return
    if (val === cat.name) { cancelAjustesEdit(); return }
    const err = catStore.renameCategory(id, val)
    if (err) {
      ajustesEditError.value = err
      return
    }
    ajustesEditingCatId.value = null
    ajustesEditError.value    = ''
  }

  function handleAjustesDeleteCat(id) {
    onDeleteCat?.(id)
    catStore.markDeleteCat(id)
    ajustesEditingCatId.value = null
  }

  // ─── Marcas ───────────────────────────────────────────────────────────────
  function startAjustesBrandEdit(brand) {
    ajustesEditingCatId.value   = null
    ajustesEditingBrandId.value = brand.id
    ajustesEditValue.value      = brand.name
    ajustesEditError.value      = ''
    nextTick(() => ajustesInputRefs.value[brand.id]?.focus())
  }

  function confirmAjustesBrandRename(id) {
    const val = ajustesEditValue.value.trim()
    if (!val) {
      ajustesEditError.value = 'El nombre no puede quedar vacío'
      return
    }
    const brand = store.brands.find(b => b.id === id)
    if (!brand) return
    if (val === brand.name) { cancelAjustesEdit(); return }
    if (store.brands.some(b => b.id !== id && b.name === val)) {
      ajustesEditError.value = 'Ya existe una marca con ese nombre'
      return
    }
    store.editBrandName(id, val)
    ajustesEditingBrandId.value = null
    ajustesEditError.value      = ''
  }

  function handleAjustesDeleteBrand(id) {
    store.markDeleteBrand(id)
    ajustesEditingBrandId.value = null
    // Desvincula la marca de su categoría usando la API del store (con persistencia y reactividad)
    const cat = catStore.getCategoryForBrand(id)
    if (cat) {
      catStore.moveBrands([id], cat.id, null)
    }
  }

  return {
    // Visibilidad
    showAjustesSheet,
    openAjustesSheet,
    closeAjustesSheet,
    // Búsqueda
    ajustesSearchQuery,
    // Computed
    filteredAjustesCategories,
    filteredAjustesBrands,
    // Estado edición
    ajustesEditingCatId,
    ajustesEditingBrandId,
    ajustesEditValue,
    ajustesEditError,
    ajustesInputRefs,
    // Handlers categorías
    startAjustesCatEdit,
    confirmAjustesCatRename,
    handleAjustesDeleteCat,
    // Handlers marcas
    startAjustesBrandEdit,
    confirmAjustesBrandRename,
    handleAjustesDeleteBrand,
    // Edición compartida
    cancelAjustesEdit,
  }
}