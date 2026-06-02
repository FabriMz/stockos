---
name: stock-scss
description: Guía de estilos SCSS para stockOS: variables, mixins, arquitectura de archivos y reglas de uso.
---

# SKILL: SCSS — Estilos de stock-os

## Cuándo aplicar este skill
Siempre que debas agregar, modificar o revisar estilos en este proyecto.
Antes de escribir cualquier línea SCSS, lee este archivo completo.

---

## Regla absoluta

**Nunca agregues estilos dentro de archivos `.vue`.**
Todo estilo va en `src/styles/`.

---

## Arquitectura de archivos

```
src/styles/
├── abstracts/
│   ├── _variables.scss   ← variables de color, tipografía, espaciado, dimensiones
│   ├── _mixins.scss      ← mixins de layout, tipografía y componentes
│   ├── _functions.scss
│   └── _index.scss       ← re-exporta todo
├── base/
│   ├── _reset.scss
│   ├── _typography.scss
│   └── _index.scss
├── layout/
│   ├── _screen.scss      ← .screen, .scroll-content, .spacer--*
│   ├── _topbar.scss
│   ├── _bottom-nav.scss
│   └── _index.scss
├── components/
│   ├── _badges.scss
│   ├── _buttons.scss     ← .btn, .btn-group, .btn-new, .icon-btn
│   ├── _cards.scss       ← .product-card, .brand-row, .brand-summary
│   ├── _forms.scss       ← .form-*, .venc-block, .stock-adjuster, .dto-custom
│   ├── _alert-banner.scss
│   ├── _stats.scss       ← .stat-card, .stat-grid
│   ├── _stock-bar.scss
│   └── _index.scss
├── views/
│   ├── _home.scss
│   ├── _catalog.scss
│   ├── _detail.scss
│   ├── _forms.scss       ← .formulario__*, .dto-custom, .formulario__delete-confirm
│   ├── _orders.scss      ← .pedidos__*, .order-row
│   ├── _alerts.scss
│   ├── _settings.scss
│   └── _index.scss
└── main.scss             ← punto de entrada, importa todo + .toast
```

### Dónde colocar cada estilo nuevo

| Tipo de estilo | Archivo |
|---|---|
| Componente reutilizable (aparece en más de una vista) | `components/_nombre.scss` |
| Layout estructural (pantalla, scroll, nav) | `layout/_nombre.scss` |
| Estilo exclusivo de una vista | `views/_nombre-vista.scss` |
| Variable o mixin nuevo | `abstracts/_variables.scss` o `abstracts/_mixins.scss` |
| Estilo global de app (ej. toast) | `main.scss` directamente |

Si el archivo de destino no existe aún, crearlo y agregarlo al `_index.scss` correspondiente.

---

## Import obligatorio

```scss
@use '../abstracts' as *;
```

Es el único import necesario para acceder a todas las variables y mixins.
Úsalo al inicio de cada archivo SCSS que los requiera.

---

## Variables disponibles — nunca hardcodees valores

### Tema
El proyecto usa **dark mode** con paleta índigo. Los fondos son oscuros, el texto es claro.
Los colores de marca (`$color-primary`, `$color-cream`, `$color-salmon`, `$color-copper`)
son los cuatro pilares de la paleta; los tints derivados son versiones con opacidad o variación de luminosidad.

### Colores de marca

```scss
$color-primary  // #6366f1 — índigo principal
$color-cream    // #e0e7ff — índigo muy claro (usada como acento suave)
$color-salmon   // #67e8f9 — cyan acento
$color-copper   // #4338ca — índigo oscuro
```

### Tints derivados

