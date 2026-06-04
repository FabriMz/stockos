---
name: stock-vue
description: Guía de uso de Vue Components en stockOS: estructura, layout, navegación, props y reglas de uso.
---

# SKILL: Vue Components — stock-os

## Cuándo aplicar este skill
Siempre que crees, modifiques o revises un componente `.vue` en este proyecto.

---

## Estructura obligatoria

```vue
<template>
  <!-- markup -->
</template>

<script setup>
// imports, lógica
</script>
```

**Reglas:**
- Siempre `<script setup>` — nunca Options API ni `export default {}`.
- **Nunca `<style>` en archivos `.vue`.** Los estilos viven en `src/styles/`. Ver `stock-scss`.
- **No uses `:style="..."` para colores, tipografía ni espaciados.** Solo para valores dinámicos calculados en JS (posición, background de icono desde datos de la marca, color de stripe desde la store).

---

## Layout estándar de vistas

### Vistas de listado / consulta y detalle
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
    <button class="btn btn--primary" ...>Guardar</button>
    <button class="btn btn--secondary" ...>Cancelar</button>
  </div>
</div>
```

- `BottomNav` se usa en las vistas de lista, alertas, detalle y otras pantallas principales.
- Los formularios no usan `BottomNav`; en su lugar, terminan con una `.btn-group`.
- Para filas de acciones en formularios o vistas internas, también se usa `.btn-group` o `.btn-group.btn-group--row`.

---

## Stores — importación y alias

```js
import { useProductsStore }        from '../stores/products.js'
import { useBrandCategoriesStore } from '../stores/brandCategories.js'
import { useOrdersStore }          from '../stores/orders.js'
import { useCurrencyStore }        from '../stores/currency.js'

const store         = useProductsStore()         // productos, marcas, alertas, lotes
const catStore      = useBrandCategoriesStore()  // grupos de marcas del catálogo
const ordersStore   = useOrdersStore()           // pedidos
const currencyStore = useCurrencyStore()         // moneda y formateo
```

> Nunca instancies dos stores con el mismo nombre de variable en el mismo componente.
> Ver `stockos-stores` para la API completa.

---

## Composables disponibles

Antes de duplicar lógica, comprueba si ya existe un composable:

| Composable | Responsabilidad |
|---|---|
| `useDtoSelector(form)` | Lógica del campo de descuento (preset / custom). Usado en `NewProduct` y `EditProduct`. |
| `useSettingsSheet(store, catStore, options?)` | Estado y lógica del sheet de ajustes (búsqueda, renombrar y eliminar categorías de marca y marcas). |
| `useAlertNavigation` | Helpers para construir rutas de alertas y resolver el botón "volver" desde el detalle de producto. |

### Uso de `useDtoSelector`

```js
import { useDtoSelector } from '../composables/useDtoSelector.js'

const form = reactive({ discount: '26' /* ... */ })

const {
  dtoMode, customDtoValue, dtoSelectValue,
  initFromValue,    // llamar con el valor inicial al editar
  onDtoChange,      // handler para @change del <select>
  onCustomDtoInput, // handler para @input del input custom
  onCustomDtoBlur,  // handler para @blur del input custom
  resetDtoToPreset, // volver a modo preset (botón ×)
} = useDtoSelector(form)
```

En edición, inicializar con `watch`:
```js
watch(product, p => {
  if (!p) return
  initFromValue(p.discount)
}, { immediate: true })
```

### Uso de `useSettingsSheet`

```js
import { useSettingsSheet } from '../composables/useSettingsSheet.js'

const {
  showSettingsSheet,
  settingsSearchQuery,
  filteredSettingsCategories,
  filteredSettingsBrands,
  openSettingsSheet,
  closeSettingsSheet,
  // ... resto de la API de edición inline
} = useSettingsSheet(store, catStore, {
  onDeleteCat: (id) => { /* callback opcional post-eliminar */ }
})
```

### Uso de `useAlertNavigation`

```js
import { buildAlertProductQuery, productRouteFromAlerts, resolveAlertBack }
  from '../composables/useAlertNavigation.js'

