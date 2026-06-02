import { ref, computed, nextTick } from 'vue'

/**
 * Encapsulates the state and logic of the catalog Settings sheet:
 * search, rename and delete of brand categories and brands.
 *
 * @param {ReturnType<import('../stores/products.js').useProductsStore>}         store
 * @param {ReturnType<import('../stores/brandCategories.js').useBrandCategoriesStore>} catStore
 * @param {{ onDeleteCat?: (id: string) => void }} [options]
 */
export function useSettingsSheet(store, catStore, options = {}) {
  const { onDeleteCat } = options

  // ─── Visibility & search ──────────────────────────────────────────────────
  const showSettingsSheet   = ref(false)
  const settingsSearchQuery = ref('')

  // ─── Inline edit state ────────────────────────────────────────────────────
  const settingsEditingCatId   = ref(null)
  const settingsEditingBrandId = ref(null)
  const settingsEditValue      = ref('')
  const settingsEditError      = ref('')
  const settingsInputRefs      = ref({})

  // ─── Filtered computeds ───────────────────────────────────────────────────
  const filteredSettingsCategories = computed(() => {
    const q = settingsSearchQuery.value.trim().toLowerCase()
    if (!q) return catStore.sortedCategories
    return catStore.sortedCategories.filter(cat => {
      if (cat.name.toLowerCase().includes(q)) return true
      return cat.brandIds.some(bid => {
        const brand = store.getBrand(bid)
        return brand?.name.toLowerCase().includes(q)
      })
    })
  })

  const filteredSettingsBrands = computed(() => {
    const q = settingsSearchQuery.value.trim().toLowerCase()
    if (!q) return store.sortedBrands
    return store.sortedBrands.filter(brand => brand.name.toLowerCase().includes(q))
  })

  // ─── Open / close ─────────────────────────────────────────────────────────
  function openSettingsSheet() {
    showSettingsSheet.value = true
  }

  function closeSettingsSheet() {
    showSettingsSheet.value      = false
    settingsEditingCatId.value   = null
    settingsEditingBrandId.value = null
    settingsEditValue.value      = ''
    settingsEditError.value      = ''
  }

  // ─── Shared inline edit ───────────────────────────────────────────────────
  function cancelSettingsEdit() {
    settingsEditingCatId.value   = null
    settingsEditingBrandId.value = null
    settingsEditValue.value      = ''
    settingsEditError.value      = ''
  }

  // ─── Brand categories ─────────────────────────────────────────────────────
  function startSettingsCatEdit(cat) {
    settingsEditingBrandId.value = null
    settingsEditingCatId.value   = cat.id
    settingsEditValue.value      = cat.name
    settingsEditError.value      = ''
    nextTick(() => settingsInputRefs.value[cat.id]?.focus())
  }

  function confirmSettingsCatRename(id) {
    const val = settingsEditValue.value.trim()
    if (!val) {
      settingsEditError.value = 'El nombre no puede quedar vacío'
      return
    }
    const cat = catStore.categories.find(c => c.id === id)
    if (!cat) return
    if (val === cat.name) { cancelSettingsEdit(); return }
    const err = catStore.renameCategory(id, val)
    if (err) {
      settingsEditError.value = err
      return
    }
    settingsEditingCatId.value = null
    settingsEditError.value    = ''
  }

  function handleSettingsDeleteCat(id) {
    onDeleteCat?.(id)
    catStore.markDeleteCat(id)
    settingsEditingCatId.value = null
  }

  // ─── Brands ───────────────────────────────────────────────────────────────
  function startSettingsBrandEdit(brand) {
    settingsEditingCatId.value   = null
    settingsEditingBrandId.value = brand.id
    settingsEditValue.value      = brand.name
    settingsEditError.value      = ''
    nextTick(() => settingsInputRefs.value[brand.id]?.focus())
  }

  function confirmSettingsBrandRename(id) {
    const val = settingsEditValue.value.trim()
    if (!val) {
      settingsEditError.value = 'El nombre no puede quedar vacío'
      return
    }
    const brand = store.brands.find(b => b.id === id)
    if (!brand) return
    if (val === brand.name) { cancelSettingsEdit(); return }
    if (store.brands.some(b => b.id !== id && b.name === val)) {
      settingsEditError.value = 'Ya existe una marca con ese nombre'
      return
    }
    store.editBrandName(id, val)
    settingsEditingBrandId.value = null
    settingsEditError.value      = ''
  }

  function handleSettingsDeleteBrand(id) {
    store.markDeleteBrand(id)
    settingsEditingBrandId.value = null
    const cat = catStore.getCategoryForBrand(id)
    if (cat) {
      catStore.moveBrands([id], cat.id, null)
    }
  }

  return {
    // Visibility
    showSettingsSheet,
    openSettingsSheet,
    closeSettingsSheet,
    // Search
    settingsSearchQuery,
    // Computed
    filteredSettingsCategories,
    filteredSettingsBrands,
    // Edit state
    settingsEditingCatId,
    settingsEditingBrandId,
    settingsEditValue,
    settingsEditError,
    settingsInputRefs,
    // Category handlers
    startSettingsCatEdit,
    confirmSettingsCatRename,
    handleSettingsDeleteCat,
    // Brand handlers
    startSettingsBrandEdit,
    confirmSettingsBrandRename,
    handleSettingsDeleteBrand,
    // Shared edit
    cancelSettingsEdit,
  }
}