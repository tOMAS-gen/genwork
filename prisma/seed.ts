import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // --- Users ---
  const admin = await prisma.user.upsert({
    where: { email: "admin@test.local" },
    update: {},
    create: { email: "admin@test.local", name: "Admin de prueba", globalRole: "SUPERADMIN" },
  });
  const miembro = await prisma.user.upsert({
    where: { email: "miembro@test.local" },
    update: {},
    create: { email: "miembro@test.local", name: "Miembro de prueba", globalRole: "MEMBER" },
  });

  // --- Groups ---
  const grupo1 = await prisma.group.upsert({
    where: { name: "Taller Central" },
    update: {},
    create: { name: "Taller Central", ownerId: admin.id },
  });
  const grupo2 = await prisma.group.upsert({
    where: { name: "Sucursal Norte" },
    update: {},
    create: { name: "Sucursal Norte", ownerId: admin.id },
  });

  // Memberships
  for (const g of [grupo1, grupo2]) {
    for (const u of [admin, miembro]) {
      await prisma.groupMembership.upsert({
        where: { userId_groupId: { userId: u.id, groupId: g.id } },
        update: {},
        create: { userId: u.id, groupId: g.id, role: u.id === admin.id ? "ADMIN" : "MEMBER" },
      });
    }
  }

  // --- Estados de tarea (feature 042): conjunto default por grupo ---
  async function ensureDefaultStatuses(groupId: string) {
    const pending = await prisma.taskStatus.upsert({
      where: { groupId_name: { groupId, name: "Pendiente" } },
      update: {},
      create: { groupId, name: "Pendiente", color: "#94a3b8", type: "IN_PROGRESS", sortOrder: 0 },
    });
    const done = await prisma.taskStatus.upsert({
      where: { groupId_name: { groupId, name: "Hecha" } },
      update: {},
      create: { groupId, name: "Hecha", color: "#22c55e", type: "FINAL", sortOrder: 1 },
    });
    return { PENDING: pending, DONE: done };
  }
  const statusesByGroup: Record<string, { PENDING: { id: string }; DONE: { id: string } }> = {
    [grupo1.id]: await ensureDefaultStatuses(grupo1.id),
    [grupo2.id]: await ensureDefaultStatuses(grupo2.id),
  };

  // --- Sectors (7) ---
  const sectorNames = ["Metalúrgica", "Carpintería", "Pintura", "Compras", "Diseño", "Montaje", "Control de calidad"];
  const sectors: Record<string, { id: string }> = {};
  for (const name of sectorNames) {
    const existing = await prisma.sector.findFirst({
      where: { groupId: null, ownerId: null, name },
    });
    sectors[name] = existing ?? (await prisma.sector.create({ data: { name } }));
  }

  // --- Label Keys & Values ---
  const keyPrioridad = await prisma.labelKey.upsert({
    where: { groupId_name: { groupId: grupo1.id, name: "Prioridad" } },
    update: {},
    create: { name: "Prioridad", groupId: grupo1.id },
  });
  const keyTipo = await prisma.labelKey.upsert({
    where: { groupId_name: { groupId: grupo1.id, name: "Tipo de trabajo" } },
    update: {},
    create: { name: "Tipo de trabajo", groupId: grupo1.id },
  });
  const keyEstado = await prisma.labelKey.upsert({
    where: { groupId_name: { groupId: grupo1.id, name: "Estado comercial" } },
    update: {},
    create: { name: "Estado comercial", groupId: grupo1.id },
  });

  const upsertValue = async (keyId: string, name: string, color: any) =>
    prisma.labelValue.upsert({
      where: { keyId_name: { keyId, name } },
      update: {},
      create: { keyId, name, color },
    });

  const vAlta = await upsertValue(keyPrioridad.id, "Alta", "RED");
  const vMedia = await upsertValue(keyPrioridad.id, "Media", "ORANGE");
  const vBaja = await upsertValue(keyPrioridad.id, "Baja", "GREEN");

  const vGrafica = await upsertValue(keyTipo.id, "Gráfica", "VIOLET");
  const vImpresion = await upsertValue(keyTipo.id, "Impresión", "BLUE");
  const vPapeleria = await upsertValue(keyTipo.id, "Papelería", "TEAL");
  const vMueble = await upsertValue(keyTipo.id, "Mueble", "AMBER");

  const vProspecto = await upsertValue(keyEstado.id, "Prospecto", "GRAY");
  const vCotizado = await upsertValue(keyEstado.id, "Cotizado", "ORANGE");
  const vConfirmado = await upsertValue(keyEstado.id, "Confirmado", "GREEN");
  const vEnProd = await upsertValue(keyEstado.id, "En producción", "BLUE");

  // --- Works (10) ---
  const worksData = [
    { name: "Farmacias del Sol", desc: "Cartelería y señalética para 3 sucursales", group: grupo1, labels: [[keyEstado.id, vEnProd], [keyPrioridad.id, vAlta], [keyTipo.id, vGrafica]] },
    { name: "Municipalidad Quilmes", desc: "Mobiliario urbano — bancos y cestos", group: grupo1, labels: [[keyEstado.id, vConfirmado], [keyPrioridad.id, vAlta], [keyTipo.id, vMueble]] },
    { name: "Café Obelisco", desc: "Menú impreso y display de mostrador", group: grupo1, labels: [[keyEstado.id, vEnProd], [keyPrioridad.id, vMedia], [keyTipo.id, vImpresion]] },
    { name: "Estudio Arq. Paz", desc: "Maquetas y planos impresos A0", group: grupo1, labels: [[keyEstado.id, vCotizado], [keyPrioridad.id, vBaja], [keyTipo.id, vImpresion]] },
    { name: "Cervecería Patagonia", desc: "Luminoso exterior y carta de pared", group: grupo1, labels: [[keyEstado.id, vConfirmado], [keyPrioridad.id, vMedia], [keyTipo.id, vGrafica]] },
    { name: "Colegio San Martín", desc: "Carpetas institucionales y papelería", group: grupo2, labels: [[keyPrioridad.id, vBaja], [keyTipo.id, vPapeleria]] },
    { name: "Veterinaria Huellitas", desc: "Vinilo de vidriera y tarjetas", group: grupo2, labels: [[keyEstado.id, vProspecto], [keyPrioridad.id, vBaja]] },
    { name: "Gimnasio Iron", desc: "Banners de lona y folletería", group: grupo2, labels: [[keyEstado.id, vCotizado], [keyPrioridad.id, vMedia], [keyTipo.id, vGrafica]] },
    { name: "Panadería La Espiga", desc: "Bolsas personalizadas y stickers", group: grupo1, labels: [[keyEstado.id, vEnProd], [keyTipo.id, vPapeleria]] },
    { name: "Inmobiliaria Costa", desc: "Cartel de obra y folletos", group: grupo1, labels: [[keyEstado.id, vProspecto], [keyPrioridad.id, vBaja], [keyTipo.id, vImpresion]] },
  ];

  const taskTemplates: Record<string, string[][]> = {
    "Farmacias del Sol": [
      ["Diseñar cartelería fachada #Diseño", "PENDING"],
      ["Cortar perfiles de aluminio #Metalúrgica", "PENDING"],
      ["Pintar estructura base #Pintura", "PENDING"],
      ["Comprar LEDs y transformadores #Compras @Metalúrgica", "DONE"],
      ["Montar letras corpóreas #Montaje", "PENDING"],
      ["Revisión final antes de instalar #Control de calidad", "PENDING"],
    ],
    "Municipalidad Quilmes": [
      ["Plano de banco modelo B #Diseño", "DONE"],
      ["Soldar estructura banco #Metalúrgica", "DONE"],
      ["Cortar tablas de lapacho #Carpintería", "PENDING"],
      ["Lijar y barnizar madera #Carpintería", "PENDING"],
      ["Comprar tornillería inox #Compras", "DONE"],
      ["Pintar patas con antióxido #Pintura", "PENDING"],
      ["Ensamblar banco completo #Montaje", "PENDING"],
      ["Inspección de soldadura #Control de calidad", "DONE"],
    ],
    "Café Obelisco": [
      ["Diseñar menú A4 doble faz #Diseño", "DONE"],
      ["Imprimir menús x200 #Impresión", "PENDING"],
      ["Armar display de acrílico #Metalúrgica", "PENDING"],
      ["Comprar acrílico 3mm #Compras", "DONE"],
    ],
    "Estudio Arq. Paz": [
      ["Calibrar plotter A0 #Impresión", "PENDING"],
      ["Imprimir planos lote 1 #Impresión", "PENDING"],
    ],
    "Cervecería Patagonia": [
      ["Diseñar luminoso #Diseño", "DONE"],
      ["Fabricar caja de luz #Metalúrgica", "PENDING"],
      ["Imprimir lona translúcida #Impresión", "PENDING"],
      ["Comprar fluorescentes #Compras", "PENDING"],
      ["Instalar luminoso #Montaje", "PENDING"],
    ],
    "Colegio San Martín": [
      ["Diseñar tapa carpeta #Diseño", "DONE"],
      ["Imprimir carpetas x500 #Impresión", "PENDING"],
      ["Troquelar y plegar #Papelería", "PENDING"],
    ],
    "Veterinaria Huellitas": [
      ["Diseñar vinilo vidriera #Diseño", "PENDING"],
      ["Diseñar tarjetas personales #Diseño", "PENDING"],
    ],
    "Gimnasio Iron": [
      ["Diseñar banner 3x1m #Diseño", "PENDING"],
      ["Imprimir lona banner #Impresión", "PENDING"],
      ["Diseñar folleto A5 #Diseño", "PENDING"],
      ["Imprimir folletos x1000 #Impresión", "PENDING"],
    ],
    "Panadería La Espiga": [
      ["Diseñar bolsa kraft #Diseño", "DONE"],
      ["Imprimir bolsas x2000 #Impresión", "DONE"],
      ["Troquelar stickers #Papelería", "PENDING"],
      ["Comprar papel kraft #Compras", "DONE"],
    ],
    "Inmobiliaria Costa": [
      ["Diseñar cartel de obra 2x3m #Diseño", "PENDING"],
      ["Presupuestar estructura metálica #Metalúrgica", "PENDING"],
    ],
  };

  const dueDates = [
    new Date(new Date().setDate(new Date().getDate() - 3)), // Hace 3 días
    new Date(), // Hoy
    new Date(new Date().setDate(new Date().getDate() + 3)), // En 3 días
    new Date(new Date().setDate(new Date().getDate() + 10)), // En 10 días
    new Date(new Date().setDate(new Date().getDate() + 30)), // En 30 días
  ];

  const createdWorks: string[] = [];

  for (const [idx, wd] of worksData.entries()) {
    const existing = await prisma.work.findFirst({
      where: { name: wd.name, groupId: wd.group.id },
    });
    if (existing) {
      console.log(`  skip work "${wd.name}" (exists)`);
      continue;
    }

    const work = await prisma.work.create({
      data: {
        name: wd.name,
        description: wd.desc,
        groupId: wd.group.id,
        createdById: admin.id,
        dueDate: idx < 5 ? dueDates[idx] : undefined,
        doc: { create: {} },
      },
    });

    createdWorks.push(work.id);

    // Labels
    for (const [keyId, value] of wd.labels) {
      await prisma.workLabel.create({
        data: { workId: work.id, keyId: keyId as string, valueId: (value as any).id },
      });
    }

    // Tasks
    const tasks = taskTemplates[wd.name] ?? [];
    for (const [rawText, state] of tasks) {
      const displayText = rawText.replace(/#\S+/g, "").replace(/@\S+/g, "").trim();
      const sectorMatch = rawText.match(/#(\S+)/);
      const refMatch = rawText.match(/@(\S+)/);

      const sectorName = sectorMatch?.[1];
      const sectorId = sectorName ? sectors[sectorName]?.id : undefined;

      const task = await prisma.task.create({
        data: {
          rawText,
          displayText,
          statusId: statusesByGroup[wd.group.id][state as "PENDING" | "DONE"].id,
          workId: work.id,
          sectorId: sectorId ?? null,
          creatorId: admin.id,
          completedAt: state === "DONE" ? new Date() : null,
          completedById: state === "DONE" ? admin.id : null,
        },
      });

      // TaskLink EXEC for sector
      if (sectorId) {
        await prisma.taskLink.create({
          data: { taskId: task.id, type: "EXEC", targetType: "SECTOR", targetId: sectorId, sectorId },
        });
      }

      // TaskLink REF for @sector
      if (refMatch) {
        const refName = refMatch[1];
        const refId = sectors[refName]?.id;
        if (refId) {
          await prisma.taskLink.create({
            data: { taskId: task.id, type: "REF", targetType: "SECTOR", targetId: refId, sectorId: refId },
          });
        }
      }
    }

    console.log(`  + "${wd.name}" (${tasks.length} tareas)`);
  }

  // --- UserFavorites (3 para el admin) ---
  if (createdWorks.length >= 3) {
    for (let i = 0; i < 3; i++) {
      await prisma.userFavorite.upsert({
        where: { userId_workId: { userId: admin.id, workId: createdWorks[i] } },
        update: {},
        create: { userId: admin.id, workId: createdWorks[i] },
      });
    }
    console.log(`  + ${3} UserFavorites para admin`);
  }

  console.log("Seed completo.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
