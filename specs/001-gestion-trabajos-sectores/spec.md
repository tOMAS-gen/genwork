# Feature Specification: Gestión de trabajos por cliente y sector con etiquetado inline

**Feature Branch**: `001-gestion-trabajos-sectores`

**Created**: 2026-07-02

**Status**: Draft

**Input**: User description: "Sistema para manejar las tareas del trabajo identificándolas por
cliente/trabajo y por sector operativo. Cada trabajo tiene una página con documentación libre
(estilo Notion: notas, presupuestos, imágenes, archivos) arriba y una checklist de tareas abajo.
Las tareas se clasifican escribiendo etiquetas inline: `/trabajo` las vincula a un cliente/trabajo,
`#sector` las asigna al sector donde se ejecutan, `@referencia` menciona sectores de los que
dependen o a los que afectan. Existe un apartado de sectores de trabajo (ej.: Metalúrgica, Compras)
donde se ven agregadas las tareas de todos los trabajos. Una tarea es única: completarla en
cualquier vista la completa en todas. Ejemplo: `Comprar perfiles de hierro #Compras @Metalurgica
/Tina` vive en el trabajo Tina, se ejecuta en Compras y es filtrable por Metalúrgica (caso
ferretería: en Compras filtro Metalúrgica y veo todo lo que tengo que comprar para ese sector)."

## Clarifications

### Session 2026-07-02

- Q: ¿El sistema es de un solo usuario o multiusuario? → A: Multiusuario. Todo acceso requiere
  iniciar sesión; nada es visible sin autenticarse.
- Q: ¿Cómo se autentican los usuarios? → A: Con autenticación de Google (cuenta Google); es el
  único método de ingreso.
- Q: ¿Quién controla quién puede entrar? → A: El usuario principal (quien monta el sistema) es
  super-admin. Desde un panel decide el modo de acceso: permitir todo un dominio de correo
  corporativo, o mantener una lista explícita de correos autorizados.
- Q: ¿Cómo se controlan los permisos en v1? → A: Por grupos con acceso binario: quien es miembro
  de un grupo puede trabajar en lo que ese grupo abarca; quien no, no. Permisos finos por acción
  (solo crear / solo confirmar tareas) quedan para una versión futura.
- Q: ¿Qué ve el usuario principal? → A: Todo: todas las tareas, trabajos y grupos de todos los
  usuarios (rol super-admin).
- Q: ¿Cómo se relacionan grupos y sectores? → A: Cada sector pertenece a exactamente un grupo.
  El permiso se otorga a nivel grupo (habilita todos los sectores del grupo) o a nivel sector
  individual (habilita solo ese sector).
- Q: ¿Qué ve un usuario fuera de su alcance? → A: Depende del grupo: cada grupo tiene una opción
  de "lectura para no miembros". Si está activada, cualquier usuario autenticado puede ver ese
  grupo en solo lectura (ej.: Producción visible en un televisor); si está desactivada, los no
  miembros no ven su contenido (ej.: Administración).
- Q: ¿Cómo se muestra el estado en una pantalla/TV? → A: Existe un dashboard de estado por sector
  (tareas pendientes y realizadas) pensado para pantallas de visualización. Se accede con un
  usuario de rol Lector: una cuenta Google autorizada de solo lectura (ej.: el correo del
  televisor) que puede ver pero nunca modificar.
- Q: ¿Quién puede crear trabajos, sectores y grupos? → A: Cualquier usuario. Lo que crea fuera de
  un grupo (trabajos, sectores) es personal: solo lo ve él. Para compartir, crea un grupo: lo que
  se crea dentro del grupo lo ven sus miembros. El creador del grupo es su administrador
  principal, decide quién entra y no puede ser quitado; los demás administradores pueden agregar
  miembros y designar otros administradores, pero nunca quitar al creador.
- Q: ¿Dónde viven los archivos de un trabajo? → A: En una "mini nube" propia del sistema
  (almacenamiento de archivos autogestionado, no Google Drive). Al crear un trabajo se crea
  automáticamente su carpeta; todo archivo subido o referenciado en la plataforma se guarda ahí.
- Q: ¿Qué pasa al terminar un trabajo? → A: Se archiva: el sistema genera un paquete portable
  con la carpeta completa (archivos, documentación y registro de tareas del proyecto) que el
  usuario descarga y guarda en la nube que prefiera (Google Drive, otra nube o disco local).
  Recién con el export confirmado el trabajo sale del sistema activo. "Eliminar" un trabajo
  terminado significa portarlo/archivarlo, nunca destruir la información.
- Q: ¿Cómo se accede a los archivos además de la plataforma? → A: La mini nube debe tener cuenta
  propia por cada usuario del sistema (aprovisionada automáticamente) y soportar sincronización
  de escritorio: el usuario instala el cliente en su computadora y las carpetas de sus trabajos
  se sincronizan solas (filosofía Nextcloud/iCloud).
