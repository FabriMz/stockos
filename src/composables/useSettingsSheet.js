import { ref, computed, nextTick } from 'vue'

/**
 * Encapsulates the state and logic of the catalog Settings sheet:
 * search, rename and delete of brand categories and brands.
 *
 * @param store         - useProductsStore instance
 * @param catStore      - useBrandCategoriesStore instance OR a batch-local adapter
 *                        with { categories, sortedCategories }
 * @param options       - {
 *                          onDeleteCat?:  (id) => void      — side-effect adicional al borrar (batch mode)
 *                          onRenameCat?:  (id, val) => err  — override rename (batch mode)
 *                          batchBrandIds?: ComputedRef<string[]>  — filter to batch brands
 *                        }
 */
export function useSettingsSheet(store, catStore, options = {}) {
  const { onDeleteCat, onRenameCat, batchBrandIds = null } = options

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
    // En modo batch, catStore ya es el adaptador del lote → todas sus categorías son relevantes
    // En modo global, filtrar por marcas del lote si se pasa batchBrandIds
    const batchIds = batchBrandIds?.value ?? null
    const baseCats = (batchIds && !onRenameCat)
      ? catStore.sortedCategories.filter(cat =>
          cat.brandIds.some(bid => batchIds.includes(bid))
        )
      : catStore.sortedCategories
    if (!q) return baseCats
    return baseCats.filter(cat => {
      if (cat.name.toLowerCase().includes(q)) return true
      return cat.brandIds.some(bid => {
        const brand = store.getBrand(bid)
        return brand?.name.toLowerCase().includes(q)
      })
    })
  })

  const filteredSettingsBrands = computed(() => {
    const q = settingsSearchQuery.value.trim().toLowerCase()
    const batchIds = batchBrandIds?.value ?? null
    const baseBrands = batchIds
      ? store.sortedBrands.filter(b => batchIds.includes(b.id))
      : store.sortedBrands
    if (!q) return baseBrands
    return baseBrands.filter(brand => brand.name.toLowerCase().includes(q))
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
    const cats = Array.isArray(catStore.categories)
      ? catStore.categories
      : catStore.sortedCategories
    const cat = cats.find(c => c.id === id)
    if (!cat) return
    if (val === cat.name) { cancelSettingsEdit(); return }

    // Usar override si está en modo batch, si no usar catStore.renameCategory
    const err = onRenameCat
      ? onRenameCat(id, val)
      : catStore.renameCategory(id, val)
    if (err) {
      settingsEditError.value = err
      return
    }
    settingsEditingCatId.value = null
    settingsEditError.value    = ''
  }

  function handleSettingsDeleteCat(id) {
    // Siempre ejecutar el borrado real en el store
    catStore.markDeleteCat(id)
    // Ejecutar el side-effect adicional si existe (ej: cancelar migración en batch mode)
    if (onDeleteCat) onDeleteCat(id)
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
    // En modo global, limpiar la categoría global también
    if (!onRenameCat && catStore.getCategoryForBrand) {
      const cat = catStore.getCategoryForBrand(id)
      if (cat) catStore.moveBrands([id], cat.id, null)
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