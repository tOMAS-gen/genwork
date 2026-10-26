# Spec: `paridad-visual` — Android igual a la web móvil

Estado: **aprobada** (2026-10-26). Módulo 2 de [MAP.md](MAP.md). Depende de [`comparativa`](SPEC-comparativa.md), que ya está cerrado. Fecha: 2026-10-25.

## Objetivo

Que cada pantalla de la app Android se vea como su equivalente en la web a 390 × 844, en claro y en oscuro. Quien pasa de la web al teléfono tiene que reconocer la misma pantalla: mismo orden, mismas piezas, mismos textos y mismo peso visual.

La referencia es la web y **la web no cambia**. La única excepción es el arreglo de fechas (alcance A), porque hoy la web no coincide ni consigo misma.

### Historias

- Como persona del equipo, abro un proyecto en el teléfono y lo veo igual que en el navegador del teléfono. No tengo que reaprender dónde está cada cosa.
- Como persona del equipo, veo la misma fecha de entrega en la lista, el detalle, el portal y la app.
- Como admin, encuentro en Android las pantallas que hoy solo están en la web: Materiales, App móvil e Integración con GenStock.
- Como usuario, veo en Android el mismo estado vacío, de carga y de error que en la web.

## Alcance

| Bloque | Qué incluye |
|---|---|
| **A. Fechas** | Una fecha de entrega se muestra igual en todas las vistas web y en Android (hallazgo 1 del inventario). Toca web y Dart. |
| **B. Base compartida** | Escala tipográfica (regla "el más chico"), tokens, encabezado de página, menú lateral (P03), KPI, cards de proyecto, chips y filtros, dialogs y estados. Se arregla una vez y beneficia a todas las pantallas. |
| **C. 34 pantallas con par** | P01–P35 marcadas `par` en [inventario.md](inventario.md), en el orden S01–S29. |
| **D. Pantallas que faltan** | P20 Materiales, P24b App móvil, P31b Integración con GenStock y la **pestaña Materiales del proyecto**, que también falta en Android (la web tiene 6 pestañas y Android 5). |
| **E. Estados** | Vacío, carga y error de cada pantalla, capturados en las dos plataformas. |

**Fuera de alcance:** los hallazgos web 2 ("Vence hoy" detrás del menú) y 3 (logo cortado en el portal) van a la auditoría S01–S29, porque la web no cambia. También quedan afuera iOS, las mejoras premium (módulos siguientes) y cualquier cambio de permisos o datos.

## Qué significa "igual"

Cada pantalla se cierra con esta lista, comparando el par `antes`/`despues` con la web:

1. **Estructura:** mismas secciones, en el mismo orden y con el mismo agrupamiento (qué va dentro de qué card).
2. **Acción principal:** el mismo control, en la misma posición relativa. Por ejemplo, el "+" de Proyectos va a la derecha del título, como en la web.
3. **Texto:** el mismo copy. Mismos títulos, rótulos, placeholders, contadores y formato de fecha.
4. **Tipografía:** mismo peso y mismo rol. Si el tamaño difiere, **gana el más chico**, con un piso de 11 px. El cuerpo de Android queda en 13 px.
5. **Espaciado y densidad:** el margen de página de la web móvil (`.main { padding: 16px 12px }`: 12 px a los costados, 16 arriba y abajo), el mismo padding de card y la misma separación entre bloques, medidos sobre las capturas.
6. **Color y superficies:** los mismos tokens de fondo, panel, borde y acento, en claro y oscuro. Las etiquetas y estados conservan su color.
7. **Forma:** los radios del rol que corresponde (chip 4, control 6, card 8, overlay 12). Íconos de la misma familia y del mismo tamaño.
8. **Componentes:** la misma pieza para la misma función. Por ejemplo, si la web usa un selector de orden y un cambio grilla/lista, Android no usa chips.
9. **Estados:** vacío, carga y error con el mismo texto y la misma forma.

**Lo nativo de Android se conserva:** barra de estado, botón y gesto atrás, ripple, pull-to-refresh, teclado y menús del sistema. Una diferencia que existe solo por eso no cuenta.

## Procedimiento por pantalla

1. **Diferencias:** comparar `antes/Pxx-*-web` con `antes/Pxx-*-android` y anotarlas en `diferencias.md`, en la sección de esa pantalla, numeradas `Pxx-01`, `Pxx-02`… con el ítem de la lista de arriba al que corresponden.
2. **Corrección en Flutter**, con tokens y widgets compartidos. Si la diferencia viene de un componente compartido, se corrige en el bloque B y no en la pantalla.
3. **Captura "después":** `PARIDAD_DIR=.context/paridad-visual/despues scripts/paridad-android.sh cap …`. La web se copia de `antes/`, porque no cambia.
4. **Cierre:** cada diferencia queda `corregida` o `aceptada (nativo)` con motivo. La pantalla pasa a `igual` en `inventario.md`.

## Comandos

```sh
# Flutter (desde mobile/)
dart analyze
flutter test
flutter test test/features/<archivo>_test.dart

# Web, solo en el bloque A (desde la raíz). El lint del repo está roto de antes:
# se corre sobre los archivos tocados.
npx vitest run <archivos de test>
npx tsc --noEmit
npx eslint <archivos tocados>

# Entorno y capturas: ver quickstart.md
AUTH_SECRET="$(cat .context/paridad-visual/auth-secret)" bash scripts/mobile-dev.sh web
ANDROID_DEVICE=emulator-5554 bash scripts/mobile-dev.sh android
PARIDAD_DIR=.context/paridad-visual/despues scripts/paridad-android.sh cap P05-proyectos-admin
node scripts/mobile-evidence.mjs .context/paridad-visual/despues
```