- Q: ¿Cómo se comparten las carpetas? → A: Por grupo: la carpeta del grupo la crea el creador del
  grupo y queda compartida automáticamente para todos sus miembros; adentro viven las carpetas de
  los trabajos del grupo. Lo personal vive en la carpeta personal de cada usuario.
- Q: ¿Qué tecnología de mini nube y cómo se despliega? → A: Nextcloud por defecto. Sistemas
  separados pero distribuidos juntos: la instalación de genwork incluye su Nextcloud listo para
  usar, y genwork tiene un módulo de conexión para configurarlo rápidamente — o para conectar un
  Nextcloud externo ya existente de la empresa. Alternativa: si la empresa ya trabaja con Google
  Drive, el módulo de almacenamiento puede usar Google Drive (vía API) en lugar de Nextcloud,
  con las mismas operaciones (carpetas por trabajo, compartidas por grupo, sync de escritorio
  con el cliente oficial de Drive).
- Q: ¿La actualización en vivo es solo para el dashboard TV? → A: No: es para todo el sistema.
  Cuando alguien crea o completa una tarea, todos los que están viendo la misma pantalla
  (trabajo, sector o dashboard) ven el cambio reflejado al instante, sin recargar. El televisor
  es solo un caso de uso más.
- Q: ¿Cuándo se libera el espacio de un trabajo archivado? → A: En dos pasos manuales: primero el
  usuario exporta y confirma (el trabajo queda archivado, fuera de los activos); después, como
  acción separada, lo elimina definitivamente. Esa eliminación borra la carpeta completa de la
  mini nube y todos los datos del trabajo en el sistema. Es una acción peligrosa: requiere
  confirmación explícita y solo está disponible con el export confirmado — necesaria para que el
  almacenamiento no se llene.
- Q: ¿Google Drive como almacenamiento? → A: Implementación futura. v1 solo implementa Nextcloud;
  la interfaz del módulo de almacenamiento queda preparada para agregar Google Drive después.
- Q: ¿Puedo etiquetar `/trabajo` sin tener permiso sobre ese trabajo? → A: Sí, dentro del mismo
  grupo. Ejemplo: quien administra solo el sector Metalúrgica detecta algo pendiente del trabajo
  Tina; desde su sector escribe la tarea con `/Tina` y esta se guarda en Tina llevando
  `#Metalurgica` (identifica desde qué sector se creó y dónde se ejecuta). El autor sigue sin
  poder abrir el trabajo Tina ni ver sus otras tareas: etiquetar es direccionar, no acceder.
- Q: ¿Cómo se muestran las etiquetas en cada vista? → A: Según contexto, omitiendo la vista
  actual (referencia implícita): en la vista del trabajo se muestran los `#sector` y `@subsector`
  de cada tarea; en la vista de un sector se muestran el `/trabajo` de origen y las `@referencias`
  (y otros `#` si la tarea tiene varios sectores de ejecución).
- Q: ¿Qué significa exactamente una referencia `@`? → A: "Esta tarea necesita aporte de". Cada
  sector tiene un apartado de referencias: las tareas de otros sectores que lo mencionan con `@`.
  No son tareas suyas (no las completa): son tareas a las que debe aportar para que el sector
  ejecutor pueda terminarlas. Ej.: `#Metalurgica @Diseño` → Diseño la ve en su apartado de
  referencias y sabe que tiene que aportar (pasar el diseño); la completa Metalúrgica.
- Q: ¿Las referencias son solo a sectores? → A: No: `@` puede referenciar sectores o usuarios.
  Un `@usuario` hace que la tarea aparezca en el apartado de referencias personal de esa persona.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear un trabajo con documentación y checklist (Priority: P1)

Como usuario, creo un trabajo para un cliente (ej.: "Tina – Remodelación visual de paneles").
El trabajo tiene dos secciones en una misma página: arriba, documentación libre donde escribo la
descripción, notas, presupuesto y agrego imágenes/archivos; abajo, una lista de tareas donde
escribo actividades y las marco como pendientes o realizadas.

**Why this priority**: Es la unidad básica del producto. Sin trabajos con doc y checklist no
existe nada que etiquetar ni vistas que agregar. Por sí sola ya reemplaza la nota suelta +
lista de tareas dispersa que el usuario usa hoy.

**Independent Test**: Crear un trabajo, escribir documentación con una imagen y un presupuesto,
agregar 3 tareas, marcar 1 como realizada, cerrar y reabrir la aplicación: todo persiste y la
tarea realizada se ve tachada en el historial.

**Acceptance Scenarios**:

1. **Given** la aplicación abierta, **When** creo un trabajo con nombre "Tina – Remodelación
   visual de paneles", **Then** veo una página con sección de documentación vacía arriba y lista
   de tareas vacía abajo.
2. **Given** un trabajo abierto, **When** escribo texto en la documentación y adjunto una imagen,
   **Then** el contenido se guarda y se muestra al reabrir el trabajo.
