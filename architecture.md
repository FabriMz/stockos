# StockOS — Documentación de Arquitectura

**Versión analizada:** 0.1.0  
**Fecha:** mayo 2026  
**Cliente:** Compañía de Indias  

---

## 1. Visión general

StockOS es una SPA mobile-first construida con Vue 3 + Vite, desplegable como aplicación nativa Android vía Capacitor. Gestiona el inventario de productos importados: stock, alertas de reposición, vencimientos y pedidos a proveedores.

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
│   ├── products.js           # Estado central de productos, marcas y categorías
│   ├── orders.js             # Estado de pedidos a proveedores
│   └── currency.js           # Moneda activa + tipo de cambio UYU/USD
│
├── views/                    # Páginas (lazy-loaded por el router)
│   ├── Home.vue
│   ├── BrandCatalog.vue
│   ├── ProductCatalog.vue
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
│   │   ├── TopBar.vue        # Barra superior (3 variantes)
│   │   └── BottomNav.vue     # Navegación inferior con FAB
│   └── ui/
│       ├── ProductCard.vue
│       ├── BrandRow.vue
│       ├── AlertFolderRow.vue
│       ├── AlertSearchBar.vue
│       ├── StockAdjuster.vue
│       ├── StockBadge.vue
│       └── StatCard.vue
│
├── composables/
│   ├── useAlertNavigation.js # Builders de rutas para contexto de alertas
│   └── useDtoSelector.js     # Lógica de selector de descuento (preset / custom)
│
├── utils/
│   └── alerts.js             # parseExpiry, monthLabel, matchesProductSearch, etc.
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
    ├── components/           # cards, buttons, badges, forms, toast, etc.
    └── views/                # Estilos por vista (home, detail, catalog, etc.)
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
| `/catalog/:brandId` | ProductCatalog | brandId: string |
| `/product/new` | NewProduct | — |
| `/product/:id` | Detail | id: string→Number |
| `/product/:id/edit` | EditProduct | id: string→Number |
| `/alerts` | BrandAlerts | — |
| `/alerts/sin-stock` | AlertCategoryBrands | meta.alertType |
| `/alerts/sin-stock/:brandId` | AlertCategoryProducts | brandId, meta.alertType |
| `/alerts/stock-bajo` | AlertCategoryBrands | meta.alertType |
| `/alerts/stock-bajo/:brandId` | AlertCategoryProducts | brandId, meta.alertType |
| `/alerts/expiry` | AlertExpiry | — |
| `/alerts/expiry/:year` | AlertExpiry | year |
| `/alerts/expiry/:year/:month` | AlertExpiry | year, month |
| `/alerts/expiry/:year/:month/:brandId` | AlertExpiry | year, month, brandId |
| `/settings` | Settings | — |
| `/orders` | Orders | — |
| `/orders/new` | NewOrder | — |
| `/orders/:id/edit` | EditOrder | id |

> **Nota:** existe un bloque de redirects de las rutas antiguas en español (`/catalogo`, `/producto/:id`, `/alertas`, etc.) para mantener compatibilidad con deep links previos.

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
| `categories` | `string[]` | Categorías de producto |
| `pendingDelete` | `Product\|null` | Producto en espera de confirmación de borrado |
| `pendingDeleteBrand` | `Brand\|null` | Marca en espera |
| `pendingDeleteCategory` | `{name,_idx}\|null` | Categoría en espera |
| `productUpdated` | `boolean` | Flag para toast de edición exitosa |

**Computed clave:**

| Computed | Descripción |
|---|---|
| `alerts` | Todos los productos con alguna alerta activa |
| `outOfStockAlerts` | Productos con stock = 0 |
| `lowStockAlerts` | Productos con stock > 0 y pct < 25% |
| `expiryAlerts` | Productos con fecha de vencimiento |
| `alertBrands` | Marcas que tienen al menos un producto con alerta |
| `outOfStockBrands` | Marcas con al menos un producto sin stock |
| `lowStockBrands` | Marcas con al menos un producto con stock bajo |
| `expiryTree` | Árbol `{ year → monthKey → brandId → Product[] }` |
| `expiryYears` | Años presentes en el árbol, ordenados |
| `sortedBrands` | Marcas ordenadas alfabéticamente (es) |
| `sortedCategories` | Categorías ordenadas alfabéticamente (es) |

**Funciones de escritura:**

