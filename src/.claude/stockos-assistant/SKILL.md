---
name: stockos-assistant
description: "Guía para el asistente sobre cómo trabajar con el proyecto stockOS: componentes, store, estilos y convenciones de Vue."
---

# SKILL: Asistente para stockOS

## Cuándo aplicar este skill
Siempre que necesites responder dudas o generar código para este proyecto.
Aplica para: nuevas vistas, componentes, store logic, estilos y navegación.

---

## Visión general del proyecto

- Base: Vue 3 + Vite + Pinia + Capacitor.
- Estructura clave:
  - `src/views/` — pantallas principales.
  - `src/components/layout/` — `TopBar`, `BottomNav`.
  - `src/components/ui/` — componentes reutilizables de UI.
  - `src/stores/` — stores de Pinia.
  - `src/styles/` — toda la capa de estilos SCSS.
  - `src/composables/` — lógica compartida reutilizable.
  - `src/router/index.js` — rutas de la aplicación.

---

## Convenciones Vue del proyecto

- Siempre usar `<script setup>`.
- Nunca usar `<style>` dentro de archivos `.vue`.
- Nunca usar Options API ni `export default {}`.
- No hardcodear colores, tipografías o espaciados con `:style` salvo cuando el valor viene de datos dinámicos (`brand.bg`, `product.col`, `stripe`, ancho de barra, etc.).
- Identificadores nuevos en inglés: clases, ids, variables, funciones, props, emits.
- Inputs deben tener `id`, `name`, `label`.
- Names de inputs siguen el patrón `{prefijo-vista}-{campo}`: `np-`, `ep-`, `ao-`, etc.
- Botones sin texto deben usar `aria-label`.
- Iconos decorativos siempre `aria-hidden="true"`.

---

## Layouts estándar

### Vistas principales / listados / detalle

```vue
<div class="screen">
  <TopBar ... />
  <div class="scroll-content">
    <!-- contenido -->
    <div class="spacer--sm"></div>
  </div>
  <BottomNav />
</div>
```

### Vistas de formulario

```vue
<div class="screen">
  <TopBar variant="back" ... />
  <div class="scroll-content">
    <!-- campos -->
    <div class="spacer--sm"></div>
  </div>
  <div class="btn-group">
    <button class="btn btn--primary">Guardar</button>
    <button class="btn btn--secondary">Cancelar</button>
  </div>
</div>
```

- `BottomNav` se usa en pantallas principales, incluidas listas y detalle.
- Formularios y vistas internas usan `.btn-group`.
- También existe `.btn-group.btn-group--row` para botones en fila.

---

## Stores y alias estándar

```js
import { useProductsStore }        from '../stores/products.js'
import { useBrandCategoriesStore } from '../stores/brandCategories.js'
import { useOrdersStore }          from '../stores/orders.js'
import { useCurrencyStore }        from '../stores/currency.js'

const store         = useProductsStore()
const catStore      = useBrandCategoriesStore()
const ordersStore   = useOrdersStore()
const currencyStore = useCurrencyStore()
```

- `useProductsStore` es el store principal de productos, marcas, lotes, alertas y categorías de producto.
- `useBrandCategoriesStore` gestiona los grupos de marcas del catálogo.
- `useCategoriesStore` se usa internamente en `useProductsStore` como fachada para categorías globales.
- `useOrdersStore` gestiona pedidos y undo de borrado.

---

## API clave de `useProductsStore`

- Estado:
  - `brands`, `products`, `batches`, `batchFoldersMeta`, `catalogExpiry`, `brandProductCategories`
- Getters:
  - `getBrand(id)`, `getProduct(id)`, `getByBrand(bid)`
  - `getBatchesByBrand(bid)`, `getBatchItemsByBrand(bid, batchNumber)`
  - `getAllBatchFolders()`, `getBatchFolder(batchNumber)`
