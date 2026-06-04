import { ref, computed } from 'vue'
import { DEFAULT_PRESET } from '../stores/discounts.js'

export function useDtoSelector(form) {
  const discountMode        = ref('none')
  const customDiscountValue = ref('')

  const discountSelectValue = computed(() => discountMode.value === 'custom' ? 'custom' : 'none')

  function initFromValue(val) {
    const discount = val || DEFAULT_PRESET
    const num = parseFloat(discount)
    if (!discount || discount === '0' || isNaN(num) || num === 0) {
      discountMode.value = 'none'
      customDiscountValue.value = ''
    } else {
      discountMode.value        = 'custom'
      customDiscountValue.value = String(num)
    }
  }

  function onDiscountChange(e) {
    if (e.target.value === 'custom') {
      discountMode.value        = 'custom'
      customDiscountValue.value = ''
      form.discount             = ''
    } else {
      discountMode.value = 'none'
      form.discount      = '0'
    }
  }

  function onCustomDiscountInput(e) {
    let raw = e.target.value.replace(/[^0-9.]/g, '')

    const dotIndex = raw.indexOf('.')
    if (dotIndex !== -1) {
      raw = raw.slice(0, dotIndex + 1) + raw.slice(dotIndex + 1).replace(/\./g, '')
      if (raw.length > dotIndex + 2) {
        raw = raw.slice(0, dotIndex + 2)
      }
    }

    raw = raw.replace(/^0+(\d)/, '$1')

    const num = parseFloat(raw)
    if (!isNaN(num) && num > 100) {
      raw = '100'
    }

    customDiscountValue.value = raw
    e.target.value = raw
    const parsed = parseFloat(raw)
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) form.discount = String(parsed)
  }

  function onCustomDiscountBlur() {
    const num = parseFloat(customDiscountValue.value)
    if (isNaN(num) || num < 1) {
      customDiscountValue.value = '1'
      form.discount             = '1'
    } else if (num > 100) {
      customDiscountValue.value = '100'
      form.discount             = '100'
    } else {
      const rounded = Math.round(num * 10) / 10
      customDiscountValue.value = String(rounded)
      form.discount             = String(rounded)
    }
  }

  function resetDiscountToPreset() {
    discountMode.value        = 'none'
    form.discount             = DEFAULT_PRESET
    customDiscountValue.value = ''
  }

  return {
    discountMode, customDiscountValue, discountSelectValue,
    initFromValue,
    onDiscountChange, onCustomDiscountInput, onCustomDiscountBlur, resetDiscountToPreset,
  }
}