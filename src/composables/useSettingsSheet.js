import { ref, computed, nextTick } from 'vue'

/**
 * Encapsulates the state and logic of the catalog Settings sheet:
 * search, rename and delete of brand categories and brands.
 *
 * @param config        - configuration object with getter functions and handlers:
 *                        { getCategories, getSortedCategories, getSortedBrands,
 *                          getBrand, addCategory, renameCategory, deleteCategory,
 *                          addBrand, editBrandName, deleteBrand,
 *                          getCategoryForBrand?, moveBrands? }
 * @param options       - {
 *                          onDeleteCat?:  (id) => void      — side-effect adicional al borrar (batch mode)
 *                          onRenameCat?:  (id, val) => err  — override rename (batch mode)
 *                          batchBrandIds?: ComputedRef<string[]>  — filter to batch brands
 *                        }
 */
export function useSettingsSheet(config, options = {}) {
  const {
    getCategories,
    getSortedCategories,
    getSortedBrands,
    getBrand,
    addCategory,
    renameCategory,
    deleteCategory,
    addBrand,
    editBrandName,
    deleteBrand,
    getCategoryForBrand,
    moveBrands,
  } = config
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
    const batchIds = batchBrandIds?.value ?? null
    const baseCats = (batchIds && !onRenameCat)
      ? getSortedCategories().filter(cat =>
          cat.brandIds.some(bid => batchIds.includes(bid))
        )
      : getSortedCategories()
    if (!q) return baseCats
    return baseCats.filter(cat => {
      if (cat.name.toLowerCase().includes(q)) return true
      return cat.brandIds.some(bid => {
        const brand = getBrand?.(bid)
        return brand?.name.toLowerCase().includes(q)
      })
    })
  })

  const filteredSettingsBrands = computed(() => {
    const q = settingsSearchQuery.value.trim().toLowerCase()
    const batchIds = batchBrandIds?.value ?? null
    const baseBrands = batchIds
      ? getSortedBrands().filter(b => batchIds.includes(b.id))
      : getSortedBrands()
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
    const cat = getCategories().find(c => c.id === id)
    if (!cat) return
    if (val === cat.name) { cancelSettingsEdit(); return }

    // Usar override si está en modo batch, si no usar renameCategory
    const err = onRenameCat
      ? onRenameCat(id, val)
      : renameCategory?.(id, val)
    if (err) {
      settingsEditError.value = err
      return
    }
    settingsEditingCatId.value = null
    settingsEditError.value    = ''
  }

  function handleSettingsDeleteCat(id) {
    if (deleteCategory) deleteCategory(id)
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
    const allBrands = getSortedBrands()
    const brand = allBrands.find(b => b.id === id)
    if (!brand) return
    if (val === brand.name) { cancelSettingsEdit(); return }
    if (allBrands.some(b => b.id !== id && b.name === val)) {
      settingsEditError.value = 'Ya existe una marca con ese nombre'
      return
    }
    editBrandName?.(id, val)
    settingsEditingBrandId.value = null
    settingsEditError.value      = ''
  }

  function handleSettingsDeleteBrand(id) {
    if (deleteBrand) deleteBrand(id)
    settingsEditingBrandId.value = null
    if (!onRenameCat && getCategoryForBrand) {
      const cat = getCategoryForBrand(id)
      if (cat && moveBrands) moveBrands([id], cat.id, null)
    }
  }

  // ─── Inline creation ───────────────────────────────────────────────────────
  const settingsCreatingCat    = ref(false)
  const settingsNewCatValue    = ref('')
  const settingsNewCatError    = ref('')
  const settingsNewCatInputRef = ref(null)

  const settingsCreatingBrand    = ref(false)
  const settingsNewBrandValue    = ref('')
  const settingsNewBrandError    = ref('')
  const settingsNewBrandInputRef = ref(null)

  function startSettingsCreateCat() {
    cancelSettingsEdit()
    settingsCreatingBrand.value  = false
    settingsNewBrandValue.value  = ''
    settingsNewBrandError.value  = ''
    settingsCreatingCat.value    = true
    settingsNewCatValue.value    = ''
    settingsNewCatError.value    = ''
    nextTick(() => settingsNewCatInputRef.value?.focus())
  }

  function cancelSettingsCreateCat() {
    settingsCreatingCat.value = false
    settingsNewCatValue.value = ''
    settingsNewCatError.value = ''
  }

  function confirmSettingsCreateCat() {
    const val = settingsNewCatValue.value.trim()
    if (!val) {
      settingsNewCatError.value = 'El nombre no puede quedar vacío'
      return
    }
    const ok = addCategory?.(val)
    if (!ok) {
      settingsNewCatError.value = 'Ya existe un grupo con ese nombre'
      return
    }
    settingsCreatingCat.value = false
    settingsNewCatValue.value = ''
    settingsNewCatError.value = ''
  }

  function startSettingsCreateBrand() {
    cancelSettingsEdit()
    cancelSettingsCreateCat()
    settingsCreatingBrand.value = true
    settingsNewBrandValue.value = ''
    settingsNewBrandError.value = ''
    nextTick(() => settingsNewBrandInputRef.value?.focus())
  }

  function cancelSettingsCreateBrand() {
    settingsCreatingBrand.value = false
    settingsNewBrandValue.value = ''
    settingsNewBrandError.value = ''
  }

  function confirmSettingsCreateBrand() {
    const val = settingsNewBrandValue.value.trim()
    if (!val) {
      settingsNewBrandError.value = 'El nombre no puede quedar vacío'
      return
    }
    const id = addBrand?.(val)
    if (!id) {
      settingsNewBrandError.value = 'Ya existe una marca con ese nombre'
      return
    }
    settingsCreatingBrand.value = false
    settingsNewBrandValue.value = ''
    settingsNewBrandError.value = ''
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
    // Inline creation state
    settingsCreatingCat,
    settingsNewCatValue,
    settingsNewCatError,
    settingsNewCatInputRef,
    settingsCreatingBrand,
    settingsNewBrandValue,
    settingsNewBrandError,
    settingsNewBrandInputRef,
    // Category handlers
    startSettingsCatEdit,
    confirmSettingsCatRename,
    handleSettingsDeleteCat,
    startSettingsCreateCat,
    cancelSettingsCreateCat,
    confirmSettingsCreateCat,
    // Brand handlers
    startSettingsBrandEdit,
    confirmSettingsBrandRename,
    handleSettingsDeleteBrand,
    startSettingsCreateBrand,
    cancelSettingsCreateBrand,
    confirmSettingsCreateBrand,
    // Shared edit
    cancelSettingsEdit,
  }
}