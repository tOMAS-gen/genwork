# Quickstart: Búsqueda de usuarios para agregar miembros

## Prerrequisitos

- Servidor dev corriendo (`npm run dev`, puerto configurado en `.claude/launch.json`).
- Sesión con un usuario que sea `ADMIN` de al menos un grupo (o `SUPERADMIN`).
- Al menos 2 usuarios registrados en la plataforma además del admin (para tener
  candidatos que buscar).

## Validación end-to-end

1. Entrar a `/groups/[id]` de un grupo donde se es administrador.
2. En la sección "Miembros", escribir 2+ caracteres del nombre o email de un
   usuario que **no** sea miembro todavía.
   - **Esperado**: aparece un indicador de carga breve y luego una lista con
     ese usuario (y otros que coincidan), máximo 8 resultados.
3. Elegir el usuario de la lista y confirmar el alta con un rol (Miembro o
   Administrador).
   - **Esperado**: se crea el `GroupMembership` (mismo comportamiento que el
     alta manual anterior); el usuario aparece en la lista de miembros del
     grupo.
4. Repetir la búsqueda por el mismo usuario ya agregado.
   - **Esperado**: no aparece en los resultados (excluido por ya-miembro).
5. Buscar un texto que no coincida con ningún usuario.
   - **Esperado**: mensaje de "sin resultados", sin opción de invitar un email libre.
6. Con una cuenta que NO administra el grupo (o rol Lector), intentar acceder
   al endpoint de búsqueda directamente.
   - **Esperado**: 403.

## Verificación de contrato (manual o vía test)

Ver `contracts/group-members-search.md` para los casos de request/response
exactos a validar contra `GET /api/groups/:id/members/search?q=...`.

## Tests automatizados esperados

- `src/lib/domain/users/__tests__/matching.test.ts` (o ubicación equivalente):
  cubre el matching insensible a mayúsculas/tildes y la exclusión de miembros
  existentes a nivel de función pura de dominio (Principio "Flujo de
  Desarrollo" de la constitution: lógica core con tests automatizados).
