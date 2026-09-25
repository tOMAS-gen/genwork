-- Feature objetivos: objetivos dentro de proyectos. Un Objective agrupa tareas de
-- un proyecto bajo título/descripción; el progreso se deriva al leer, nunca se
-- guarda. Las tareas de un objetivo conservan workId = proyecto: permisos,
-- contadores y vistas por workId no cambian.
-- Task.objectiveId es ON DELETE SET NULL (no CASCADE): borrar un objetivo nunca se
-- lleva tareas en silencio; "eliminar con sus tareas" las borra explícitamente la
-- capa de servicio. sourceTemplateId es informativo (copia sin vínculo vivo).
-- Aditiva: las tareas existentes quedan como generales (objectiveId NULL) y las
-- plantillas existentes no necesitan conversión.

-- CreateTable
CREATE TABLE "Objective" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "sourceTemplateId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Objective_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "objectiveId" TEXT;

-- CreateIndex
CREATE INDEX "Objective_workId_position_idx" ON "Objective"("workId", "position");

-- CreateIndex
CREATE INDEX "Task_objectiveId_position_idx" ON "Task"("objectiveId", "position");

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_sourceTemplateId_fkey" FOREIGN KEY ("sourceTemplateId") REFERENCES "Work"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE SET NULL ON UPDATE CASCADE;
