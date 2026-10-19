import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth", () => ({
  requireSession: vi.fn(async () => ({
    user: { id: "u-1", email: "miembro@test.local", name: "Miembro", globalRole: "MEMBER" },
  })),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    accessConfig: { findUnique: vi.fn(async () => ({ genstockBaseUrl: "http://genstock" })) },
  },
}));

function item(id: string, isSupply: boolean) {
  return { product: { id, name: id, is_supply: isSupply }, prices: [], warehouses: [] };
}

function page(items: unknown[]) {
  return new Response(
    JSON.stringify({ items, total: items.length, limit: 12, offset: 0, has_more: false }),
  );
}

async function search(query: string) {
  const { GET } = await import("@/app/api/genstock/search/route");
  const res = await GET(new Request(`http://localhost/api/genstock/search?${query}`), undefined as never);
  return { status: res.status, body: await res.json() };
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("/api/genstock/search", () => {
  it("por defecto busca solo insumos", async () => {
    fetchMock.mockResolvedValueOnce(page([item("cemento", true)]));

    const { status, body } = await search("q=cemento");

    expect(status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("http://genstock/search?q=cemento&limit=12&is_supply=true");
    expect(body).toMatchObject({ supplyFallback: false, items: [{ product: { id: "cemento" } }] });
  });

  it("sin insumos que coincidan, busca en todo el catálogo", async () => {
    fetchMock.mockResolvedValueOnce(page([])).mockResolvedValueOnce(page([item("taladro", false)]));

    const { body } = await search("q=taladro");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe("http://genstock/search?q=taladro&limit=12");
    expect(body).toMatchObject({ supplyFallback: true, items: [{ product: { id: "taladro" } }] });
  });

  it("con supply=0 busca en todo el catálogo de entrada", async () => {
    fetchMock.mockResolvedValueOnce(page([item("taladro", false)]));

    const { body } = await search("q=taladro&supply=0");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("http://genstock/search?q=taladro&limit=12");
    expect(body).toMatchObject({ supplyFallback: false });
  });

  it("expone a la app los decimales de Genstock como texto decimal exacto", async () => {
    fetchMock.mockResolvedValueOnce(
      page([
        {
          ...item("cemento", true),
          prices: [
            { price_list_id: "pl-1", currency_id: "ars", price: 125050, min_quantity: null },
          ],
          warehouses: [
            { warehouse_id: "w-1", stock_mode: "controlled", stock_available: 350000000 },
          ],
        },
      ]),
    );

    const { status, body } = await search("q=cemento");

    expect(status).toBe(200);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      headers: { "X-Client-Contract": "4" },
    });
    expect(body.items[0].prices[0]).toMatchObject({ price: "1250.50", min_quantity: null });
    expect(body.items[0].warehouses[0]).toMatchObject({ stock_available: "3.50000000" });
  });

  it("responde 502 si Genstock es anterior a la 1.17 y manda decimales como texto", async () => {
    fetchMock.mockResolvedValueOnce(
      page([
        {
          ...item("cemento", true),
          prices: [
            { price_list_id: "pl-1", currency_id: "ars", price: "1250.50", min_quantity: null },
          ],
        },
      ]),
    );

    const { status, body } = await search("q=cemento");

    expect(status).toBe(502);
    expect(JSON.stringify(body)).toContain("GENSTOCK_INCOMPATIBLE");
  });
});
