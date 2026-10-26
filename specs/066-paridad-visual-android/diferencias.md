# Diferencias web ↔ Android

Relevamiento de la tarea 5 de [tasks-paridad-visual.md](tasks-paridad-visual.md), sobre los pares de `.context/paridad-visual/antes/` (390 × 844, claro y oscuro). Cada diferencia lleva:

- **Ítem:** el número de la lista "igual" de la [spec](SPEC-paridad-visual.md): 1 estructura · 2 acción principal · 3 texto · 4 tipografía · 5 espaciado · 6 color · 7 forma · 8 componentes · 9 estados.
- **Destino:** **B-n** (componente compartido, tarea n del bloque B), **P** (se corrige en la pantalla) o **nativo** (no cuenta).
- **Estado:** `abierta`, `corregida` o `aceptada (motivo)`.

Medidas en dp, tomadas de las capturas a 1,5× (web a la izquierda, Android a la derecha).

## Hallazgos que no son de Android

Se anotan para la auditoría S01–S29 (la web no cambia en este módulo):

- **W1 (P12):** en el detalle de sector, el texto de la tarea se parte letra por letra en 390 px.
- **W2 (P13, P14):** plural roto: "1 miembros · 1 proyectos".
- **W3 (P03/P22):** "Vence hoy" se abre detrás del menú lateral (hallazgo 2 del inventario).
- **W4 (P33):** logo cortado en el portal (hallazgo 3 del inventario).

## Resumen por componente compartido (bloque B)

| Componente | Diferencias | Pantallas | Tarea |
|---|---|---|---|
| Encabezado de página | La acción va a la derecha del título, en la misma fila (Android la baja debajo cuando el título es largo). El subtítulo queda debajo del título en la columna del texto. El encabezado se desplaza con el contenido (Android lo deja fijo). | P04, P05, P08, P10, P11, P13, P15, P21 | 7 |
| Barra superior | 48 dp de alto en la web (Android 56). | todas | 7 |
| Menú lateral | Cabecera "ESPACIO DE TRABAJO" + ✕, avatar con dos iniciales, ítems a 14 regular, secciones PROYECTOS y SECTORES como rótulo en mayúsculas con contador y "ver todos", orden Todos · Mis proyectos · Favoritos · Plantillas · Archivados, proyectos en una línea "Grupo — Proyecto", "Vence hoy" y "Salir" al pie. Atrás cierra el menú. | P03, P22 | 7 |
| KPI | Cuatro cards separadas en grilla de 2 × 2, con "Total · 100%" en una línea mono (Android: una card con cuatro columnas). | P05, P08 | 8 |
| Card de proyecto | Menú "⋯" junto a la estrella; fecha "Entrega: 29/10/2026"; urgencia en `--color-warning-text` (Android usa el ámbar de `warning`). | P05, P33 | 8 |
| Barra de herramientas de listado | Buscador + fila [Filtros] [orden ▾] [grilla \| lista] + contador en la misma card. Filtros abre un panel en línea (Sector, Etiqueta, Estado, Grupos). El alcance (Todos, Mis proyectos, Favoritos, Archivados) se elige en el menú lateral, no con chips. | P05, P08, P11 | 9 |
| Campos de formulario | Rótulo arriba del campo, no flotante dentro del borde. Desplegables con el mismo aspecto de campo y el valor en regular (Android lo pone en 600 porque `DropdownButton` toma `titleMedium`). | P06, P11, P14, P19, P28, P29, P32 | 10 |
| Pestañas del proyecto | Seis pestañas (Tareas, Materiales, Documentos, Archivos, Actividad, Acceso cliente) con ícono y subrayado; Android tiene tres. | P07, P17–P19 | 9 (+17) |
| Chip de estado en el tablero | Contorno gris neutro ("En curso", "Pendiente"); Android lo pinta relleno con el acento. | P10, P35 | 9 |
| Dialog | Sin banda ni divisor en cabecera y pie; rótulos arriba; "Cancelar" con contorno; contador "0 / 2.000". | P06 y todos los dialogs de alta | 10 |
| Estado vacío | Ícono + título + texto + acción, centrado (Android: ícono de bandeja y una línea). | P08, P19, P20, P28, P29 | 10 |

