<template>
  <Transition name="sheet">
    <div
      v-if="modelValue"
      class="sheet-overlay"
      role="dialog"
      :aria-label="sheetAriaLabel"
      @click.self="emit('cancel')"
    >
      <div class="sheet">
        <div class="sheet__handle" aria-hidden="true"></div>

        <div class="sheet__header">
          <div class="sheet__title">{{ sheetTitle }}</div>
          <div class="sheet__sub">{{ sheetSub }}</div>
        </div>

        <div v-if="isCloneMode" class="sheet__preview">
          <div class="sheet__preview-icon" :style="{ background: product?.bg }">
            <i :class="`ti ${product?.ic}`" :style="{ color: product?.col }" aria-hidden="true"></i>
          </div>
          <div>
            <div class="sheet__preview-name">{{ product?.name }}</div>
            <div class="sheet__preview-sku">{{ product?.sku }} · {{ product?.brand }}</div>
          </div>
        </div>

        <div class="sheet__body">

          <template v-if="isCloneMode && batchFoldersMeta.length > 0">
            <div class="sheet__section-label" id="batch-selector-label">Seleccioná el lote</div>
            <div class="sheet__batch-list" role="listbox" aria-labelledby="batch-selector-label">
              <button
                v-for="batch in batchFoldersMeta"
                :key="batch.batchNumber"
                class="sheet__batch-option"
                :class="{ 'sheet__batch-option--active': selectedOption === batch.batchNumber }"
                role="option"
                :aria-selected="selectedOption === batch.batchNumber"
                @click="selectedOption = batch.batchNumber"
              >
                <div class="sheet__batch-option-body">
                  <span class="sheet__batch-option-name">{{ batch.batchNumber }}</span>
                  <span class="sheet__batch-option-meta">vence {{ formatExpiry(batch.expiry) }}</span>
                </div>
                <span :class="['badge', expiryBadgeClass(batch.expiry)]"><i :class="`ti ${expiryBadgeIcon(batch.expiry)}`" aria-hidden="true"></i>{{ expiryBadgeLabel(batch.expiry) }}</span>
              </button>

              <button
                class="sheet__batch-option sheet__batch-option--new"
                :class="{ 'sheet__batch-option--active': selectedOption === '_new' }"
                role="option"
                :aria-selected="selectedOption === '_new'"
                @click="selectedOption = '_new'"
              >
                <div class="sheet__batch-option-body sheet__batch-option-body--row">
                  <i class="ti ti-folder-plus" aria-hidden="true"></i>
                  <span class="sheet__batch-option-name">Crear nuevo lote</span>
                </div>
              </button>
            </div>
          </template>

          <template v-if="showNameExpiry">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="clone-batch">Nro. de lote</label>
                <input
                  id="clone-batch"
                  name="clone-batch"
                  class="form-input"
                  v-model="form.batchNumber"
                  placeholder="Ej: L2504-D"
                  autocomplete="off"
                />
                <span v-if="showErrors && !form.batchNumber.trim()" class="form-hint form-hint--error">Requerido</span>
                <span v-else-if="showErrors && isDuplicateName" class="form-hint form-hint--error">Ya existe un lote con ese nombre</span>
              </div>
              <div class="form-group">
                <label class="form-label" for="clone-expiry">Vencimiento</label>
                <input
                  id="clone-expiry"
                  name="clone-expiry"
                  type="date"
                  class="form-input"
                  v-model="form.expiry"
                  :min="todayIso"
                  @input="handleExpiryInput"
                />
                <span v-if="showErrors && !form.expiry" class="form-hint form-hint--error">Requerido</span>
                <span v-else-if="form.expiry && expiryYearError" class="form-hint form-hint--error">{{ expiryYearError }}</span>
              </div>
            </div>
          </template>

          <div v-if="isCloneMode" class="form-group">
            <label class="form-label" for="clone-stock">Stock inicial</label>
            <input
              id="clone-stock"
              name="clone-stock"
              type="number"
              min="0"
              class="form-input"
              v-model.number="form.stock"
              placeholder="0"
            />
            <span class="form-hint">Unidades que llegaron en esta carga</span>
          </div>

        </div>

        <div class="btn-group btn-group--row">
          <button class="btn btn--secondary" @click="emit('cancel')">Cancelar</button>
          <button class="btn btn--primary" @click="handleConfirm">
            <i :class="`ti ${confirmIcon}`" aria-hidden="true"></i>
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useProductsStore } from '../../stores/products.js'
import { formatExpiry, expiryBadgeClass, expiryBadgeLabel, expiryBadgeIcon } from '../../utils/alerts.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  product:    { type: Object,  default: null },
  editBatch:  { type: Object,  default: null },
})

const emit = defineEmits(['confirm', 'cancel'])

const store = useProductsStore()
const { batchFoldersMeta } = storeToRefs(store)

const isCloneMode  = computed(() => !!props.product && !props.editBatch)
const isCreateMode = computed(() => !props.product && !props.editBatch)
const isEditMode   = computed(() => !!props.editBatch)

