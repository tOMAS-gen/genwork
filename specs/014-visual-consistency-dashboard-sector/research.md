# Research: Visual Consistency — Dashboard y Detalle de Sector

## Decision 1: Board layout approach

**Decision**: Reemplazar la grilla genérica `.board` con tarjetas `project-card` individuales por sector, usando las clases CSS existentes (`pc-name-pill`, `pc-progress-*`, `card-header`).

**Rationale**: Las clases ya manejan dark mode, responsive, hover effects y están probadas en la home de proyectos. Reutilizarlas garantiza consistencia visual sin código nuevo.

**Alternatives considered**:
- Crear nuevas clases CSS específicas para board → duplicación innecesaria
- Usar grid CSS tipo kanban → más complejo, no alineado con el estilo actual del sitio

## Decision 2: TaskItem en board vs spans custom

**Decision**: Usar el componente TaskItem existente dentro del board en vez de spans con emojis ☐/☑.

**Rationale**: TaskItem ya maneja checkbox estilizado, tags inline coloreados, estado done/pending, edición inline, y es el componente estándar en toda la app. El board actual usa emojis de texto que rompen la consistencia.

**Alternatives considered**:
- Crear un componente "BoardTask" simplificado → violación del principio V (YAGNI) y duplicación
- Mantener emojis pero mejorar estilos → parche, no solución

## Decision 3: Sector detail — agrupación de tareas

**Decision**: Mantener la agrupación actual (sueltas arriba, por proyecto abajo) pero mejorar los separadores visuales con encabezados de proyecto estilizados.

**Rationale**: La lógica de agrupación ya existe en el API (`/api/sectors/[id]/tasks`). Solo falta mejorar la presentación de los encabezados de grupo para que cada sección de proyecto sea visualmente distinguible.

**Alternatives considered**:
- Tabs por proyecto → demasiado complejo para esta feature, violación principio V
- Acordeones colapsables → añade complejidad de estado sin beneficio claro

## Decision 4: Board — read-only vs interactive

**Decision**: El board se mantiene como vista de solo lectura (consistente con su propósito de pantalla/TV). Las tareas se muestran con TaskItem en modo read-only (canToggle=false, sin edición).

**Rationale**: El board es para visualización rápida de estado. La interacción completa se hace en el detalle de sector o proyecto.

**Alternatives considered**:
- Hacer el board interactivo → cambia el scope, no pedido