- `addProduct(prod)` / `editProduct(id, data)` — maneja el re-linkeo de marcas en edición
- `updateStock(id, qty)` — actualización directa de stock
- `addBrand(name)` / `deleteBrand(id)` — solo elimina si `prods.length === 0`
- `addCategory(name)` / `deleteCategory(name)`
- `markDelete` / `undoDelete` / `confirmDelete` — patrón undo para productos
- `markDeleteBrand` / `undoDeleteBrand` / `confirmDeleteBrand` — patrón undo para marcas
- `markDeleteCategory` / `undoDeleteCategory` / `confirmDeleteCategory`

**Patrón undo:** al invocar `markDelete*`, el ítem se elimina inmediatamente del array y se guarda un snapshot con `_idx`. Se inicia un timer de 5 segundos. Si el usuario presiona "Deshacer", el ítem se reinserta en su posición original. Al expirar el timer, se limpia el snapshot.

### 5.2 `useOrdersStore` (`stockos_orders`)

Gestiona pedidos a proveedores. Incluye migración de claves legacy (`nombre→name`, `estado→status`, etc.).

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

### 5.3 `useCurrencyStore`

Sin persistencia. Se inicializa al montar la app con `fetchExchangeRate()`.

**Lógica de tipo de cambio:**
1. Consulta `https://uy.dolarapi.com/v1/cotizaciones/usd` (fuente primaria REST)
2. Fallback: SOAP al BCU (`cotizaciones.bcu.gub.uy`), moneda 2225 (USD), últimos 5 días
3. Si ambas fallan, mantiene el valor por defecto `42.5`

**Funciones:**

| Función | Descripción |
|---|---|
| `toggleCurrency()` | Alterna UYU ↔ USD |
| `setCurrency(val)` | Fuerza UYU o USD |
| `formatPrice(n)` | Formatea un valor almacenado en UYU |
| `formatProductPrice(n)` | Formatea un valor almacenado en USD (product.cost, product.price) |

---

## 6. Modelo de datos

### Producto

```js
{
  id:     number,       // autoincremental
  name:   string,
  sku:    string,
  brand:  string,       // nombre de la marca (desnormalizado)
  bid:    string,       // id de la marca (FK)
  cat:    string,       // categoría
  stock:  number,
  max:    number,       // stock máximo (para % y color)
  cost:   number,       // en USD
  price:  number,       // en USD
  discount: string,     // porcentaje como string ('26', '26+5', etc.)
  expiry: string|null,  // ISO YYYY-MM-DD o null
  img:    string|null,  // ruta relativa a /public/products/
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
  prods:  number[], // array de product.id
}
```

### Pedido (Order)

```js
{
  id:     number,
  name:   string,
  ref:    string,   // número de PO
  status: string,   // texto libre descriptivo
  amount: number,   // en UYU
  color:  string,   // hex semántico (ver ORDER_COLORS)
  active: boolean,
}
```

---

## 7. Componentes

### TopBar

Tres variantes controladas por la prop `variant`:

| Variante | Uso | Contenido |
|---|---|---|
| `home` | Home, BrandCatalog | Logo, fecha, moneda, FX rate, campanita de alertas |
| `title` | Alerts, Orders, Settings | Título + slot `#actions` |
| `back` | Resto de vistas | Botón atrás con label configurable + título + slot `#actions` |

Props relevantes: `backLabel`, `backTo`, `searchId`, `searchPlaceholder`, `modelValue` (v-model), `showSearch`.

### BottomNav

Navegación de 4 tabs con FAB central (+Nuevo producto).  
Tabs: Inicio `/`, Catálogo `/catalog`, Alertas `/alerts` (con dot indicator), Ajustes `/settings`.  
El active state se resuelve con `route.path.startsWith(to)`, salvo `/` que requiere match exacto.

### ProductCard

Tarjeta de producto con imagen, nombre, SKU, stock badge, barra de stock y precio formateado. Usa `useCurrencyStore` para el formateo.

### StockAdjuster

Control de incremento/decremento de stock. Emite `update:modelValue`. Valida rango 0–9999.

### StockBadge

Muestra estado de stock como badge coloreado: Sin Stock / Stock Bajo / En Stock.

---

## 8. Composables

### `useAlertNavigation`

Funciones puras (no reactivas) para construir rutas en el contexto del sistema de alertas. El sistema de alertas pasa contexto vía query params al navegar a un producto, para que el botón "Atrás" sepa a dónde volver.

| Función | Descripción |
|---|---|
| `buildAlertProductQuery(ctx)` | Construye el objeto query `{ from, alert, brand?, year?, month? }` |
| `productRouteFromAlerts(id, ctx)` | Retorna el route object completo para navegar a un producto desde alertas |
| `resolveAlertBack(query, product)` | Resuelve el destino del botón "Atrás" según el query activo |
| `detailPathWithQuery(id, query)` | Construye la ruta de detalle preservando el contexto de alertas |

