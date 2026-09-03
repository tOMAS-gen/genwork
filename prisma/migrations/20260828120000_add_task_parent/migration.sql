-- Feature 062: subtareas de un nivel. Task.parentId permite que una tarea
-- cuelgue de otra (padre); el FK es self-referencial con ON DELETE CASCADE
-- (borrar el padre borra sus subtareas) y el índice compuesto ordena las
-- subtareas de un mismo padre por posición, igual que Task_workId_position_idx.

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "Task_parentId_position_idx" ON "Task"("parentId", "position");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
