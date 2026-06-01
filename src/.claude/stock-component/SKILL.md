---
name: stock-component
description: "Guía de uso de los componentes UI y rutas en stock-os"
---

# SKILL: Componentes UI y Rutas — stock-os

## Cuándo aplicar este skill
Siempre que construyas o modifiques una vista: para saber qué componentes reutilizables usar, sus props exactas, y cómo configurar la navegación correctamente.

---

## Mapa de rutas

| Ruta | Componente | Params | TopBar variant | Back |
|---|---|---|---|---|
| `/` | Home | — | `home` | — |
| `/catalogo` | BrandCatalog | — | `home` | — |
| `/catalogo/:brandId` | ProductCatalog | `brandId` (string) | `back` → `/catalogo` |
| `/producto/nuevo` | NewProduct | — | `back` → `/catalogo` |
| `/producto/:id` | Detail | `id` (string→number) | `back` → `/catalogo/${producto.bid}` |
| `/producto/:id/editar` | EditProduct | `id` (string→number) | `back` → `/producto/${producto.id}` |
| `/alertas` | BrandAlerts | — | `title` | — |
| `/alertas/:brandId` | ProductAlerts | `brandId` (string) | `back` → `/alertas` |
| `/pedidos` | Orders | — | `title` | — |
| `/pedidos/nuevo` | NewOrder | — | `back` → `/pedidos` |
| `/pedidos/:id/editar` | EditOrder | `id` (string→number) | `back` → `/pedidos` |
| `/ajustes` | Settings | — | `title` | — |

### Notas de navegación
- `route.params.id` llega como `string` — convertir con `Number(id)` o `store.getProducto(route.params.id)` (el getter ya lo maneja).
- `route.params.brandId` es `string` y coincide directamente con `brand.id`.
- Después de eliminar un producto: navegar a `/catalogo/${bid}` (guardar `bid` antes de eliminar).
- Después de guardar un producto nuevo: navegar a `/catalogo/${form.bid}`.

---

## BrandRow

Fila de marca con icono, nombre, meta, stripe de color y slot de badges.

```vue
<BrandRow
  :brand="brand"
  :to="`/catalogo/${brand.id}`"
  :meta="`${getByBrand(brand.id).length} productos · ${brand.origen}`"
  :stripe="brandStripe(brand.id)"
>
  <template #badges>
    <span v-if="hasSinStock(brand.id)"  class="badge badge--out"><i class="ti ti-ban"></i>Sin stock</span>
    <span v-if="hasStockBajo(brand.id)" class="badge badge--low"><i class="ti ti-alert-circle"></i>Stock bajo</span>
    <span v-if="hasVenc(brand.id)"      class="badge badge--venc"><i class="ti ti-clock"></i>Por vencer</span>
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

## ProductCard

Tarjeta de producto con icono, nombre, SKU, precios, barra de stock y badges.

```vue
<ProductCard :producto="producto" />
```

| Prop | Tipo | Requerida | Notas |
|---|---|---|---|
| `producto` | Object | ✓ | Objeto producto completo |

El componente maneja internamente la navegación a `/producto/${producto.id}` y consume `useProductosStore` y `useCurrencyStore`. No requiere nada más desde la vista.

---

## StockBadge

Badge inline del estado de stock de un producto. Muestra uno de: Sin stock / Stock bajo / En stock.

```vue
<StockBadge :producto="producto" />
```

| Prop | Tipo | Requerida | Notas |
|---|---|---|---|
| `producto` | Object | ✓ | Objeto producto completo |

Consume `useProductosStore` internamente para calcular `pct`. No acepta slots.

---

## StockAdjuster

Control de ajuste de stock con input numérico, botones +/− y barra de progreso opcional.

```vue
<!-- En formularios de edición (con barra) -->
<StockAdjuster
  v-model="form.stock"
  label="Unidades actuales"
  :max="producto.max"
  :show-bar="true"
  input-id="ep-stock"
/>

<!-- En formularios de creación (sin barra) -->
<StockAdjuster
  v-model="form.stock"
  label="Unidades en stock"
  hint="Podés actualizar el stock después desde el detalle"
  input-id="np-stock"
