# Mapa de capacidades: paridad visual Android ↔ web móvil y propuesta premium

Estado: **aprobado** el 2026-10-25.

## Decisiones tomadas

- La referencia es la web en viewport de celular. Android se ajusta para igualarla y la web no cambia en esta iniciativa.
- Hay dos fases globales: primero se iguala Android en todas las pantallas y después se audita y se hace el boceto de cada una. No se mezclan mejoras con la paridad.
- El alcance son todas las rutas: equipo, administración, portal, TV y las pantallas que solo existen en el móvil.
- **Tamaño de texto:** cuando un mismo texto mide distinto en la web y en Android, se usa el más chico. Por eso el cuerpo de Android queda en 13 px aunque la web use 14 px.
- **Auditoría premium:** complementa a `docs/auditoria-ui-ux/PLAN.md` (S01–S29). Esa auditoría cubre accesibilidad y uso. La premium cubre la calidad visual, reutiliza sus IDs y no repite sus hallazgos.
- Los bocetos se hacen con Codex `/imagegen` y usan como referencia la captura de la pantalla que se trabaja. El usuario reconecta el MCP de Codex antes de esa fase.

## Módulos

| Id | Responsabilidad | Depende de |
|---|---|---|
| `comparativa` | Banco de comparación. Inventario de pantallas P-xx enlazado con S01–S29 y M00–M21. Base de QA, usuario/rol y datos compartidos por las dos plataformas. Web y emulador al mismo ancho lógico. Par de capturas por pantalla, en tema claro y oscuro. | — |
| `paridad-visual` | Para cada pantalla: lista de diferencias entre web y Android, corrección en Flutter y captura "después" que coincide con la web. Se conservan los gestos y los controles nativos de Android. También crea en Android las pantallas web que no tienen equivalente (por ejemplo, Materiales e integración GenStock), con la web como referencia visual y funcional. | `comparativa` |
| `auditoria-premium` | `/impeccable audit` y `critique` de cada pantalla ya igualada. Produce hallazgos priorizados y una dirección premium escrita, sin cambiar código. | `paridad-visual` |
| `bocetos-premium` | Un boceto `/imagegen` por pantalla. A `/imagegen` se le pasa como imagen de referencia la captura Android ya igualada de esa pantalla, junto con los hallazgos de su auditoría. El boceto mantiene la estructura y el contenido de la captura y la identidad de genwork (Montserrat, azul de marca, superficies planas). Se guarda al lado de la captura original para comparar antes y después. | `auditoria-premium`, `comparativa` (captura), MCP de Codex |

Orden de construcción: `comparativa` → `paridad-visual` (todas las pantallas) → `auditoria-premium` → `bocetos-premium`.

Cada módulo tendrá su spec en esta carpeta: `SPEC-<id>.md`.

## Posterior, fuera de esta iniciativa

| Id | Responsabilidad | Depende de |
|---|---|---|
| `implementacion-premium` | Llevar a código los bocetos aprobados, en la web y en Android a la vez para no volver a separarlas. Se hace pantalla por pantalla y se actualizan DESIGN.md y los tokens de `@gen/ui` cuando cambie algo del sistema. Cada pantalla se cierra con un nuevo par de capturas web/Android del banco `comparativa`. | `bocetos-premium` (con boceto aprobado por el usuario) |

Este módulo queda escrito para no perderlo. Se especifica en una spec nueva cuando haya bocetos aprobados.

**Idea para más adelante, sin módulo todavía:** adaptar esta misma app Flutter a la TV. Por eso la vista Lector (`/tv`) se captura con el rol `lector`. En esta iniciativa se captura al ancho del celular y no se agrega ningún formato de TV.
