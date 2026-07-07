# Rediseño visual — apartados de etiquetas

Fecha: 2026-07-06
Tipo: mejora visual/estética (sin cambios de modelo, API ni contratos)

## Problema

Los apartados de etiquetas se ven genéricos: el picker de asignación es una lista
larga, el color picker ocupa demasiado, el admin es una `<table>` cruda y los
filtros son `<select>` grises. El usuario pidió que se vean más visuales y menos
"comunes", manteniendo el design system flat de genwork.

## Alcance

Cuatro componentes, cada uno independiente y verificable por separado. Solo
cambia presentación (JSX + CSS). Lógica de datos, permisos y APIs intactas.

### 1. Asignar etiqueta — `src/components/works/LabelPicker.tsx`

- Agregar buscador arriba del contenido del Dialog: filtra claves y valores por
  texto (case/acento-insensible, reusar `normalizeTagName` si aplica).
- Mantener secciones por scope (Globales / Del grupo / Personales) pero con
  encabezado más sutil; valores como chips en grilla (ya existen).
- Estado vacío del buscador: "Sin resultados".

### 2. Color picker compacto — `src/components/ui/ColorPicker.tsx` + CSS

- Estado `showAdvanced` (default `false`).
- Vista por defecto: swatches + fila hex + link "Personalizado". El área SB y el
  slider de hue arrancan ocultos.
- Al tocar "Personalizado" se despliega el área SB + hue. Se recuerda abierto si
  el color activo no coincide con ningún preset (color custom → abrir directo).
- Reduce la altura del popover a ~la mitad en el caso común.

### 3. Admin de etiquetas — `src/components/works/LabelAdmin.tsx`

- Reemplazar la `<table>` por una grilla de tarjetas, una por clave.
- Cada tarjeta: header con nombre (editable inline) + botón borrar; cuerpo con
  los valores como chips y un chip punteado "+ Valor" que expande el editor de
  alta (input + ColorField + Agregar).
- Alta de clave nueva al pie, sin cambios de lógica.

### 4. Filtros — `dashboard/FilterBar.tsx` (visible) + `filters/FilterBar.tsx` + CSS

- Estilar los `<select>` nativos como pills (se conserva el select por
  accesibilidad y simplicidad; no se construye dropdown custom).
- Pill activa (con valor) se colorea con `--accent` suave; inactiva neutra.
- Filtro de etiqueta muestra un punto del color del valor cuando hay uno elegido.
- Nota: el FilterBar que ve el usuario es `dashboard/FilterBar` (home). El
  `filters/FilterBar` (pensado para la vista de sector, 032 P2) todavía no está
  cableado a ninguna página; se le aplicó el mismo estilo por consistencia.

## No incluido (YAGNI)

- Dropdowns custom accesibles para los filtros (los `<select>` nativos alcanzan).
- Guardado de colores custom en el picker.
- Cambios en el parser de tags inline ni en el autocomplete.

## Verificación

Preview del dev server (`:3010`): abrir cada apartado y confirmar layout,
colores, estados activos y que las acciones (asignar, crear, borrar, filtrar)
siguen funcionando. Tests unitarios existentes deben seguir verdes.
