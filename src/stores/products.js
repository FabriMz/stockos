import { defineStore, storeToRefs } from 'pinia'
import { ref, computed, watch } from 'vue'
import { brandsData }         from '../data/brands.js'
import { productsData }       from '../data/products.js'
import { useUndo }            from '../composables/useUndo.js'
import { useAlerts }          from '../composables/useAlerts.js'
import { useCategoriesStore } from './categories.js'
import { storageGet, storageSet, storageRemove } from '../utils/storage.js'

const STORAGE_KEY     = 'stockos_v2'
const STORAGE_KEY_OLD = 'stockos_v1'

function getDefaultCatalogExpiry() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

async function saveState(products, brands, catalogExpiry, batches, batchFoldersMeta, brandProductCategories) {
  try {
    await storageSet(STORAGE_KEY, JSON.stringify({
      products, brands, catalogExpiry, batches,
      batchFoldersMeta, brandProductCategories,
      _seeded: true,
    }))
  } catch { /* noop */ }
}

function deriveBatchFoldersMeta(batches) {
  const map = {}
  batches.forEach(b => {
    if (!map[b.batchNumber]) map[b.batchNumber] = { batchNumber: b.batchNumber, expiry: b.expiry, brandIds: [], categories: [] }
    if (!map[b.batchNumber].brandIds.includes(b.bid)) map[b.batchNumber].brandIds.push(b.bid)
  })
  return Object.values(map)
}

// Migra formato antiguo { bid, batchNumber, expiry } → { batchNumber, expiry, brandIds, categories } deduplicando por nombre
function migrateBatchFoldersMeta(raw) {
  const map = {}
  raw.forEach(f => {
    if (!map[f.batchNumber]) map[f.batchNumber] = {
      batchNumber: f.batchNumber,
      expiry: f.expiry,
      brandIds: Array.isArray(f.brandIds) ? [...f.brandIds] : [],
      categories: Array.isArray(f.categories) ? [...f.categories] : [],
    }
  })
  return Object.values(map)
}

