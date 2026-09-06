# Paridad visual GenStock → GenWork

Objetivo: que GenWork web y GenStock Flutter se perciban como productos de la misma plataforma. Se conserva la arquitectura funcional de GenWork y se reemplaza el verde de marca de GenStock por el azul de GenWork.

## Fuentes analizadas

- Captura real de GenStock POS: `.context/attachments/gS07PD/Captura de pantalla 2026-09-05 a la(s) 01.34.47.png`.
- Golden de GenStock: `frontend/test/golden/goldens/desktop__sector_principal__oscuro.png`.
- Tokens Flutter: `frontend/lib/core/theme/app_theme.dart` y `frontend/lib/core/theme/gen_stock_colors.dart`.
- Shell Flutter: `frontend/lib/features/shell/presentation/widgets/app_shell_view.dart`, `sector_sidebar.dart` y `sector_scaffold.dart`.
- Tablas Flutter: `frontend/lib/shared/widgets/gen_table.dart`.
- Implementación GenWork: `src/app/globals.css`, `src/components/nav/Shell.tsx`, `src/components/nav/DrawerNav.tsx`, `src/components/dashboard/*`, `src/components/board/BoardGrid.tsx` y `src/app/(main)/works/[id]/page.tsx`.

## ADN visual extraído

### Superficies

| Rol | GenStock oscuro | Traducción GenWork |
| --- | --- | --- |
| Suelo/página | `#0C0C0F` | neutralizado a `#0C0C0C` en `--bg` |
| Chrome/rail/campo | `#15151B` | neutralizado a `#151515` en `--field` |
| Card/panel elevado | `#1C1C22` | neutralizado a `#1C1C1C` en `--surface` |
| Overlay flotante | `#26262E` | neutralizado a `#262626` en `--floating` |
| Hover | `#2C2C35` | neutralizado a `#2C2C2C` en `--hover-soft` |
| Borde hairline | `#272730` | neutralizado a `#272727` en `--border` |
| Texto principal | `#F0F0F5` | neutralizado a `#F0F0F0` en `--text` |
| Texto secundario | `#9595A0` | neutralizado a `#959595` en `--muted` |
| Marca | `#13E28E` | azul GenWork `#5B7FFF` en oscuro |

La profundidad se comunica mediante cambios de superficie. Cards, filas y chips no proyectan sombra. Sólo diálogos, menús y popovers usan sombra. Por decisión de dirección visual de GenWork, todos los neutros finales son acromáticos (`R=G=B`): no se conserva el componente azul/violeta residual de los hex de GenStock. El azul aparece únicamente en detalles de marca e interacción.

### Geometría y ritmo

- Escala de espaciado: `4, 8, 12, 16, 20, 24, 32, 40, 48`.
- Checkbox: radio `2px`.
- Chip, tooltip y badge: radio `4px`.
- Botón, input e item de navegación: radio `6px`.
- Card, panel y header de tabla: radio `8px`.
- Overlay: radio `12px`.
- Círculo/píldora: sólo avatar, badge numérico o progreso.
- Rail: `48px`; bloque visual de icono `38px`; objetivo táctil `48px`.
- Drawer expandido: `240px`.
- Margen normal de página: `16px`; pantalla operativa compacta: `10px`.
- Fila de tabla: `44px` por defecto; controles etiquetados con objetivo mínimo de `48px`.
- Campo estándar Flutter: `56px`.
- Marca de estado activo: lengüeta de `3px`, repetida en navegación, tabs y orden activo.

### Tipografía e iconografía

- Montserrat: título de pantalla `24/700`; título de item `14/600`; cuerpo `14/400` con altura `1.6`; soporte `12/400`; rótulo de sección `11/700` en mayúsculas y tracking `1.2`; acción `13/600` en sentence case.
- Roboto Mono para códigos, rutas y valores técnicos.
- GenStock usa glifos Material `outlined`/`rounded`, no un set de trazos genérico. Para paridad real, GenWork debería exponer Material Symbols o Material Icons a través de su adaptador central `src/components/ui/icons.tsx`.

## Implementación web — 2026-09-05

- Shell de 240px por defecto (conserva el ancho elegido por el usuario), rail de 48px y barra superior de 40px con marca y selector de tema; 48px en móvil.
- Main de 16px, menú móvil deslizable y controles de navegación con lengüeta activa de 3px en ambos modos.
- Montserrat para texto y Roboto Mono para valores técnicos. Título principal de 24px.
- Adaptador central con 74 Material Symbols Outlined SVG incluidos en el bundle; fuente original Google, licencia Apache-2.0 adjunta. No descarga fuentes de iconos en el navegador.
- Cards de proyectos y tablero con radio 8px y padding 16px. Chips de 4px; controles de 6px.
- Borde estructural y outline de campo separados; foco visible de 2px. Se conservan campos compactos para las listas web.
- Tabs de proyecto con indicador de 3px y scroll horizontal en pantallas pequeñas.
- Filtros adaptables: el buscador conserva un ancho útil y los filtros saltan de línea.
- Paleta oscura acromática y azul de GenWork conservados.

## Criterio de paridad

La captura real y los tokens de GenStock definen la referencia. Los controles nativos de ventana y el contenido POS pertenecen a la app de escritorio; la web usa una barra de aplicación con controles funcionales. Las pantallas mantienen la navegación y los datos de GenWork. Esto no representa una certificación de igualdad píxel por píxel.

Los bocetos de referencia están en [`mockups/`](./mockups/README.md).

## Validación realizada