```scss
// Primary (índigo)
$color-primary-50   // rgba(99,102,241, 0.14)
$color-primary-100  // rgba(99,102,241, 0.22)
$color-primary-200  // rgba(99,102,241, 0.36)
$color-primary-700  // #4f46e5
$color-primary-900  // #a5b4fc

// Cream (índigo muy claro → dark mode: fondos)
$color-cream-50   // #1e1a2e
$color-cream-100  // #252036
$color-cream-200  // #2a253e
$color-cream-300  // #0f0d1a

// Salmon (cyan)
$color-salmon-50   // rgba(103,232,249, 0.12)
$color-salmon-100  // rgba(103,232,249, 0.22)
$color-salmon-700  // #06b6d4
$color-salmon-900  // #67e8f9

// Copper (índigo oscuro)
$color-copper-50   // rgba(67,56,202, 0.12)
$color-copper-100  // rgba(67,56,202, 0.22)
$color-copper-700  // #3730a3
$color-copper-900  // #818cf8
```

### Colores semánticos

```scss
// Peligro / Sin stock
$color-danger         // #ef4444
$color-danger-bg      // rgba(239,68,68, 0.14)
$color-danger-text    // #fca5a5
$color-danger-border  // rgba(239,68,68, 0.28)

// Advertencia / Stock bajo
$color-warning         // #d97706
$color-warning-bg      // rgba(217,119,6, 0.14)
$color-warning-text    // #fbbf24
$color-warning-border  // rgba(217,119,6, 0.28)

// Acento / Destacado  (alias de salmon)
$color-accent      // = $color-salmon
$color-accent-bg   // = $color-salmon-50
$color-accent-text // = $color-salmon-900

// OK / En stock
$color-success         // #059669
$color-success-bg      // rgba(5,150,105, 0.14)
$color-success-text    // #34d399
$color-success-border  // rgba(5,150,105, 0.28)

// Vencimiento
$color-expiry         // #7c3aed
$color-expiry-bg      // rgba(124,58,237, 0.14)
$color-expiry-text    // #c4b5fd
$color-expiry-border  // rgba(124,58,237, 0.28)
```

> ⚠️ El grupo de vencimiento se llama `$color-expiry-*`, no `$color-venc-*`.

### Neutros y fondos (dark mode)

```scss
$color-bg-primary    // #13111e — fondo principal (más oscuro)
$color-bg-secondary  // #1e1a2e — fondo secundario (cards, sheets)
$color-bg-tertiary   // #0f0d1a — fondo de pantalla (el más oscuro)

$color-border        // rgba(165,180,252, 0.08) — borde suave
$color-border-strong // rgba(165,180,252, 0.14) — borde prominente

$color-text-primary    // #f5f3ff — texto principal (casi blanco)
$color-text-secondary  // #c4b5fd — texto secundario (violeta claro)
$color-text-tertiary   // #ddd6fe — texto terciario / labels
$color-text-on-primary // #ffffff — sobre fondos de acción
```

### Tipografía

```scss
$font-display  // 'Barlow Condensed'
$font-body     // 'Barlow'
$font-mono     // 'DM Mono'

// Tamaños
$font-size-2xs : 9px
$font-size-xs  : 10px
$font-size-sm  : 11px
$font-size-base: 13px
$font-size-md  : 14px
$font-size-lg  : 15px
$font-size-xl  : 17px
$font-size-2xl : 19px
$font-size-3xl : 22px
$font-size-4xl : 26px
$font-size-5xl : 32px

// Pesos
$font-weight-regular : 400
$font-weight-medium  : 500
$font-weight-semibold: 600
$font-weight-bold    : 700

// Letter-spacing
$letter-spacing-tight   // -0.01em
$letter-spacing-normal  // 0
$letter-spacing-wide    // 0.04em
$letter-spacing-wider   // 0.08em
$letter-spacing-widest  // 0.1em

// Line-height
$line-height-tight   : 1.1
$line-height-snug    : 1.3
$line-height-normal  : 1.5
$line-height-relaxed : 1.6
```

### Espaciado (base 4px)

```scss
$spacing-0 :  0
$spacing-1 :  4px
$spacing-2 :  8px
$spacing-3 :  10px
$spacing-4 :  12px
$spacing-5 :  14px
$spacing-6 :  16px
$spacing-7 :  20px
$spacing-8 :  24px
$spacing-9 :  32px
$spacing-10:  40px
```

### Radios

```scss
$radius-sm  :  6px    $radius-md  :  8px    $radius-lg  :  10px
$radius-xl  :  12px   $radius-2xl :  14px   $radius-3xl :  18px
$radius-full:  9999px
```

