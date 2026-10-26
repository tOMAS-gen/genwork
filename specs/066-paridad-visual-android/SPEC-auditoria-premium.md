# Spec: `auditoria-premium` — hallazgos y dirección premium por pantalla

Estado: **hecha** (2026-10-26), falta la revisión del usuario. Módulo 3 de [MAP.md](MAP.md). Depende de [`paridad-visual`](SPEC-paridad-visual.md), que ya está implementado: Android y la web móvil se ven iguales, así que cada hallazgo vale para las dos plataformas.

## Objetivo

Decir, pantalla por pantalla, qué separa a genwork de una interfaz premium y qué cambiaría para llegar ahí, sin tocar código. El resultado es la entrada de los bocetos (`bocetos-premium`) y, más adelante, de `implementacion-premium`.

"Premium" acá no es decoración. Según PRODUCT.md es: información de un vistazo, menos opciones, densidad justa y el mismo vocabulario visual en toda la app. La identidad de DESIGN.md se mantiene: Montserrat, azul de marca, superficies planas, radios por rol.

## Alcance

- Las 40 pantallas con captura en `.context/paridad-visual/despues/` (P02–P35; P01 Acceso no tiene captura después porque obliga a cerrar sesión, y se audita con la de `antes/`).
- Tema claro y oscuro.
- Una auditoría técnica de la app Flutter (`/impeccable audit`, variante nativa) en sus cinco dimensiones.

**No se repite** lo que ya cubre `docs/auditoria-ui-ux/PLAN.md` (S01–S29: accesibilidad y uso). Cuando un hallazgo toca ese terreno, se cita el ID del sector `Sxx` y se deja para esa auditoría.

## Entregable

`auditoria-premium.md` en esta carpeta, con:

1. **Dirección premium:** principios `D1…Dn`, comunes a todas las pantallas, con lo que cambia y lo que se conserva.
2. **Auditoría técnica nativa:** puntaje 0–4 en accesibilidad, rendimiento, tema, conformidad con Android y adaptación, con los hallazgos P0–P3.
3. **Hallazgos por pantalla:** IDs `Pxx-Mn`, con prioridad P0–P3, el principio `D` que aplica y la corrección propuesta. Cada pantalla cierra con un **brief de boceto**: dos a cuatro líneas que dicen qué cambia en la versión premium.
4. **Patrones sistémicos:** lo que se repite en muchas pantallas y conviene resolver una vez en los componentes compartidos.

## Método

1. Dirección: revisión de pantallas representativas (Proyectos, Detalle de proyecto, Mi día, Detalle de tarea) para fijar los principios.
2. Pantallas: revisión de las capturas claro y oscuro de cada una, contra la dirección, con lectura del código Flutter cuando hace falta confirmar un dato (tamaño, color, componente).
3. Técnica: lectura de `mobile/lib` según `audit.native` de impeccable.
4. Síntesis: un solo documento, sin hallazgos duplicados.

## Límites

- **Siempre:** citar la captura o el archivo de cada hallazgo; respetar las decisiones de MAP.md y de DESIGN.md.
- **Preguntar antes:** proponer cambiar la identidad (fuente, color de marca, superficies).
- **Nunca:** cambiar código ni la web en este módulo; usar capturas con datos que no sean de la semilla QA.

## Criterios de éxito

1. Las 40 pantallas tienen hallazgos priorizados y brief de boceto.
2. La dirección premium tiene principios concretos y verificables (medidas, roles, tokens), no adjetivos.
3. La auditoría técnica tiene los cinco puntajes y su total.
4. Ningún hallazgo repite uno de S01–S29 sin citarlo.
