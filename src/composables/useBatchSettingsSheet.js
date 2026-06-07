import { ref, computed, nextTick } from 'vue'

/**
 * Encapsula el estado y la lógica del sheet de Ajustes de Lotes.
 * Extrae el bloque inline que vivía en BrandCatalog.vue.
 *
 * @param config  - {
 *                    getSortedFolders: () => folder[]  — lista ordenada de carpetas
 *                    getFoldersMeta:   () => meta[]    — para validar duplicados en rename
 *                    renameFolder:     (oldNum, newNum, expiry) => void
 *                    deleteFolder:     (batchNumber) => void
 *                  }
 * @param options - {
 *                    onDelete?: (batchNumber) => void  — side-effect adicional al borrar
 *                  }
 */
export function useBatchSettingsSheet(config, options = {}) {
  const { getSortedFolders, getFoldersMeta, renameFolder, deleteFolder } = config
  const { onDelete } = options

  // ─── Visibility & search ──────────────────────────────────────────────────
  const showBatchSettingsSheet   = ref(false)
  const batchSettingsSearchQuery = ref('')

  // ─── Inline edit state ────────────────────────────────────────────────────
  const batchSettingsEditingId  = ref(null)
  const batchSettingsEditValue  = ref('')
  const batchSettingsEditError  = ref('')
  const batchSettingsInputRefs  = ref({})

  // ─── Filtered computed ────────────────────────────────────────────────────
  const filteredBatchSettingsFolders = computed(() => {
    const q = batchSettingsSearchQuery.value.trim().toLowerCase()
    const ordered = getSortedFolders()
    if (!q) return ordered
    return ordered.filter(f => f.batchNumber.toLowerCase().includes(q))
  })

  // ─── Open / close ─────────────────────────────────────────────────────────
  function openBatchSettingsSheet() {
    showBatchSettingsSheet.value = true
  }

  function closeBatchSettingsSheet() {
    showBatchSettingsSheet.value   = false
    batchSettingsSearchQuery.value = ''
    cancelBatchSettingsEdit()
  }

  // ─── Inline edit ──────────────────────────────────────────────────────────
  function startBatchSettingsEdit(folder) {
    batchSettingsEditingId.value = folder.batchNumber
    batchSettingsEditValue.value = folder.batchNumber
    batchSettingsEditError.value = ''
    nextTick(() => batchSettingsInputRefs.value[folder.batchNumber]?.focus())
  }

  function cancelBatchSettingsEdit() {
    batchSettingsEditingId.value = null
    batchSettingsEditValue.value = ''
    batchSettingsEditError.value = ''
  }

  function confirmBatchSettingsRename(oldBatchNumber) {
    const val = batchSettingsEditValue.value.trim()
    if (!val) {
      batchSettingsEditError.value = 'El nombre no puede quedar vacío'
      return
    }
    if (val === oldBatchNumber) { cancelBatchSettingsEdit(); return }
    if (getFoldersMeta().some(f => f.batchNumber === val)) {
      batchSettingsEditError.value = 'Ya existe un lote con ese nombre'
      return
    }
    const folder = getSortedFolders().find(f => f.batchNumber === oldBatchNumber)
    if (!folder) return
    renameFolder(oldBatchNumber, { batchNumber: val, expiry: folder.expiry })
    cancelBatchSettingsEdit()
  }

  function handleBatchSettingsDelete(batchNumber) {
    if (onDelete) onDelete(batchNumber)
    deleteFolder(batchNumber)
    batchSettingsEditingId.value = null
  }

  return {
    // Visibility
    showBatchSettingsSheet,
    openBatchSettingsSheet,
    closeBatchSettingsSheet,
    // Search
    batchSettingsSearchQuery,
    // Computed
    filteredBatchSettingsFolders,
    // Edit state
    batchSettingsEditingId,
    batchSettingsEditValue,
    batchSettingsEditError,
    batchSettingsInputRefs,
    // Handlers
    startBatchSettingsEdit,
    cancelBatchSettingsEdit,
    confirmBatchSettingsRename,
    handleBatchSettingsDelete,
  }
}