### Bordes

```scss
$border-width   : 0.5px
$border-width-md: 1px
$border         : $border-width solid $color-border
$border-strong  : $border-width solid $color-border-strong
```

### Íconos

```scss
$icon-xs : 14px   $icon-sm : 15px   $icon-md : 17px
$icon-lg : 20px   $icon-xl : 22px   $icon-2xl: 26px   $icon-3xl: 28px
```

### Dimensiones UI

```scss
$topbar-height    : 52px
$bottomnav-height : 56px
$tap-target       : 44px
$icon-btn-size    : 34px
$input-height     : 38px
$btn-height-sm    : 32px
$btn-height-md    : 38px
$btn-height-lg    : 42px
$avatar-size-sm   : 26px
$avatar-size-md   : 32px
$avatar-size-lg   : 44px
$brand-icon-size  : 38px
$product-icon-size: 36px
$stock-bar-height : 3px
$stock-bar-width  : 68px
$stripe-width     : 3px
```

### Sombras y transiciones

```scss
$shadow-sm: 0 1px 3px rgba(0,0,0, 0.30)
$shadow-md: 0 2px 8px rgba(0,0,0, 0.40)
$shadow-lg: 0 4px 16px rgba(0,0,0, 0.50)

$transition-fast  : 0.1s ease
$transition-normal: 0.2s ease
$transition-slow  : 0.3s ease
```

### Z-index

```scss
$z-base: 0   $z-topbar: 100   $z-nav: 100   $z-overlay: 150   $z-modal: 200
```

---

## Mixins disponibles

### Layout

```scss
@include flex-row($gap: 0, $align: center, $justify: flex-start)
@include flex-col($gap: 0, $align: flex-start, $justify: flex-start)
@include flex-list    // columna stretch, width 100% — para listas
@include flex-center  // flex + center en ambos ejes
@include flex-between // flex + space-between
```

### Tipografía

```scss
@include font-display($size: $font-size-2xl, $weight: $font-weight-bold)
@include font-mono($size: $font-size-base, $weight: $font-weight-regular)
@include font-label   // mono xs uppercase — para section-label y etiquetas
@include truncate     // text-overflow ellipsis
```

### Componentes

```scss
@include tap-target         // min 44x44px
@include icon-btn           // botón icono cuadrado transparente (34x34px)
@include card-base          // bg-primary + border + radius-xl
@include section-label      // padding + font-label
@include screen-layout      // flex-col, height 100dvh, overflow hidden
@include scroll-content     // flex 1, overflow-y auto, scrollbar fino
@include color-stripe($color) // stripe de color lateral (3px)
@include badge-base         // base de badges (flex-row, font-mono xs)
@include input-base         // input estándar (height, border, focus, dark)
```

---

## Nesting SASS

```scss
.mi-bloque {
  color: $color-text-primary;

  &:hover  { color: $color-primary; }
  &.active { background: $color-bg-secondary; }
  &--mod   { font-weight: $font-weight-semibold; }

  &__hijo {
    font-size: $font-size-sm;

    i { font-size: $icon-sm; }
  }
}
```

No anidar más de 3 niveles salvo que la estructura del DOM lo exija.

---

## Idioma del código
Todo identificador nuevo — clases CSS, ids, variables — se escribe en **inglés**.

---

## Checklist antes de entregar

- [ ] ¿Los estilos están en `src/styles/`, no en el `.vue`?
- [ ] ¿Usé `@use '../abstracts' as *;` para importar?
- [ ] ¿Usé variables SCSS en lugar de valores hardcodeados?
- [ ] ¿Usé `$color-expiry-*` (no `$color-venc-*`) para estilos de vencimiento?
- [ ] ¿El archivo nuevo está listado en el `_index.scss` del subdirectorio correspondiente?
- [ ] ¿Elegí el subdirectorio correcto (component vs view vs layout)?
- [ ] ¿Usé nesting `&` en lugar de repetir el selector padre?
- [ ] ¿No anidé más de 3 niveles?