3. **Given** un trabajo con tareas, **When** marco la casilla de una tarea, **Then** la tarea pasa
   a estado Realizada, se muestra tachada/diferenciada y permanece visible en la lista.
4. **Given** una tarea realizada, **When** desmarco la casilla, **Then** vuelve a estado Pendiente.

---

### User Story 2 - Clasificar tareas con etiquetas inline (Priority: P2)

Como usuario, mientras escribo una tarea le agrego etiquetas dentro del mismo texto: `#sector`
para indicar en qué sector se ejecuta, `@sector` para referenciar de qué depende o a qué afecta,
y `/trabajo` para indicar a qué trabajo pertenece. Las etiquetas se reconocen al escribir y quedan
como vínculos navegables.

**Why this priority**: El etiquetado inline es el mecanismo diferencial del producto; habilita
todas las vistas y filtros posteriores. Depende de que existan trabajos y tareas (US1).

**Independent Test**: En un trabajo, escribir `Comprar perfiles de hierro #Compras @Metalurgica`
y verificar que ambas etiquetas se reconocen, se distinguen visualmente y quedan asociadas a la
tarea con su tipo correcto (ejecución vs. referencia).

**Acceptance Scenarios**:

1. **Given** una tarea en edición, **When** escribo `#Compras` dentro del texto, **Then** el
   sistema reconoce la etiqueta como sector de ejecución y la vincula a la tarea.
2. **Given** una tarea en edición, **When** escribo `@Metalurgica`, **Then** el sistema registra
   una referencia (mención) sin cambiar dónde se ejecuta ni dónde vive la tarea.
3. **Given** que escribo `#` o `@` o `/` seguido de texto, **When** el nombre coincide con un
   sector/trabajo existente, **Then** el sistema me lo sugiere para autocompletar.
4. **Given** que escribo una etiqueta con un nombre que no existe, **When** confirmo la tarea,
   **Then** el sistema me ofrece crear el sector/trabajo nuevo o corregir el nombre.
5. **Given** una tarea con etiquetas, **When** toco/clickeo una etiqueta, **Then** navego a la
   vista de ese sector o trabajo.

---

### User Story 3 - Ver y operar tareas por sector (Priority: P3)

Como usuario, creo sectores de trabajo (ej.: Metalúrgica, Compras) y en cada sector veo todas las
tareas de todos los trabajos etiquetadas con `#ese-sector`. Puedo completar una tarea desde el
sector y el cambio se refleja en el trabajo de origen, y viceversa. También puedo crear una tarea
desde el sector usando `/trabajo` para que se guarde en ese trabajo.

**Why this priority**: Es la segunda vista del modelo de doble vista; convierte el etiquetado en
valor operativo (trabajar "por sector" además de "por cliente").

**Independent Test**: Con dos trabajos que tienen tareas `#Metalurgica`, abrir el sector
Metalúrgica y verificar que aparecen las tareas de ambos; completar una desde el sector y
verificar que aparece completada dentro de su trabajo.

**Acceptance Scenarios**:

1. **Given** tareas en distintos trabajos etiquetadas `#Metalurgica`, **When** abro el sector
   Metalúrgica, **Then** veo todas esas tareas juntas, cada una indicando de qué trabajo viene.
2. **Given** la vista de un sector, **When** marco una tarea como realizada, **Then** la tarea
   queda realizada también en su trabajo de origen (misma tarea, no copia).
3. **Given** la vista del sector Metalúrgica, **When** creo la tarea `Armar estructura /Tina`,
   **Then** la tarea se guarda en el trabajo Tina con el vínculo `#Metalurgica` al sector actual.
4. **Given** una tarea `#Compras @Metalurgica`, **When** abro el sector Metalúrgica, **Then** la
   veo como referencia/relacionada pero NO puedo completarla desde ahí (se completa en Compras,
   su sector de ejecución).

---

### User Story 4 - Filtrar de forma transversal (Priority: P4)

Como usuario, dentro de cualquier vista filtro las tareas por trabajo, por sector referenciado o
por estado. Caso típico: estoy por ir a la ferretería, abro el sector Compras, filtro por
`@Metalurgica` y veo todas las compras pendientes relacionadas con metalúrgica, de todos los
trabajos.

**Why this priority**: Multiplica el valor de las vistas, pero requiere que existan etiquetas y
vistas de sector (US2 y US3) para tener algo que filtrar.

**Independent Test**: Con tareas `#Compras` que referencian distintos sectores, abrir Compras,
aplicar filtro `@Metalurgica` y verificar que solo quedan visibles las compras vinculadas a
metalúrgica.

**Acceptance Scenarios**:

1. **Given** el sector Compras con tareas de varios trabajos y referencias, **When** filtro por
   referencia `Metalurgica`, **Then** solo veo las tareas de Compras que mencionan `@Metalurgica`.
2. **Given** cualquier vista de sector, **When** filtro por trabajo `Tina`, **Then** solo veo las
   tareas de ese sector que pertenecen al trabajo Tina.
