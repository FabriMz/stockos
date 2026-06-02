# StockOS — Documentación de Arquitectura

**Versión analizada:** 0.1.0  
**Fecha:** junio 2026  
**Cliente:** Compañía de Indias  

---

## 1. Visión general

StockOS es una SPA mobile-first construida con Vue 3 + Vite, desplegable como aplicación nativa Android vía Capacitor. Gestiona el inventario de productos importados: stock, alertas de reposición, vencimientos, lotes de importación y pedidos a proveedores.

```
Vue 3 (Composition API)
  └── Pinia (estado global + persistencia en localStorage)
  └── Vue Router 4 (hash history)
  └── SCSS (arquitectura 7-1 simplificada)
  └── Capacitor 6 → APK Android
```

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework UI | Vue 3 | ^3.4 |
| Build | Vite | ^8 |
| Estado | Pinia | ^2.1 |
| Routing | Vue Router | ^4.3 |
| Estilos | Sass (SCSS) | ^1.77 |
| CSS tooling | PostCSS + Autoprefixer | — |
| Native wrapper | Capacitor | ^6 / CLI ^8 |
| Iconografía | Tabler Icons (CDN) | — |
| Tipografía | Barlow / Barlow Condensed / DM Mono | CDN |

---

## 3. Estructura de directorios

```
src/
├── main.js                   # Punto de entrada: createApp, Pinia, Router
├── App.vue                   # Shell: phone-shell + toast global
│
├── router/
│   └── index.js              # Rutas con hash history + redirects legacy
│
├── stores/
│   ├── products.js           # Store central: productos, marcas, lotes y categorías por marca
│   ├── categories.js         # Categorías de producto (clave stockos_categories)
│   ├── brandCategories.js    # Grupos/categorías de marcas en el catálogo
│   ├── discounts.js          # Presets de descuento configurables
│   ├── productCatOpen.js     # Estado UI: acordeones de categoría abiertos/cerrados
│   ├── orders.js             # Estado de pedidos a proveedores
│   └── currency.js           # Moneda activa + tipo de cambio UYU/USD
│
├── views/                    # Páginas (lazy-loaded por el router)
│   ├── Home.vue
│   ├── BrandCatalog.vue
│   ├── ProductCatalog.vue
│   ├── BatchDetail.vue
│   ├── BatchBrandDetail.vue
│   ├── Detail.vue
│   ├── NewProduct.vue
│   ├── EditProduct.vue
│   ├── BrandAlerts.vue
│   ├── AlertCategoryBrands.vue
│   ├── AlertCategoryProducts.vue
│   ├── AlertExpiry.vue
│   ├── Orders.vue
│   ├── NewOrder.vue
│   ├── EditOrder.vue
│   └── Settings.vue
│
├── components/
│   ├── layout/
│   │   ├── TopBar.vue        # Barra superior (4 variantes)
│   │   └── BottomNav.vue     # Navegación inferior con FAB expandible
│   └── ui/
│       ├── ProductCard.vue
│       ├── BrandRow.vue
│       ├── CatalogCatSep.vue
│       ├── CloneSheet.vue
│       ├── AlertFolderRow.vue
│       ├── AlertSearchBar.vue
│       ├── StockAdjuster.vue
│       ├── StockBadge.vue
│       └── StatCard.vue
│
├── composables/
│   ├── useAlertNavigation.js # Builders de rutas para contexto de alertas
│   ├── useAlerts.js          # Computeds de alertas (usado internamente por products store)
│   ├── useDtoSelector.js     # Lógica del selector de descuento (preset / custom)
│   ├── useSettingsSheet.js   # Lógica del sheet de configuración del catálogo
│   └── useUndo.js            # Patrón undo genérico (pending ref + timer)
│
├── utils/
│   └── alerts.js             # parseExpiry, monthLabel, formatExpiry, expiryBadgeClass, etc.
│
├── constants/
│   └── orderColors.js        # Paleta semántica de estados de pedido
│
├── data/
│   ├── products.js           # Seed: ~675 productos
│   ├── brands.js             # Seed: 37 marcas
│   └── brandCategories.js    # Agrupación temática de marcas para catálogo
│
└── styles/
    ├── main.scss             # Entry point de estilos
    ├── abstracts/            # Variables, funciones, mixins (no emiten CSS)
    ├── base/                 # Reset, tipografía
    ├── layout/               # topbar, bottom-nav, screen
    ├── components/           # cards/, buttons, badges, forms, toast, etc.
    └── views/                # Estilos por vista + subcarpeta catalog/
```

