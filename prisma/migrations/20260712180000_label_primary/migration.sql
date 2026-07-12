-- Revierte LabelKey.multi (mala interpretación: la restricción real no es por
-- clave configurada de antemano, sino por asignación marcada como principal).
ALTER TABLE "LabelKey" DROP COLUMN "multi";

-- TaskLabel vuelve a su PK compuesta original (un valor por clave y tarea, el
-- último $tag gana): el esquema de "principal + secundarias libres" es solo
-- para proyectos (Work), no para tareas.
-- Dedupe defensivo por si alguna tarea quedó con 2 filas del mismo (taskId, keyId)
-- mientras estuvo vigente el modelo multi (se conserva una fila arbitraria).
DELETE FROM "TaskLabel" a USING "TaskLabel" b
  WHERE a.id < b.id AND a."taskId" = b."taskId" AND a."keyId" = b."keyId";
ALTER TABLE "TaskLabel" DROP CONSTRAINT "TaskLabel_pkey";
DROP INDEX "TaskLabel_taskId_keyId_valueId_key";
ALTER TABLE "TaskLabel" DROP COLUMN "id";
ALTER TABLE "TaskLabel" ADD CONSTRAINT "TaskLabel_pkey" PRIMARY KEY ("taskId", "keyId");

-- WorkLabel: agrega isPrimary. A lo sumo una fila con isPrimary=true por
-- workId (índice único parcial) — es la etiqueta que da el color al proyecto;
-- el resto quedan como "secundarias" sin restricción de una por clave.
ALTER TABLE "WorkLabel" ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "WorkLabel_workId_primary_key" ON "WorkLabel"("workId") WHERE "isPrimary" = true;
