-- Feature 063: carpetas de proyectos. Una ProjectFolder agrupa proyectos del
-- mismo cliente, organización o tipo de trabajo dentro de un ámbito (Grupo o
-- Personal, igual que ProjectStage). En la nube es un nivel intermedio:
-- /GENWORK_<EMPRESA>/<ÁMBITO>/<CARPETA>/<PROYECTO_007>.
-- Work.projectFolderId es ON DELETE SET NULL: borrar una carpeta nunca borra
-- proyectos, solo los deja sin carpeta.
-- Aditiva: los proyectos existentes quedan sin carpeta (projectFolderId NULL).

-- AlterTable
ALTER TABLE "Work" ADD COLUMN     "projectFolderId" TEXT;

-- CreateTable
CREATE TABLE "ProjectFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "groupId" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectFolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFolder_groupId_name_key" ON "ProjectFolder"("groupId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFolder_ownerId_name_key" ON "ProjectFolder"("ownerId", "name");

-- CreateIndex
CREATE INDEX "Work_projectFolderId_idx" ON "Work"("projectFolderId");

-- AddForeignKey
ALTER TABLE "Work" ADD CONSTRAINT "Work_projectFolderId_fkey" FOREIGN KEY ("projectFolderId") REFERENCES "ProjectFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFolder" ADD CONSTRAINT "ProjectFolder_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFolder" ADD CONSTRAINT "ProjectFolder_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