---

## 4. Routing

El router usa `createWebHashHistory` (compatible con Capacitor sin servidor HTTP).  
Todas las vistas se cargan de forma **lazy** (`() => import(...)`).

### Mapa de rutas activas

| Ruta | Vista | Parámetros |
|---|---|---|
| `/` | Home | — |
| `/catalog` | BrandCatalog | — |
| `/catalog/batch/:batchNumber` | BatchDetail | batchNumber: string |
| `/catalog/batch/:batchNumber/:brandId` | BatchBrandDetail | batchNumber, brandId |
| `/catalog/:brandId` | ProductCatalog | brandId: string |
| `/product/new` | NewProduct | — |
| `/product/:id` | Detail | id: string→Number |
| `/product/:id/edit` | EditProduct | id: string→Number |
| `/alerts` | BrandAlerts | — |
| `/alerts/out-of-stock` | AlertCategoryBrands | meta.alertType |
| `/alerts/out-of-stock/:brandId` | AlertCategoryProducts | brandId, meta.alertType |
| `/alerts/low-stock` | AlertCategoryBrands | meta.alertType |
| `/alerts/low-stock/:brandId` | AlertCategoryProducts | brandId, meta.alertType |
| `/alerts/expiry` | AlertExpiry | — |
| `/alerts/expiry/:year` | AlertExpiry | year |
| `/alerts/expiry/:year/:month` | AlertExpiry | year, month |
| `/alerts/expiry/:year/:month/:brandId` | AlertExpiry | year, month, brandId |
| `/orders` | Orders | — |
| `/orders/new` | NewOrder | — |
| `/orders/:id/edit` | EditOrder | id |
| `/settings` | Settings | — |

> **Redirects legacy:** existe un bloque de redirects de rutas antiguas en español (`/catalogo`, `/producto/:id`, `/alertas`, `/ajustes`, etc.) y un redirect de la ruta de lote con brandId en la URL (`/catalog/:brandId/batch/:batchNumber`).

---

## 5. Stores Pinia

Todos los stores usan el **setup store pattern** (función, no Options API).

### 5.1 `useProductsStore` (`stockos_v1`)

Es el store central de la aplicación. Persiste en `localStorage` bajo la clave `stockos_v1`.

**Estado reactivo:**

| Ref | Tipo | Descripción |
|---|---|---|
| `products` | `Product[]` | Lista de productos (~675 seed) |
| `brands` | `Brand[]` | Lista de marcas (37 seed) |
| `catalogExpiry` | `string` | Vigencia activa del catálogo (formato `YYYY-MM`) |
| `batches` | `BatchItem[]` | Items de lotes de importación |
| `batchFoldersMeta` | `BatchFolderMeta[]` | Metadatos de carpetas de lote (sin duplicados) |
| `brandProductCategories` | `{ [brandId]: string[] }` | Categorías de producto por marca |

**Getters (funciones puras):**

| Función | Descripción |
|---|---|
| `getBrand(id)` | Marca por id |
| `getProduct(id)` | Producto por id (acepta string o number) |
| `getByBrand(bid)` | Productos de una marca (excluye `_batchOnly`) |
| `getBatchesByBrand(bid)` | Todos los batch items de una marca |
| `getBatchItemsByBrand(bid, batchNumber)` | Batch items filtrados por marca y número de lote |
| `getAllBatchFolders()` | Todas las carpetas de lote ordenadas por fecha |
| `getBatchFolder(batchNumber)` | Carpeta de lote con sus grupos de marcas |