3. **Given** cualquier lista de tareas, **When** filtro por estado Pendiente, **Then** las tareas
   realizadas se ocultan hasta quitar el filtro.

---

### User Story 5 - Ingresar con Google y administrar el acceso (Priority: P1 — fundacional)

Como usuario, ingreso al sistema con mi cuenta de Google; sin sesión iniciada no veo nada.
Como usuario principal (super-admin), configuro desde un panel quién puede entrar: habilito un
dominio de correo corporativo completo o mantengo una lista de correos autorizados. Los grupos
los crea cualquier usuario: quien crea un grupo queda como su administrador principal y decide
quién entra a ese grupo.

**Why this priority**: Es fundacional: todo el sistema exige sesión iniciada, por lo que ninguna
otra historia es usable en producción sin esta. Se implementa junto con US1 para el MVP.

**Independent Test**: Con dos cuentas de Google (una autorizada, una no), verificar que la
autorizada entra y ve el sistema, la no autorizada recibe rechazo claro, y el super-admin puede
autorizar la segunda desde el panel y entonces esta ingresa.

**Acceptance Scenarios**:

1. **Given** un visitante sin sesión, **When** intenta acceder a cualquier vista, **Then** solo se
   le ofrece iniciar sesión con Google.
2. **Given** el modo "dominio corporativo" activo para `@empresa.com`, **When** alguien ingresa
   con un correo de ese dominio, **Then** accede sin necesidad de autorización individual.
3. **Given** el modo "lista de correos" activo, **When** ingresa un correo que no está en la
   lista, **Then** el acceso se rechaza con un mensaje claro y no se expone ningún dato.
4. **Given** el super-admin en su panel, **When** agrega o quita un correo de la lista, **Then**
   el cambio aplica en el próximo intento de ingreso de ese correo.
5. **Given** el super-admin, **When** navega el sistema, **Then** ve todos los trabajos, sectores,
   grupos y tareas sin restricción.

---

### User Story 6 - Dashboard de estado por sector para pantallas (Priority: P5)

Como responsable del taller, dejo un televisor o pantalla mostrando un tablero con el estado de
las tareas por sector (pendientes y realizadas), para que cualquiera vea de un vistazo cómo va la
producción. La pantalla usa una cuenta especial de rol Lector: entra con su propia cuenta Google
autorizada, ve el tablero de los grupos que tiene habilitados y no puede modificar nada.

**Why this priority**: Aporta visibilidad operativa al equipo, pero requiere que existan usuarios,
grupos, sectores y tareas funcionando (US1–US5).

**Independent Test**: Iniciar sesión con una cuenta de rol Lector en un dispositivo, verificar que
se muestra el tablero por sector con contadores/listas de pendientes y realizadas, que se refleja
una tarea recién completada por otro usuario, y que ninguna acción de edición está disponible.

**Acceptance Scenarios**:

1. **Given** una cuenta con rol Lector, **When** inicia sesión, **Then** accede al dashboard de
   estado por sector y no ve controles de creación, edición ni completado.
2. **Given** el dashboard visible en una pantalla, **When** un usuario completa una tarea de un
   sector mostrado, **Then** el tablero refleja el cambio sin intervención manual.
3. **Given** un grupo con lectura para no miembros desactivada y no habilitado para esa cuenta
   Lector, **When** se mira el dashboard, **Then** ese grupo no aparece.

---

### User Story 7 - Archivar un trabajo terminado (export portable) (Priority: P6)

Como usuario, cuando termino un trabajo (ej.: Tina), lo archivo: el sistema genera un paquete
portable con todos los archivos de la carpeta del trabajo, la documentación y el registro
completo de tareas (realizadas y pendientes). Yo descargo ese paquete y lo guardo donde
prefiera (mi Google Drive, otra nube o un disco). Con el export confirmado, el trabajo sale del
sistema activo. Así la mini nube queda liviana con solo los trabajos en curso, y nada se pierde.

**Why this priority**: Cierra el ciclo de vida del trabajo y evita que el almacenamiento activo
crezca sin límite, pero requiere todo lo anterior funcionando (trabajos, archivos, tareas).

**Independent Test**: Con un trabajo que tiene archivos, documentación y tareas, ejecutar
"archivar", descargar el paquete, verificar que es completo y legible sin el sistema, que el
trabajo ya no figura entre los activos, y que la operación se niega si el export falla.

**Acceptance Scenarios**:

1. **Given** un trabajo activo con archivos y tareas, **When** el usuario lo archiva, **Then** el
   sistema genera un paquete descargable con los archivos, la documentación y el registro de
   tareas del proyecto, en formatos legibles sin el sistema.
2. **Given** una generación o descarga que falla (sin conexión, sin espacio), **When** se intenta
   archivar, **Then** el trabajo NO se elimina del sistema activo y se informa el error.