### `useDtoSelector`

Gestiona el campo de descuento en los formularios de producto (NewProduct, EditProduct). Soporta valores preset (`26`, `26+5`) y un campo libre (`custom`) con validación de rango 1–100.

| Función / Ref | Descripción |
|---|---|
| `discountMode` | `'preset'` o `'custom'` |
| `customDiscountValue` | Valor crudo del input libre |
| `discountSelectValue` | Computed para el `<select>` |
| `initFromValue(val)` | Inicializa el modo desde un valor existente |
| `onDiscountChange(e)` | Handler del `<select>` |
| `onCustomDiscountInput(e)` | Handler del input libre |
| `onCustomDiscountBlur()` | Normaliza el valor al perder foco |
| `resetDiscountToPreset()` | Vuelve al preset por defecto (`26`) |

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
├── components/         # _cards, _buttons, _badges, _forms, _toast, _alert-banner, _stats, _stock-bar
└── views/              # Un partial por vista (_home, _catalog, _detail, _orders, _alerts, _forms, _settings)
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
| products | `stockos_v1` | `{ products, brands, categories, _seeded: true }` |
| orders | `stockos_orders` | `{ orders, _seeded: true }` |
| currency | — | No persiste (fetch en cada sesión) |

**Seed data:** la primera vez que el usuario abre la app (sin `_seeded` en storage), se carga el seed de `data/products.js` y `data/brands.js`. A partir de entonces, cualquier modificación persiste en localStorage y el seed queda ignorado.

**Migración de orders:** al inicializar `useOrdersStore`, se ejecutan `migrateStorage()` (renombra la clave legacy `stockos_pedidos`) y `migrateOrderKeys()` (renombra campos legacy `nombre/estado/monto/enCurso` a `name/status/amount/active`).

---

## 12. Sistema de alertas

Las alertas son un computed derivado del estado de productos. No hay entidad "alerta" persistida.

**Tres tipos:**

| Tipo | Condición | Ruta |
|---|---|---|
| `sin-stock` | `product.stock === 0` | `/alerts/sin-stock[/:brandId]` |
| `stock-bajo` | `stock > 0 && pct < 25%` | `/alerts/stock-bajo[/:brandId]` |
| `expiry` | `product.expiry != null` | `/alerts/expiry[/:year[/:month[/:brandId]]]` |

**Árbol de vencimientos (`expiryTree`):**  
Estructura `year → monthKey (MM) → brandId → Product[]` construida en computed. Las vistas de `/alerts/expiry` navegan incrementalmente por este árbol usando los params de ruta.

**Contexto de alerta en navegación:**  
Al navegar desde una lista de alertas a un producto (`Detail.vue`), se adjuntan query params `?from=alerts&alert=sin-stock&brand=elavion[&year=2025&month=06]`. `resolveAlertBack()` los lee para reconstruir el breadcrumb de vuelta correcto.

---

## 13. Despliegue

```
npm run build   →   dist/          (assets con hashes de contenido)
capacitor sync  →   android/       (proyecto Android Studio)
capacitor open android             (abrir para firmar y exportar APK)
```

La app corre completamente **offline** (sin backend). Toda la lógica, datos y persistencia son client-side.

---

## 14. Decisiones de diseño relevantes

**Hash history sobre HTML5 history:** necesario para que Capacitor pueda servir el `index.html` como entry point sin servidor HTTP que reescriba URLs.

**Desnormalización brand name en producto:** `product.brand` almacena el nombre de la marca además de `product.bid` (el id). Evita lookups en cada render de lista. `editProduct()` actualiza ambos campos cuando cambia la marca.

**`brand.prods` como array de IDs:** las marcas llevan una lista de sus product IDs. Es una relación bidireccional mantenida manualmente. Requiere atención en `addProduct`, `editProduct`, `markDelete` y `markDeleteBrand` para mantener la coherencia.

**Patrón undo con timer:** en lugar de dialogs de confirmación, se elimina inmediatamente y se ofrece deshacer durante 5 segundos via toast. El snapshot del ítem eliminado se guarda en una `ref` dedicada (`pendingDelete*`). Si el usuario no actúa, `confirmDelete*()` limpia el snapshot.

**Stores sin `actions` explícitas:** se usan funciones directas en el scope del setup store, no el patrón `actions:{}` de Options API. Más idiomático con Composition API.