## P01 Acceso

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P01-01 | 1 | La web muestra el login con Google y el modo de prueba; Android, el alta del servidor por QR. Son pasos distintos del mismo flujo: el login de Android abre esta misma página web en el navegador. | nativo | aceptada (flujo propio de la app) |
| P01-02 | 5 | La card de Android queda centrada en vertical; la web la pone arriba con 24 dp de margen. | P | abierta |

## P02 Servidores (solo Android)

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P02-01 | 1 | Pantalla propia de la app (decisión 2): adopta el encabezado y las cards de la web. Ya los usa. | nativo | aceptada (solo Android) |

## P03 Navegación

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P03-01 | 1 | Cabecera: la web abre con el rótulo "ESPACIO DE TRABAJO" y ✕; Android con la marca "›genwork" y ✕, y repite el rótulo debajo del usuario. | B-7 | corregida |
| P03-02 | 3 | Avatar con dos iniciales ("AD") en la web; una ("A") en Android. | B-7 | corregida |
| P03-03 | 4 | Ítems principales a 14 regular en la web; 16 semibold en Android. | B-7 | corregida |
| P03-04 | 1 | "Proyectos" y "Sectores" son rótulos de sección en mayúsculas con contador y "ver todos"; en Android son ítems destacados con contador y flecha. | B-7 | corregida |
| P03-05 | 1 | Orden de subítems: Todos · Mis proyectos · Favoritos · Plantillas · Archivados (Android pone Plantillas primero). | B-7 | corregida |
| P03-06 | 3 | Proyectos en una línea "QA produccion — Cartelería…" con ícono de documento; Android usa dos líneas con ícono de carpeta. | B-7 | corregida |
| P03-07 | 1 | "Vence hoy" y "Salir" al pie del menú. | B-7 | corregida |
| P03-08 | — | Con el menú abierto, atrás cierra la app (hallazgo 4). | B-7 | corregida (PopScope; probado con el atrás del emulador) |
| P03-09 | 2 | La barra superior de la web tiene el cambio de tema; Android, la campanita de notificaciones (las notificaciones existen solo en Android, decisión 2; el tema está en Configuración). | nativo | aceptada (decisión 2) |

## P04 Mi día

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P04-01 | 1 | Android muestra la fecha del día ("domingo 25 de octubre") en mono; la web no. | P | abierta |
| P04-02 | 1 | Encabezado fijo en Android; en la web se desplaza. | B-7 | corregida |
| P04-03 | 1 | Tarea con subtareas: la web muestra flecha para plegar y la insignia "1/2"; Android un checkbox y "1/2 subtareas" debajo. | P | abierta |
| P04-04 | 8 | Acciones de la fila: la web tiene ☀, + y ✕; Android solo ☀ (agregar subtarea y quitar de Mi día están en el detalle y en el gesto). | P | abierta |
| P04-05 | 5 | Filas más altas en Android (56–75 dp contra 48–64). | P | abierta |

## P05 Proyectos

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P05-01 | 2 | El "+" va a la derecha del título; en Android cae debajo. | B-7 | corregida |
| P05-02 | 1 | KPI en 4 cards de 2 × 2; Android, una card de 4 columnas. | B-8 | corregida |
| P05-03 | 8 | Buscador "Buscar proyectos…" + [Filtros] [Más recientes ▾] [grilla \| lista]; Android tiene chips Todos/Mis proyectos/Favoritos, Activos/Archivados, ícono de filtro y "Filtros y orden". | B-9 | corregida (ListToolbar; el alcance Todos/Mis/Favoritos/Archivados queda en el menú, como la web) |
| P05-04 | 2 | Card con menú "⋯" (archivar, etc.) además de la estrella. | B-8 | corregida |
| P05-05 | 3 | Fecha "Entrega: 29/10/2026"; Android "Entrega: 29 oct". | B-8 | corregida |
| P05-06 | 6 | Urgencia en `--color-warning-text` (marrón en claro); Android en ámbar. | B-6 | corregida (`dueToneColor`, token `dangerText` nuevo) |

## P06 Crear proyecto

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P06-01 | 1 | Orden de campos: Ámbito, Nombre, Descripción; Android pone el grupo al final con el rótulo "Grupo". | P | abierta |
| P06-02 | 8 | Rótulos arriba del campo; Android usa rótulo flotante. | B-9 | abierta |
| P06-03 | 3 | Placeholders "Ej.: Tina – Remodelación de paneles" y "De qué se trata el proyecto"; contador "0 / 2.000" solo en la descripción. | P | abierta |
| P06-04 | 8 | "Cancelar" con contorno; cabecera y pie sin banda ni divisor. | B-10 | abierta |
| P06-05 | 3 | Valor del ámbito "Para mí (personal)"; Android "Personal". | P | abierta |

