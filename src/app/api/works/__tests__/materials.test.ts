import { beforeEach, describe, expect, it, vi } from "vitest";

const WORK_ID = "11111111-1111-4111-8111-111111111111";
const MATERIAL_ID = "22222222-2222-4222-8222-222222222222";
const PRODUCT_ID = "33333333-3333-4333-8333-333333333333";

const authState = vi.hoisted(() => ({
  userId: "user-1",
  role: "MEMBER" as "SUPERADMIN" | "MEMBER" | "READER" | "CLIENT",
  memberGroupIds: [] as string[],
}));

interface FakeWork {
  id: string;
  name: string;
  groupId: string | null;
  ownerId: string | null;
  status: "ACTIVE" | "ARCHIVED";
  isTemplate: boolean;
  createdAt: Date;
  group: { id: string; name: string; publicRead: boolean } | null;
}

interface FakeMaterial {
  id: string;
  workId: string;
  genstockProductId: string;
  productName: string;
  productCode: string;
  humanCode: string;
  unitId: string;
  unitName: string | null;
  unitAbbreviation: string | null;
  unitAllowsDecimal: boolean | null;
  unitMagnitude: string | null;
  unitFactor: string | null;
  unitIsBase: boolean | null;
  quantityRequired: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const db = vi.hoisted(() => ({
  works: [] as FakeWork[],
  materials: [] as FakeMaterial[],
  unitAllowsDecimal: true,
}));

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => ({
    user: {
      id: authState.userId,
      email: "user@test.local",
      name: "Usuario",
      globalRole: authState.role,
    },
  })),
}));

vi.mock("@/server/user-context", () => ({
  getUserContext: vi.fn(async () => ({
    id: authState.userId,
    globalRole: authState.role,
    memberGroupIds: new Set(authState.memberGroupIds),
    adminGroupIds: new Set(authState.memberGroupIds),
    grantedSectorIds: new Set<string>(),
    readerGroupIds: new Set<string>(),
    clientWorkIds: new Set<string>(),
  })),
}));

vi.mock("@/server/events", () => ({
  emit: vi.fn(),
}));

vi.mock("@/server/genstock", () => ({
  getGenstockItem: vi.fn(async () => ({
    product: {
      id: PRODUCT_ID,
      name: "Cemento",
      product_code: "CEM",
      human_code: "CEM",
      unit_id: "unit-1",
      is_supply: true,
      is_active: true,
    },
    prices: [],
    warehouses: [],
  })),
  getGenstockContext: vi.fn(async () => ({
    price_lists: [],
    currencies: [],
    warehouses: [],
    units: [
      {
        id: "unit-1",
        name: "Bolsa",
        abbreviation: "bol",
        magnitude: "kg",
        factor: "25",
        is_base: false,
        allows_decimal: db.unitAllowsDecimal,
      },
    ],
  })),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    work: {
      findUnique: vi.fn(
        async ({ where: { id } }: { where: { id: string } }) =>
          db.works.find((work) => work.id === id) ?? null,
      ),
      findMany: vi.fn(
        async ({ where }: { where?: { status?: "ACTIVE" | "ARCHIVED"; isTemplate?: boolean } }) =>
          db.works.filter(
            (work) =>
              (where?.status === undefined || work.status === where.status) &&
              (where?.isTemplate === undefined || work.isTemplate === where.isTemplate),
          ),
      ),
    },
    workMaterial: {
      findMany: vi.fn(async ({ where }: { where?: { workId?: string | { in: string[] } } }) => {
        let rows = db.materials;
        const workIdFilter = where?.workId;
        if (typeof workIdFilter === "string") {
          rows = rows.filter((material) => material.workId === workIdFilter);
        } else if (workIdFilter && "in" in workIdFilter) {
          rows = rows.filter((material) => workIdFilter.in.includes(material.workId));
          return rows.map((material) => ({
            ...material,
            work: db.works.find((work) => work.id === material.workId),
          }));
        }
        return rows;
      }),
      findFirst: vi.fn(
        async ({
          where,
        }: {
          where: { id?: string; workId?: string; genstockProductId?: string };
        }) =>
          db.materials.find(
            (material) =>
              (where.id === undefined || material.id === where.id) &&
              (where.workId === undefined || material.workId === where.workId) &&
              (where.genstockProductId === undefined ||
                material.genstockProductId === where.genstockProductId),
          ) ?? null,
      ),
      create: vi.fn(
        async ({ data }: { data: Omit<FakeMaterial, "id" | "createdAt" | "updatedAt"> }) => {
          const material = {
            id: MATERIAL_ID,
            ...data,
            createdAt: new Date("2026-09-04T00:00:00.000Z"),
            updatedAt: new Date("2026-09-04T00:00:00.000Z"),
          };
          db.materials.push(material);
          return material;
        },
      ),
      update: vi.fn(
        async ({ where: { id }, data }: { where: { id: string }; data: Partial<FakeMaterial> }) => {
          const material = db.materials.find((row) => row.id === id)!;
          Object.assign(material, data, { updatedAt: new Date("2026-09-04T01:00:00.000Z") });
          return material;
        },
      ),
      deleteMany: vi.fn(async ({ where }: { where: { id: string; workId: string } }) => {
        const before = db.materials.length;
        db.materials = db.materials.filter(
          (material) => material.id !== where.id || material.workId !== where.workId,
        );
        return { count: before - db.materials.length };
      }),
    },
  },
}));

