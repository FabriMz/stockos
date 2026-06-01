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
- **Nunca `<style>` en archivos `.vue`.** Los estilos viven en `src/styles/` e importan desde `main.scss`. Ver `skill-scss.md`.
- **No uses `:style="..."` para colores, tipografía ni espaciados.** Solo para valores dinámicos calculados en JS (posición, background de icono, color de stripe desde datos).

---

## Layout estándar de vistas

La mayoría de vistas siguen uno de estos dos patrones:

### Vistas de listado / consulta
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

`BottomNav` solo aparece en vistas principales; los formularios y detalles usan `.btn-group`.

---

## TopBar — tres variantes

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
  back-to="/catalogo"
  title="Detalle"
>
  <template #actions>
    <button class="icon-btn" aria-label="Editar">
      <i class="ti ti-edit" aria-hidden="true"></i>
    </button>
  </template>
</TopBar>
```

Props de TopBar:

| Prop | Tipo | Default | Notas |
|---|---|---|---|
| `variant` | String | `'title'` | `'home'` \| `'title'` \| `'back'` |
| `title` | String | `''` | Texto del título (variantes `title` y `back`) |
| `backLabel` | String | `'Atrás'` | Texto del botón atrás |
| `backTo` | String | `''` | Ruta destino; si vacío, usa `router.back()` |
| `searchId` | String | `'topbar-search'` | `id` y `name` del input (solo variante `home`) |
| `searchPlaceholder` | String | `'Buscar…'` | Placeholder del input |
| `modelValue` | String | `''` | v-model del campo de búsqueda |

---

## Stores — importación y alias

```js
import { useProductosStore } from '../stores/products.js'
import { usePedidosStore }   from '../stores/orders.js'
import { useCurrencyStore }  from '../stores/currency.js'

const store         = useProductosStore()   // productos y marcas
const store         = usePedidosStore()     // pedidos (misma variable, nunca ambas en el mismo componente)
const currencyStore = useCurrencyStore()    // moneda y formateo
```

Ver `skill-stores.md` para la API completa de cada store.

---

## Composables disponibles

Antes de duplicar lógica, comprueba si ya existe un composable:

| Composable | Responsabilidad |
|---|---|
| `useDtoSelector(form)` | Lógica del campo de descuento (preset / custom). Usado en `NewProduct` y `EditProduct`. |

### Uso de `useDtoSelector`
```js
import { useDtoSelector } from '../composables/useDtoSelector.js'

const form = reactive({ dto: '26', /* otros campos */ })

const {
  dtoMode, customDtoValue, dtoSelectValue,
  initFromValue,          // llamar con el valor inicial al editar
  onDtoChange,            // handler para @change del <select>
  onCustomDtoInput,       // handler para @input del input custom
  onCustomDtoBlur,        // handler para @blur del input custom
  resetDtoToPreset,       // volver a modo preset (botón ×)
} = useDtoSelector(form)
```

En edición, inicializar con `watch`:
```js
watch(producto, p => {
  if (!p) return
  initFromValue(p.dto)
}, { immediate: true })
```

---

## Iconos

Solo Tabler Icons, siempre con `aria-hidden="true"`:
```html
<i class="ti ti-package"    aria-hidden="true"></i>
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
  :aria-label="nombre"
  @keydown.enter="$router.push(to)"
>
```

---

## Formularios

```vue
<label class="form-label" for="np-nombre">Nombre del producto</label>
<input
  class="form-input"
  id="np-nombre"
  name="np-nombre"
  type="text"
  v-model="form.nombre"
/>
<span class="form-hint">Texto de ayuda opcional</span>
```

- Todo input con `id` y `name` explícitos.
- El `name` sigue el patrón `{prefijo-vista}-{campo}` (ej. `np-sku`, `ep-estado`).
- Prefijos por vista: `np-` → NewProduct, `ep-` → EditProduct/EditOrder, etc.
- Para inputs readonly: `readonly` + `class="form-input"` (el estilo ya lo diferencia visualmente).
- Usar `inputmode="numeric"` o `inputmode="decimal"` en campos numéricos.

### Clases de formulario disponibles

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

Las clases de badge están definidas en `src/styles/components/_badges.scss`:

| Clase | Estado |
|---|---|
| `.badge.badge--out` | Sin stock |
| `.badge.badge--low` | Stock bajo |
| `.badge.badge--venc` | Por vencer |
| `.badge.badge--ok` | En stock |

Usar el componente `StockBadge` cuando solo se necesita el badge de estado de un producto:
```vue
<StockBadge :producto="producto" />
```

---

## Accesibilidad — reglas mínimas

- Botones sin texto visible: `aria-label` descriptivo.
- Iconos decorativos: `aria-hidden="true"`.
- Mensajes de estado no urgentes: `role="status"` + `aria-live="polite"`.
- Alertas urgentes: `role="alert"` + `aria-live="assertive"`.
- Grupos de radio/checkbox: `role="group"` + `aria-labelledby`.
- Barras de progreso (stock): `role="progressbar"` + `:aria-valuenow` + `aria-valuemin` + `aria-valuemax`.

---

## Idioma del código
Todo identificador nuevo — clases CSS, ids, nombres de variables, funciones, props y emits —
se escribe en **inglés**, siguiendo el patrón ya establecido en el proyecto.

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
- [ ] ¿El layout de la vista sigue el patrón `.screen > .scroll-content + BottomNav` o `.screen > .scroll-content + .btn-group`?