## P07 Detalle de proyecto

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P07-01 | 1 | Fecha límite debajo de Avance, con selector punteado "29/10/2026", ✕ y urgencia; Android la pone al costado, sin urgencia, con "29 oct". | P | abierta |
| P07-02 | 1 | Descripción completa en la web; Android la corta en 3 líneas con "Ver descripción completa". | nativo | aceptada (en el teléfono el corte evita que una descripción larga empuje las pestañas fuera de la pantalla; el texto completo queda a un toque) |
| P07-03 | 2 | "Etiquetas" con ícono de etiqueta para editarlas. | P | abierta |
| P07-04 | 1 | Pestañas dentro de una card, con 6 pestañas. | B-9 / 17 | abierta |
| P07-05 | 1 | Pestaña Tareas: título "Tareas" + "2 pendientes", "+ Nuevo objetivo" con contorno, Lista/Tablero; composer en línea por sección ("Escribí una tarea y Enter…", "+ Agregar tarea a «…»"); Android usa un composer fijo abajo con selector de sección. | P | abierta |
| P07-06 | 3 | Objetivo: progreso "1/3 · 33%" contando subtareas y contador "2"; Android "0/2 · 0%". | P | abierta |
| P07-07 | 3 | Sin tareas generales: caja punteada "Sin tareas generales."; Android "Sin tareas". | P | abierta |
| P07-08 | 8 | Reordenar con manija en la web; Android con "Ordenar tareas". | nativo | aceptada (arrastrar con manija dentro de una lista desplazable es incómodo en táctil) |

## P08 Plantillas

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P08-01 | 2 | Acción "Nueva plantilla" con texto, a la derecha del título; Android un "+" debajo. | B-7 | abierta |
| P08-02 | 1 | KPI y barra de herramientas como en Proyectos. | B-8 / B-9 | abierta |
| P08-03 | 9 | Vacío: carpeta + "Sin plantillas de objetivo todavía" + texto + "Nueva plantilla"; Android bandeja + "No hay plantillas para mostrar.". | B-10 | abierta |

## P09 Detalle de tarea

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P09-01 | 1 | La web edita en el lugar; Android tiene pantalla propia. | nativo | aceptada (decisión 1) |
| P09-02 | 6 | Proyecto, objetivo y sector como pastillas con los colores de etiqueta de la web (`--tag-work`, `--tag-exec`, `--tag-label`). | P | abierta |

## P10 Tablero

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P10-01 | 6 | Barra de progreso en acento con "33%" a la derecha; Android verde y sin porcentaje. | P | abierta |
| P10-02 | 8 | Chip de estado con contorno gris; Android relleno con el acento. | B-9 | abierta |
| P10-03 | 1 | Fila de tarea: punto de acento, título, carpeta + ruta, subtareas, chip; Android: sin punto, chip arriba de la ruta y punto gris en la ruta. | P | abierta |
| P10-04 | 6 | Cuerpo de la card en `--surface` (blanco); Android en `--bg`. | P | abierta |
| P10-05 | 2 | Cabecera de sector sin flecha en la web; Android la usa para abrir el sector. | nativo | aceptada (en la web se abre con clic en el nombre; Android necesita un destino táctil visible) |

## P11 Sectores

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P11-01 | 8 | Barra de herramientas como Proyectos: [Filtros] [Nombre · A–Z ▾] [grilla \| lista]; "3 sectores" y "Contraer todo" en la misma fila. Android: dos desplegables flotantes y "Contraer todo" aparte. | B-9 | abierta |
| P11-02 | 1 | Grupo: barra de acento, flecha, punto de color, nombre en mayúsculas, "(1)" y contador; Android ícono de personas y "2 pendientes". | P | abierta |
| P11-03 | 3 | Card de sector: pastilla, contador, progreso y "1/3 tareas"; Android suma flecha y "2 pendientes · 3 tareas". | P | abierta |