**Computed clave:**

| Computed | Descripción |
|---|---|
| `alerts` | Todos los productos con alguna alerta activa |
| `outOfStockAlerts` | Productos con stock = 0 |
| `lowStockAlerts` | Productos con stock > 0 y pct < 25% |
| `expiryAlerts` | Productos con fecha de vencimiento |
| `alertBrands` | Marcas con al menos un producto con alerta |
| `outOfStockBrands` | Marcas con al menos un producto sin stock |
| `lowStockBrands` | Marcas con al menos un producto con stock bajo |
| `expiryTree` | Árbol `{ year → monthKey → brandId → Product[] }` |
| `expiryYears` | Años presentes en el árbol, ordenados |
| `sortedBrands` | Marcas ordenadas alfabéticamente (es) |

**Funciones de escritura:**

- `addProduct(prod)` / `editProduct(id, data)` — maneja el re-linkeo de marcas en edición
- `updateStock(id, qty)` — actualización directa de stock
- `addBrand(name)` / `deleteBrand(id)` / `editBrandName(id, newName)`
- `addEmptyBatchFolder(batchNumber, expiry)` / `cloneToBatch(product, opts)` / `editBatchFolder(oldNum, opts)`
- `markDelete` / `undoDelete` / `confirmDelete` — undo de productos
- `markDeleteBrand` / `undoDeleteBrand` / `confirmDeleteBrand`
- `markDeleteBatchItem` / `undoDeleteBatchItem` / `confirmDeleteBatchItem`
- `markDeleteBatchFolder` / `undoDeleteBatchFolder` / `confirmDeleteBatchFolder`
- `markDeleteCategory` / `undoDeleteCategory` / `confirmDeleteCategory` (fachada sobre `useCategoriesStore`)
- `getCategoriesForBrand(brandId)` / `addCategoryToBrand(brandId, name)` / `renameCategoryInBrand(brandId, old, new)` / `markDeleteCategoryInBrand(brandId, catName)` / `undoDeleteCategoryInBrand()`
- `setCatalogExpiry(value)` — persiste la vigencia activa del catálogo
- `setProductUpdated()` — activa el flag de toast de edición (3s)

**Patrón undo:** al invocar `markDelete*`, el ítem se elimina inmediatamente del array y se guarda un snapshot con `_idx`. Se inicia un timer de 5 segundos. Si el usuario presiona "Deshacer", el ítem se reinserta en su posición original. Al expirar el timer, se limpia el snapshot.

### 5.2 `useCategoriesStore` (`stockos_categories`)

Gestiona las categorías de producto (lista plana de strings). Se inicializa con migración automática desde `stockos_v1.categories` en el primer arranque tras el split.

**API:** `categories`, `sortedCategories`, `addCategory`, `deleteCategory`, `markDeleteCategory`, `undoDeleteCategory`, `confirmDeleteCategory`, `pendingDeleteCategory`.

> **Nota:** `useProductsStore` re-exporta toda la API de `useCategoriesStore` como fachada. La mayoría de los componentes no necesitan importarlo directamente.

### 5.3 `useBrandCategoriesStore` (`stockos_brand_categories`)

Gestiona los grupos/categorías a las que pertenecen las marcas en el catálogo. Seed inicial desde `data/brandCategories.js`.

**Modelo:**

```js
{ id: string, name: string, brandIds: string[] }
```

**API:** `categories`, `sortedCategories`, `addCategory`, `renameCategory`, `getCategoryForBrand`, `moveBrands`, `markMoveBrands`, `undoMoveBrands`, `confirmMoveBrands`, `markDeleteCat`, `undoDeleteCat`, `confirmDeleteCat`.

