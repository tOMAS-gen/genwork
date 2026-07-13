# Feature Specification: Fix cursor de texto desplazado al editar tareas

**Feature Branch**: `[050-fix-cursor-texto-tareas]`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Fix cursor de texto en tareas: el cursor de texto no está bien calibrado al escribir/editar el texto de una tarea, aparece desplazado respecto a la posición real del texto (probablemente un input/textarea de la tarea con line-height, padding o font mismatch entre el texto renderizado y el cursor)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Escribir o editar el texto de una tarea con el cursor en la posición correcta (Priority: P1)

Como usuario que crea o edita una tarea escribiendo su texto (incluyendo etiquetado inline `/trabajo #sector @referencia $etiqueta`), quiero que el cursor de texto (caret) se muestre exactamente donde está el punto de inserción real, para poder ubicarme con precisión al corregir, insertar o borrar texto sin adivinar dónde va a aparecer el próximo carácter.

**Why this priority**: Es el único síntoma reportado y afecta la acción más frecuente del producto (crear/editar tareas). Un cursor desplazado genera errores de tipeo constantes y desconfianza en el editor.

**Independent Test**: Se puede probar abriendo el campo de texto de una tarea (nueva o existente), haciendo click o usando teclado para posicionar el cursor en distintos puntos del texto (inicio, medio, final, dentro de una palabra), y verificando visualmente que el cursor aparece alineado con el carácter correspondiente, sin necesidad de ninguna otra funcionalidad.

**Acceptance Scenarios**:

1. **Given** un campo de texto de tarea vacío, **When** el usuario hace click para enfocarlo y empieza a escribir, **Then** el cursor aparece inmediatamente antes del primer carácter escrito, alineado verticalmente con la línea de texto.
2. **Given** una tarea con texto existente, **When** el usuario hace click en un punto específico dentro del texto (ej. entre dos letras de una palabra), **Then** el cursor se posiciona exactamente en ese punto, sin desfase horizontal ni vertical respecto al texto visible.
3. **Given** un campo de texto de tarea con el cursor posicionado, **When** el usuario mueve el cursor con las flechas del teclado, **Then** el cursor se desplaza carácter por carácter manteniéndose alineado con el texto en todo momento.
4. **Given** una tarea cuyo texto incluye etiquetado inline (`/trabajo`, `#sector`, `@referencia`, `$etiqueta`) ya resuelto a vínculo navegable, **When** el usuario edita texto antes, dentro o después de esas etiquetas, **Then** el cursor se mantiene alineado con el texto real en todos los tramos, incluyendo el estilo visual distinto de las etiquetas.

---

### User Story 2 - Selección de texto consistente con la posición visible (Priority: P2)

Como usuario que selecciona parte del texto de una tarea (para borrar, copiar o reemplazar), quiero que el área resaltada de la selección coincida con el texto que realmente estoy seleccionando, para no seleccionar caracteres de más o de menos por un desfase visual.

**Why this priority**: Es una consecuencia directa del mismo desajuste que afecta al cursor; si el cursor está mal calibrado, la selección de texto (que se ancla a las mismas coordenadas) hereda el mismo problema. Prioridad menor porque la selección se usa con menor frecuencia que la escritura simple.

**Independent Test**: Se puede probar seleccionando un rango de texto con mouse (arrastrando) o teclado (shift+flechas) sobre el texto de una tarea, y verificando que el resaltado cubre exactamente los caracteres seleccionados, sin extenderse ni quedar corto respecto al texto visible.

**Acceptance Scenarios**:

1. **Given** una tarea con texto, **When** el usuario selecciona una palabra haciendo doble click, **Then** el resaltado cubre exactamente esa palabra, sin desfase respecto a sus límites visuales.
2. **Given** una tarea con texto, **When** el usuario arrastra el mouse para seleccionar un rango de caracteres, **Then** el borde de la selección sigue el puntero y coincide con el carácter sobre el que está el mouse en cada instante.

---

### Edge Cases

