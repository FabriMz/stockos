---
name: stockos-stores
description: Guía de uso de los stores Pinia en stockOS: estructura, API, modelo de datos y reglas de uso.
---


# SKILL: Stores Pinia — stock-os

## Cuándo aplicar este skill
Siempre que leas, modifiques o crees código que interactúe con los stores de este proyecto.

---

## Patrón de store — Setup Store obligatorio

Todos los stores usan el patrón de función (`setup store`), nunca Options API:

```js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useXxxStore = defineStore('xxx', () => {
  const valor = ref(null)
  const derivado = computed(() => valor.value !== null)

  function publico() { valor.value = 'x' }

  return { valor, derivado, publico }
})
```

---

## Los stores y sus alias de instancia

```js
import { useProductsStore }        from '../stores/products.js'
import { useBrandCategoriesStore } from '../stores/brandCategories.js'
import { useOrdersStore }          from '../stores/orders.js'
import { useCurrencyStore }        from '../stores/currency.js'

// Alias estándar en componentes
const store         = useProductsStore()
const catStore      = useBrandCategoriesStore()  // grupos de marcas
const ordersStore   = useOrdersStore()
const currencyStore = useCurrencyStore()
```

> **Nota:** `useProductsStore` re-exporta la API de `useCategoriesStore` (categorías de producto) como fachada.
> `useBrandCategoriesStore` es un store separado para los grupos de marcas del catálogo.

---

## Composables internos

```
src/composables/
  useUndo.js    — patrón undo genérico (pending ref + timer). Usado internamente por los stores.
  useAlerts.js  — computeds de alertas derivados de products + brands. Usado internamente por useProductsStore.
```

No se importan directamente desde componentes.

---

## `useProductsStore` — API completa

### Estado

```js
store.brands               // Ref<Brand[]>
store.products             // Ref<Product[]>
store.batches              // Ref<BatchItem[]>     — ítems de lote
store.batchFoldersMeta     // Ref<BatchFolder[]>   — carpetas de lote { batchNumber, expiry }
store.catalogExpiry        // Ref<string>          — vigencia del catálogo (YYYY-MM)
```

### Getters (funciones puras, no computed)

```js
store.getBrand(id)                          // → Brand | undefined
store.getProduct(id)                        // → Product | undefined  (id: string | number)
store.getByBrand(bid)                       // → Product[]  (excluye _batchOnly)
store.getBatchesByBrand(bid)                // → BatchItem[]
store.getBatchItemsByBrand(bid, batchNumber)// → BatchItem[]
store.getAllBatchFolders()                   // → BatchFolder[] enriquecidas con brandGroups
store.getBatchFolder(batchNumber)           // → BatchFolder enriquecida | null
```

### Helpers de stock (funciones puras)

```js
store.pct(product)          // → number 0-100  — porcentaje stock/max
store.isOutOfStock(product) // → boolean
store.isLowStock(product)   // → boolean        — stock > 0 y pct < 25
store.isExpiring(product)   // → boolean        — tiene fecha de vencimiento
store.hasAlert(product)     // → boolean        — cualquiera de las tres condiciones
store.stockColor(product)   // → string hex     — color semántico del estado de stock
```

### Alertas (computed)

```js
store.alerts           // ComputedRef<Product[]> — todos los productos con alguna alerta
store.outOfStockAlerts // ComputedRef<Product[]>
store.lowStockAlerts   // ComputedRef<Product[]>
store.expiryAlerts     // ComputedRef<Product[]>
store.alertBrands      // ComputedRef<Brand[]>   — marcas con al menos un producto con alerta
store.outOfStockBrands // ComputedRef<Brand[]>
store.lowStockBrands   // ComputedRef<Brand[]>
```

### Árbol de vencimientos

```js
store.expiryTree                          // ComputedRef<{ year → monthKey → brandId → Product[] }>
store.expiryYears                         // ComputedRef<number[]>
store.expiryMonths(year)                  // → number[]      (meses con productos)
store.expiryBrands(year, monthKey)        // → Brand[]       (monthKey: string '01'–'12')
store.expiryProducts(year, monthKey, bid) // → Product[]
```

### Marcas

```js
store.sortedBrands                          // ComputedRef<Brand[]> — ordenadas por nombre (es)
store.addBrand(name)                        // → string id | undefined
store.deleteBrand(id)                       // elimina solo si prods.length === 0 (sin undo)
store.editBrandName(id, newName)            // renombra marca y propaga a productos
store.pendingDeleteBrand                    // Ref<Brand | null>
store.markDeleteBrand(id)                   // elimina con undo (5s), desvincula productos
store.undoDeleteBrand()                     // restaura marca y sus productos
store.confirmDeleteBrand()                  // limpia sin restaurar
```