### 5.4 `useDiscountsStore` (`stockos_discounts`)

Gestiona los presets de descuento configurables. Default: `['26', '26+5']`.

**API:** `discounts`, `sortedDiscounts`, `addDiscount`, `deleteDiscount`, `markDeleteDiscount`, `undoDeleteDiscount`, `confirmDeleteDiscount`.

También exporta `DEFAULT_PRESET = '26'` para uso en formularios.

### 5.5 `useProductCatOpenStore`

Estado UI sin persistencia. Controla qué acordeones de categoría están abiertos en `ProductCatalog` y `AlertCategoryProducts`. Clave interna: `` `${brandId}:${catName}` ``.

**API:** `isOpen(brandId, catName)`, `toggle(brandId, catName)`, `setOpen(brandId, catName, value)`, `setAllForBrand(brandId, catNames, value)`.

### 5.6 `useOrdersStore` (`stockos_orders`)

Gestiona pedidos a proveedores. Incluye migración de clave legacy `stockos_pedidos` y de campos en español (`nombre→name`, `estado→status`, `monto→amount`, `enCurso→active`).

**Estado:**

| Ref | Tipo | Descripción |
|---|---|---|
| `orders` | `Order[]` | Lista de pedidos |
| `pendingDeleteOrder` | `Order\|null` | Pedido en espera de borrado |

**Computed:**

| Computed | Descripción |
|---|---|
| `activeOrders` | Pedidos con `active: true` |
| `orderHistory` | Pedidos con `active: false` |

**Modelo Order:**

```js
{ id, name, ref, status, amount, color, active }
```

### 5.7 `useCurrencyStore`

Sin persistencia. Se inicializa al montar el store con `fetchExchangeRate()`.

**Lógica de tipo de cambio:**
1. Consulta `https://uy.dolarapi.com/v1/cotizaciones/usd` (fuente primaria REST)
2. Fallback: SOAP al BCU (`cotizaciones.bcu.gub.uy`), moneda 2225 (USD), últimos 5 días
3. Si ambas fallan, mantiene el valor por defecto `42.5`

**Estado:** `currency` (`'UYU'|'USD'`), `exchangeRate`, `exchangeRateSource`, `priceListValidity` (YYYY-MM).

**Funciones:**

| Función | Descripción |
|---|---|
| `toggleCurrency()` | Alterna UYU ↔ USD |
| `setCurrency(val)` | Fuerza UYU o USD |
| `setPriceListValidity(val)` | Actualiza la vigencia de la lista de precios |
| `formatPrice(n)` | Formatea un valor almacenado en UYU |
| `formatProductPrice(n)` | Formatea un valor almacenado en USD (product.cost, product.price) |

---

## 6. Modelo de datos

### Producto

```js
{
  id:          number,       // autoincremental
  sku:         string,       // código de lista de precios
  name:        string,
  brand:       string,       // nombre de la marca (desnormalizado)
  bid:         string,       // id de la marca (FK → Brand.id)
  origin:      string,       // país de origen
  size:        string,       // contenido/tamaño, ej. '190gr'
  unitsPerBox: number,       // unidades por caja (para reposición mínima)
  cost:        number,       // precio de costo IVA incluido (en USD)
  price:       number,       // precio de venta sugerido (en USD)
  discount:    string,       // porcentaje como string ('26', '26+5', etc.)
  stock:       number,
  max:         number,       // stock máximo (para % y color)
  ic:          string,       // clase Tabler Icon, ej. 'ti-salad'
  bg:          string,       // color de fondo del icono (hex)
  col:         string,       // color del icono (hex)
  img:         string|null,  // ruta relativa a /public/products/
  expiry:      string|null,  // ISO YYYY-MM-DD o null
  batch:       string|null,  // número de lote (solo productos clonados a lote)
  category:    string,       // categoría de producto dentro de la marca (desnormalizado)
  _batchOnly:  boolean,      // true si es un clon exclusivo de un lote (no aparece en catálogo normal)
}
```

