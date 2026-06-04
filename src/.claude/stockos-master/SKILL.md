---
name: stockos-master
description: "Skill maestra para seleccionar y aplicar las skills específicas de stockOS según la situación."
---

# SKILL: Master — stockOS

## Propósito
Esta skill no reemplaza a las demás. Su única función es decidir qué skill específica aplicar en función de la tarea.

---

## Cuándo usar esta skill
Usa `stockos-master` siempre que necesites:
- determinar qué convenciones aplicar para un cambio o una nueva funcionalidad.
- decidir entre UI, stores, estilos o reglas Vue.
- coordinar múltiples áreas para una misma petición.

No es una guía de implementación completa; es un enrutador entre:
- `stock-component`
- `stock-vue`
- `stock-scss`
- `stockos-stores`
- `stockos-assistant`

---

## Reglas de selección

### Si la tarea es sobre componentes, rutas o navegación
Aplicar primero `stock-component`.

Ejemplos:
- crear o modificar vistas de catálogo, alertas o detalle.
- elegir `TopBar` variante correcta.
- construir rutas con `brandId`, `batchNumber`, `id`, `year`, `month`.
- enlazar filas y botones a rutas existentes.

### Si la tarea es sobre estructura de componentes Vue
Aplicar `stock-vue`.

Ejemplos:
- definir el template y la arquitectura de una vista.
- elegir entre `BottomNav` y `.btn-group`.
- respetar `<script setup>` y no usar `<style>` en `.vue`.
- usar composables existentes (`useDtoSelector`, `useSettingsSheet`, `useAlertNavigation`).

### Si la tarea es sobre estilos o SCSS
Aplicar `stock-scss`.

Ejemplos:
- crear nuevos estilos para componentes reutilizables.
- elegir archivo SCSS correcto en `src/styles/`.
- usar variables y mixins de `abstracts/`.
- evitar CSS inline y valores hardcodeados.

### Si la tarea es sobre stores, estado o APIs de Pinia
Aplicar `stockos-stores`.

Ejemplos:
- leer o modificar `useProductsStore`, `useOrdersStore`, `useBrandCategoriesStore`, `useCurrencyStore`.
- definir getters, acciones, `pendingDelete`, `undo/confirm`.
- persistencia, carga inicial y sincronización de datos.
- lógica de alertas, lotes, marcas y categorías.

### Si la tarea es de contexto general del proyecto
Aplicar `stockos-assistant`.

Ejemplos:
- explicar arquitectura global de stockOS.
- decidir qué store o componente usar para una nueva función.
- dar reglas de accesibilidad, nomenclatura y buenas prácticas.
- ayudar con la organización general de vistas y carpetas.

---

## Matriz de decisiones

| Necesidad | Skill principal | Complemento posible |
|---|---|---|
| Nueva vista / pantalla | `stock-vue` | `stock-component`, `stockos-assistant` |
| Cambio en rutas o navegación | `stock-component` | `stock-vue` |
| Ajuste de estilos | `stock-scss` | `stock-vue` |
| Lógica de datos / estado | `stockos-stores` | `stockos-assistant` |
| Revisar convenciones globales | `stockos-assistant` | todas las demás |

---

## Cómo aplicar la selección
1. Identifica la capa principal: UI, estructura Vue, estilo, store o contexto.
2. Usa la skill correspondiente.
3. Si la petición cruza varias capas, aplica varias skills en el orden lógico.
   - Ejemplo: nueva pantalla de catálogo = `stock-vue` + `stock-component` + `stock-scss`.
   - Ejemplo: botón nuevo que actualiza stock = `stock-vue` + `stockos-stores`.
4. Siempre respeta la regla global: no escribir estilos en `.vue`.

---

## Ejemplo de uso en el asistente
- Pregunta: "Cómo construyo el detalle de producto?"
  - `stockos-master` elige `stock-vue` para el layout y `stock-component` para TopBar/rutas.
- Pregunta: "Dónde pongo esta variable de color?"
  - `stockos-master` elige `stock-scss`.
- Pregunta: "Cómo guardo nuevos productos en el store?"
  - `stockos-master` elige `stockos-stores`.
- Pregunta: "Qué convención sigue stockOS?"
  - `stockos-master` elige `stockos-assistant`.

---

## Combinaciones comunes
- `stock-vue` + `stock-component`: vista nueva o actualización de pantalla.
- `stock-vue` + `stock-scss`: estilo y layout de un componente nuevo.
- `stock-vue` + `stockos-stores`: formulario o detalle que lee/escribe datos.
- `stockos-assistant` + cualquiera: caso de diseño arquitectónico o decisión cross-cutting.

---

## Nota final
No hagas suposiciones sin verificar el archivo real. Usa `stockos-master` como guía de selección, no como documentación técnica completa.
