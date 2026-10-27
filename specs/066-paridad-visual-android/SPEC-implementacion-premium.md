# Spec: `implementacion-premium` — los bocetos, en código

Estado: **piloto hecho; fases 1–5 planificadas** (2026-10-26, [plan](plan-implementacion-premium.md)). Módulo posterior de [MAP.md](MAP.md). Depende de [`auditoria-premium`](auditoria-premium.md) y de los bocetos aprobados por el usuario.

## Objetivo

Llevar a código la dirección premium "taller preciso" (D1–D10) pantalla por pantalla, en la web y en Android a la vez, para que no vuelvan a separarse.

El módulo arranca con un **piloto**: el detalle de tarea de Android (P09). El usuario ya decidió cómo tiene que quedar y la pantalla es solo de Android, así que sirve para probar el método con una sola pantalla. Las fases que siguen (bases compartidas PS1–PS3, componentes PS4–PS15 y pantallas) se planifican después del piloto, con su revisión.

### Decisiones del usuario para las fases 1–5 (2026-10-26)

- **Aprueba todos los bocetos.**
- **Android primero, web al final.** Las fases 1 a 4 son solo de Android. La fase 5 lleva a la web los cambios de sistema y vuelve a igualar las dos con el banco `comparativa`. Esto reemplaza el "a la vez" del objetivo.
- **QR con `qr_flutter`** en App móvil (P24b): dependencia nueva aprobada.
- **Crear proyecto (P06)** queda como diálogo centrado y no como hoja inferior, porque la guarda prohíbe `showModalBottomSheet`.

## Piloto: detalle de tarea (P09)

### Decisiones del usuario (2026-10-26)

- Al abrir una tarea, lo principal es la **descripción**, las **subtareas** y la **asignación**.
- Mi día, Urgente y Recordatorio pasan a **chips chicos**, como el selector de estado, en lugar de filas grandes con interruptor.
- Mover, Historial y Borrar van a un menú **"⋯"**.
- **Solo Android.** La web edita la tarea dentro de la lista (P09-01, aceptada en la paridad) y no cambia en el piloto. Un panel de detalle en la web se decide después.
- **"+ Asignar" con selector:** lista sectores y personas con la API de sugerencias que ya existe (`/api/tags/suggest`) y, al elegir, agrega `#sector` o `@persona` al texto de la tarea. No cambia la API.

### Cómo queda

Referencia: `despues/P09-detalle-tarea-admin-light-390-boceto.png`.

1. **Barra:** cierre "×", miga con el contexto (`proyecto › objetivo`, o `#sector` si la tarea es de un sector) y menú "⋯" con Mover a objetivo, Mover bajo otra tarea, Separar del padre, Historial de estados y Borrar tarea (en rojo).
2. **Título** de la tarea en 20/700, editable en el lugar, sin caja; un botón de tilde lo guarda.
3. **Fila de chips de 32 dp:** los estados (selector de estado, como hoy), Mi día, Urgente y Recordatorio.
4. **Asignada a:** los chips de proyecto, sector, personas y etiquetas que hoy aparecen sueltos, más "+ Asignar".
5. **Descripción** como bloque principal: campo de unas 6 líneas. Si no hay cambios muestra "Guardado ✓"; si hay cambios, un botón tonal "Guardar".
6. **Subtareas:** card con contador "1/2", filas de 48 dp con divisor, botón para ordenar y la línea "Nueva subtarea…" adentro de la misma card.

Lo que hoy informa la fila de Urgente ("Avisar a 2 personas al activar" o "Sin destinatarios…") pasa a la descripción accesible del chip y a un aviso al activarlo, para que no se pierda.

## Comandos

```sh
# desde mobile/
dart analyze
flutter test
flutter test test/features/task_detail_premium_test.dart
dart format <archivos tocados>   # nunca sobre carpetas

# capturas (ver quickstart.md)
PARIDAD_DIR=.context/paridad-visual/despues scripts/paridad-android.sh cap P09-detalle-tarea-admin
```

## Tests

- Test nuevo `test/features/task_detail_premium_test.dart`: orden de los bloques, chips (Mi día, Urgente, Recordatorio), menú "⋯", selector de asignación y guardado de descripción.
- Los tests que hoy fijan la forma vieja de la pantalla se **adaptan a la nueva sin quitar lo que verifican**: el mismo comportamiento con otro control. Son `ui_phase3_test` (título en la barra, Historial como sección, Borrar como botón), `notifications_test` (Urgente como interruptor), `daily_parity_test` y `objectives_parity_test` (acciones que pasan al menú). Cada cambio se lista en el commit.
- No se tocan umbrales de contraste, overflow ni las guardas de tokens.

## Límites

- **Siempre:** tokens y widgets compartidos; ningún color, radio o espaciado literal en `features/`; claro y oscuro.
- **Preguntar antes:** cambiar la web, la API o la navegación; sumar dependencias; quitar una verificación de un test.
- **Nunca:** relajar contraste, overflow o guardas; usar `showModalBottomSheet`.

## Criterios de éxito del piloto

1. La pantalla sigue el boceto en el orden de bloques y en la fila de chips, en claro y en oscuro.
2. Todo lo que se podía hacer antes se sigue pudiendo hacer: cambiar el estado, Mi día, Urgente, recordatorio, mover, separar, ordenar subtareas, historial y borrar.
3. "+ Asignar" agrega un sector o una persona a la tarea.
4. `dart analyze` limpio y `flutter test` en verde.
5. Captura `despues` de P09 en claro y oscuro, revisada contra el boceto.
