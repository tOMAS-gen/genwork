# Quickstart: Fix cursor de texto desplazado al editar tareas

## Prerrequisitos

- Repo en la rama `050-fix-cursor-texto-tareas` (o con el fix aplicado localmente).
- Dependencias instaladas (`npm install` si es la primera vez).

## Setup

```bash
npm run dev
```

Abrir `http://localhost:3010` (o el puerto configurado) y loguearse con un usuario de prueba.

## Escenarios de validación

Repetir cada escenario en **dos puntos de entrada**: (a) alta de tarea nueva (`TaskListEditor`, fila "+ nueva tarea" dentro de un trabajo o sector) y (b) edición inline de una tarea existente (`TaskInlineEdit`, click sobre el texto de una tarea ya creada). El punto (b) es el mismo componente en toda la app — repetirlo abriendo la tarea **desde la vista de un trabajo y desde la vista de un sector** (y desde el detalle de tarea si hay una entrada directa a él) para cubrir los distintos contextos donde se monta (FR-006).

1. **Texto simple sin tags**
   - Escribir `Comprar perfiles de hierro`.
   - Verificar: el caret aparece siempre justo después del último carácter tipeado, sin salto vertical.

2. **Texto con tag al inicio**
   - Escribir `#Compras revisar stock`.
   - Verificar: al hacer click entre "revisar" y "stock", el caret cae exactamente ahí — no 4-6px corrido hacia la derecha o abajo.

3. **Texto con múltiples tags**
   - Escribir `Comprar perfiles de hierro #Compras @Metalurgica /Tina`.
   - Verificar: click en cualquier punto antes, dentro y después de cada tag posiciona el caret en el lugar correcto; el resaltado de color de cada tag no se mueve al enfocar/desenfocar.

4. **Texto largo con wrap a 2+ líneas**
   - Escribir una oración larga que fuerce salto de línea dentro del campo.
   - Verificar: el caret sigue alineado en la segunda línea, sin desfase acumulado.

5. **Selección de texto**
   - Doble click sobre una palabra: el resaltado de selección del navegador cubre exactamente esa palabra.
   - Arrastrar con mouse sobre un rango que incluya un tag: el resaltado sigue el puntero sin salirse del texto real.

6. **Regresión visual del resaltado de tags**
   - Comparar antes/después: los colores y estilos de `/trabajo #sector @referencia $etiqueta` se ven igual que antes del fix (sin pill/fondo extra en `.notes-row`, consistente con `.task-row`).

7. **Movimiento del caret con teclado**
   - Con el texto `Comprar perfiles de hierro #Compras @Metalurgica`, hacer click al final y mover el caret con flecha izquierda varias veces, cruzando dentro y fuera de un tag; luego `Home` y `End`.
   - Verificar: el caret se desplaza carácter por carácter siempre alineado con el texto visible, sin saltos, incluyendo al entrar/salir de un tramo con tag (FR-004).

## Resultado esperado

Los 7 escenarios pasan en ambos puntos de entrada (y en los distintos contextos de vista del punto (b)) sin desfase perceptible del caret ni de la selección, y sin cambios visuales en el resaltado de tags — equivalente a SC-001 a SC-004 de spec.md.