### Marca

```js
{
  id:     string,   // slug lowercase sin espacios
  name:   string,
  origin: string,
  ic:     string,   // clase de icono Tabler (ej: 'ti-coffee')
  bg:     string,   // color de fondo hex
  col:    string,   // color de acento hex
  prods:  number[], // array de product.id (excluye _batchOnly)
}
```

### Lote — Item (`BatchItem`)

```js
{
  id:          string,   // 'batch_<timestamp>_<productId>'
  productId:   number,   // id del producto clonado (_batchOnly)
  bid:         string,   // id de la marca
  batchNumber: string,   // número/nombre del lote
  expiry:      string,   // YYYY-MM — fecha de vencimiento del lote
  stock:       number,
}
```

### Lote — Carpeta (`BatchFolderMeta`)

```js
{
  batchNumber: string,   // identificador único del lote
  expiry:      string,   // YYYY-MM — fecha de vencimiento
}
```

### Pedido (Order)

```js
{
  id:     number,
  name:   string,    // descripción / proveedor
  ref:    string,    // número de PO
  status: string,    // texto libre descriptivo
  amount: number,    // en UYU
  color:  string,    // hex semántico (ver ORDER_COLORS)
  active: boolean,
}
```

---

## 7. Componentes

### TopBar

Cuatro variantes controladas por la prop `variant`:

| Variante | Uso | Contenido |
|---|---|---|
| `home` | Home, BrandCatalog | Logo, fecha, moneda, FX rate, campanita de alertas, búsqueda opcional |
| `title` | Alerts, Orders, Settings | Título + slot `#actions` |
| `back` | Detalle, formularios | Botón atrás con label configurable + título |
| `breadcrumb` | BatchDetail | Título + nav de migas + slot `#actions` |

Props relevantes: `title`, `breadcrumbs`, `backLabel`, `backTo`, `searchId`, `searchPlaceholder`, `modelValue` (v-model), `showSearch`.

### BottomNav

Navegación de 4 tabs con FAB central expandible (3 opciones: Nuevo producto / Nuevo lote / Nueva categoría).  
Tabs: Inicio `/`, Catálogo `/catalog`, Alertas `/alerts` (con dot indicator), Ajustes `/settings`.  
El active state se resuelve con `route.path.startsWith(to)`, salvo `/` que requiere match exacto.

### ProductCard

Tarjeta de producto con imagen/icono, nombre, contenido (`size`), precio formateado, barra de stock y badges. Soporta tres modos:

- **Modo navegación** (default): click navega a detalle.
- **Modo acciones** (`showActions`): muestra botones Detalle / Editar / Clonar (o Quitar si hay `batchContext`).
- **Modo eliminable** (`deletable`): muestra botón de borrado directo.

Prop `batchContext` shape: `{ itemId: string, batchNum: string }`.

### CatalogCatSep

Separador de categoría con menú de opciones (renombrar, eliminar, migrar marcas). Dos variantes:

- Default: separador completo con label de categoría.
- `icon-only`: solo el botón de engranaje, para usar dentro de acordeones.

### CloneSheet

Sheet modal para clonar un producto a un lote de importación. Permite seleccionar lote existente o crear uno nuevo.

### StockAdjuster

Control de incremento/decremento de stock. Emite `update:modelValue`. Valida rango 0–9999.

### StockBadge

Badge de estado de stock: Sin Stock / Stock Bajo / En Stock.

---

## 8. Composables

### `useAlertNavigation`

Funciones puras (no reactivas) para construir rutas en el contexto del sistema de alertas. El contexto se pasa vía query params al navegar a un producto, para que el botón "Atrás" sepa a dónde volver.

