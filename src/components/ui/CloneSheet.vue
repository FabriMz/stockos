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
                <span :class="['badge', expiryBadgeClass(batch.expiry)]">{{ expiryBadgeLabel(batch.expiry) }}</span>
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
                />
                <span v-if="showErrors && !form.expiry" class="form-hint form-hint--error">Requerido</span>
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
import { formatExpiry, expiryBadgeClass, expiryBadgeLabel } from '../../utils/alerts.js'

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
    form.value = {
      batchNumber: props.editBatch.batchNumber,
      expiry:      props.editBatch.expiry ? props.editBatch.expiry + '-01' : '',
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
  if (isEditMode.value)  return 'Modificá el número o la fecha de vencimiento'
  if (isCloneMode.value) return batchFoldersMeta.value.length > 0
    ? 'Elegí un lote existente o creá uno nuevo'
    : 'Asigná el lote de la carga que llegó'
  return 'Creá un lote vacío y asignale productos después'
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
    return form.value.batchNumber.trim() !== '' && !!form.value.expiry && !isDuplicateName.value
  }
  if (isCloneMode.value && selectedOption.value !== '_new') {
    return true
  }
  return form.value.batchNumber.trim() !== '' && !!form.value.expiry && !isDuplicateName.value
}

function handleConfirm() {
  if (!isFormValid()) {
    showErrors.value = true
    return
  }

  if (isEditMode.value) {
    emit('confirm', { batchNumber: form.value.batchNumber, expiry: form.value.expiry.slice(0, 7) })
    return
  }

  if (isCloneMode.value) {
    if (selectedOption.value !== '_new') {
      emit('confirm', { batchNumber: selectedOption.value, stock: form.value.stock })
    } else {
      emit('confirm', {
        batchNumber: form.value.batchNumber,
        expiry:      form.value.expiry.slice(0, 7),
        stock:       form.value.stock,
      })
    }
    return
  }

  emit('confirm', { batchNumber: form.value.batchNumber, expiry: form.value.expiry.slice(0, 7) })
}
</script>