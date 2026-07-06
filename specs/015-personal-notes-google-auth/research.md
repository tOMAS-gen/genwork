# Research: Sector Personal, Notas y Google Auth

## Decision 1: Editor rich-text para notas

**Decision**: Usar TipTap (basado en ProseMirror) como editor de texto enriquecido para las notas del sector personal.

**Rationale**: TipTap es el estándar de facto para editores rich-text en React. Liviano, extensible, headless (permite estilizar con CSS propio), y soporta JSON como formato de almacenamiento (portable, queryable). Soporta out-of-the-box: headings, bold, italic, listas, links, placeholder.

**Alternatives considered**:
- Lexical (Meta) → más complejo de configurar, API menos estable
- Slate.js → API cambiante, documentación fragmentada
- Markdown puro con preview → pierde la experiencia WYSIWYG que el usuario pidió ("como Notion")
- ContentEditable manual → demasiado trabajo, bugs de browser

## Decision 2: Almacenamiento de contenido de notas

**Decision**: Guardar el contenido como JSON (formato TipTap/ProseMirror) en un campo `Json` de Prisma (jsonb en PostgreSQL).

**Rationale**: JSON preserva la estructura del documento sin parsing. Permite renderizar sin transformaciones. Compatible con el formato nativo de TipTap (`editor.getJSON()` / `editor.commands.setContent(json)`).

**Alternatives considered**:
- HTML string → difícil de manipular server-side, XSS risk si no se sanitiza
- Markdown → pierde fidelidad de formato en roundtrip, no es WYSIWYG nativo
- Campo TEXT con markdown → más simple pero no alineado con "como Notion"

## Decision 3: Sector personal como ruta dedicada vs. sector regular

**Decision**: El sector personal usa una ruta dedicada `/notes` en lugar de `/sectors/[id]`. Internamente puede tener un registro en la tabla Sector con flag `isPersonal`, pero la UI lo trata como sección propia del sidebar.

**Rationale**: El sector personal tiene una UX diferente (notas con editor, no tareas con checklist). Usar `/sectors/[id]` forzaría a mezclar dos interfaces incompatibles en una misma página. Una ruta propia es más simple y clara.

**Alternatives considered**:
- Rehusar la página de sector existente con modo condicional → viola Principio V (complejidad innecesaria), mezcla dos UX distintas
- Crear entidad separada "PersonalSpace" → tabla innecesaria, el concepto de sector ya cubre la pertenencia

## Decision 4: Avatar de Google en sidebar

**Decision**: Agregar campo `image` al modelo User. Persistir la URL de foto de Google en el callback de signIn de next-auth. Mostrar `<img>` circular en el sidebar con fallback a iniciales.

**Rationale**: next-auth ya recibe `profile.picture` en el callback de Google. Solo falta persistirlo. El modelo User actual no tiene campo `image`. El sidebar (DrawerNav) ya tiene acceso a la sesión.

**Alternatives considered**:
- Guardar solo en la sesión JWT sin persistir → se pierde al expirar token, no está disponible server-side
- Proxy de imagen → innecesario, la URL de Google es pública y estable

## Decision 5: Admin visual — reuse de design system

**Decision**: Refactorizar /admin para usar las clases CSS existentes: `sheet`, `sheet-title`, `project-grid`, `project-card`, `pc-name-pill`. Cada sección de admin se muestra como tarjeta con ícono y descripción.

**Rationale**: Las clases ya existen y manejan responsive + dark mode. No hay que crear CSS nuevo.

**Alternatives considered**:
- Crear componentes nuevos de admin → duplicación innecesaria (Principio V)