### Productos

```js
store.updateStock(id, qty)    // actualiza stock directamente
store.addProduct(prod)        // agrega y registra en brand.prods
store.editProduct(id, data)   // merge parcial; sincroniza brand.prods si cambia bid
store.pendingDelete           // Ref<Product | null>
store.markDelete(id)          // elimina con undo (5s), elimina de brand.prods
store.undoDelete()            // restaura producto y lo re-agrega a brand.prods
store.confirmDelete()         // limpia sin restaurar
```

### Lotes

```js
store.addEmptyBatchFolder(batchNumber, expiry)          // crea carpeta sin ítems
store.cloneToBatch(product, { batchNumber, expiry, stock }) // clona producto a lote
store.editBatchFolder(oldBatchNumber, { batchNumber, expiry }) // renombra/actualiza carpeta
store.setCatalogExpiry(value)                           // actualiza vigencia del catálogo (YYYY-MM)

// Undo: ítem de lote
store.pendingDeleteBatchItem
store.markDeleteBatchItem(id)
store.undoDeleteBatchItem()
store.confirmDeleteBatchItem()

// Undo: carpeta completa
store.pendingDeleteBatchFolder
store.markDeleteBatchFolder(batchNumber)
store.undoDeleteBatchFolder()
store.confirmDeleteBatchFolder()
```

### Categorías de producto por marca (brandProductCategories)

```js
store.getCategoriesForBrand(brandId)                    // → string[] ordenadas
store.addCategoryToBrand(brandId, name)                 // → boolean (false si ya existe)
store.renameCategoryInBrand(brandId, oldName, newName)  // propaga a productos
store.pendingDeleteProductCat                           // Ref<snap | null>
store.markDeleteCategoryInBrand(brandId, catName)       // elimina con undo, limpia productos
store.undoDeleteCategoryInBrand()
store.confirmDeleteProductCat()
```

### Categorías globales (fachada sobre useCategoriesStore)

```js
store.categories              // Ref<string[]>
store.sortedCategories        // ComputedRef<string[]> — ordenadas (es)
store.addCategory(name)       // agrega si no existe
store.deleteCategory(name)    // elimina sin undo
store.pendingDeleteCategory   // Ref<{ name, _idx } | null>
store.markDeleteCategory(name)
store.undoDeleteCategory()
store.confirmDeleteCategory()
```

### UI

```js
store.productUpdated          // Ref<boolean> — flag para toast de edición exitosa (3s)
store.setProductUpdated()     // activa el flag y lo limpia automáticamente
```

---

## Modelo de datos: `Product`

```js
{
  id:           number,   // autoincremental
  sku:          string,   // código de lista de precios
  name:         string,
  brand:        string,   // nombre de la marca (desnormalizado)
  bid:          string,   // id de la marca (FK → Brand.id)
  origin:       string,   // país de origen
  size:         string,   // ej. '190gr'
  unitsPerBox:  number,
  cost:         number,   // precio de costo (USD)
  price:        number,   // precio de venta sugerido (USD)
  discount:     string,   // '26' | '26+5' | string numérico personalizado
  stock:        number,
  max:          number,   // capacidad máxima (para pct)
  ic:           string,   // clase Tabler Icon, ej. 'ti-salad'
  bg:           string,   // color de fondo del icono (hex)
  col:          string,   // color del icono (hex)
  img?:         string,   // ruta de imagen, opcional
  expiry?:      string,   // fecha de vencimiento (YYYY-MM-DD), opcional
  lot?:         string,   // número de lote, opcional
  category?:    string,   // nombre de categoría (string desnormalizado), opcional
  batch?:       string,   // número de lote (solo _batchOnly), opcional
  _batchOnly?:  boolean,  // true si el producto es un clon de lote, no aparece en catálogo normal
}
```

## Modelo de datos: `Brand`

```js
{
  id:     string,    // slug único, ej. 'polli'
  name:   string,
  origin: string,
  ic:     string,    // clase Tabler Icon
  bg:     string,    // color de fondo del icono (hex)
  col:    string,    // color del icono (hex)
  prods:  number[],  // ids de productos de esta marca (excluye _batchOnly)
}
```

## Modelo de datos: `BatchFolder` (meta)

```js
{
  batchNumber: string,  // nombre/número del lote, ej. 'Lote 03'
  expiry:      string,  // YYYY-MM-DD
}
```

