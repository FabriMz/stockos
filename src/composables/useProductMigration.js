import { ref, computed, nextTick } from 'vue'

export function useProductMigration(options) {
  const {
    categorizedGroups,
    existingCats,
    onConfirmMigrate,
    onCancelMigrate = () => {},
    onCreateCategory = null,
  } = options

  const migratingCat       = ref(null)
  const selectedProductIds = ref(new Set())
  const showMigrateSheet   = ref(false)
  const migrateTarget      = ref(null)

  const migrateCreating       = ref(false)
  const migrateNewCatName     = ref('')
  const migrateNewCatError    = ref('')
  const migrateNewCatInputRef = ref(null)

  const migrationTargets = computed(() =>
    existingCats.value.filter(c => c !== migratingCat.value)
  )

  const currentGroupItems = computed(() => {
    if (!migratingCat.value) return []
    const group = categorizedGroups.value.find(
      g => (g.cat ?? '__sin_cat__') === migratingCat.value
    )
    return group?.items ?? []
  })

  const isAllSelected = computed(
    () => currentGroupItems.value.length > 0 &&
      currentGroupItems.value.every(item => selectedProductIds.value.has(item.id))
  )

  function toggleSelectAll() {
    if (isAllSelected.value) {
      selectedProductIds.value = new Set()
    } else {
      selectedProductIds.value = new Set(currentGroupItems.value.map(item => item.id))
    }
  }

  function toggleMigrateMode(cat) {
    if (migratingCat.value === cat) {
      cancelMigrate()
    } else {
      migratingCat.value       = cat
      selectedProductIds.value = new Set()
    }
  }

  function cancelMigrateCreateCat() {
    migrateCreating.value    = false
    migrateNewCatName.value  = ''
    migrateNewCatError.value = ''
  }

  function cancelMigrate() {
    migratingCat.value       = null
    selectedProductIds.value = new Set()
    showMigrateSheet.value   = false
    migrateTarget.value      = null
    cancelMigrateCreateCat()
    onCancelMigrate()
  }

  function toggleProductSelect(id) {
    const s = new Set(selectedProductIds.value)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    selectedProductIds.value = s
  }

  function openMigrateSheet() {
    if (selectedProductIds.value.size === 0) return
    migrateTarget.value    = null
    showMigrateSheet.value = true
  }

  function startMigrateCreateCat() {
    if (!onCreateCategory) return
    migrateCreating.value    = true
    migrateNewCatName.value  = ''
    migrateNewCatError.value = ''
    nextTick(() => migrateNewCatInputRef.value?.focus())
  }

  function handleMigrateCreateCat() {
    if (!onCreateCategory) return
    const n = migrateNewCatName.value.trim()
    if (!n) {
      migrateNewCatError.value = 'El nombre no puede quedar vacío'
      return
    }

    const created = onCreateCategory(n)
    if (!created) {
      migrateNewCatError.value = 'Ya existe una categoría con ese nombre'
      return
    }

    migrateTarget.value = created
    cancelMigrateCreateCat()
  }

  function confirmMigrate() {
    if (!migrateTarget.value) return
    onConfirmMigrate(migrateTarget.value, selectedProductIds.value, migratingCat.value)
    cancelMigrate()
  }

  return {
    migratingCat,
    selectedProductIds,
    showMigrateSheet,
    migrateTarget,
    migrationTargets,
    currentGroupItems,
    isAllSelected,
    migrateCreating,
    migrateNewCatName,
    migrateNewCatError,
    migrateNewCatInputRef,
    toggleSelectAll,
    toggleMigrateMode,
    cancelMigrate,
    toggleProductSelect,
    openMigrateSheet,
    startMigrateCreateCat,
    cancelMigrateCreateCat,
    handleMigrateCreateCat,
    confirmMigrate,
  }
}
