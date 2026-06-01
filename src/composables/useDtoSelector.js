import { ref, computed } from 'vue'
import { useDiscountsStore } from '../stores/discounts.js'
import { DEFAULT_PRESET }    from '../stores/discounts.js'

export function useDtoSelector(form) {
  const discountsStore      = useDiscountsStore()
  const discountMode        = ref('preset')
  const customDiscountValue = ref('')

  const discountSelectValue = computed(() => discountMode.value === 'custom' ? 'custom' : form.discount)

  function initFromValue(val) {
    const discount = val || DEFAULT_PRESET
    if (discountsStore.discounts.includes(discount)) {
      discountMode.value = 'preset'
    } else {
      discountMode.value        = 'custom'
      customDiscountValue.value = discount
    }
  }

  function onDiscountChange(e) {
    if (e.target.value === 'custom') {
      discountMode.value        = 'custom'
      customDiscountValue.value = ''
      form.discount             = ''
    } else {
      discountMode.value = 'preset'
      form.discount      = e.target.value
    }
  }

  function onCustomDiscountInput(e) {
    // Allow only digits and a single decimal point; strip everything else
    let raw = e.target.value.replace(/[^0-9.]/g, '')

    // Remove extra dots (keep only the first one)
    const dotIndex = raw.indexOf('.')
    if (dotIndex !== -1) {
      raw = raw.slice(0, dotIndex + 1) + raw.slice(dotIndex + 1).replace(/\./g, '')
    }

    // Strip leading zeros before a digit (e.g. "010" → "10"), but allow "0." for decimals
    raw = raw.replace(/^0+(\d)/, '$1')

    // Clamp to 100 if the numeric value exceeds it
    const num = parseFloat(raw)
    if (!isNaN(num) && num > 100) {
      raw = '100'
    }

    // Sync the displayed value and the form only if valid
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
      customDiscountValue.value = String(num)
      form.discount             = String(num)
    }
  }

  function resetDiscountToPreset() {
    discountMode.value        = 'preset'
    form.discount             = DEFAULT_PRESET
    customDiscountValue.value = ''
  }

  return {
    discountMode, customDiscountValue, discountSelectValue,
    initFromValue,
    onDiscountChange, onCustomDiscountInput, onCustomDiscountBlur, resetDiscountToPreset,
  }
}