| Función | Descripción |
|---|---|
| `buildAlertProductQuery(ctx)` | Construye el objeto query `{ from, alert, brand?, year?, month? }` |
| `productRouteFromAlerts(id, ctx)` | Retorna el route object completo para navegar a un producto desde alertas |
| `resolveAlertBack(query, product)` | Resuelve el destino del botón "Atrás" según el query activo (soporta `from: 'alerts'` y `from: 'batch'`) |
| `detailPathWithQuery(id, query)` | Construye la ruta de detalle preservando el contexto (alertas o lote) |

### `useAlerts`

Computeds y helpers de alertas, derivados puramente de los refs de `products` y `brands`. Sin estado propio, sin side effects. Usado internamente por `useProductsStore`; no se importa directamente desde componentes.

Expone: `pct`, `isOutOfStock`, `isLowStock`, `isExpiring`, `hasAlert`, `stockColor`, `alerts`, `outOfStockAlerts`, `lowStockAlerts`, `expiryAlerts`, `alertBrands`, `outOfStockBrands`, `lowStockBrands`, `expiryTree`, `expiryYears`, `expiryMonths`, `expiryBrands`, `expiryProducts`.

### `useDtoSelector`

Gestiona el campo de descuento en los formularios de producto (NewProduct, EditProduct). Soporta valores preset (de `useDiscountsStore`) y un campo libre (`custom`) con validación de rango 1–100.

| Función / Ref | Descripción |
|---|---|
| `discountMode` | `'preset'` o `'custom'` |
| `customDiscountValue` | Valor crudo del input libre |
| `discountSelectValue` | Computed para el `<select>` |
| `initFromValue(val)` | Inicializa el modo desde un valor existente |
| `onDiscountChange(e)` | Handler del `<select>` |
| `onCustomDiscountInput(e)` | Handler del input libre (sanitiza y clampea) |
| `onCustomDiscountBlur()` | Normaliza el valor al perder foco |
| `resetDiscountToPreset()` | Vuelve al `DEFAULT_PRESET` |

### `useSettingsSheet`

Encapsula el estado y la lógica del sheet de configuración del catálogo (BrandCatalog): búsqueda, renombrado y eliminación de grupos de marcas y marcas individuales.

Recibe `store` (useProductsStore) y `catStore` (useBrandCategoriesStore) como parámetros.

### `useUndo`

Patrón undo genérico: guarda un snapshot, inicia un timer y expone `mark` / `take` / `confirm`.

```js
const { pending, mark, take, confirm } = useUndo(5000) // timeoutMs opcional
```

Usado internamente por todos los stores con soporte de undo. No se importa desde componentes.

---

## 9. Utils

### `alerts.js`

| Función | Descripción |
|---|---|
| `parseExpiry(expiry)` | Parsea `YYYY-MM-DD` → `{ year, month, monthKey }` o `null` |
| `monthLabel(month)` | Número de mes → nombre en español |
| `expirySortKey(expiry)` | Retorna timestamp para ordenar fechas |
| `formatTodayDate()` | Fecha de hoy en formato `DD/MM/YYYY` |
| `formatExpiryDate(expiry)` | Fecha de vencimiento en formato largo (es) |
| `formatExpiry(yyyymm)` | Convierte `YYYY-MM` → `MM/YYYY` |
| `expiryBadgeClass(yyyymm)` | Clase CSS del badge según días hasta vencimiento |
| `expiryBadgeLabel(yyyymm)` | Texto del badge de vencimiento (`Vencido`, `Próximo`, `OK`, etc.) |
| `matchesProductSearch(p, q)` | Filtra un producto por nombre, SKU o marca |
| `matchesBrandSearch(brand, q, prods)` | Filtra una marca por nombre o productos |

---

## 10. Sistema de estilos

Arquitectura basada en **7-1 simplificado** con capas Sass `@use` / `@forward`.

