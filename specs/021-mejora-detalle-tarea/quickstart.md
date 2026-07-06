# Quickstart: Mejora del sistema de detalle de tareas

## Prerrequisitos

- Dev server corriendo en puerto 3010 (`npm run dev`)
- `DEV_AUTH=true` en `.env.local`
- Al menos un proyecto con tareas (seed data)

## Escenarios de validación

### 1. Vista: descripción visible sin header

1. Navegar a un proyecto que tenga una tarea con descripción
2. Verificar: la descripción aparece debajo de la tarea como texto plano con barra azul lateral
3. Verificar: NO hay header "Descripción" visible
4. Verificar: tareas sin descripción no muestran ningún panel extra

**Esperado**: descripción inline con barra azul, sin header, solo si existe

### 2. Edición: campo de descripción accesible

1. Hacer clic en el texto de una tarea para entrar en edición
2. Verificar: debajo del campo de texto principal aparece un textarea con placeholder "Descripción"
3. Presionar Tab desde el campo de texto principal
4. Verificar: el foco se mueve al textarea de descripción
5. Escribir una descripción y hacer clic fuera (blur)
6. Verificar: la descripción se guarda y aparece en modo vista

**Esperado**: campo de descripción presente en edición, Tab funciona, guarda en blur

### 3. Colapso/expansión de descripción existente

1. Ver una tarea con descripción visible
2. Hacer clic en el ícono FileText en la fila
3. Verificar: la descripción se colapsa
4. Hacer clic de nuevo
5. Verificar: la descripción se expande

**Esperado**: toggle funciona, transición suave

### 4. Tema oscuro

1. Cambiar a tema oscuro
2. Repetir escenarios 1 y 2
3. Verificar: barra azul, texto y textarea se ven correctos

**Esperado**: coherente con dark mode