// Fecha mínima para el input de vencimiento (hoy en YYYY-MM-DD local)
const todayIso = new Date().toLocaleDateString('en-CA')

// Rango de años válidos para vencimiento
const MIN_EXPIRY_YEAR = 2000
const MAX_EXPIRY_YEAR = 2100

/**
 * Devuelve el mensaje de error si el año está fuera del rango [2000, 2100].
 * Devuelve null si el valor está vacío o el año es válido.
 */
const expiryYearError = computed(() => {
  const val = form.value.expiry
  if (!val) return null
  const year = parseInt(val.split('-')[0], 10)
  if (year < MIN_EXPIRY_YEAR || year > MAX_EXPIRY_YEAR) {
    return `Escribe un año entre ${MIN_EXPIRY_YEAR} y ${MAX_EXPIRY_YEAR}`
  }
  return null
})

const selectedOption = ref('_new')
const form           = ref({ batchNumber: '', expiry: '', stock: 0 })
const showErrors     = ref(false)

const showNameExpiry = computed(() => {
  if (isEditMode.value || isCreateMode.value) return true
  return selectedOption.value === '_new'
})

const isDuplicateName = computed(() => {
  const num = form.value.batchNumber.trim()
  if (!num) return false
  const editingNum = isEditMode.value ? props.editBatch?.batchNumber : null
  return batchFoldersMeta.value.some(
    f => f.batchNumber === num && f.batchNumber !== editingNum
  )
})

watch(() => props.modelValue, open => {
  if (!open) return
  showErrors.value = false
  if (isEditMode.value) {
    const rawExpiry = props.editBatch.expiry ?? ''
    // Si ya tiene día (YYYY-MM-DD) lo usamos directo; si es legado YYYY-MM añadimos -01
    const dateInputValue = rawExpiry && rawExpiry.split('-').length === 2
      ? rawExpiry + '-01'
      : rawExpiry
    form.value = {
      batchNumber: props.editBatch.batchNumber,
      expiry:      dateInputValue,
      stock:       0,
    }
  } else {
    form.value = { batchNumber: '', expiry: '', stock: 0 }
    selectedOption.value = batchFoldersMeta.value.length > 0
      ? batchFoldersMeta.value[0].batchNumber
      : '_new'
  }
})

const sheetTitle = computed(() => {
  if (isEditMode.value)  return 'Editar lote'
  if (isCloneMode.value) return 'Clonar a lote'
  return 'Nuevo lote'
})

const sheetSub = computed(() => {
  if (isEditMode.value)  return 'Modifica el número o la fecha de vencimiento'
  if (isCloneMode.value) return batchFoldersMeta.value.length > 0
    ? 'Elige un lote existente o crea uno nuevo'
    : 'Asigna el lote de la carga que llegó'
  return 'Crea un lote vacío y asígnale productos después'
})

const sheetAriaLabel = computed(() => {
  if (isEditMode.value)  return `Editar lote ${props.editBatch?.batchNumber}`
  if (isCloneMode.value) return `Clonar ${props.product?.name} a lote`
  return 'Nuevo lote'
})

const confirmIcon = computed(() =>
  isEditMode.value ? 'ti-device-floppy' : 'ti-folder-plus'
)

const confirmLabel = computed(() => {
  if (isEditMode.value)  return 'Guardar cambios'
  if (isCloneMode.value) return selectedOption.value === '_new' ? 'Crear lote y clonar' : 'Agregar al lote'
  return 'Crear lote'
})

function isFormValid() {
  if (isEditMode.value) {
    return form.value.batchNumber.trim() !== '' && !!form.value.expiry && !expiryYearError.value && !isDuplicateName.value
  }
  if (isCloneMode.value && selectedOption.value !== '_new') {
    return true
  }
  return form.value.batchNumber.trim() !== '' && !!form.value.expiry && !expiryYearError.value && !isDuplicateName.value
}

/**
 * Valida que el año tenga máximo 4 dígitos.
 * Si el usuario intenta escribir más dígitos, los trunca.
 */
function handleExpiryInput() {
  const val = form.value.expiry
  if (!val) return
  
  const parts = val.split('-')
  if (parts.length !== 3) return
  
  const [year, month, day] = parts
  
  // Si el año tiene más de 4 dígitos, truncar a 4
  if (year.length > 4) {
    form.value.expiry = `${year.substring(0, 4)}-${month}-${day}`
  }
}

function handleConfirm() {
  if (!isFormValid()) {
    showErrors.value = true
    return
  }

  if (isEditMode.value) {
    emit('confirm', { batchNumber: form.value.batchNumber, expiry: form.value.expiry })
    return
  }

  if (isCloneMode.value) {
    if (selectedOption.value !== '_new') {
      emit('confirm', { batchNumber: selectedOption.value, stock: form.value.stock })
    } else {
      emit('confirm', {
        batchNumber: form.value.batchNumber,
        expiry:      form.value.expiry,
        stock:       form.value.stock,
      })
    }
    return
  }

  emit('confirm', { batchNumber: form.value.batchNumber, expiry: form.value.expiry })
}
</script>