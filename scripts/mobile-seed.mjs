import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const url = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid/');
if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/genwork_mobile_parity') {
  throw new Error('El seed solo puede ejecutarse en la base local genwork_mobile_parity.');
}
const uuid = (key) => { const h = createHash('sha256').update(key).digest('hex'); return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`; };
const db = new PrismaClient();
const doc = (text) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
try {
  await db.$transaction(async (tx) => {
    // Retirar solo fixtures de la primera versión, que usaba IDs no UUID.
    await tx.task.deleteMany({ where: { id: { startsWith: 'parity-' } } });
    await tx.work.deleteMany({ where: { id: { startsWith: 'parity-' } } });
    await tx.group.deleteMany({ where: { id: { startsWith: 'parity-' } } });
    await tx.note.deleteMany({ where: { id: { startsWith: 'parity-' } } });
    await tx.reminder.deleteMany({ where: { id: { startsWith: 'parity-' } } });
    const users = {};
    for (const [login, role] of [['admin', 'SUPERADMIN'], ['miembro', 'MEMBER'], ['lector', 'READER'], ['cliente', 'CLIENT']]) {
      users[login] = await tx.user.upsert({ where: { email: `${login}@test.local` }, update: {}, create: { email: `${login}@test.local`, name: `${login} de prueba`, globalRole: role } });
    }
    await tx.accessConfig.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
    for (const [suffix, publicRead] of [['produccion', false], ['publico', true], ['privado', false]]) {
      const groupId = uuid(`parity-${suffix}`);
      await tx.group.upsert({ where: { id: groupId }, update: {}, create: { id: groupId, name: `QA ${suffix}`, color: '#3b5bfa', publicRead, ownerId: users.admin.id } });
      await tx.groupMembership.upsert({ where: { userId_groupId: { userId: users.admin.id, groupId } }, update: {}, create: { userId: users.admin.id, groupId, role: 'ADMIN' } });
      if (suffix === 'produccion') {
        await tx.groupMembership.upsert({ where: { userId_groupId: { userId: users.miembro.id, groupId } }, update: {}, create: { userId: users.miembro.id, groupId, role: 'ADMIN' } });
        await tx.readerGrant.upsert({ where: { userId_groupId: { userId: users.lector.id, groupId } }, update: {}, create: { userId: users.lector.id, groupId } });
      }
      for (const [id, name, type, color, sortOrder] of [['open', 'Pendiente', 'IN_PROGRESS', '#3b5bfa', 0], ['done', 'Terminado', 'FINAL', '#16a34a', 1]]) {
        await tx.taskStatus.upsert({ where: { id: uuid(`${groupId}-${id}`) }, update: {}, create: { id: uuid(`${groupId}-${id}`), name, type, color, sortOrder, groupId } });
      }
      const sectorId = uuid(`${groupId}-sector`);
      await tx.sector.upsert({ where: { id: sectorId }, update: {}, create: { id: sectorId, name: 'Impresión', color: '#3b5bfa', groupId } });
      const workId = uuid(`${groupId}-work`);
      await tx.work.upsert({ where: { id: workId }, update: {}, create: { id: workId, name: suffix === 'produccion' ? 'Cartelería del local' : `Proyecto ${suffix}`, description: 'Preparar originales, imprimir y entregar. '.repeat(8), groupId, createdById: users.miembro.id, dueDate: new Date(Date.now() + 86400000 * 3) } });
      const objectiveId = uuid(`${workId}-objective`);
      await tx.objective.upsert({ where: { id: objectiveId }, update: {}, create: { id: objectiveId, title: 'Preparación y entrega', workId, createdById: users.miembro.id } });
      for (const [id, text, done, parentId] of [['root', 'Preparar los originales', false, null], ['sub-1', 'Revisar medidas y sangrado', true, uuid(`${workId}-root`)], ['sub-2', 'Confirmar colores con el cliente', false, uuid(`${workId}-root`)], ['print', 'Imprimir y controlar la terminación', false, null]]) {
        const taskId = uuid(`${workId}-${id}`);
        await tx.task.upsert({ where: { id: taskId }, update: {}, create: { id: taskId, rawText: text, displayText: text, workId, objectiveId, parentId, creatorId: users.miembro.id, statusId: uuid(`${groupId}-${done ? 'done' : 'open'}`), myDayAt: done ? null : new Date(), position: id === 'print' ? 1 : 0 } });
        await tx.taskLink.upsert({ where: { taskId_type_targetType_targetId: { taskId, type: 'EXEC', targetType: 'SECTOR', targetId: sectorId } }, update: {}, create: { taskId, type: 'EXEC', targetType: 'SECTOR', targetId: sectorId, sectorId } });
      }
      await tx.docPage.upsert({ where: { workId }, update: {}, create: { workId, content: doc('Documento de producción: mantener el formato y guardar los cambios.') } });
      if (suffix === 'produccion') {
        await tx.clientWorkGrant.upsert({ where: { userId_workId: { userId: users.cliente.id, workId } }, update: {}, create: { userId: users.cliente.id, workId, grantedById: users.admin.id } });
      }
    }
    for (const login of ['admin', 'miembro']) {
      await tx.note.upsert({ where: { id: uuid(`parity-note-${login}`) }, update: {}, create: { id: uuid(`parity-note-${login}`), userId: users[login].id, title: 'Notas de producción', content: doc('Materiales, medidas y observaciones del trabajo.') } });
      await tx.reminder.upsert({ where: { id: uuid(`parity-reminder-${login}`) }, update: {}, create: { id: uuid(`parity-reminder-${login}`), title: 'Revisar entregas', scope: 'INDIVIDUAL', ownerId: users[login].id, createdById: users[login].id, date: new Date(), weekdays: [], leads: { create: { daysBefore: 0, minuteOfDay: 540 } } } });
    }
  });
  console.log('QA preparado: admin, miembro, lector y cliente; grupos privado/público, proyectos, objetivos, subtareas, documentos, notas y recordatorios.');
} finally { await db.$disconnect(); }