### Persistencia
- `products`, `brands`, `batches`, `batchFoldersMeta`, `catalogExpiry`, `brandProductCategories` → `stockos_v1`
- `categories` → `stockos_categories`
- `orders` → `stockos_orders`
- `brandCategories` → `stockos_brand_categories`

---

## `useBrandCategoriesStore` — API completa

Gestiona los **grupos de marcas** que aparecen como separadores en el catálogo.

```js
// Modelo: { id: string, name: string, brandIds: string[] }

catStore.categories                              // Ref<Category[]>
catStore.sortedCategories                        // ComputedRef<Category[]>
catStore.addCategory(name)                       // → boolean
catStore.renameCategory(id, newName)             // → string | null (null = ok, string = error)
catStore.getCategoryForBrand(brandId)            // → Category | undefined
catStore.moveBrands(brandIds, fromId, toId)      // mueve marcas entre grupos

// Undo: eliminar grupo
catStore.pendingDeleteCat
catStore.markDeleteCat(id)
catStore.undoDeleteCat()
catStore.confirmDeleteCat()

// Undo: mover marcas
catStore.pendingMoveBrands
catStore.markMoveBrands(brandIds, fromId, toId)
catStore.undoMoveBrands()
catStore.confirmMoveBrands()
```

---

## `useOrdersStore` — API completa

### Estado

```js
ordersStore.orders         // Ref<Order[]>
ordersStore.activeOrders   // ComputedRef<Order[]> — active === true
ordersStore.orderHistory   // ComputedRef<Order[]> — active === false
```

### Acciones

```js
ordersStore.addOrder(data)      // unshift al inicio, genera id autoincremental
ordersStore.editOrder(id, data) // merge parcial
ordersStore.pendingDeleteOrder  // Ref<Order | null>
ordersStore.markDeleteOrder(id)
ordersStore.undoDeleteOrder()
ordersStore.confirmDeleteOrder()
```

### Modelo de datos: `Order`

```js
{
  id:     number,
  name:   string,   // descripción / proveedor
  ref:    string,   // referencia, ej. 'PO-2025-033'
  status: string,   // texto libre
  amount: number,   // monto total en UYU
  color:  string,   // hex del color de estado (ver ORDER_COLORS)
  active: boolean,  // true → En curso, false → Historial
}
```

---

## `useCurrencyStore` — API completa

### Estado

```js
currencyStore.currency            // Ref<'UYU' | 'USD'>
currencyStore.exchangeRate        // Ref<number>
currencyStore.exchangeRateSource  // Ref<string | null>
currencyStore.priceListValidity   // Ref<string>  — vigencia de lista (YYYY-MM)
```

### Acciones

```js
currencyStore.setCurrency(val)           // 'UYU' | 'USD'
currencyStore.toggleCurrency()           // alterna entre UYU y USD
currencyStore.setPriceListValidity(val)  // actualiza vigencia de lista
currencyStore.formatPrice(n)             // → string — n en UYU
currencyStore.formatProductPrice(n)      // → string — n en USD (product.cost, product.price)
```

### `formatPrice(n)` vs `formatProductPrice(n)`
- `formatPrice(n)` — para valores almacenados en **UYU** (pedidos, totales)
- `formatProductPrice(n)` — para valores almacenados en **USD** (`product.cost`, `product.price`)

Ambas respetan `currency` actual y formatean con `.` de miles y `,` decimal.

### Persistencia
No persiste. Arranca con `currency: 'UYU'` y `exchangeRate: 42.5` como fallback.
`fetchExchangeRate()` se llama automáticamente al crear el store.

---

## Idioma del código
Todo identificador nuevo — variables, funciones, props, emits, clases CSS —
se escribe en **inglés**, siguiendo el patrón establecido en el proyecto.

---

## Checklist antes de entregar

- [ ] ¿Importé los stores con los alias correctos?
- [ ] ¿Usé las acciones del store en lugar de mutar `.value` directamente desde componentes?
- [ ] ¿Para formatear precios UYU usé `formatPrice`; para precios USD usé `formatProductPrice`?
- [ ] ¿Para calcular porcentaje de stock usé `store.pct(product)`?
- [ ] ¿Para detectar alertas usé `store.hasAlert(product)`?
- [ ] ¿Al agregar un producto nuevo pasé `bid` correcto para que se registre en `brand.prods`?
- [ ] ¿Los lotes usan `cloneToBatch` y nunca mutación directa de `batches`?