3. **Given** un trabajo archivado con éxito (export confirmado), **When** se consulta la lista de
   trabajos activos, **Then** ya no aparece; sus tareas dejan de aparecer en las vistas de sector.
4. **Given** la acción "eliminar" sobre un trabajo activo, **When** el usuario la ejecuta,
   **Then** el sistema ofrece archivar primero; no existe eliminación destructiva sin exportación
   confirmada.
5. **Given** un trabajo archivado (export confirmado), **When** el usuario ejecuta la eliminación
   definitiva y pasa la confirmación explícita adicional, **Then** el sistema borra la carpeta
   completa del trabajo en la mini nube y todos sus datos (tareas, documentación, vínculos,
   adjuntos), liberando el espacio.

---

### Edge Cases

- Etiqueta que no coincide con ningún trabajo/sector existente: el sistema ofrece crearlo en el
  momento o corregir; nunca guarda una etiqueta "colgada" sin destino.
- Tarea creada en una vista de sector sin `/trabajo`: queda en el sector como tarea sin trabajo
  asignado, visible y completable; puede asignarse a un trabajo después.
- Renombrar un trabajo o sector: todas las tareas etiquetadas siguen vinculadas y muestran el
  nombre nuevo (el vínculo no depende del texto escrito).
- Eliminar un sector con tareas: las tareas NO se eliminan; pierden esa etiqueta y permanecen en
  sus trabajos. El sistema advierte cuántas tareas se desvincularán antes de confirmar.
- Eliminar un trabajo con tareas etiquetadas en sectores: el sistema advierte que sus tareas
  desaparecerán también de las vistas de sector antes de confirmar.
- Una tarea con múltiples `#sector`: aparece en todos esos sectores y puede completarse desde
  cualquiera de ellos.
- Texto que contiene `#`, `@` o `/` sin intención de etiquetar (ej.: "perfil 20/20"): el sistema
  solo reconoce etiqueta cuando el patrón coincide con la sintaxis y el usuario confirma la
  sugerencia; debe existir forma de escribir el símbolo literal.
- Dos trabajos o sectores con el mismo nombre dentro del mismo ámbito (mismo grupo o mismo
  espacio personal): no permitido; en ámbitos distintos sí puede repetirse (dos grupos pueden
  tener cada uno su sector "Compras").
- Usuario con sesión activa cuyo correo es quitado de la lista de autorizados: pierde el acceso
  (a más tardar al siguiente inicio de sesión); sus tareas y actividad previas se conservan.
- Usuario autenticado que no pertenece a ningún grupo: trabaja en su espacio personal (trabajos,
  sectores y tareas privados); puede crear un grupo cuando necesite compartir con otros.
- Intento de quitar al administrador principal de un grupo: prohibido para todos, incluidos los
  demás administradores; la opción no debe existir.
- Usuario con permiso solo de sector crea `... /Tina` hacia un trabajo que no puede abrir: la
  tarea se guarda en Tina con el `#` de su sector; el autocompletado de `/` le sugiere los
  trabajos del grupo aunque no pueda abrirlos; el autor puede seguir viendo y completando esa
  tarea desde su sector (`#` de ejecución), no desde el trabajo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir crear, renombrar y eliminar trabajos, cada uno con nombre
  único dentro de su ámbito (grupo o espacio personal) e información de cliente/título visible.
- **FR-002**: Cada trabajo MUST mostrar en una misma página dos secciones: documentación (arriba)
  y lista de tareas (abajo).
- **FR-003**: La sección de documentación MUST permitir texto libre con formato básico e
  incorporación de imágenes y archivos adjuntos (presupuestos, diseños, medidas, instrucciones).
- **FR-004**: El sistema MUST permitir crear tareas escribiendo una línea de texto, sin pasos
  obligatorios adicionales.
- **FR-005**: Toda tarea MUST tener exactamente dos estados posibles: Pendiente y Realizada,
  alternables mediante casilla/selector desde cualquier vista donde sea completable.
- **FR-006**: Las tareas realizadas MUST permanecer visibles en el historial del trabajo,
  diferenciadas visualmente (ej.: tachadas), y MUST poder revertirse a Pendiente.
- **FR-007**: El sistema MUST reconocer etiquetas inline dentro del texto de la tarea con esta
  semántica: `/nombre` = trabajo al que pertenece; `#nombre` = sector donde se ejecuta;
  `@nombre` = sector o usuario referenciado (necesita su aporte para completarse). Precedencia:
  una etiqueta explícita gana sobre el contexto donde se escribe (ej.: una tarea escrita dentro
  del trabajo A con `/B` se guarda en B).
- **FR-008**: Toda tarea MUST ser una entidad única: sus cambios de texto, etiquetas o estado se
  reflejan en todas las vistas donde aparece, sin copias ni sincronización manual.
- **FR-009**: El sistema MUST ofrecer autocompletado de nombres existentes al escribir `/`, `#`
  o `@`, y MUST ofrecer crear el trabajo/sector cuando el nombre no existe.