## P12 Detalle de sector

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P12-01 | 3 | Subtítulo "Grupo QA produccion"; Android "QA produccion". | P | abierta |
| P12-02 | 3 | Avance "33% · 1 de 3 completadas" contando subtareas; Android "0% · 0 de 2". | P | abierta |
| P12-03 | 1 | "Estados del sector" está en el menú ⋮ en la web; Android lo muestra como enlace. | P | abierta |
| P12-04 | 1 | Composer en línea "Escribí una tarea y Enter… (/proyecto" y agrupado por proyecto en una barra; Android composer fijo abajo y filtro Pendientes/Hechas/Todas. | P | abierta |

## P13 Grupos

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P13-01 | 6 | Pastilla del nombre con texto en `--text`; Android en acento. | P | abierta |
| P13-02 | 1 | La web no tiene buscador; Android sí. | P | aceptada (con muchos grupos el buscador es necesario en el teléfono; no cambia la estructura) |
| P13-03 | 3 | "pública" como insignia; Android "Lectura para no miembros" en texto y suma "2 pendientes" y flecha. | P | abierta |

## P14 Detalle de grupo

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P14-01 | 1 | Miembros, clientes y etiquetas se editan en el lugar en la web; Android usa pantallas y dialogs. | nativo | aceptada (decisión 1) |
| P14-02 | 3 | Rol como insignia ("admin principal", "admin"); Android en texto ("Administrador principal"). | P | abierta |
| P14-03 | 8 | "Lectura para no miembros" como checkbox; Android card con candado y lápiz. | P | abierta |

## P15 Notas

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P15-01 | 1 | La web abre directamente la nota; Android muestra la lista. | nativo | aceptada (decisión 1: la lista es la pantalla de entrada en el teléfono) |
| P15-02 | 4 | Card de nota: título, "hoy" y extracto en tres líneas; tipografía al rol de la web. | P | abierta |

## P16 Nota

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P16-01 | 1 | Migas "Mis notas / Notas de producción" con 🗑; Android encabezado "Nota". | P | abierta |
| P16-02 | 4 | Título como encabezado grande editable; Android campo con fondo. | P | abierta |
| P16-03 | 8 | Barra de formato visible en Android. | nativo | aceptada (en táctil no hay menú de selección con atajos) |

## P17 Documento del proyecto

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P17-01 | 3 | Título "Documentación"; la pestaña se llama "Documentos". | P | abierta |
| P17-02 | 1 | Acciones ✓ y ⋯ en la fila del título, a la derecha; Android las baja a otra fila. | B-7 | abierta |

## P18 Archivos del proyecto

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P18-01 | — | Vacío "Carpeta no habilitada" igual en las dos. | — | igual |

## P19 Actividad y acceso cliente

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P19-01 | 3 | Vacío "Todavía no hay acciones de un asistente de IA en este proyecto." en texto simple; Android con ícono y sin "de IA". Subtítulo de Android "Acciones realizadas mediante conexiones MCP." | P | abierta |
| P19-02 | 6 | Ícono de pestaña reloj; Android "i". | P | abierta |
| P19-03 | 3 | Texto de Acceso cliente distinto ("Los clientes con acceso ven este proyecto…"). | P | abierta |
| P19-04 | 8 | Cliente con insignia "Invitado" gris y 🗑; Android texto "Invitado" e ícono de quitar persona. | P | abierta |

## P20 Materiales — falta en Android (tarea 18)

## P21 Recordatorios

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P21-01 | 1 | La web abre en el calendario del mes ("Octubre 2026", ‹ Hoy ›); Android abre en "Próximos" y suma Notificaciones arriba. | P | abierta |
| P21-02 | 2 | Acción "+" (Android usa el ícono de alarma). | P | abierta |
| P21-03 | 1 | Zona horaria al pie; Android arriba. | P | abierta |

## P22 Notificaciones y Vence hoy (solo Android)

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P22-01 | 1 | Pantallas propias (decisión 2); el vacío usa la forma de estado vacío de la web. | B-10 | abierta |

## P23 Cuenta

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P23-01 | 1 | La web muestra pestañas Mi cuenta · Vincular con Claude · App móvil y las cards Cuenta de almacenamiento, Sistema y Usuarios permitidos; Android muestra perfil, servidor y versión, y lleva Sistema y Almacenamiento a pantallas aparte. | P | abierta |
| P23-02 | 3 | Subtítulo "Almacenamiento vinculado, versión y estado del sistema."; Android "Perfil, servidor y sesión.". | P | abierta |