export const useProductsStore = defineStore('products', () => {

  // ─── Estado ──────────────────────────────────────────────────────────────────
  const brands                 = ref(brandsData)
  const products               = ref(productsData)
  const catalogExpiry          = ref(getDefaultCatalogExpiry())
  const batches                = ref([])
  const batchFoldersMeta       = ref([])
  const brandProductCategories = ref({})

  // Señal que indica si el store ya cargó desde el storage nativo
  const _ready = ref(false)

  // ─── Init async ──────────────────────────────────────────────────────────────
  async function _init() {
    try {
      await storageRemove(STORAGE_KEY_OLD)
      const raw = await storageGet(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved?._seeded) {
          brands.value                 = saved.brands                 ?? []
          products.value               = saved.products               ?? []
          catalogExpiry.value          = typeof saved.catalogExpiry === 'string'
            ? saved.catalogExpiry
            : getDefaultCatalogExpiry()
          batches.value                = Array.isArray(saved.batches) ? saved.batches : []
          batchFoldersMeta.value       = Array.isArray(saved.batchFoldersMeta)
            ? migrateBatchFoldersMeta(saved.batchFoldersMeta)
            : (Array.isArray(saved.batches) ? deriveBatchFoldersMeta(saved.batches) : [])
          brandProductCategories.value = saved.brandProductCategories ?? {}
        }
      }
    } catch { /* noop */ } finally {
      _ready.value = true
    }
  }

  _init()

  watch(
    [products, brands, catalogExpiry, batches, batchFoldersMeta, brandProductCategories],
    () => {
      if (!_ready.value) return
      saveState(products.value, brands.value, catalogExpiry.value, batches.value, batchFoldersMeta.value, brandProductCategories.value)
    },
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
    // Incluir marcas asignadas explícitamente al lote aunque no tengan items aún
    const extraBrandIds = Array.isArray(meta.brandIds) ? meta.brandIds : []
    extraBrandIds.forEach(bid => {
      if (!brandMap[bid]) brandMap[bid] = []
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
    const existing = brands.value.find(b => b.id === id)
    if (existing) return id   // ya existe → reutilizar (no crear duplicado)
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

  const sortedBrands = computed(() =>
    [...brands.value].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  )

  // ─── CRUD: Productos ──────────────────────────────────────────────────────────
  function updateStock(id, qty) {
    const p = products.value.find(p => p.id === Number(id))
    if (p) p.stock = Number(qty)
  }

  function addProduct(prod) {
    const newId = Math.max(0, ...products.value.map(p => p.id)) + 1
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
    batchFoldersMeta.value.push({ batchNumber: num, expiry, brandIds: [], categories: [] })
  }

  // Registra una marca como perteneciente a un lote (aunque no tenga productos aún)
  function addBrandToFolder(batchNumber, brandId) {
    const meta = batchFoldersMeta.value.find(f => f.batchNumber === batchNumber)
    if (!meta) return
    if (!Array.isArray(meta.brandIds)) meta.brandIds = []
    if (!meta.brandIds.includes(brandId)) meta.brandIds.push(brandId)
  }

  // ─── Categorías de lote ───────────────────────────────────────────────────────
  // Cada lote tiene sus propias categorías en meta.categories: { id, name, brandIds[] }

  function _genBatchCatId() {
    return `bc${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`
  }

  function _getBatchMeta(batchNumber) {
    const meta = batchFoldersMeta.value.find(f => f.batchNumber === batchNumber)
    if (meta && !Array.isArray(meta.categories)) meta.categories = []
    return meta ?? null
  }

  function getBatchSortedCategories(batchNumber) {
    const meta = _getBatchMeta(batchNumber)
    if (!meta) return []
    return [...meta.categories].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }

  function getBatchCategoryForBrand(batchNumber, brandId) {
    const meta = _getBatchMeta(batchNumber)
    if (!meta) return null
    return meta.categories.find(c => c.brandIds.includes(brandId)) ?? null
  }

  function addBatchCategory(batchNumber, name) {
    const n = name.trim()
    if (!n) return false
    const meta = _getBatchMeta(batchNumber)
    if (!meta) return false
    if (meta.categories.some(c => c.name === n)) return false
    meta.categories.push({ id: _genBatchCatId(), name: n, brandIds: [] })
    return true
  }

  function renameBatchCategory(batchNumber, id, newName) {
    const n = newName.trim()
    if (!n) return 'El nombre no puede quedar vacío'
    const meta = _getBatchMeta(batchNumber)
    if (!meta) return 'Lote no encontrado'
    if (meta.categories.some(c => c.name === n && c.id !== id)) return 'Ya existe un grupo con ese nombre'
    const cat = meta.categories.find(c => c.id === id)
    if (!cat) return 'Grupo no encontrado'
    cat.name = n
    return null
  }

  function deleteBatchCategory(batchNumber, id) {
    const meta = _getBatchMeta(batchNumber)
    if (!meta) return
    meta.categories = meta.categories.filter(c => c.id !== id)
  }

  function moveBrandInBatch(batchNumber, brandId, fromCatId, toCatId) {
    const meta = _getBatchMeta(batchNumber)
    if (!meta) return
    if (fromCatId !== null) {
      const from = meta.categories.find(c => c.id === fromCatId)
      if (from) from.brandIds = from.brandIds.filter(b => b !== brandId)
    }
    if (toCatId !== null) {
      const to = meta.categories.find(c => c.id === toCatId)
      if (to && !to.brandIds.includes(brandId)) to.brandIds.push(brandId)
    }
  }

  // Crea un producto nuevo directamente dentro de un lote.
  // Recibe el form completo (igual que addProduct) mas el batchNumber de destino.
  function addProductToBatch(prod, batchNumber) {
    const meta = batchFoldersMeta.value.find(f => f.batchNumber === batchNumber)
    if (!meta) return
    const newId = Math.max(0, ...products.value.map(p => p.id)) + 1
    products.value.push({ ...prod, id: newId, _batchOnly: true, batch: batchNumber, expiry: meta.expiry })
    if (!Array.isArray(meta.brandIds)) meta.brandIds = []
    if (!meta.brandIds.includes(prod.bid)) meta.brandIds.push(prod.bid)
    const itemId = `batch_${Date.now()}_${newId}`
    batches.value.push({
      id         : itemId,
      productId  : newId,
      bid        : prod.bid,
      batchNumber: batchNumber,
      expiry     : meta.expiry,
      stock      : Number(prod.stock) || 0,
    })
    return newId
  }

  function cloneToBatch(product, { batchNumber, expiry, stock }) {
    const num = batchNumber.trim()
    if (!num) return
    let folder = batchFoldersMeta.value.find(f => f.batchNumber === num)
    if (!folder) {
      if (!expiry) return
      folder = { batchNumber: num, expiry, brandIds: [], categories: [] }
      batchFoldersMeta.value.push(folder)
    }
    if (!Array.isArray(folder.brandIds)) folder.brandIds = []
    if (!folder.brandIds.includes(product.bid)) folder.brandIds.push(product.bid)
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
      brandProductCategories.value = { ...brandProductCategories.value, [brandId]: [] }
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
      brandProductCategories.value = { ...brandProductCategories.value, [snap.brandId]: [] }
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
    _ready,
    brands, products, catalogExpiry, batches, batchFoldersMeta,
    // Getters
    getBrand, getProduct, getByBrand,
    getBatchesByBrand, getBatchItemsByBrand, getAllBatchFolders, getBatchFolder,
    // Alertas (de useAlerts)
    ...alertHelpers,
    // Marcas
    addBrand, deleteBrand, editBrandName, sortedBrands,
    pendingDeleteBrand, markDeleteBrand, undoDeleteBrand, confirmDeleteBrand,
    // Productos CRUD
    updateStock, addProduct, editProduct,
    // Productos undo
    pendingDelete, markDelete, undoDelete, confirmDelete,
    // Lotes
    addEmptyBatchFolder,
    addBrandToFolder,
    getBatchSortedCategories,
    getBatchCategoryForBrand,
    addBatchCategory,
    renameBatchCategory,
    deleteBatchCategory,
    moveBrandInBatch,
    addProductToBatch,
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
    deleteCategory:        catsStore.deleteCategory,
    pendingDeleteCategory,
    markDeleteCategory,
    undoDeleteCategory,
    confirmDeleteCategory: catsStore.confirmDeleteCategory,
  }
})