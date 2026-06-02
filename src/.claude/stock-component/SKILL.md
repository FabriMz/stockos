---
name: stock-component
description: "Guía de uso de los componentes UI y rutas en stock-os"
---

# SKILL: Componentes UI y Rutas — stock-os

## Cuándo aplicar este skill
Siempre que construyas o modifiques una vista: para saber qué componentes reutilizables usar, sus props exactas, y cómo configurar la navegación correctamente.

---

## Mapa de rutas

| Ruta | Vista | Params | TopBar variant |
|---|---|---|---|
| `/` | Home | — | `home` |
| `/catalog` | BrandCatalog | — | `home` |
| `/catalog/:brandId` | ProductCatalog | `brandId` (string) | `back` → `/catalog` |
| `/catalog/batch/:batchNumber` | BatchDetail | `batchNumber` (string) | `breadcrumb` |
| `/catalog/batch/:batchNumber/:brandId` | BatchBrandDetail | `batchNumber`, `brandId` | `breadcrumb` |
| `/product/new` | NewProduct | — | `back` → `/catalog` |
| `/product/:id` | Detail | `id` (string→number) | `back` → `/catalog/${product.bid}` |
| `/product/:id/edit` | EditProduct | `id` (string→number) | `back` → `/product/${product.id}` |
| `/alerts` | BrandAlerts | — | `title` |
| `/alerts/out-of-stock` | AlertCategoryBrands | — | `back` → `/alerts` |
| `/alerts/out-of-stock/:brandId` | AlertCategoryProducts | `brandId` | `back` → `/alerts/out-of-stock` |
| `/alerts/low-stock` | AlertCategoryBrands | — | `back` → `/alerts` |
| `/alerts/low-stock/:brandId` | AlertCategoryProducts | `brandId` | `back` → `/alerts/low-stock` |
| `/alerts/expiry` | AlertExpiry | — | `back` → `/alerts` |
| `/alerts/expiry/:year` | AlertExpiry | `year` | `breadcrumb` |
| `/alerts/expiry/:year/:month` | AlertExpiry | `year`, `month` | `breadcrumb` |
| `/alerts/expiry/:year/:month/:brandId` | AlertExpiry | `year`, `month`, `brandId` | `breadcrumb` |
| `/settings` | Settings | — | `title` |

### Notas de navegación
- `route.params.id` llega como `string` — convertir con `Number(id)` o usar `store.getProduct(route.params.id)` (el getter ya lo maneja).
- `route.params.brandId` es `string` y coincide directamente con `brand.id`.
- Las rutas en español (`/catalogo`, `/alertas`, etc.) son solo redirects legacy — nunca generes código apuntando a ellas.
- Las rutas de alertas usan `meta.alertType` (`'out-of-stock'` | `'low-stock'`) para que `AlertCategoryBrands` y `AlertCategoryProducts` sepan qué tipo mostrar.
- Después de eliminar un producto: navegar a `/catalog/${bid}` (guardar `bid` antes de eliminar).
- Después de guardar un producto nuevo: navegar a `/catalog/${form.bid}`.

---

## TopBar — cuatro variantes

```vue
<!-- Home / Catálogo: barra con búsqueda -->
<TopBar
  variant="home"
  search-id="mi-search"
  search-placeholder="Buscar…"
  v-model="searchQuery"
/>

<!-- Alertas / Pedidos / Ajustes: solo título -->
<TopBar variant="title" title="Mi sección">
  <template #actions>
    <button class="icon-btn" aria-label="Acción">
      <i class="ti ti-plus" aria-hidden="true"></i>
    </button>
  </template>
</TopBar>

<!-- Detalle / Formulario: botón atrás -->
<TopBar
  variant="back"
  back-label="Catálogo"
  back-to="/catalog"
  title="Detalle"
>
  <template #actions>
    <button class="icon-btn" aria-label="Editar">
      <i class="ti ti-edit" aria-hidden="true"></i>
    </button>
  </template>
</TopBar>

<!-- Vistas multi-nivel (lotes, vencimientos): breadcrumbs -->
<TopBar
  variant="breadcrumb"
  title="Lote 03"
  :breadcrumbs="[
    { label: 'Catálogo', to: '/catalog' },
    { label: 'Lote 03', to: `/catalog/batch/${batchNumber}` },
  ]"
>
  <template #actions>...</template>
</TopBar>
```

| Prop | Tipo | Default | Notas |
|---|---|---|---|
| `variant` | String | `'title'` | `'home'` \| `'title'` \| `'back'` \| `'breadcrumb'` |
| `title` | String | `''` | Texto del título |
| `backLabel` | String | `'Atrás'` | Texto del botón atrás (variante `back`) |
| `backTo` | String | `''` | Ruta destino; si vacío, usa `router.back()` |
| `breadcrumbs` | Array | `[]` | Array de `{ label: string, to: string }` (variante `breadcrumb`) |
| `searchId` | String | `'topbar-search'` | `id` del input (solo variante `home`) |
| `searchPlaceholder` | String | `'Buscar…'` | Placeholder del input |
| `modelValue` | String | `''` | v-model del campo de búsqueda |