```
styles/
├── main.scss           # @use de las 4 capas
├── abstracts/
│   ├── _variables.scss # Tokens: colores, tipografía, spacing, radios, sombras, z-index, dimensiones UI
│   ├── _mixins.scss    # flex-row/col/list/center/between, font-display/mono/label, card-base, screen-layout...
│   ├── _functions.scss # Funciones Sass auxiliares
│   └── _index.scss     # @forward de los tres anteriores
├── base/               # Reset, tipografía base
├── layout/             # _topbar.scss, _bottom-nav.scss, _screen.scss
├── components/
│   ├── _cards.scss, _buttons.scss, _badges.scss, _forms.scss
│   ├── _sheets.scss, _toast.scss, _alert-banner.scss, _stats.scss, _stock-bar.scss
│   └── cards/          # _brand-row, _brand-search, _brand-summary, _brand-toolbar, _order-row, _product-card
└── views/
    ├── _home, _catalog, _detail, _orders, _alerts, _forms, _settings
    └── catalog/        # _batch-detail, _batch-folders, _brand-row-selectable, _cat-accordion,
                        # _cat-sep, _catalog-action-bar, _catalog-tabs, _settings-sheet
```

**Convenciones:**
- Nomenclatura BEM: `.bloque__elemento--modificador`
- Anidado SCSS con `&` para modificadores y pseudo-selectores
- Sin CSS en archivos `.vue`
- Variables de diseño disponibles globalmente vía `@use 'abstracts' as *`
- Dark mode como modo único (no hay toggle; todos los colores son del sistema oscuro)

**Paleta semántica principal:**

| Token | Color | Uso |
|---|---|---|
| `$color-danger` | `#c2354e` | Sin stock, acciones destructivas |
| `$color-warning` | `#c8762a` | Stock bajo |
| `$color-success` | `#2D8A5F` | En stock, recibido |
| `$color-expiry` | `#7b72d4` | Vencimiento |
| `$color-bg-primary` | `#231e19` | Fondo principal |

---

## 11. Persistencia

| Store | Clave localStorage | Estructura |
|---|---|---|
| products | `stockos_v1` | `{ products, brands, catalogExpiry, batches, batchFoldersMeta, brandProductCategories, _seeded: true }` |
| categories | `stockos_categories` | `string[]` (migración automática desde `stockos_v1.categories`) |
| brandCategories | `stockos_brand_categories` | `{ id, name, brandIds }[]` |
| discounts | `stockos_discounts` | `string[]` |
| orders | `stockos_orders` | `{ orders, _seeded: true }` |
| productCatOpen | — | No persiste (estado UI de sesión) |
| currency | — | No persiste (fetch en cada sesión) |

**Seed data:** la primera vez que el usuario abre la app (sin `_seeded` en storage), se carga el seed de `data/products.js` y `data/brands.js`. A partir de entonces, cualquier modificación persiste en localStorage y el seed queda ignorado.

**Migraciones en orders:** al inicializar `useOrdersStore`, se ejecutan `migrateStorage()` (renombra la clave legacy `stockos_pedidos`) y `migrateOrderKeys()` (renombra campos legacy en español a sus equivalentes en inglés).

**Migración en batchFoldersMeta:** al cargar `useProductsStore`, se ejecuta `migrateBatchFoldersMeta()` para normalizar el formato antiguo `{ bid, batchNumber, expiry }` al formato actual `{ batchNumber, expiry }` deduplicando por nombre de lote.

---

## 12. Sistema de alertas

Las alertas son un computed derivado del estado de productos. No hay entidad "alerta" persistida.

**Tres tipos:**

| Tipo | Condición | Ruta |
|---|---|---|
| `out-of-stock` | `product.stock === 0` | `/alerts/out-of-stock[/:brandId]` |
| `low-stock` | `stock > 0 && pct < 25%` | `/alerts/low-stock[/:brandId]` |
| `expiry` | `product.expiry != null` | `/alerts/expiry[/:year[/:month[/:brandId]]]` |

**Árbol de vencimientos (`expiryTree`):**  
Estructura `year → monthKey (MM) → brandId → Product[]` construida en computed. Las vistas de `/alerts/expiry` navegan incrementalmente por este árbol usando los params de ruta.