Para ver un cambio de Dart sin reinstalar, se usa la tecla `r` (hot reload) en la terminal de `flutter run`. Si se hace sin terminal interactiva, se relanza `mobile-dev.sh android`.

## Estructura

```
specs/066-paridad-visual-android/
  SPEC-paridad-visual.md    esta spec
  diferencias.md            diferencias numeradas por pantalla y su estado (se crea acá)
  inventario.md             suma la columna "igual"
mobile/lib/core/theme/      tokens y escala tipográfica (bloque B)
mobile/lib/shared/widgets/  componentes compartidos (bloque B)
mobile/lib/features/<x>/    pantallas (bloques C, D y E)
mobile/lib/data/            modelos y repositorios para las pantallas nuevas (bloque D)
mobile/test/                regresiones
src/…                       solo el arreglo de fechas (bloque A)
.context/paridad-visual/despues/   capturas "después", sin versionar
```

## Estilo de código

Se siguen [mobile/AGENTS.md](../../mobile/AGENTS.md) y `ui-genstock-parity-plan.md` §0:

- Nada de colores, radios ni medidas sueltas. Todo sale de los tokens, y `design_tokens_guard_test` lo verifica.
- Cada control interactivo nuevo lleva `ValueKey('<pantalla>_<accion>')` y las existentes no se tocan.
- Textos en castellano rioplatense, con el mismo copy que la web.

```dart
// Correcto: tokens del sistema y medidas con nombre.
return Container(
  padding: const EdgeInsets.all(AppSpacing.md),
  decoration: BoxDecoration(
    color: c.surface,
    border: Border.all(color: c.border),
    borderRadius: AppGeometry.card,
  ),
  child: Text('Entrega: ${formatDay(work.dueDate!)}', style: AppTextStyles.body),
);
```

## Estrategia de pruebas

- **Fechas (A):** primero un test que falle, en TS y en Dart. Casos: medianoche UTC, hora cercana al cambio de día en Buenos Aires (como el seed) y fecha elegida desde la UI. La misma entrada tiene que dar el mismo día en la lista, el detalle, el portal y Android.
- **Base compartida (B):** tests de widget de los componentes que cambian. `ui_phase3_test` (contraste AA, sin overflow a 360 dp y con texto 1,5×) no se relaja: si falla, se ajusta el token.
- **Pantallas (C):** se actualizan los tests de paridad que existen (`works_dashboard_test`, `navigation_parity_test`, `settings_parity_test`, etc.) cuando cambia la estructura, nunca el comportamiento. Un finder se cambia solo si cambió la estructura, y el commit lo explica.
- **Pantallas nuevas (D):** test de repositorio contra la respuesta de la API y test de widget con datos, vacío, error y permisos (admin y miembro).
- **Visual:** el par `despues` de cada pantalla, revisado contra la lista de "igual". No hay pruebas automáticas de píxeles.
- Antes de cada commit: `dart analyze` sin issues y `flutter test` en verde. Si se tocó la web, también los tests de TS de esos archivos y `tsc`.

## Límites

- **Siempre:** usar la web como referencia · usar tokens · conservar `ValueKey`, permisos, pull-to-refresh, reintento y guardado · aplicar "el más chico" con piso de 11 px · capturar el "después" en claro y oscuro · hacer un commit por pantalla o componente, con su ID P/S.
- **Preguntar antes:** cambiar la web fuera del bloque A · cambiar la API o el backend (si una pantalla nueva necesita algo que la API no da) · sumar dependencias (por ejemplo, el binding de Marionette, N10) · cambiar la estructura de navegación de Android (ver la pregunta 1) · borrar o reescribir un test.
- **Nunca:** relajar el contraste, el overflow o los guards de tokens · ampliar permisos · cambiar la web para que "coincida" con Android · tocar datos fuera de `genwork_mobile_parity` · poner capturas con datos reales o la webcam.

## Criterios de éxito

1. **Fechas:** la misma entrega muestra el mismo día en la lista web, el detalle web, el portal y Android, con tests en TS y en Dart.
2. **Pantallas con par:** las 34 filas `par` están `igual` en `inventario.md`. Cada diferencia de `diferencias.md` está corregida o aceptada como nativa con motivo.
3. **Pantallas que faltan:** P20, P24b, P31b y la pestaña Materiales existen en Android, tienen par en `despues/` y respetan los permisos de la web.
4. **Estados:** vacío, carga y error capturados en las dos plataformas para cada pantalla que los tenga.
5. **Calidad:** `dart analyze` limpio y `flutter test` en verde. `ui_phase3_test` y `design_tokens_guard_test` sin cambios en sus umbrales.
6. **Comparador:** `node scripts/mobile-evidence.mjs .context/paridad-visual/despues` muestra todos los pares sin huérfanas fuera de las pantallas que solo existen en Android.

## Decisiones (2026-10-26)

1. **Pestañas contra pantallas.** En la web, Documentos, Archivos, Actividad y Acceso cliente son pestañas dentro del proyecto (P17–P19), y el detalle de tarea (P09) se edita en el lugar. En Android son pantallas aparte. **Se conserva la navegación de Android** y se iguala lo visual de cada pieza: la barra de pestañas y el contenido.
2. **Pantallas que solo existen en Android** (Notificaciones, Preferencias de notificaciones, Sistema y Cuenta de almacenamiento): **se quedan y adoptan el lenguaje visual de la web** (encabezado, cards, controles).
3. **Atrás con el menú lateral abierto** (hallazgo 4): se verifica en P03 y, si se confirma, **el botón atrás cierra el menú**.
4. **Marionette (N10): se suma** el binding solo en modo debug, para navegar y verificar cada pantalla. No entra en la build de release.
