import { defineStore, storeToRefs } from 'pinia'
import { ref, computed, watch } from 'vue'
import { brandsData }         from '../data/brands.js'
import { productsData }       from '../data/products.js'
import { useUndo }            from '../composables/useUndo.js'
import { useAlerts }          from '../composables/useAlerts.js'
import { useCategoriesStore } from './categories.js'

const STORAGE_KEY = 'stockos_v1'

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function getDefaultCatalogExpiry() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function saveState(products, brands, catalogExpiry, batches, batchFoldersMeta, brandProductCategories) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ products, brands, catalogExpiry, batches, batchFoldersMeta, brandProductCategories, _seeded: true }))
  } catch {}
}

function deriveBatchFoldersMeta(batches) {
  const map = {}
  batches.forEach(b => {
    if (!map[b.batchNumber]) map[b.batchNumber] = { batchNumber: b.batchNumber, expiry: b.expiry }
  })
  return Object.values(map)
}

// Migra formato antiguo { bid, batchNumber, expiry } → { batchNumber, expiry } deduplicando por nombre
function migrateBatchFoldersMeta(raw) {
  const map = {}
  raw.forEach(f => {
    if (!map[f.batchNumber]) map[f.batchNumber] = { batchNumber: f.batchNumber, expiry: f.expiry }
  })
  return Object.values(map)
}