import { GET as GET_WORK_MATERIALS, POST } from "@/app/api/works/[id]/materials/route";
import { DELETE, PATCH } from "@/app/api/works/[id]/materials/[materialId]/route";
import { GET as GET_TOTALS } from "@/app/api/materials/route";

function work(overrides: Partial<FakeWork> = {}): FakeWork {
  return {
    id: WORK_ID,
    name: "Proyecto",
    groupId: null,
    ownerId: "user-1",
    status: "ACTIVE",
    isTemplate: false,
    createdAt: new Date("2026-09-04T00:00:00.000Z"),
    group: null,
    ...overrides,
  };
}

function material(overrides: Partial<FakeMaterial> = {}): FakeMaterial {
  return {
    id: MATERIAL_ID,
    workId: WORK_ID,
    genstockProductId: PRODUCT_ID,
    productName: "Cemento",
    productCode: "CEM",
    humanCode: "CEM",
    unitId: "unit-1",
    unitName: "Bolsa",
    unitAbbreviation: "bol",
    unitAllowsDecimal: true,
    unitMagnitude: "kg",
    unitFactor: "25",
    unitIsBase: false,
    quantityRequired: "2",
    notes: null,
    createdAt: new Date("2026-09-04T00:00:00.000Z"),
    updatedAt: new Date("2026-09-04T00:00:00.000Z"),
    ...overrides,
  };
}

function jsonReq(
  method: string,
  body: unknown,
  url = `http://localhost/api/works/${WORK_ID}/materials`,
) {
  return new Request(url, { method, body: JSON.stringify(body) });
}

function req(method = "GET", url = `http://localhost/api/works/${WORK_ID}/materials`) {
  return new Request(url, { method });
}

