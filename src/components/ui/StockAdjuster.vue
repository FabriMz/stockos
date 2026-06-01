<template>
  <div class="stock-adjuster">
    <div class="stock-adjuster__header">
      <span class="stock-adjuster__label">{{ label }}</span>
      <span class="stock-adjuster__value">{{ modelValue }} uds.</span>
    </div>

    <template v-if="showBar">
      <div
        class="stock-bar stock-bar--full"
        role="progressbar"
        :aria-valuenow="pct"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div class="stock-bar__fill" :class="fillClass" :style="{ width: pct + '%' }"></div>
      </div>
      <div class="stock-nums">
        <span>{{ modelValue }} uds.</span>
        <span>cap. {{ max }} uds.</span>
      </div>
    </template>

    <div v-if="hint" class="stock-adjuster__hint">{{ hint }}</div>

    <div class="stock-adjuster__controls">
      <button class="stock-adjuster__btn" @click="decrement" aria-label="Restar unidad">−</button>
      <input
        :id="inputId"
        :name="inputId"
        type="number"
        class="stock-adjuster__input"
        :value="modelValue"
        @input="onInput"
        @change="onInput"
        min="0"
        inputmode="numeric"
        :aria-label="label"
      />
      <button class="stock-adjuster__btn" @click="increment" aria-label="Sumar unidad">+</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Number, required: true },
  label:      { type: String, default: 'Unidades en stock' },
  hint:       { type: String, default: '' },
  max:        { type: Number, default: 0 },
  showBar:    { type: Boolean, default: false },
  inputId:    { type: String, default: 'stock-input' },
})

const emit  = defineEmits(['update:modelValue'])

const pct = computed(() => props.max ? Math.round((props.modelValue / props.max) * 100) : 0)

const fillClass = computed(() => {
  if (props.modelValue === 0) return 'stock-bar__fill--out'
  if (pct.value < 25)         return 'stock-bar__fill--low'
  return 'stock-bar__fill--ok'
})

const increment = () => emit('update:modelValue', props.modelValue + 1)
const decrement = () => emit('update:modelValue', Math.max(0, props.modelValue - 1))
const onInput   = e  => {
  const val = parseInt(e.target.value)
  if (!isNaN(val) && val >= 0) emit('update:modelValue', val)
}
</script>