---

## BrandRow

Fila de marca con icono, nombre, meta, stripe de color y slot de badges.

```vue
<BrandRow
  :brand="brand"
  :to="`/catalog/${brand.id}`"
  :meta="`${getByBrand(brand.id).length} productos · ${brand.origin}`"
  :stripe="brandStripe(brand.id)"
>
  <template #badges>
    <span v-if="store.outOfStockBrands.some(b => b.id === brand.id)" class="badge badge--out">
      <i class="ti ti-ban"></i>Sin stock
    </span>
    <span v-if="store.lowStockBrands.some(b => b.id === brand.id)" class="badge badge--low">
      <i class="ti ti-alert-circle"></i>Stock bajo
    </span>
  </template>
</BrandRow>
```

| Prop | Tipo | Requerida | Notas |
|---|---|---|---|
| `brand` | Object | ✓ | Objeto brand completo |
| `to` | String | ✓ | Ruta destino al hacer click |
| `meta` | String | — | Línea secundaria debajo del nombre |
| `stripe` | String | — | Hex del color de la franja lateral; vacío = sin franja |

El slot `#badges` es opcional. Si no se pasa, el área de badges queda vacía.

---

## AlertFolderRow

Fila de carpeta de alerta con icono, etiqueta, meta, stripe y chevron. Navega al hacer click.

```vue
<AlertFolderRow
  label="Sin stock"
  :meta="`${outOfStockBrands.length} marcas afectadas`"
  to="/alerts/out-of-stock"
  icon="ti-ban"
  :icon-bg="$color-danger-bg"
  :icon-color="$color-danger-text"
  stripe="#ef4444"
/>
```

| Prop | Tipo | Default | Notas |
|---|---|---|---|
| `label` | String | (requerida) | Texto principal de la fila |
| `meta` | String | `''` | Texto secundario |
| `to` | String | (requerida) | Ruta destino |
| `icon` | String | `'ti-folder'` | Clase Tabler Icon |
| `iconBg` | String | — | Color de fondo del icono (hex o variable CSS) |
| `iconColor` | String | — | Color del icono |
| `stripe` | String | `''` | Color del stripe lateral (hex); vacío = sin stripe |

---

## AlertSearchBar

Barra de búsqueda para filtrar contenido en vistas de alertas.

```vue
<AlertSearchBar
  v-model="searchQuery"
  input-id="alert-search"
  placeholder="Buscar marca…"
/>
```

| Prop | Tipo | Default | Notas |
|---|---|---|---|
| `modelValue` | String | `''` | v-model |
| `placeholder` | String | `'Buscar en alertas…'` | Placeholder del input |
| `inputId` | String | `'alert-search'` | `id` y `name` del input |

Muestra un botón `×` automáticamente cuando `modelValue` no está vacío.

---

## CatalogCatSep

Separador de categorías en el catálogo con menú de opciones (gear). Tiene dos variantes de uso.

```vue
<!-- Variante icon-only: solo el botón de engranaje (se usa junto al título de sección) -->
<CatalogCatSep
  variant="icon-only"
  :cat-id="cat.id"
  :cat-name="cat.name"
  :show-migrate="true"
  :show-delete="true"
  :show-edit="true"
  @delete="handleDeleteCat"
  @renamed="handleRenamed"
  @toggle-migrate="handleToggleMigrate"
/>
```

| Prop | Tipo | Default | Notas |
|---|---|---|---|
| `catId` | String | (requerida) | Id del grupo de marcas |
| `catName` | String | (requerida) | Nombre del grupo |
| `showMigrate` | Boolean | `false` | Muestra opción "Migrar marcas" |
| `showDelete` | Boolean | `true` | Muestra opción "Eliminar" |
| `showEdit` | Boolean | `true` | Muestra opción "Renombrar" |

Emite: `delete`, `renamed`, `toggle-migrate`.

---

## CloneSheet

Sheet modal para clonar un producto a un lote, o para editar los datos de una carpeta de lote.

```vue
<!-- Modo clonar producto -->
<CloneSheet
  v-model="showCloneSheet"
  :product="selectedProduct"
  @confirm="handleCloneConfirm"
  @cancel="showCloneSheet = false"
/>

<!-- Modo editar carpeta de lote -->
<CloneSheet
  v-model="showEditSheet"
  :edit-batch="batchFolder"
  @confirm="handleEditConfirm"
  @cancel="showEditSheet = false"
/>
```

| Prop | Tipo | Default | Notas |
|---|---|---|---|
| `modelValue` | Boolean | `false` | Controla visibilidad |
| `product` | Object | `null` | Si se pasa, activa modo clonar |
| `editBatch` | Object | `null` | Si se pasa, activa modo editar carpeta |

Emite: `confirm`, `cancel`.

---

## ProductCard

Tarjeta de producto con icono, nombre, SKU, precios, barra de stock y badges.

```vue
<ProductCard :product="product" />
```

| Prop | Tipo | Requerida | Notas |
|---|---|---|---|
| `product` | Object | ✓ | Objeto producto completo |