- TypeScript sin errores; ESLint sin errores (advertencias previas en Shell y DrawerNav).
- 98 archivos de pruebas / 859 pruebas pasaron.
- Navegador Chrome: dashboard claro/oscuro, sidebar 240/48px, navegación activa, tablero y detalle de proyecto.
- Sin desborde horizontal de página en 1280×800, 960×640 y 390×844; menú móvil abre y cierra con Escape.
- Capturas de la implementación en `.context/genstock-parity/` (evidencia local, gitignored).

## Adaptación por pantalla — segunda pasada

- **Proyectos y tablero:** encabezado compartido `PageHeader`, título de 24px, icono de sección y acciones alineadas.
- **Sectores:** grilla adaptable, cards de 16px, chips de 4px, secciones con marca de 3px, buscador y controles que se distribuyen en varias filas en móvil. Detalle a ancho de trabajo, con etiqueta de ámbito adaptable.
- **Grupos:** grilla coherente con sectores; detalle dividido en paneles de miembros, clientes, etiquetas y proyectos. Miembros y acciones permiten varias filas.
- **Notas y referencias:** encabezados comunes, editor en panel y referencias agrupadas en superficies delimitadas.
- **Recordatorios:** encabezado de sección, navegación mensual y calendario como tabla continua; día actual con indicador de 3px.
- **Configuración:** paneles para asistentes, almacenamiento y sistema. Formularios adaptables y código con scroll propio.
- **Administración:** navegación entre todas las secciones; encabezados y anchos de formulario consistentes, listas de usuarios/clientes con filas contenidas, mensajes técnicos que se ajustan al ancho.
- **Portal de clientes y TV:** misma marca, encabezados y superficies; mantienen sus controles y permisos específicos.
- **Diálogos:** radio de 12px, padding de 16px, título de 16px y nombre accesible en creación y confirmación.

### Verificación de esta pasada

31 rutas verificadas en Chrome: escritorio oscuro y móvil claro, sin desborde horizontal del documento. Incluye los 7 sectores disponibles, detalle de grupo, detalle de error y listado/detalle del portal de clientes. Las tablas, navegación de administración y bloques de código pueden desplazarse dentro de su contenedor.

Interacciones comprobadas: búsqueda de sectores, grilla/lista, plegado de secciones, abrir/cerrar creación de sector, pestañas de asistentes, navegación mensual y diálogo de recordatorios, navegación administrativa y acceso al portal con usuario cliente de prueba. Sin errores de ejecución en el navegador.

TypeScript y ESLint sin errores; 69 pruebas relacionadas pasaron. Evidencia local: `.context/page-parity/verification.json` y capturas en la misma carpeta.

## Detalle de proyecto — resumen y área de trabajo

- Resumen en una superficie: identidad, descripción editable, avance y fecha límite; etiquetas y código en una franja inferior.
- Dos columnas en escritorio; flujo vertical adaptable en móvil. Tipografía, iconos y colores conservan los tokens de GenStock/GenWork.
- Área de trabajo con pestañas, encabezado de tareas, pendientes, selector Lista/Tablero y campo de creación delimitado.
- Pestañas con flechas, Home/End, foco visible y panel asociado; descripción y fecha con nombres accesibles. Progreso con semántica de progressbar.
- Carga y estado vacío adaptados a la nueva estructura; se conserva la vista de proyectos archivados.
- Validación: 11 detalles reales, copia de código, etiquetas, pestañas y vistas, escritorio/móvil claro/oscuro, 320–1280px, orientación horizontal y texto ampliado. Estados de carga, vacío, archivado y error/reintento comprobados con respuestas simuladas sin cambiar registros. TypeScript y ESLint sin errores; 7 pruebas de progreso aprobadas.
- Capturas y verificaciones locales: `.context/project-detail/`.

## Detalle de sector — misma estructura visual que proyectos

- Resumen con identidad, ámbito, progreso basado en las métricas de la API y cantidad de proyectos vinculados. Control de color identificado y menú de acciones conservado.
- Área de tareas con pendientes, selector Lista/Tablero y campo de creación delimitado; encabezados por proyecto y tareas sin proyecto cuando conviven ambos tipos.
- Referencias en una superficie propia, manteniendo sus agrupaciones, enlaces y permisos.
- Carga acorde al diseño, estado vacío único en ambas vistas y recuperación ante un error de carga.
- Verificación: 7 sectores reales en escritorio/móvil y claro/oscuro, métricas de subtareas, lista/tablero, color, renombrado y configuración de estados. Respuestas simuladas para referencias, solo lectura, nombres largos, vacío y error/reintento; sin modificar registros. TypeScript y ESLint sin errores; 14 pruebas aprobadas. Evidencia en `.context/sector-detail/`.

## Vista de tareas — lectura por sector

- Tablero directamente visible para dejar fijo en pantalla, con resumen de tareas y sectores, sin barra de búsqueda, filtros, ordenamiento ni selector de vista.
- Sectores con encabezado, progreso y estados escritos; sólo se listan tareas y subtareas sin finalizar. Las contenedoras desaparecen cuando todas sus hijas se completan. El progreso conserva el total original y los sectores al día muestran «Sin tareas pendientes».
- Textos largos expandibles y desplazamiento dentro de cada sector en tablero. Separadores sólo entre tareas.
- Resumen sin duplicar tareas compartidas entre sectores; contenedoras excluidas del progreso.
- La actualización en vivo renueva las tareas automáticamente. Un error de actualización mantiene los últimos datos y ofrece reintentar. TV conserva su vista de lectura sin barra de controles.
- Estilos aislados en `BoardGrid.module.css`, con los tokens comunes y adaptación a móvil. Evidencia de revisión en `.context/task-overview/`.