- ¿Qué pasa con el desfase cuando el texto de la tarea ocupa más de una línea (wrap)? El cursor debe seguir alineado en cada línea, incluyendo el salto de línea.
- ¿Qué pasa si el texto contiene emojis o caracteres especiales (tildes, ñ, símbolos) junto a etiquetado inline? El cursor debe posicionarse igual de preciso que con texto ASCII simple.
- ¿Qué pasa al enfocar el campo desde distintos puntos de entrada (crear tarea nueva, editar tarea existente desde la vista de trabajo, desde la vista de sector, desde el detalle de tarea)? El comportamiento del cursor debe ser consistente en todos.
- ¿Qué pasa con el desfase en distintos tamaños de fuente o zoom del navegador? El cursor debe reescalar junto con el texto sin perder alineación.
- ¿Qué pasa si el usuario redimensiona la ventana o cambia de dispositivo (desktop/mobile) mientras edita? El cursor no debe quedar desalineado tras el cambio de layout.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar el cursor de texto (caret) exactamente en la posición horizontal y vertical que corresponde al punto de inserción real dentro del campo de texto de una tarea, en cualquier punto del texto (inicio, medio, final).
- **FR-002**: El sistema DEBE mantener el cursor alineado con el texto durante la escritura continua, sin que el desfase aparezca ni se acumule a medida que el texto crece o el campo hace wrap a una nueva línea.
- **FR-003**: El sistema DEBE posicionar el cursor correctamente al hacer click en cualquier punto del texto, incluyendo dentro, antes o después de un tramo de texto con etiquetado inline (`/trabajo #sector @referencia $etiqueta`) ya renderizado con su estilo visual distintivo.
- **FR-004**: El sistema DEBE mantener el cursor alineado al desplazarlo con el teclado (flechas izquierda/derecha/arriba/abajo, Home/End).
- **FR-005**: El área de selección de texto (resaltado) DEBE coincidir visualmente con el rango de caracteres seleccionado, sin desfase respecto al texto real, tanto al seleccionar con mouse como con teclado.
- **FR-006**: El comportamiento correcto del cursor y la selección DEBE ser consistente en todos los puntos de entrada donde se edita el texto de una tarea (creación de tarea nueva, edición inline desde la vista de trabajo, desde la vista de sector, y desde el detalle de tarea).
- **FR-007**: El sistema NO DEBE introducir regresiones visuales en el resaltado de etiquetado inline (colores, estilos de `/trabajo #sector @referencia $etiqueta`) como efecto secundario de la corrección.

### Key Entities

*(No aplica — esta feature es una corrección visual/de interacción sobre un componente de UI existente; no introduce ni modifica entidades de datos.)*

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En una prueba manual de escritura y edición sobre 10 tareas con distinto contenido (texto simple, texto largo con wrap, texto con etiquetado inline, texto con tildes/emojis), el cursor aparece alineado con el texto real en el 100% de los casos, sin desfase perceptible.
- **SC-002**: Los usuarios dejan de reportar el problema de "cursor desplazado" al editar tareas tras el despliegue de la corrección.
- **SC-003**: La selección de texto (mouse y teclado) coincide con el resaltado visible en el 100% de los casos probados en SC-001.
- **SC-004**: No se detecta ninguna regresión visual en el resaltado de etiquetado inline tras la corrección, verificado por comparación antes/después en los mismos 10 casos de prueba.

## Assumptions

- El desfase reportado es un problema de calibración visual (CSS: line-height, padding, font, box-sizing, o una capa de overlay desalineada con el campo de entrada real), no un problema de lógica de datos ni de guardado del texto de la tarea.
- La corrección aplica al campo de edición de texto de la tarea en sí (título/contenido de la tarea), no al editor de Documentación del proyecto (que es un componente distinto, estilo Notion, fuera del alcance de esta feature).
- El fix debe preservar el comportamiento existente de reconocimiento y resaltado de etiquetado inline (`/` `#` `@` `$`) mientras se escribe — no se toca el parser, solo la calibración visual del cursor/selección respecto al texto.
- No hay requerimientos de accesibilidad ni de dispositivos táctiles fuera de los ya soportados por el campo de texto existente; el fix no amplía el alcance de plataformas soportadas.