**Contexto de alerta en navegación:**  
Al navegar desde una lista de alertas a un producto (`Detail.vue`), se adjuntan query params `?from=alerts&alert=out-of-stock&brand=elavion[&year=2025&month=06]`. `resolveAlertBack()` los lee para reconstruir el breadcrumb de vuelta correcto.

Al navegar desde un lote (`BatchBrandDetail.vue`), el contexto es `?from=batch&batchNum=<number>`. `resolveAlertBack()` también lo maneja.

---

## 13. Sistema de lotes

Los lotes de importación permiten agrupar productos por número de lote y fecha de vencimiento para seguimiento de stock.

**Modelo:**
- **`BatchFolderMeta`**: metadato ligero de una carpeta de lote (`batchNumber + expiry`). Sin duplicados.
- **`BatchItem`**: un producto concreto dentro de un lote (`bid`, `batchNumber`, `expiry`, `stock`). Referencia a un producto clonado con `_batchOnly: true`.

**Flujo de creación:**
1. El usuario clona un producto existente a un lote vía `CloneSheet`.
2. `cloneToBatch()` crea un nuevo producto con `_batchOnly: true` y su correspondiente `BatchItem`.
3. Si el lote no existe, también crea la `BatchFolderMeta`.

**Rutas:**
- `/catalog?tab=batches` — lista de carpetas de lote en `BrandCatalog`
- `/catalog/batch/:batchNumber` — detalle de una carpeta con grupos por marca (`BatchDetail`)
- `/catalog/batch/:batchNumber/:brandId` — productos de una marca dentro del lote (`BatchBrandDetail`)

**FAB → "Nuevo lote":** navega a `/catalog?tab=batches&newBatch=1`, que abre el sheet de creación directamente.

---

## 14. Despliegue

```
npm run build   →   dist/          (assets con hashes de contenido)
capacitor sync  →   android/       (proyecto Android Studio)
capacitor open android             (abrir para firmar y exportar APK)
```

La app corre completamente **offline** (sin backend). Toda la lógica, datos y persistencia son client-side.

---

## 15. Decisiones de diseño relevantes

**Hash history sobre HTML5 history:** necesario para que Capacitor pueda servir el `index.html` como entry point sin servidor HTTP que reescriba URLs.

**Desnormalización brand name en producto:** `product.brand` almacena el nombre de la marca además de `product.bid` (el id). Evita lookups en cada render de lista. `editProduct()` y `editBrandName()` actualizan ambos campos cuando cambia la marca.

**`brand.prods` como array de IDs:** las marcas llevan una lista de sus product IDs. Es una relación bidireccional mantenida manualmente. Solo incluye productos regulares (excluye `_batchOnly`). Requiere atención en `addProduct`, `editProduct`, `markDelete` y `markDeleteBrand`.

**Patrón undo con timer:** en lugar de dialogs de confirmación, se elimina inmediatamente y se ofrece deshacer durante 5 segundos vía toast. El snapshot del ítem eliminado se guarda en una `ref` dedicada. Si el usuario no actúa, `confirm*()` limpia el snapshot.

**Stores sin `actions` explícitas:** se usan funciones directas en el scope del setup store, no el patrón `actions:{}` de Options API. Más idiomático con Composition API.

**`useProductsStore` como fachada:** re-exporta la API de `useCategoriesStore` para que los componentes no necesiten importar dos stores distintos en la mayoría de los casos. Las categorías de producto (`useCategoriesStore`) y los grupos de marcas (`useBrandCategoriesStore`) son stores independientes con sus propias claves de localStorage.

**Precios en USD, pedidos en UYU:** `product.cost` y `product.price` se almacenan en USD y se formatean con `currencyStore.formatProductPrice()`. Los montos de pedido (`order.amount`) se almacenan en UYU y se formatean con `currencyStore.formatPrice()`.