- **FR-010**: El sistema MUST permitir crear sectores de trabajo con nombre único, y cada sector
  MUST mostrar todas las tareas de todos los trabajos etiquetadas con `#ese-sector`.
- **FR-011**: En la vista de sector, cada tarea MUST indicar su trabajo de origen y MUST poder
  completarse solo si ese sector es su sector de ejecución (`#`); las tareas que solo la
  referencian (`@`) se muestran como relacionadas, sin casilla de completado.
- **FR-012**: El sistema MUST permitir crear tareas desde la vista de un sector; con `/trabajo`
  la tarea se guarda en ese trabajo vinculada al sector actual; sin `/trabajo` queda en el sector
  hasta ser asignada.
- **FR-013**: Toda vista de tareas MUST permitir filtrar por trabajo, por sector referenciado y
  por estado (pendiente/realizada), combinables.
- **FR-014**: Las etiquetas MUST ser vínculos navegables: activarlas lleva a la vista del trabajo
  o sector correspondiente.
- **FR-015**: Renombrar un trabajo o sector MUST mantener todos los vínculos existentes; eliminar
  uno MUST advertir el impacto (tareas desvinculadas o eliminadas) antes de confirmar.
- **FR-016**: Los datos MUST persistir entre sesiones: al cerrar y reabrir la aplicación, todos
  los trabajos, documentación, tareas, etiquetas y estados se conservan.
- **FR-017**: El sistema MUST exigir sesión iniciada con autenticación de Google para acceder a
  cualquier contenido; es el único método de ingreso.
- **FR-018**: El sistema MUST tener un único usuario principal (super-admin): quien instala/monta
  el sistema. Este rol MUST poder ver y administrar todo el contenido y todos los usuarios.
- **FR-019**: El super-admin MUST disponer de un panel de control de acceso con dos modos:
  (a) autorizar automáticamente todo correo de un dominio corporativo configurado, o
  (b) autorizar solo los correos de una lista explícita que él administra.
- **FR-020**: Un ingreso con correo no autorizado MUST rechazarse con mensaje claro, sin exponer
  ningún dato del sistema.
- **FR-021**: El sistema MUST permitir a cualquier usuario crear grupos de trabajo. El creador
  queda como administrador principal del grupo: decide quién ingresa, puede designar otros
  administradores y NO puede ser quitado del grupo por nadie. Los demás administradores MUST
  poder agregar miembros y designar administradores, pero nunca quitar al administrador principal.
- **FR-022**: El permiso MUST otorgarse en dos niveles: por grupo (el usuario opera todos los
  sectores del grupo, presentes y futuros) o por sector individual (opera solo ese sector). En
  v1 el permiso es binario: quien lo tiene puede operar (ver, crear, completar tareas) dentro de
  ese alcance; quien no, no. Permisos por acción (solo crear / solo confirmar) quedan
  explícitamente fuera de v1.
- **FR-023**: Un usuario con permisos en varios grupos o sectores MUST poder operar en todos
  ellos; sus vistas agregan el contenido de todo su alcance.
- **FR-024**: Cada grupo MUST tener una opción de "lectura para no miembros", administrada por
  los administradores del grupo y desactivada por defecto. Activada: cualquier usuario
  autenticado ve el contenido del grupo en solo lectura. Desactivada: los no miembros no ven su
  contenido.
- **FR-025**: El sistema MUST soportar el rol Lector: un usuario autorizado de solo lectura que
  nunca puede crear, editar ni completar nada, pensado para dispositivos de visualización
  (ej.: televisor del taller). Ve los grupos con lectura habilitada y los que el super-admin le
  habilite explícitamente desde su panel.
- **FR-026**: El sistema MUST ofrecer un dashboard de estado por sector: tareas pendientes y
  realizadas por sector, apto para pantalla grande, que refleja los cambios sin acción manual del
  espectador.
- **FR-027**: Todo trabajo y sector MUST pertenecer a un ámbito: un grupo (visible y operable
  para sus miembros según permisos) o el espacio personal de su creador (visible solo para él).
  Las tareas heredan el ámbito del trabajo o sector donde viven.
- **FR-028**: Un usuario sin grupos MUST poder trabajar plenamente en su espacio personal: crear
  trabajos, sectores y tareas privados, con las mismas capacidades de etiquetado y filtrado.
- **FR-029**: Al crear un trabajo, el sistema MUST crear automáticamente su carpeta en el
  almacenamiento de archivos propio del sistema ("mini nube"), dentro del ámbito correspondiente:
  la carpeta compartida del grupo, o la carpeta personal del creador. Todo archivo subido a la
  documentación o referenciado en el trabajo MUST guardarse en esa carpeta.
- **FR-033**: Cada usuario del sistema MUST tener automáticamente su cuenta/identidad en la mini
  nube (aprovisionamiento al autorizarse su ingreso), con su carpeta personal privada.