export const useProductsStore = defineStore('products', () => {

  // ─── Estado ──────────────────────────────────────────────────────────────────
  const saved          = loadState()
  const brands         = ref(saved?._seeded ? saved.brands : brandsData)
  const products       = ref(saved?._seeded ? saved.products : productsData)
  const catalogExpiry  = ref(saved?._seeded && typeof saved.catalogExpiry === 'string'
    ? saved.catalogExpiry
    : getDefaultCatalogExpiry())
  const batches          = ref(saved?._seeded && Array.isArray(saved.batches) ? saved.batches : [])
  const batchFoldersMeta = ref(
    saved?._seeded && Array.isArray(saved.batchFoldersMeta)
      ? migrateBatchFoldersMeta(saved.batchFoldersMeta)
      : (saved?._seeded && Array.isArray(saved.batches) ? deriveBatchFoldersMeta(saved.batches) : [])
  )

  // brandProductCategories: { [brandId]: string[] }
  const brandProductCategories = ref(
    saved?._seeded && saved.brandProductCategories
      ? saved.brandProductCategories
      : {}
  )

  watch(
    [products, brands, catalogExpiry, batches, batchFoldersMeta, brandProductCategories],
    () => saveState(products.value, brands.value, catalogExpiry.value, batches.value, batchFoldersMeta.value, brandProductCategories.value),
    { deep: true }
  )

  // ─── Getters ─────────────────────────────────────────────────────────────────
  const getBrand   = id  => brands.value.find(b => b.id === id)
  const getProduct = id  => products.value.find(p => p.id === Number(id))
  const getByBrand = bid => products.value.filter(p => p.bid === bid && !p._batchOnly)

  const getBatchesByBrand = bid =>
    batches.value.filter(b => b.bid === bid)

  const getBatchItemsByBrand = (bid, batchNumber) =>
    batches.value.filter(b => b.bid === bid && b.batchNumber === batchNumber)

  function _buildFolderFromMeta(meta) {
    const items = batches.value.filter(b => b.batchNumber === meta.batchNumber)
    const brandMap = {}
    items.forEach(b => {
      if (!brandMap[b.bid]) brandMap[b.bid] = []
      brandMap[b.bid].push(b)
    })
    const brandGroups = Object.entries(brandMap)
      .map(([bid, bItems]) => ({ brand: brands.value.find(br => br.id === bid), items: bItems }))
      .filter(g => g.brand)
      .sort((a, b) => a.brand.name.localeCompare(b.brand.name, 'es'))
    return { batchNumber: meta.batchNumber, expiry: meta.expiry, brandGroups }
  }

  const getAllBatchFolders = () =>
    batchFoldersMeta.value
      .map(_buildFolderFromMeta)
      .sort((a, b) => (a.expiry > b.expiry ? 1 : -1))

  const getBatchFolder = batchNumber => {
    const meta = batchFoldersMeta.value.find(f => f.batchNumber === batchNumber)
    return meta ? _buildFolderFromMeta(meta) : null
  }

  // ─── Alertas (composable, sin estado propio) ─────────────────────────────────
  const alertHelpers = useAlerts(products, brands)

  // ─── UNDO: Producto ──────────────────────────────────────────────────────────
  const { pending: pendingDelete, mark: _markProd, take: _takeProd, confirm: confirmDelete } = useUndo()

  function markDelete(id) {
    const idx = products.value.findIndex(p => p.id === Number(id))
    if (idx === -1) return
    const prod = products.value[idx]
    let _batchItem = null
    if (prod._batchOnly) {
      const item = batches.value.find(b => b.productId === Number(id))
      if (item) {
        _batchItem = { ...item }
        batches.value = batches.value.filter(b => b.productId !== Number(id))
      }
    }
    const snapshot = { ...prod, _idx: idx, _batchItem }
    products.value.splice(idx, 1)
    brands.value.forEach(b => { b.prods = b.prods.filter(pid => pid !== Number(id)) })
    _markProd(snapshot)
  }

  function undoDelete() {
    const snapshot = _takeProd()
    if (!snapshot) return
    const { _idx, _batchItem, ...prod } = snapshot
    products.value.splice(_idx, 0, prod)
    if (!prod._batchOnly) {
      const brand = brands.value.find(b => b.id === prod.bid)
      if (brand && !brand.prods.includes(prod.id)) brand.prods.push(prod.id)
    } else if (_batchItem) {
      batches.value.push(_batchItem)
    }
  }

  // ─── UNDO: Marca ─────────────────────────────────────────────────────────────
  const { pending: pendingDeleteBrand, mark: _markBrand, take: _takeBrand, confirm: confirmDeleteBrand } = useUndo()

  function markDeleteBrand(id) {
    const idx = brands.value.findIndex(b => b.id === id)
    if (idx === -1) return
    const brand = brands.value[idx]
    const affectedProds = products.value
      .filter(p => p.bid === id)
      .map(p => ({ id: p.id, bid: p.bid, brand: p.brand }))
    products.value.forEach(p => {
      if (p.bid === id) { p.bid = null; p.brand = 'Sin marca' }
    })
    brands.value.splice(idx, 1)
    _markBrand({ ...brand, _idx: idx, _affectedProds: affectedProds })
  }

  function undoDeleteBrand() {
    const snapshot = _takeBrand()
    if (!snapshot) return
    const { _idx, _affectedProds, ...brand } = snapshot
    brands.value.splice(_idx, 0, brand)
    _affectedProds.forEach(({ id, bid, brand: brandName }) => {
      const p = products.value.find(p => p.id === id)
      if (p) { p.bid = bid; p.brand = brandName }
    })
  }

  // ─── CRUD: Marcas ─────────────────────────────────────────────────────────────
  function addBrand(name) {
    const n = name.trim()
    if (!n) return
    const id = n.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
    if (brands.value.find(b => b.id === id)) return
    brands.value.push({ id, name: n, origin: '', ic: 'ti-box', bg: '#F0EAE4', col: '#791132', prods: [] })
    return id
  }

  function deleteBrand(id) {
    const brand = brands.value.find(b => b.id === id)
    if (!brand || brand.prods.length > 0) return
    brands.value = brands.value.filter(b => b.id !== id)
  }

  function editBrandName(id, newName) {
    const name = newName.trim()
    if (!name) return
    const brand = brands.value.find(b => b.id === id)
    if (!brand || brand.name === name) return
    if (brands.value.some(b => b.id !== id && b.name === name)) return
    brand.name = name
    products.value.forEach(p => {
      if (p.bid === id) p.brand = name
    })
  }

  function editCategory(oldName, newName) {
    const name = newName.trim()
    if (!name || name === oldName) return
    if (catsStore.categories.value.includes(name)) return
    catsStore.editCategory(oldName, name)
    products.value.forEach(p => {
      if (p.category === oldName) p.category = name
    })
  }

  const sortedBrands = computed(() =>
    [...brands.value].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  )

  // ─── CRUD: Productos ──────────────────────────────────────────────────────────
  function updateStock(id, qty) {
    const p = products.value.find(p => p.id === Number(id))
    if (p) p.stock = Number(qty)
  }

  function addProduct(prod) {
    const newId = Math.max(...products.value.map(p => p.id)) + 1
    products.value.push({ ...prod, id: newId })
    const brand = brands.value.find(b => b.id === prod.bid)
    if (brand) brand.prods.push(newId)
  }

  function editProduct(id, data) {
    const idx = products.value.findIndex(p => p.id === Number(id))
    if (idx === -1) return
    const old = products.value[idx]
    if (data.bid && data.bid !== old.bid) {
      const oldBrand = brands.value.find(b => b.id === old.bid)
      if (oldBrand) oldBrand.prods = oldBrand.prods.filter(pid => pid !== Number(id))
      const newBrand = brands.value.find(b => b.id === data.bid)
      if (newBrand) {
        if (!newBrand.prods.includes(Number(id))) newBrand.prods.push(Number(id))
        data.brand = newBrand.name
      }
    }
    products.value[idx] = { ...old, ...data }
  }

  // ─── CRUD: Lotes ──────────────────────────────────────────────────────────────
  function addEmptyBatchFolder(batchNumber, expiry) {
    const num = batchNumber.trim()
    if (!num || !expiry) return
    if (batchFoldersMeta.value.find(f => f.batchNumber === num)) return
    batchFoldersMeta.value.push({ batchNumber: num, expiry })
  }

  function cloneToBatch(product, { batchNumber, expiry, stock }) {
    const num = batchNumber.trim()
    if (!num) return
    let folder = batchFoldersMeta.value.find(f => f.batchNumber === num)
    if (!folder) {
      if (!expiry) return
      folder = { batchNumber: num, expiry }
      batchFoldersMeta.value.push(folder)
    }
    const resolvedExpiry = folder.expiry
    const newId = Math.max(0, ...products.value.map(p => p.id)) + 1
    products.value.push({ ...product, id: newId, stock: Number(stock), expiry: resolvedExpiry, batch: num, _batchOnly: true })
    const id = `batch_${Date.now()}_${product.id}`
    batches.value.push({ id, productId: newId, bid: product.bid, batchNumber: num, expiry: resolvedExpiry, stock: Number(stock) })
  }

  // ─── UNDO: Item de lote ───────────────────────────────────────────────────────
  const { pending: pendingDeleteBatchItem, mark: _markBatchItem, take: _takeBatchItem, confirm: confirmDeleteBatchItem } = useUndo()

  function markDeleteBatchItem(id) {
    const item = batches.value.find(b => b.id === id)
    if (!item) return
    const cloned = products.value.find(p => p.id === item.productId && p._batchOnly)
    const snapshot = { ...item, _clonedProduct: cloned ? { ...cloned } : null }
    products.value = products.value.filter(p => !(p.id === item.productId && p._batchOnly))
    batches.value = batches.value.filter(b => b.id !== id)
    _markBatchItem(snapshot)
  }

  function undoDeleteBatchItem() {
    const snapshot = _takeBatchItem()
    if (!snapshot) return
    const { _clonedProduct, ...batchItem } = snapshot
    batches.value.push(batchItem)
    if (_clonedProduct) products.value.push(_clonedProduct)
  }

  function editBatchFolder(oldBatchNumber, { batchNumber, expiry }) {
    const num = batchNumber.trim()
    if (!num || !expiry) return
    batches.value.forEach(b => {
      if (b.batchNumber === oldBatchNumber) {
        b.batchNumber = num
        b.expiry = expiry
        const cloned = products.value.find(p => p.id === b.productId && p._batchOnly)
        if (cloned) {
          cloned.batch = num
          cloned.expiry = expiry
        }
      }
    })
    const meta = batchFoldersMeta.value.find(f => f.batchNumber === oldBatchNumber)
    if (meta) { meta.batchNumber = num; meta.expiry = expiry }
  }

  // ─── UNDO: Lote (carpeta completa) ───────────────────────────────────────────
  const { pending: pendingDeleteBatchFolder, mark: _markBatchFolder, take: _takeBatchFolder, confirm: confirmDeleteBatchFolder } = useUndo()

  function markDeleteBatchFolder(batchNumber) {
    const meta = batchFoldersMeta.value.find(f => f.batchNumber === batchNumber)
    if (!meta) return
    const toDelete = batches.value.filter(b => b.batchNumber === batchNumber)
    const snapshot = {
      folderMeta: { ...meta },
      items: toDelete.map(b => {
        const cloned = products.value.find(p => p.id === b.productId && p._batchOnly)
        return { ...b, _clonedProduct: cloned ? { ...cloned } : null }
      }),
    }
    toDelete.forEach(b => {
      products.value = products.value.filter(p => !(p.id === b.productId && p._batchOnly))
    })
    batches.value = batches.value.filter(b => b.batchNumber !== batchNumber)
    batchFoldersMeta.value = batchFoldersMeta.value.filter(f => f.batchNumber !== batchNumber)
    _markBatchFolder(snapshot)
  }

  function undoDeleteBatchFolder() {
    const snapshot = _takeBatchFolder()
    if (!snapshot) return
    const { folderMeta, items } = snapshot
    if (folderMeta) batchFoldersMeta.value.push(folderMeta)
    items.forEach(b => {
      const { _clonedProduct, ...batchItem } = b
      batches.value.push(batchItem)
      if (_clonedProduct) products.value.push(_clonedProduct)
    })
  }

  // ─── UI: toast de edición exitosa ─────────────────────────────────────────────
  const productUpdated = ref(false)
  let updatedTimer = null

  function setProductUpdated() {
    clearTimeout(updatedTimer)
    productUpdated.value = true
    updatedTimer = setTimeout(() => { productUpdated.value = false }, 3000)
  }

  // ─── Catálogo: Vigencia persistente ─────────────────────────────────────────────────────
  function setCatalogExpiry(value) {
    catalogExpiry.value = value
  }

  // ─── Categorías por marca ─────────────────────────────────────────────────────

  const { pending: pendingDeleteProductCat, mark: _markProductCat, take: _takeProductCat, confirm: confirmDeleteProductCat } = useUndo()

  function getCategoriesForBrand(brandId) {
    const list = brandProductCategories.value[brandId]
    if (!Array.isArray(list)) return []
    return [...list].sort((a, b) => a.localeCompare(b, 'es'))
  }

  function addCategoryToBrand(brandId, name) {
    const n = name.trim()
    if (!n) return false
    if (!brandProductCategories.value[brandId]) {
      brandProductCategories.value[brandId] = []
    }
    if (brandProductCategories.value[brandId].includes(n)) return false
    brandProductCategories.value[brandId].push(n)
    return true
  }

  function renameCategoryInBrand(brandId, oldName, newName) {
    const n = newName.trim()
    if (!n || n === oldName) return
    // Renombrar en la lista de categorías de la marca
    const list = brandProductCategories.value[brandId]
    if (Array.isArray(list)) {
      const idx = list.indexOf(oldName)
      if (idx !== -1) list[idx] = n
    }
    // Propagar a productos
    products.value.forEach(p => {
      if (p.bid === brandId && p.category === oldName) p.category = n
    })
  }

  function markDeleteCategoryInBrand(brandId, catName) {
    // Guardar ids afectados para undo
    const affectedIds = products.value
      .filter(p => p.bid === brandId && p.category === catName)
      .map(p => p.id)
    // Limpiar de productos
    products.value.forEach(p => {
      if (p.bid === brandId && p.category === catName) p.category = ''
    })
    // Quitar de la lista de categorías de la marca
    const list = brandProductCategories.value[brandId]
    if (Array.isArray(list)) {
      const idx = list.indexOf(catName)
      if (idx !== -1) list.splice(idx, 1)
    }
    _markProductCat({ brandId, catName, affectedIds })
  }

  function undoDeleteCategoryInBrand() {
    const snap = _takeProductCat()
    if (!snap) return
    // Restaurar categoría en la lista de la marca
    if (!brandProductCategories.value[snap.brandId]) {
      brandProductCategories.value[snap.brandId] = []
    }
    if (!brandProductCategories.value[snap.brandId].includes(snap.catName)) {
      brandProductCategories.value[snap.brandId].push(snap.catName)
    }
    // Restaurar en productos
    products.value.forEach(p => {
      if (snap.affectedIds.includes(p.id)) p.category = snap.catName
    })
  }

  // ─── Fachada: Categorías (re-exportadas desde useCategoriesStore) ─────────────
  const catsStore = useCategoriesStore()
  const {
    categories,
    sortedCategories,
    pendingDeleteCategory,
  } = storeToRefs(catsStore)

  /**
   * Elimina la categoría y propaga a productos: los que la tenían quedan sin categoría.
   * Guarda los ids afectados para poder restaurar en undo.
   */
  function markDeleteCategory(name) {
    const affectedIds = products.value
      .filter(p => p.category === name)
      .map(p => p.id)
    products.value.forEach(p => {
      if (p.category === name) p.category = ''
    })
    catsStore.markDeleteCategory(name, affectedIds)
  }

  /**
   * Restaura la categoría eliminada y re-asigna a los productos afectados.
   */
  function undoDeleteCategory() {
    catsStore.undoDeleteCategory((affectedIds, restoredName) => {
      products.value.forEach(p => {
        if (affectedIds.includes(p.id)) p.category = restoredName
      })
    })
  }

  return {
    // Estado
    brands, products, catalogExpiry, batches, batchFoldersMeta,
    // Getters
    getBrand, getProduct, getByBrand,
    getBatchesByBrand, getBatchItemsByBrand, getAllBatchFolders, getBatchFolder,
    // Alertas (de useAlerts)
    ...alertHelpers,
    // Marcas
    addBrand, deleteBrand, sortedBrands,
    pendingDeleteBrand, markDeleteBrand, undoDeleteBrand, confirmDeleteBrand,
    // Productos CRUD
    updateStock, addProduct, editProduct,
    // Productos undo
    pendingDelete, markDelete, undoDelete, confirmDelete,
    // Lotes
    addEmptyBatchFolder,
    cloneToBatch, markDeleteBatchItem, undoDeleteBatchItem, confirmDeleteBatchItem, pendingDeleteBatchItem,
    editBatchFolder,
    pendingDeleteBatchFolder, markDeleteBatchFolder, undoDeleteBatchFolder, confirmDeleteBatchFolder,
    // UI
    productUpdated, setProductUpdated,
    // Catálogo
    setCatalogExpiry,
    // Categorías por marca
    getCategoriesForBrand,
    addCategoryToBrand,
    renameCategoryInBrand,
    markDeleteCategoryInBrand,
    undoDeleteCategoryInBrand,
    pendingDeleteProductCat,
    confirmDeleteProductCat,
    // Categorías (fachada — mismos refs reactivos que useCategoriesStore)
    categories, sortedCategories,
    addCategory:           catsStore.addCategory,
    editCategory,
    deleteCategory:        catsStore.deleteCategory,
    pendingDeleteCategory,
    markDeleteCategory,
    undoDeleteCategory,
    confirmDeleteCategory: catsStore.confirmDeleteCategory,
  }
})