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

## Los 4 stores y sus alias de instancia

```js
import { useProductsStore }    from '../stores/products.js'
import { useCategoriesStore }  from '../stores/categories.js'
import { useOrdersStore }      from '../stores/orders.js'
import { useCurrencyStore }    from '../stores/currency.js'

// Alias estándar en componentes (nunca dos en el mismo componente salvo necesidad)
const store         = useProductsStore()
const catsStore     = useCategoriesStore()   // solo si se importa directamente
const ordersStore   = useOrdersStore()
const currencyStore = useCurrencyStore()
```

> **Nota:** `useProductsStore` re-exporta toda la API de `useCategoriesStore` como fachada.
> La mayoría de los componentes no necesitan importar `useCategoriesStore` directamente.

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
store.brands      // Ref<Brand[]>   — array de marcas
store.products    // Ref<Product[]> — array de productos
// (categories vive en useCategoriesStore, re-exportada aquí como fachada)
```

### Getters (funciones puras, no computed)

```js
store.getBrand(id)       // → Brand | undefined   (id es string, ej. 'polli')
store.getProduct(id)     // → Product | undefined  (id puede ser string o number)
store.getByBrand(bid)    // → Product[]            (bid es string)
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

### Categorías (fachada sobre useCategoriesStore)

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
  id:       number,   // autoincremental
  sku:      string,   // código de lista de precios
  name:     string,   // nombre del producto
  brand:    string,   // nombre de la marca (desnormalizado)
  bid:      string,   // id de la marca (FK → Brand.id)
  origin:   string,
  content:  string,   // ej. '190gr'
  unitsPerBox: number,
  cost:     number,   // precio de costo IVA incluido (UYU)
  pvp:      number,   // precio de venta sugerido (UYU)
  dto:      string,   // '26' | '26+5' | string numérico personalizado
  stock:    number,
  max:      number,   // capacidad máxima (para pct)
  ic:       string,   // clase de Tabler Icon, ej. 'ti-salad'
  bg:       string,   // color de fondo del icono (hex)
  col:      string,   // color del icono (hex)
  expiry?:  string,   // fecha de vencimiento (YYYY-MM-DD), opcional
  lot?:     string,   // número de lote, opcional
  category?: string,  // nombre de categoría (string desnormalizado), opcional
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
  prods:  number[],  // ids de productos de esta marca
}
```

### Persistencia
- `products` y `brands` → `localStorage` bajo la clave `stockos_v1`
- `categories`           → `localStorage` bajo la clave `stockos_categories`
  (migración automática desde `stockos_v1.categories` en el primer arranque tras el split)

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

### Persistencia
Persiste en `localStorage` bajo la clave `stockos_orders`.
Incluye migración automática de claves legacy en español (`nombre→name`, `estado→status`, etc.).

---

## `useCurrencyStore` — API completa

### Estado

```js
currencyStore.currency           // Ref<'UYU' | 'USD'>
currencyStore.exchangeRate       // Ref<number>
currencyStore.exchangeRateSource // Ref<string | null>
```

### Acciones

```js
currencyStore.setCurrency(val)   // 'UYU' | 'USD'
currencyStore.toggleCurrency()   // alterna entre UYU y USD
currencyStore.formatPrice(n)     // → string — n siempre en UYU
```

### `formatPrice(n)`
- `n` es siempre el precio en **UYU**.
- Si `currency === 'USD'`, divide por `exchangeRate` y prefija `U$S`.
- Si `currency === 'UYU'`, formatea con `.` de miles y `,` decimal, prefija `$`.

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
- [ ] ¿Para formatear precios usé `currencyStore.formatPrice(n)`?
- [ ] ¿Para calcular porcentaje de stock usé `store.pct(product)`?
- [ ] ¿Para detectar alertas usé `store.hasAlert(product)`?
- [ ] ¿Al agregar un producto nuevo pasé `bid` correcto para que se registre en `brand.prods`?
- [ ] ¿`products` y `brands` persisten; `categories` también (clave separada); pedidos persisten?