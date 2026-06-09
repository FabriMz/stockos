<template>
  <div class="stock-adjuster" :class="{ 'stock-adjuster--error': error }">
    <div class="stock-adjuster__body">
      <div class="stock-adjuster__left">
        <input
          :id="inputId"
          :name="inputId"
          type="number"
          class="stock-adjuster__value-input"
          :class="{ 'stock-adjuster__value-input--error': error }"
          :value="modelValue"
          @keydown="onKeyDown"
          @input="onInput"
          @change="onInput"
          @blur="onBlur"
          min="0"
          :max="maxStock"
          step="1"
          inputmode="numeric"
          :aria-label="label"
          :aria-invalid="!!error"
        />
        <label :for="inputId" class="stock-adjuster__label">{{ label }}</label>
      </div>
      <span
        v-if="isAtMax"
        class="stock-adjuster__max-hint"
        aria-live="polite"
      >Máximo alcanzado</span>
      <div class="stock-adjuster__controls">
        <button class="stock-adjuster__btn" @click="decrement" aria-label="Restar unidad">−</button>
        <button
          class="stock-adjuster__btn"
          @click="increment"
          aria-label="Sumar unidad"
          :disabled="isAtMax"
        >+</button>
      </div>
    </div>

    <template v-if="showBar">
      <div class="stock-bar stock-bar--full" role="progressbar" :aria-valuenow="pct" aria-valuemin="0"
        aria-valuemax="100">
        <div class="stock-bar__fill" :class="fillClass" :style="{ width: pct + '%' }"></div>
      </div>
      <div class="stock-nums">
        <span>{{ modelValue }} uds.</span>
        <span>cap. {{ max }} uds.</span>
      </div>
    </template>

    <div v-if="hint" class="stock-adjuster__hint">{{ hint }}</div>
    <span v-if="error" class="stock-adjuster__error" role="alert">{{ error }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Number, required: true },
  label: { type: String, default: 'Unidades en stock' },
  hint: { type: String, default: '' },
  max: { type: Number, default: 0 },
  showBar: { type: Boolean, default: false },
  inputId: { type: String, default: 'stock-input' },
  maxStock: { type: Number, default: 99_999 },
  error: { type: String, default: null },
})

const emit = defineEmits(['update:modelValue', 'validate'])

const isAtMax = computed(() => props.modelValue >= props.maxStock)

const pct = computed(() => props.max ? Math.round((props.modelValue / props.max) * 100) : 0)

const fillClass = computed(() => {
  if (props.modelValue === 0) return 'stock-bar__fill--out'
  if (pct.value < 25) return 'stock-bar__fill--low'
  return 'stock-bar__fill--ok'
})

const increment = () => {
  const next = props.modelValue + 1
  if (next <= props.maxStock) emit('update:modelValue', next)
  emit('validate')
}

const decrement = () => {
  emit('update:modelValue', Math.max(0, props.modelValue - 1))
  emit('validate')
}

const BLOCKED_KEYS = ['e', 'E', '+', '-', ',', '.']

const onKeyDown = e => {
  if (BLOCKED_KEYS.includes(e.key)) e.preventDefault()
}

const onBlur = e => {
  if (e.target.value === '' || e.target.value === null) {
    emit('update:modelValue', 0)
    e.target.value = 0
  }
  emit('validate')
}

const onInput = e => {
  const raw = e.target.value.replace(/[^0-9]/g, '')
  if (raw === '') {
    emit('update:modelValue', 0)
    e.target.value = 0
    return
  }
  const val = parseInt(raw, 10)
  if (!isNaN(val) && val >= 0) {
    const clamped = Math.min(val, props.maxStock)
    emit('update:modelValue', clamped)
    e.target.value = clamped
  }
}
</script>