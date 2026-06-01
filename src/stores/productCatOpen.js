import { defineStore } from 'pinia'
import { reactive } from 'vue'

export const useProductCatOpenStore = defineStore('productCatOpen', () => {
  // Clave: `${brandId}:${catName}` → boolean
  const openMap = reactive({})

  function _key(brandId, catName) {
    return `${brandId}:${catName}`
  }

  function isOpen(brandId, catName) {
    const k = _key(brandId, catName)
    // Por defecto abierto si no hay registro previo
    return k in openMap ? openMap[k] : true
  }

  function toggle(brandId, catName) {
    const k = _key(brandId, catName)
    openMap[k] = !isOpen(brandId, catName)
  }

  function setOpen(brandId, catName, value) {
    openMap[_key(brandId, catName)] = value
  }

  function setAllForBrand(brandId, catNames, value) {
    catNames.forEach(name => {
      openMap[_key(brandId, name)] = value
    })
  }

  return { isOpen, toggle, setOpen, setAllForBrand }
})