El componente maneja internamente la navegación a `/product/${product.id}` y consume `useProductsStore` y `useCurrencyStore`. No requiere nada más desde la vista.

---

## StockBadge

Badge inline del estado de stock de un producto.

```vue
<StockBadge :product="product" />
```

| Prop | Tipo | Requerida |
|---|---|---|
| `product` | Object | ✓ |

---

## StockAdjuster

Control de ajuste de stock con input numérico, botones +/− y barra de progreso opcional.

```vue
<!-- Con barra (edición) -->
<StockAdjuster
  v-model="form.stock"
  label="Unidades actuales"
  :max="product.max"
  :show-bar="true"
  input-id="ep-stock"
/>

<!-- Sin barra (creación) -->
<StockAdjuster
  v-model="form.stock"
  label="Unidades en stock"
  hint="Podés actualizar el stock después desde el detalle"
  input-id="np-stock"
/>
```

| Prop | Tipo | Default | Notas |
|---|---|---|---|
| `modelValue` | Number | (requerida) | Valor actual vía v-model |
| `label` | String | `'Unidades en stock'` | Etiqueta |
| `hint` | String | `''` | Texto de ayuda debajo del control |
| `max` | Number | `0` | Capacidad máxima; necesario para la barra |
| `showBar` | Boolean | `false` | Muestra barra de progreso |
| `inputId` | String | `'stock-input'` | `id` y `name` del input |

---

## StatCard

Tarjeta de estadística con label, valor, subtexto y barra de color.

```vue
<div class="stat-grid">
  <StatCard label="TOTAL SKU" :value="totalProds" :sub="`${store.brands.length} marcas`" color="blue" />
  <StatCard label="ALERTAS"   :value="store.alerts.length" color="danger" value-class="stat-card__value--danger" />
</div>
```

| Prop | Tipo | Default | Notas |
|---|---|---|---|
| `label` | String | (requerida) | Texto superior en mayúsculas |
| `value` | String \| Number | (requerida) | Valor principal |
| `sub` | String | `''` | Texto secundario |
| `color` | String | `'primary'` | `'blue'` \| `'success'` \| `'danger'` \| `'primary'` |
| `valueClass` | String | `''` | Clase extra sobre el valor |

---

## Clases de botones

```vue
<!-- Primario -->
<button class="btn btn--primary" @click="save">
  <i class="ti ti-device-floppy" aria-hidden="true"></i>Guardar
</button>

<!-- Secundario -->
<button class="btn btn--secondary" @click="cancel">Cancelar</button>

<!-- Peligro -->
<button class="btn btn--danger" @click="remove">
  <i class="ti ti-trash" aria-hidden="true"></i>Sí, eliminar
</button>

<!-- Icono (TopBar actions) -->
<button class="icon-btn" aria-label="Editar">
  <i class="ti ti-edit" aria-hidden="true"></i>
</button>

<!-- Nuevo (TopBar actions) -->
<button class="btn-new" aria-label="Nuevo pedido" @click="$router.push('/orders/new')">
  <i class="ti ti-plus" aria-hidden="true"></i>Nuevo
</button>
```

Botones de acción principal siempre dentro de `.btn-group` al pie de la vista:
```vue
<div class="btn-group">
  <button class="btn btn--primary" ...>Guardar</button>
  <button class="btn btn--secondary" ...>Cancelar</button>
</div>
```

---

## Espaciadores

```vue
<div class="spacer--xs"></div>  <!-- 8px  -->
<div class="spacer--sm"></div>  <!-- 12px -->
<div class="spacer--md"></div>  <!-- 16px -->
<div class="spacer--lg"></div>  <!-- 24px -->
```

Siempre incluir `<div class="spacer--sm"></div>` justo antes del cierre de `.scroll-content`.

---

## section-label

```vue
<p class="section-label">Identificación</p>
```

Aplica `font-label` (mono, xs, uppercase). Nunca uses `<h2>` ni `<h3>` para estos separadores.

---

## Idioma del código
Todo identificador nuevo — clases CSS, ids, variables, funciones, props y emits — se escribe en **inglés**.

---

## Checklist antes de entregar

- [ ] ¿Las rutas en el código son en inglés (`/catalog`, `/alerts`, `/settings`)?
- [ ] ¿El `back-to` o `breadcrumbs` de `TopBar` apunta a la ruta correcta según el mapa?
- [ ] ¿Usé `AlertFolderRow` para las entradas de carpeta de alerta?
- [ ] ¿Usé `AlertSearchBar` para el filtro en vistas de alertas?
- [ ] ¿Usé `ProductCard` en lugar de replicar la tarjeta manualmente?
- [ ] ¿Pasé `input-id` a `StockAdjuster` con el prefijo correcto de la vista?
- [ ] ¿Incluí `<div class="spacer--sm"></div>` al final del `scroll-content`?
- [ ] ¿Los botones de acción están dentro de `.btn-group`?
- [ ] ¿Usé `.section-label` con `<p>` en lugar de headings?