// Construir query params para navegar al detalle desde alertas
const query = buildAlertProductQuery({ alert: 'out-of-stock', brandId: 'polli' })
// → { from: 'alerts', alert: 'out-of-stock', brand: 'polli' }

// Navegar al detalle de un producto desde alertas
router.push(productRouteFromAlerts(product.id, { alert: 'expiry', year: 2025, month: '06' }))

// Resolver el botón "volver" en el detalle de producto
const back = resolveAlertBack(route.query, product)
// → { to: '/alerts/out-of-stock/polli', label: 'Sin stock' } | null
```

---

## Iconos

Solo Tabler Icons, siempre con `aria-hidden="true"`:
```html
<i class="ti ti-package"        aria-hidden="true"></i>
<i class="ti ti-alert-triangle" aria-hidden="true"></i>
```

---

## Elementos clickeables (no `<button>`)

Cuando un `<div>` actúa como botón (listas, filas):
```vue
<div
  class="brand-row"
  @click="$router.push(to)"
  role="button"
  tabindex="0"
  :aria-label="name"
  @keydown.enter="$router.push(to)"
>
```

---

## Formularios

```vue
<label class="form-label" for="np-name">Nombre del producto</label>
<input
  class="form-input"
  id="np-name"
  name="np-name"
  type="text"
  v-model="form.name"
/>
<span class="form-hint">Texto de ayuda opcional</span>
```

- Todo input con `id` y `name` explícitos.
- El `name` sigue el patrón `{prefijo-vista}-{campo}` (ej. `np-sku`, `ep-status`).
- Prefijos por vista: `np-` → NewProduct, `ep-` → EditProduct/EditOrder, etc.
- Para inputs readonly: `readonly` + `class="form-input"`.
- Usar `inputmode="numeric"` o `inputmode="decimal"` en campos numéricos.

### Clases de formulario

| Clase | Uso |
|---|---|
| `.form-section` | Contenedor de un grupo de campos |
| `.form-row` | Grid de dos columnas |
| `.form-group` | Envuelve label + input + hint |
| `.form-label` | Etiqueta del campo |
| `.form-input` | Input de texto / número / fecha |
| `.form-select` | Select nativo |
| `.form-hint` | Texto de ayuda debajo del input |

---

## Badges de stock

| Clase | Estado |
|---|---|
| `.badge.badge--out` | Sin stock |
| `.badge.badge--low` | Stock bajo |
| `.badge.badge--venc` | Por vencer |
| `.badge.badge--ok` | En stock |

Usar el componente `StockBadge` cuando solo se necesita el badge de estado:
```vue
<StockBadge :product="product" />
```

---

## Accesibilidad — reglas mínimas

- Botones sin texto visible: `aria-label` descriptivo.
- Iconos decorativos: `aria-hidden="true"`.
- Mensajes no urgentes: `role="status"` + `aria-live="polite"`.
- Alertas urgentes: `role="alert"` + `aria-live="assertive"`.
- Grupos radio/checkbox: `role="group"` + `aria-labelledby`.
- Barras de stock: `role="progressbar"` + `:aria-valuenow` + `aria-valuemin` + `aria-valuemax`.

---

## Idioma del código
Todo identificador nuevo — clases CSS, ids, variables, funciones, props y emits — se escribe en **inglés**.

---

## Checklist antes de entregar

- [ ] ¿Usé `<script setup>`?
- [ ] ¿No hay `<style>` en el `.vue`?
- [ ] ¿No hay `:style` con colores, fuentes o espaciados hardcodeados?
- [ ] ¿Todos los inputs tienen `id`, `name` y `<label>`?
- [ ] ¿Los botones sin texto visible tienen `aria-label`?
- [ ] ¿Los `<div>` clickeables tienen `role="button"`, `tabindex="0"` y `@keydown.enter`?
- [ ] ¿Los iconos decorativos tienen `aria-hidden="true"`?
- [ ] ¿Revisé si ya existe un composable antes de duplicar lógica?
- [ ] ¿El layout sigue `.screen > .scroll-content + BottomNav` o `.screen > .scroll-content + .btn-group`?