## P24a Vincular con Claude

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P24a-01 | 3 | Título "Vincular con Claude" y subtítulo; Android "Conexiones MCP". | P | abierta |
| P24a-02 | 1 | Cards "Dirección del servidor" (URL + Copiar), "Tus tokens" (nombre + Generar token) y "Conectar en claude.ai"; Android un texto, "Crear conexión" y la actividad. | P | abierta |

## P24b App móvil — falta en Android (tarea 19)

## P25 Administración

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P25-01 | 1 | Lista de cards con ícono, título y descripción (Mi cuenta, Control de acceso, Almacenamiento, Usuarios y roles, Clientes, Integración con Genstock…); Android agrupa en secciones con otros nombres y sin descripción. | P | abierta |

## P26 Usuarios y acceso

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P26-01 | 3 | Títulos "Usuarios y roles" y "Control de acceso"; Android "Usuarios" y "Acceso". | P | abierta |
| P26-02 | 3 | Texto de introducción del rol Lector; insignia "super-admin". | P | abierta |
| P26-03 | 8 | Rol con desplegable y grupos con checkbox en el lugar; Android botones que abren dialogs. | P | abierta |
| P26-04 | 8 | Control de acceso: radios y "Correos autorizados" con campo + Autorizar en la misma pantalla. | P | abierta |

## P27 Clientes

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P27-01 | 3 | Título "Clientes" e introducción; Android "Clientes externos" sin introducción. | P | abierta |
| P27-02 | 8 | Alta en el lugar (Correo, Nombre, "Dar de alta"); cliente con insignia "Invitado", 🗑 y "Proyectos: …". | P | abierta |

## P28 Etiquetas y etapas

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P28-01 | 3 | Título "Etiquetas"; Android "Etiquetas y colores". | P | abierta |
| P28-02 | 9 | Vacío como caja punteada "+ Nueva clave"; Android desplegable de ámbito + "Agregar" + "No hay elementos en este ámbito.". | P | abierta |

## P29 Estados de tarea

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P29-01 | 3 | Introducción "Conjunto general de estados…" y rótulo "Ámbito" arriba del desplegable. | P | abierta |
| P29-02 | 8 | Alta en línea: nombre + [En curso \| Final] + "+" en caja punteada. | P | abierta |

## P30 Recordatorios del sistema

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P30-01 | 3 | Título "Recordatorios"; Android "Recordatorios del sistema". | P | abierta |
| P30-02 | 1 | Dos cards: "Zona horaria del sistema" (texto, campo, Guardar) y "Email (Gmail)" (texto, Conectar Gmail). | P | abierta |

## P31a Almacenamiento

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P31a-01 | 3 | Título "Almacenamiento"; Android "Almacenamiento del sistema". | P | abierta |
| P31a-02 | 1 | Formulario en el lugar (Proveedor, URL, usuario, app password, Guardar, Probar conexión) y card "Aprovisionamiento pendiente". | P | abierta |

## P31b Integración con GenStock — falta en Android (tarea 20)

## P32 Errores

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P32-01 | 3 | Título "Errores" y vacío "No hay errores registrados." en texto simple; Android "Registro de errores", filtro de estado y card. | P | abierta |

## P33 Portal

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P33-01 | 1 | Barra: logo + "Vista de cliente · solo lectura", nombre del cliente, tema y "Salir"; Android menú + selector de tema de tres íconos. | P | abierta |
| P33-02 | 1 | Card como la de proyecto: pastilla del nombre, progreso con %, "1/3 tareas", entrega con urgencia; Android título, "1 de 3 tareas completadas", flecha. | P | abierta |
| P33-03 | 3 | Subtítulo "Seguimiento del avance y las entregas de tus proyectos."; Android "Consultá el avance de tus trabajos.". | P | abierta |

## P34 Proyecto en portal

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P34-01 | 1 | "← Mis proyectos", encabezado con el nombre, descripción, entrega en caja, progreso, pestañas Tareas/Documentos/Actividad; Android encabezado "Proyecto" y secciones plegables. | P | abierta |
| P34-02 | 1 | Tareas agrupadas por objetivo en cards, subtareas en card anidada; Android sin cards y con el sector como pastilla. | P | abierta |

## P35 TV

| ID | Ítem | Diferencia | Destino | Estado |
|---|---|---|---|---|
| P35-01 | 1 | Sin barra superior ni menú; encabezado sin subtítulo. | P | abierta |
| P35-02 | — | El resto, como P10 (comparte el tablero). | P | abierta |