/>
```

| Prop | Tipo | Default | Notas |
|---|---|---|---|
| `modelValue` | Number | — (requerida) | Valor actual via v-model |
| `label` | String | `'Unidades en stock'` | Texto de la etiqueta |
| `hint` | String | `''` | Texto de ayuda debajo del control |
| `max` | Number | `0` | Capacidad máxima; necesario para la barra |
| `showBar` | Boolean | `false` | Muestra barra de progreso y números de capacidad |
| `inputId` | String | `'stock-input'` | `id` y `name` del input numérico |

Emite `update:modelValue` con el nuevo valor numérico.

---

## StatCard

Tarjeta de estadística con label, valor, subtexto y barra de color.

```vue
<StatCard
  label="TOTAL SKU"
  :value="totalProds"
  :sub="`${store.brands.length} marcas activas`"
  color="blue"
/>
```

| Prop | Tipo | Default | Notas |
|---|---|---|---|
| `label` | String | — (requerida) | Texto superior en mayúsculas |
| `value` | String \| Number | — (requerida) | Valor principal |
| `sub` | String | `''` | Texto secundario debajo del valor |
| `color` | String | `'primary'` | Color de la barra inferior: `'blue'` \| `'success'` \| `'danger'` \| `'primary'` |
| `valueClass` | String | `''` | Clase extra sobre el valor, ej. `'stat-card__value--sm'` o `'stat-card__value--danger'` |

Las tarjetas se disponen en `.stat-grid` (grid de 2×2):
```vue
<div class="stat-grid">
  <StatCard ... />
  <StatCard ... />
  <StatCard ... />
  <StatCard ... />
</div>
```

---

## Clases de botones

```vue
<!-- Botón primario — ancho completo, altura lg -->
<button class="btn btn--primary" @click="guardar">
  <i class="ti ti-device-floppy" aria-hidden="true"></i>Guardar
</button>

<!-- Botón secundario — ancho completo, altura md -->
<button class="btn btn--secondary" @click="cancelar">Cancelar</button>

<!-- Botón de peligro — ancho completo, altura md -->
<button class="btn btn--danger" @click="eliminar">
  <i class="ti ti-trash" aria-hidden="true"></i>Sí, eliminar
</button>

<!-- Botón icono (TopBar actions) -->
<button class="icon-btn" aria-label="Editar">
  <i class="ti ti-edit" aria-hidden="true"></i>
</button>

<!-- Botón nuevo (TopBar actions, junto a título) -->
<button class="btn-new" aria-label="Nuevo pedido" @click="$router.push('/pedidos/nuevo')">
  <i class="ti ti-plus" aria-hidden="true"></i>Nuevo
</button>
```

Los botones de acción principal van siempre dentro de `.btn-group` al pie de la vista:
```vue
<div class="btn-group">
  <button class="btn btn--primary" ...>Guardar</button>
  <button class="btn btn--secondary" ...>Cancelar</button>
</div>
```

---

## Espaciadores

```vue
<div class="spacer--xs"></div>  <!-- 8px  — entre secciones dentro de un bloque -->
<div class="spacer--sm"></div>  <!-- 12px — al final del scroll-content -->
<div class="spacer--md"></div>  <!-- 16px -->
<div class="spacer--lg"></div>  <!-- 24px -->
```

Siempre incluir `<div class="spacer--sm"></div>` justo antes del cierre de `.scroll-content` para que el contenido no quede pegado al `.btn-group` o al `BottomNav`.

---

## section-label

Título de sección entre bloques de contenido:

```vue
<p class="section-label">Identificación</p>
```

Aplica `font-label` (mono, xs, uppercase, color terciario) con padding lateral estándar. No uses `<h2>` ni `<h3>` para estos separadores.

---

## Idioma del código
Todo identificador nuevo — clases CSS, ids, nombres de variables, funciones, props y emits —
se escribe en **inglés**, siguiendo el patrón ya establecido en el proyecto.

---

## Checklist antes de entregar

- [ ] ¿Usé `ProductCard` en lugar de replicar la tarjeta manualmente?
- [ ] ¿Usé `StockBadge` en lugar de replicar la lógica de badge?
- [ ] ¿Pasé `input-id` a `StockAdjuster` con el prefijo correcto de la vista?
- [ ] ¿El `back-to` de `TopBar` apunta a la ruta correcta según el mapa?
- [ ] ¿Incluí `<div class="spacer--sm"></div>` al final del `scroll-content`?
- [ ] ¿Los botones de acción están dentro de `.btn-group`?
- [ ] ¿Usé `.section-label` con `<p>` en lugar de headings?