- **FR-034**: Al crear un grupo, el sistema MUST crear su carpeta compartida en la mini nube,
  con el creador del grupo como dueño, y MUST compartirla automáticamente con cada miembro que
  ingresa (y dejar de compartirla con quien sale del grupo).
- **FR-035**: La mini nube MUST soportar sincronización de escritorio mediante un cliente
  estándar: las carpetas de los trabajos a las que el usuario tiene acceso se sincronizan con su
  computadora sin pasos manuales por archivo.
- **FR-036**: Todas las vistas (trabajo, sector, dashboard) MUST reflejar en vivo los cambios
  hechos por otros usuarios (crear, editar, completar tareas) sin que el espectador recargue ni
  haga ninguna acción.
- **FR-037**: El módulo de almacenamiento MUST ser conectable mediante una interfaz de proveedor.
  En v1 se implementa únicamente Nextcloud (el incluido en la instalación o uno externo). Google
  Drive vía API queda como proveedor alternativo de una versión futura (mismas operaciones:
  carpeta por trabajo, compartida por grupo, sync de escritorio con el cliente oficial
  correspondiente); la interfaz MUST permitir agregarlo sin cambios en el dominio.
- **FR-038**: Etiquetar MUST ser direccionar, no acceder: un usuario con permiso en algún sector
  de un grupo MUST poder crear tareas hacia cualquier trabajo de ese grupo mediante `/trabajo`,
  aunque no tenga permiso para abrir ese trabajo. La tarea creada desde un sector MUST llevar el
  `#` de ese sector (vínculo de ejecución que identifica su origen). El autor sin permiso sobre
  el trabajo MUST seguir sin poder abrirlo ni ver sus demás tareas.
- **FR-039**: Las etiquetas de cada tarea MUST mostrarse según el contexto de la vista, omitiendo
  la referencia a la vista actual: en la vista del trabajo se muestran `#` y `@`; en la vista de
  un sector se muestran `/trabajo` y `@` (más otros `#` si la tarea tiene varios sectores de
  ejecución).
- **FR-040**: Cada vista de sector MUST tener un apartado de referencias separado de sus tareas
  propias: las tareas de otros sectores que lo mencionan con `@`. Son de solo lectura para ese
  sector (sin casilla de completado): indican que el sector debe aportar para que el sector
  ejecutor (`#`) pueda completarlas.
- **FR-041**: Una referencia `@usuario` MUST hacer visible la tarea en el apartado de referencias
  personal del usuario mencionado, con la misma semántica de solo lectura/aporte. El
  autocompletado de `@` MUST sugerir sectores y usuarios del ámbito.
- **FR-042**: Una tarea con referencia a un sector o usuario MUST ser visible (solo lectura) para
  los destinatarios de la referencia aunque no tengan permiso sobre el trabajo o el sector
  ejecutor de la tarea: la referencia otorga visibilidad de esa tarea puntual, nada más.
- **FR-030**: El sistema MUST permitir archivar un trabajo: generar un paquete portable y
  descargable con la carpeta de archivos completa, la documentación y el registro íntegro de
  tareas (texto, etiquetas y estados). El paquete MUST ser legible sin el sistema (formatos
  estándar) para guardarse en cualquier nube o disco que el usuario elija.
- **FR-031**: Archivar MUST ser atómico hacia el usuario: si la generación o entrega del paquete
  falla, el trabajo permanece intacto en el sistema activo; el trabajo sale del sistema solo con
  el export confirmado. No MUST existir eliminación destructiva de un trabajo sin archivado
  exitoso previo o confirmación explícita e inequívoca del usuario.
- **FR-032**: Un trabajo archivado MUST desaparecer de los trabajos activos y sus tareas de todas
  las vistas de sector. La liberación del espacio es un segundo paso manual: la eliminación
  definitiva MUST estar disponible solo para trabajos con export confirmado, MUST exigir
  confirmación explícita adicional (acción destructiva), y MUST borrar la carpeta completa del
  trabajo en la mini nube y todos sus datos en el sistema (tareas, documentación, vínculos,
  adjuntos).

### Key Entities

- **Trabajo**: unidad por cliente/proyecto (ej.: "Tina – Remodelación visual de paneles"). Tiene
  nombre único, documentación y una lista de tareas propias. Pertenece a un ámbito: un grupo o el
  espacio personal de su creador.
- **Documentación**: contenido libre de un trabajo — texto con formato, imágenes, archivos.
  Pertenece a un único trabajo.
- **Tarea**: línea de actividad con estado Pendiente/Realizada. Pertenece a lo sumo a un trabajo
  (`/`), tiene cero o más sectores de ejecución (`#`) y cero o más referencias (`@`) a sectores o
  usuarios que deben aportar. Es única en todo el sistema, visible desde múltiples vistas.
- **Sector**: área operativa transversal (ej.: Metalúrgica, Compras). Tiene nombre único; agrega
  tareas de todos los trabajos según etiquetas. Pertenece a un ámbito: un grupo o el espacio
  personal de su creador.