- Alertas y helpers:
  - `pct(product)`, `isOutOfStock(product)`, `isLowStock(product)`, `isExpiring(product)`, `hasAlert(product)`, `stockColor(product)`
  - `alerts`, `outOfStockAlerts`, `lowStockAlerts`, `expiryAlerts`
  - `alertBrands`, `outOfStockBrands`, `lowStockBrands`
  - `expiryTree`, `expiryYears`, `expiryMonths(year)`, `expiryBrands(year, monthKey)`, `expiryProducts(year, monthKey, bid)`
- Marcas:
  - `addBrand(name)`, `deleteBrand(id)`, `editBrandName(id, newName)`
  - `pendingDeleteBrand`, `markDeleteBrand(id)`, `undoDeleteBrand()`, `confirmDeleteBrand()`
- Productos:
  - `updateStock(id, qty)`, `addProduct(prod)`, `editProduct(id, data)`
  - `pendingDelete`, `markDelete(id)`, `undoDelete()`, `confirmDelete()`
- Lotes:
  - `addEmptyBatchFolder(batchNumber, expiry)`
  - `addBrandToFolder(batchNumber, brandId)`
  - `getBatchSortedCategories(batchNumber)`, `getBatchCategoryForBrand(batchNumber, brandId)`
  - `addBatchCategory(batchNumber, name)`, `renameBatchCategory(batchNumber, id, newName)`, `deleteBatchCategory(batchNumber, id)`, `moveBrandInBatch(batchNumber, brandId, fromCatId, toCatId)`
  - `addProductToBatch(prod, batchNumber)`, `cloneToBatch(product, { batchNumber, expiry, stock })`
  - `pendingDeleteBatchItem`, `markDeleteBatchItem(id)`, `undoDeleteBatchItem()`, `confirmDeleteBatchItem()`
  - `pendingDeleteBatchFolder`, `markDeleteBatchFolder(batchNumber)`, `undoDeleteBatchFolder()`, `confirmDeleteBatchFolder()`
- UI:
  - `productUpdated`, `setProductUpdated()`
- Categorías por marca:
  - `getCategoriesForBrand(brandId)`, `addCategoryToBrand(brandId, name)`, `renameCategoryInBrand(brandId, oldName, newName)`, `markDeleteCategoryInBrand(brandId, catName)`, `undoDeleteCategoryInBrand()`, `confirmDeleteProductCat()`
- Fachada de categorías globales:
  - `categories`, `sortedCategories`, `addCategory`, `deleteCategory`, `pendingDeleteCategory`, `markDeleteCategory`, `undoDeleteCategory`, `confirmDeleteCategory`

---

## SCSS / estilo

- Todo estilo vive en `src/styles/`.
- `src/styles/main.scss` importa `abstracts`, `base`, `layout`, `components`, `views`.
- Usa `@use '../abstracts' as *;` en los archivos SCSS que lo requieren.
- Arquitectura:
  - `abstracts/` — variables, mixins, funciones, export central.
  - `base/` — reset y tipografía global.
  - `layout/` — `.screen`, `.scroll-content`, `.topbar`, `.bottom-nav`.
  - `components/` — botones, formularios, cards, sheets, badges, estadisticas, barras de stock.
  - `views/` — estilos específicos de cada pantalla.
- No agregar CSS en `.vue`.
- Usa variables SCSS en lugar de valores hex hardcodeados siempre que sea posible.

---

## Componentes UI frecuentes

- `TopBar`:
  - variantes: `home`, `title`, `back`, `breadcrumb`
  - props: `variant`, `title`, `backLabel`, `backTo`, `breadcrumbs`, `searchId`, `searchPlaceholder`, `modelValue`, `showSearch`
  - emits: `update:modelValue`, `back`
