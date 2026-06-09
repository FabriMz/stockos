<template>
  <div class="alert-search">
    <i class="ti ti-search" aria-hidden="true"></i>
    <input :id="inputId" :name="inputId" type="search" :placeholder="placeholder" :aria-label="placeholder"
      :value="modelValue" @input="emit('update:modelValue', $event.target.value)" />
    <button v-if="modelValue" class="alert-search__clear" type="button" @click="emit('update:modelValue', '')"
      aria-label="Limpiar búsqueda">
      <i class="ti ti-x" aria-hidden="true"></i>
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Buscar en alertas…' },
  inputId: { type: String, default: 'alert-search' },
})

const emit = defineEmits(['update:modelValue'])
</script>