describe("project materials API", () => {
  beforeEach(() => {
    authState.userId = "user-1";
    authState.role = "MEMBER";
    authState.memberGroupIds = [];
    db.works = [work()];
    db.materials = [];
    db.unitAllowsDecimal = true;
  });

  it("lista materiales con acceso de lectura al proyecto", async () => {
    db.materials = [material()];
    const res = await GET_WORK_MATERIALS(req(), { params: Promise.resolve({ id: WORK_ID }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ productName: "Cemento", quantityRequired: "2" });
  });

  it("crea material con snapshot de Genstock y cantidad válida", async () => {
    const res = await POST(jsonReq("POST", { productId: PRODUCT_ID, quantityRequired: "3,5" }), {
      params: Promise.resolve({ id: WORK_ID }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({
      genstockProductId: PRODUCT_ID,
      productName: "Cemento",
      unitName: "Bolsa",
      unitAbbreviation: "bol",
      unitAllowsDecimal: true,
      unitMagnitude: "kg",
      unitFactor: "25",
      unitIsBase: false,
      quantityRequired: "3.5",
    });
  });

  it("rechaza decimales cuando la unidad de Genstock no los permite", async () => {
    db.unitAllowsDecimal = false;
    const res = await POST(jsonReq("POST", { productId: PRODUCT_ID, quantityRequired: "3,5" }), {
      params: Promise.resolve({ id: WORK_ID }),
    });
    expect(res.status).toBe(400);
    expect(db.materials).toEqual([]);
  });

  it("rechaza clientes externos", async () => {
    authState.role = "CLIENT";
    const res = await GET_WORK_MATERIALS(req(), { params: Promise.resolve({ id: WORK_ID }) });
    expect(res.status).toBe(403);
  });

  it("rechaza usuarios sin acceso al proyecto", async () => {
    authState.userId = "other-user";
    const res = await GET_WORK_MATERIALS(req(), { params: Promise.resolve({ id: WORK_ID }) });
    expect(res.status).toBe(404);
  });

  it("actualiza cantidad/notas y elimina material", async () => {
    db.materials = [material()];
    const patchRes = await PATCH(jsonReq("PATCH", { quantityRequired: "4", notes: "Comprar" }), {
      params: Promise.resolve({ id: WORK_ID, materialId: MATERIAL_ID }),
    });
    expect(patchRes.status).toBe(200);
    expect(await patchRes.json()).toMatchObject({ quantityRequired: "4", notes: "Comprar" });

    const deleteRes = await DELETE(req("DELETE"), {
      params: Promise.resolve({ id: WORK_ID, materialId: MATERIAL_ID }),
    });
    expect(deleteRes.status).toBe(204);
    expect(db.materials).toEqual([]);
  });

  it("rechaza edición decimal cuando el material guardó una unidad entera", async () => {
    db.materials = [material({ unitAllowsDecimal: false })];
    const patchRes = await PATCH(jsonReq("PATCH", { quantityRequired: "4.5" }), {
      params: Promise.resolve({ id: WORK_ID, materialId: MATERIAL_ID }),
    });
    expect(patchRes.status).toBe(400);
    expect(db.materials[0].quantityRequired).toBe("2");
  });
});

describe("materials totals API", () => {
  beforeEach(() => {
    authState.userId = "user-1";
    authState.role = "MEMBER";
    authState.memberGroupIds = ["group-1"];
    db.works = [
      work({
        id: "active-visible-1",
        name: "Obra A",
        groupId: "group-1",
        ownerId: null,
        group: { id: "group-1", name: "Grupo", publicRead: false },
      }),
      work({ id: "active-visible-2", name: "Obra B", ownerId: "user-1" }),
      work({ id: "archived", name: "Archivado", ownerId: "user-1", status: "ARCHIVED" }),
      work({ id: "hidden", name: "Oculto", ownerId: "other-user" }),
    ];
    db.materials = [
      material({ id: "m1", workId: "active-visible-1", quantityRequired: "2" }),
      material({ id: "m2", workId: "active-visible-2", quantityRequired: "1.25" }),
      material({ id: "m3", workId: "archived", quantityRequired: "100" }),
      material({ id: "m4", workId: "hidden", quantityRequired: "100" }),
    ];
  });

  it("suma solo proyectos activos visibles y agrupa por producto", async () => {
    const res = await GET_TOTALS(req("GET", "http://localhost/api/materials"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].totalQuantityRequired).toBe("3.25");
    expect(body[0].projects.map((project: { workName: string }) => project.workName)).toEqual([
      "Obra A",
      "Obra B",
    ]);
  });
});