- **Etiqueta/Vínculo**: relación tipada entre una tarea y un trabajo, sector o usuario. Tipos:
  pertenencia (`/` → trabajo), ejecución (`#` → sector), referencia (`@` → sector o usuario). El
  vínculo apunta a la entidad, no al texto del nombre.
- **Usuario**: persona autenticada con cuenta de Google. Atributos: correo, nombre, rol global
  (super-admin del sistema, miembro o lector) y, por cada grupo, su rol allí (administrador
  principal, administrador o miembro) y permisos otorgados (por grupo y/o por sector). Tiene un
  espacio personal privado para sus propios trabajos, sectores y tareas.
- **Grupo**: unidad organizativa y de permisos creada por cualquier usuario (ej.: Administración,
  Producción). Tiene nombre único, contiene trabajos y sectores, y una opción de lectura para no
  miembros (desactivada por defecto). Su creador es el administrador principal, irremovible. El
  permiso a nivel grupo habilita todos sus sectores; también puede otorgarse permiso a un sector
  suelto.
- **Configuración de acceso**: modo de autorización de ingreso (dominio corporativo o lista de
  correos) y la lista de correos autorizados. Administrada solo por el super-admin.
- **Carpeta de trabajo**: espacio de archivos en la mini nube, creado automáticamente con cada
  trabajo (1:1). Contiene todos los archivos subidos o referenciados en ese trabajo.
- **Archivo**: documento, imagen, diseño o cualquier adjunto. Vive en la carpeta de su trabajo y
  se referencia desde la documentación o las tareas.
- **Paquete de archivo (export)**: resultado de archivar un trabajo — carpeta de archivos +
  documentación + registro de tareas en formatos estándar, descargable; el usuario lo guarda en
  la nube o disco que prefiera.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario crea un trabajo nuevo con su primera tarea en menos de 1 minuto.
- **SC-002**: Clasificar una tarea (trabajo + sector + referencia) no requiere más que escribir
  el texto con sus etiquetas: cero pantallas o formularios adicionales.
- **SC-003**: El 100% de las tareas completadas desde una vista aparecen completadas en todas las
  demás vistas de forma inmediata, sin acción del usuario.
- **SC-004**: Ante el caso "voy a la ferretería": el usuario obtiene la lista completa de compras
  pendientes de un sector dado en 2 acciones o menos (abrir sector Compras + aplicar filtro).
- **SC-005**: El 100% de las tareas realizadas permanecen consultables en el historial de su
  trabajo (ninguna se pierde al completarse).
- **SC-006**: Toda la información de un trabajo (documentación y avance de tareas) es visible en
  una sola página, sin navegar a otras secciones.

## Assumptions

- Multiusuario desde v1: autenticación exclusivamente con Google; el usuario principal
  (super-admin) controla el ingreso por dominio corporativo o lista de correos, y organiza los
  permisos mediante grupos de acceso binario. Permisos finos por acción (solo crear / solo
  confirmar tareas) quedan para una versión futura.
- Se asume equipo chico (menos de ~30 usuarios); no se requieren flujos de invitación masiva
  en v1.
- Las etiquetas (`/`, `#`, `@`) solo referencian trabajos y sectores del mismo ámbito: el mismo
  grupo, o el espacio personal del autor. Referencias cruzadas entre grupos quedan fuera de v1.
- Mover un trabajo o sector del espacio personal a un grupo (o entre grupos) queda fuera de v1;
  se contempla como actualización futura.
- Mini nube decidida: Nextcloud por defecto (cuentas por API, carpetas de grupo compartidas,
  cliente de sincronización de escritorio, archivos accesibles para el export). genwork y
  Nextcloud son sistemas separados que se distribuyen juntos; genwork incluye un módulo de
  conexión que permite apuntar al Nextcloud incluido, a uno externo preexistente, o a Google
  Drive vía API como proveedor de almacenamiento alternativo (FR-037).
- El destino final del paquete de archivado lo elige el usuario (descarga); el sistema no
  necesita credenciales de ninguna nube externa para archivar.
- Restaurar un trabajo archivado (re-importar el paquete) al sistema activo queda fuera de v1.
- La plataforma concreta (web, escritorio o móvil) se decide en la fase de plan; la spec exige
  solo que sea utilizable en el contexto de trabajo diario del usuario.
- `@` es referencia/mención para filtrar y navegar; NO implica bloqueo duro entre tareas (no hay
  cadenas de dependencia que impidan completar una tarea).
- Sin fechas límite, recordatorios ni notificaciones en v1; el seguimiento es por listas y filtros.
- Los nombres de trabajos y sectores son únicos dentro de su ámbito (grupo o espacio personal);
  la coincidencia de etiquetas es insensible a mayúsculas/acentos al autocompletar.
- Idioma de la interfaz: español.
- Volumen esperado: decenas de trabajos activos y cientos de tareas; no se requiere escala
  industrial.