- `BrandRow`: fila clickeable de marca con `brand`, `to`, `meta`, `stripe`, y `#badges`.
- `AlertFolderRow`: fila de alerta con `label`, `meta`, `to`, `icon`, `iconBg`, `iconColor`, `stripe`.
- `AlertSearchBar`: búsqueda de alertas con `modelValue`, `placeholder`, `inputId`.
- `CatalogCatSep`: separador de categoría con `catId`, `catName`, `variant`, `showMigrate`, `showDelete`, `showEdit`, `isMigrating`, `migrateLabel`.
- `CloneSheet`: sheet modal con `modelValue`, `product`, `editBatch`.
- `ProductCard`: tarjeta de producto con `product`, `showActions`, `deletable`, `batchContext`.
- `StockBadge`: badge de estado con `product`.
- `StockAdjuster`: control de stock con `modelValue`, `label`, `hint`, `max`, `showBar`, `inputId`, `maxStock`, `error`.
- `StatCard`: tarjeta de métrica con `label`, `value`, `sub`, `color`, `valueClass`.

---

## Rutas y navegación

- Rutas principales en inglés, con redirects legacy desde español.
- Rutas relevantes principales:
  - `/` → `Home`
  - `/catalog` → `BrandCatalog`
  - `/catalog/:brandId` → `ProductCatalog`
  - `/catalog/batch/:batchNumber` → `BatchDetail`
  - `/catalog/batch/:batchNumber/:brandId` → `BatchBrandDetail`
  - `/product/new` → `NewProduct`
  - `/product/:id` → `Detail`
  - `/product/:id/edit` → `EditProduct`
  - `/alerts` → `BrandAlerts`
  - `/alerts/out-of-stock` → `AlertCategoryBrands` (meta alertType)
  - `/alerts/out-of-stock/:brandId` → `AlertCategoryProducts`
  - `/alerts/low-stock` → `AlertCategoryBrands`
  - `/alerts/low-stock/:brandId` → `AlertCategoryProducts`
  - `/alerts/expiry` y sus variaciones → `AlertExpiry`
  - `/settings` → `Settings`
- `route.params` llegan como `string`.
- `route.query` se usa para guardar contexto de alertas y batch.

---

## Data models importantes

- `Product`:
  - `id`, `sku`, `name`, `brand`, `bid`, `origin`, `size`, `unitsPerBox`, `cost`, `price`, `discount`, `stock`, `max`, `ic`, `bg`, `col`, `img?`, `expiry?`, `batch?`, `_batchOnly?`
- `Brand`:
  - `id`, `name`, `origin`, `ic`, `bg`, `col`, `prods`
- `BatchFolder`:
  - `batchNumber`, `expiry`, `brandIds`, `categories`

---

## Reglas rápidas para el asistente

- Respeta las convenciones del proyecto antes de generar código.
- Reusa componentes existentes en lugar de crear nuevos cuando el uso es comparable.
- Si no hay componente exacto, verifica primero `src/components/ui/` y `src/components/layout/`.
- Consulta `src/stores/products.js` antes de afirmar que una API del store existe.
- Si modificas estilos, ubica la regla en el SCSS correcto en vez de agregar CSS en `.vue`.
- Usa rutas en inglés en el código nuevo.
- Evita generar rutas legacy en español; son solo redirects.

---

## Checklist rápida

- [ ] `script setup` usado.
- [ ] Sin `<style>` en `.vue`.
- [ ] Sin `export default` en `.vue`.
- [ ] No `:style` hardcodeado para colores/fuentes/espaciados.
- [ ] Inputs con `id`, `name`, `label`.
- [ ] Iconos con `aria-hidden="true"`.
- [ ] `role="button"`, `tabindex="0"`, `@keydown.enter` en elementos clickeables.
- [ ] Layout sigue `.screen > .scroll-content` y `BottomNav` o `.btn-group` según el caso.
- [ ] Usa stores y composables existentes del proyecto.
- [ ] Estilos en `src/styles/`, no en `.vue`.
- [ ] Variables SCSS en lugar de valores hardcodeados siempre que sea posible.
