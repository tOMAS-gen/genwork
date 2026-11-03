# Design System — GenWork

GenWork comparte la identidad visual de GenStock y conserva su azul de marca.
La referencia detallada está en [GENSTOCK_PARITY.md](design-system/genwork/GENSTOCK_PARITY.md); los tokens, la base y los componentes genéricos viven en la librería compartida [@gen/ui](https://github.com/tOMAS-gen/gen-ui) (tema `genwork`); `src/app/globals.css` sólo tiene lo propio de genwork. La nomenclatura común está en `NOMENCLATURA.md` de gen-ui.

La web y la app Android (`mobile/`) siguen las mismas reglas (spec 066). En la app, los tokens viven en `GenColors`, `AppTextStyles` y `AppGeometry`; en la web, los que difieren de @gen/ui se pisan en `src/app/genwork-tokens.css` (sólo para genwork) y un test los compara con `GenColors`.

## Identidad

- Montserrat para la interfaz; Roboto Mono para códigos, fechas numéricas, cifras y valores técnicos, con números tabulares.
- Escala: título de pantalla 20/700, título de card o fila 15/600, cuerpo 13/400, secundario 12 gris, acciones 13/600, rótulos de sección 11/700 en mayúsculas.
- Azul claro `#3b5bfa`, oscuro `#5b7fff`. La marca aparece en selección, interacción, foco y logotipo; nunca en superficies.
- Tema claro: página `#f4f5f8`, card `#ffffff`, campo `#f1f3f6`, borde estructural `#d2d6de`, outline `#e3e6eb`.
- Tema oscuro, neutros acromáticos: página `#0c0c0c`, card `#151515`, campo `#1c1c1c`, flotante `#262626`, borde `#272727`.
- Contorno de campos (`--control`): `#7d8494` en claro y `#707070` en oscuro, 3:1 contra el fondo.
- En oscuro, verde `#45b583`/`#5bbf86`, ámbar `#e0a83a` (texto `#e8c46e`) y favorito `#e3b341`, menos saturados.
- Colores de etiquetas y estados conservan su significado y son independientes de la marca. Estado de tarea: pendiente neutro, en curso azul, terminado verde.
- Plazo: con más de 3 días, neutro; de hoy a 3 días, ámbar; vencido, rojo. En una línea de meta va corto («29 oct · 3 días»).

## Forma y estructura

- Radios por rol: chips 4px, controles 6px, cards 8px, overlays 12px. Círculos sólo para avatares, contadores, puntos de color y progreso.
- Cards planas, sin elevación ni desplazamiento en hover. Sombras sólo para elementos flotantes.
- Margen de página de 16 en el teléfono; padding de card 16. Ritmo 4/8: 4, 8, 12, 16, 24, 32, 48.
- Desde 600 dp el contenido se centra con un máximo de 720; desde 840 dp el menú queda fijo al costado. Sidebar web 240px, rail 48px.
- Selección con lengüeta de 3px. Áreas táctiles de 48 aunque el control se vea más chico (segmentados de 32–36).

## Patrones

- Cabecera de raíz: título 20/700, subtítulo de una línea en 13 gris y la acción a la derecha, sin ícono ni regla. Subpantalla: migas en 12/500 gris sobre el título. Entidad: punto de color junto al nombre, dentro de una card.
- Filas de ajuste agrupadas: rótulo 11/700, una card por grupo, filas de 56 con ícono de 20 gris, título 15/600, una línea de descripción y chevron.
- Una sola acción visible por fila; el resto en el «⋯» (en rojo y al final lo destructivo).
- Campo: rótulo arriba en 12/600 gris, relleno `field` y contorno `control`.
- Estado vacío: card con ícono de 32 en una caja de 48 sobre el acento suave, título 15/600 y una línea en 13 gris.
- KPI: una franja con divisores, cifra en mono 20/700 y rótulo 11/600; sin porcentaje.
- Progreso: barra de 4 en la marca (verde sólo al 100 %) con «1/3 · 33%» en mono en la misma fila.
- Material Symbols Outlined en SVG mediante `@gen/ui/icons` (re-exportado en `src/components/ui/icons.tsx`); en la app, `AppIcons`.
- Transiciones de 150–200ms; respetar `prefers-reduced-motion` y las animaciones desactivadas del sistema. Foco visible de 2px. En Android, atrás predictivo durante el gesto.
