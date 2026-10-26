# Spec: `bocetos-premium` — un boceto por pantalla

Estado: **hechos** (2026-10-26): 41 bocetos, falta que el usuario elija cuáles se implementan. Módulo 4 de [MAP.md](MAP.md). Depende de [`auditoria-premium`](SPEC-auditoria-premium.md) y de las capturas del módulo `comparativa`.

## Objetivo

Mostrar con una imagen cómo se vería cada pantalla en su versión premium, para que el usuario elija qué llevar a código en `implementacion-premium`.

## Cómo se hace

- Generador: Codex, con su herramienta de imágenes (`codex exec -i <captura> …`). El MCP de Codex no conecta; se usa la línea de comandos, que tiene la misma herramienta.
- Referencia: la captura Android ya igualada, tema claro (`despues/Pxx-…-light-390-android.png`).
- Prompt: el brief de boceto de la pantalla y los principios `D` de [auditoria-premium.md](auditoria-premium.md), más la identidad fija: Montserrat, azul `#3b5bfa`, página `#f4f5f8`, cards blancas planas con borde `#e3e6eb`, radios 4/6/8, chips rectangulares, Material Symbols Outlined, textos en español de la captura.
- El boceto **mantiene la estructura, el contenido y los textos** de la captura. No agrega secciones ni datos.
- **Excepción, pantallas vacías en la semilla** (P28 Etiquetas, P29 Estados de tarea, P32 Errores): el boceto muestra la pantalla con datos de ejemplo, porque un estado vacío no deja ver cómo se ven las filas. Muestra una sola de las dos cosas, nunca el vacío y los datos a la vez. Los demás vacíos (P08, P18, P20, P22…) se dibujan vacíos.
- Salida: `.context/paridad-visual/despues/Pxx-…-light-390-boceto.png`, al lado de la captura. El comparador muestra la terna web, Android y boceto.

## Límites

- **Siempre:** un boceto por pantalla (40), tema claro; revisar cada imagen antes de darla por buena y regenerar las que inventen contenido o rompan la identidad.
- **Preguntar antes:** bocetos en tema oscuro o variantes de una misma pantalla.
- **Nunca:** pasarle a Codex capturas con datos que no sean de la semilla QA, tokens o rutas privadas.

## Criterios de éxito

1. 40 bocetos, uno por pantalla, con el mismo contenido que su captura.
2. Todos respetan la identidad y aplican el brief de su pantalla.
3. El comparador los muestra junto a la web y a Android.
