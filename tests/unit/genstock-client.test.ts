import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/server/api";

const accessConfigFindUnique = vi.hoisted(() =>
  vi.fn(async (): Promise<{ genstockBaseUrl: string | null } | null> => null),
);

vi.mock("@/lib/db/client", () => ({
  prisma: {
    accessConfig: {
      findUnique: accessConfigFindUnique,
    },
  },
}));

const originalBaseUrl = process.env.GENSTOCK_BASE_URL;

afterEach(() => {
  process.env.GENSTOCK_BASE_URL = originalBaseUrl;
  accessConfigFindUnique.mockReset();
  accessConfigFindUnique.mockResolvedValue(null);
  vi.unstubAllGlobals();
});

describe("genstock client", () => {
  it("construye URLs desde GENSTOCK_BASE_URL", async () => {
    const { genstockUrl } = await import("@/server/genstock");
    process.env.GENSTOCK_BASE_URL = "http://localhost:8090/api/v1/";
    const url = genstockUrl("/search", new URLSearchParams({ q: "cemento", limit: "12" }));
    expect(url).toBe("http://localhost:8090/api/v1/search?q=cemento&limit=12");
  });

  it("falla claro cuando GENSTOCK_BASE_URL no está configurada", async () => {
    const { genstockUrl } = await import("@/server/genstock");
    delete process.env.GENSTOCK_BASE_URL;
    expect(() => genstockUrl("/search")).toThrow(ApiError);
  });

  it("usa la URL guardada cuando existe configuración de Genstock", async () => {
    const { searchGenstockProducts } = await import("@/server/genstock");
    process.env.GENSTOCK_BASE_URL = "http://env-genstock";
    accessConfigFindUnique.mockResolvedValue({ genstockBaseUrl: "http://db-genstock/" });
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ items: [], total: 0 })));
    vi.stubGlobal("fetch", fetchMock);

    await searchGenstockProducts({ query: "cemento" });

    expect(fetchMock).toHaveBeenCalledWith("http://db-genstock/search?q=cemento", {
      cache: "no-store",
      headers: { "X-Client-Contract": "4" },
    });
  });

  it("traduce fallo de red a GENSTOCK_UNAVAILABLE", async () => {
    const { searchGenstockProducts } = await import("@/server/genstock");
    process.env.GENSTOCK_BASE_URL = "http://genstock.local";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network");
      }),
    );

    await expect(searchGenstockProducts({ query: "cemento" })).rejects.toMatchObject({
      code: "GENSTOCK_UNAVAILABLE",
      status: 502,
    });
  });

  it.each([
    ["UNABLE_TO_VERIFY_LEAF_SIGNATURE", /certificado HTTPS/],
    ["UNABLE_TO_GET_ISSUER_CERT_LOCALLY", /certificado HTTPS/],
    ["DEPTH_ZERO_SELF_SIGNED_CERT", /certificado HTTPS/],
    ["CERT_HAS_EXPIRED", /certificado HTTPS/],
    ["ERR_TLS_CERT_ALTNAME_INVALID", /certificado HTTPS/],
    ["ECONNREFUSED", /no responde/],
    ["ENOTFOUND", /no se encontró/],
  ])("explica la causa %s del fallo de conexión", async (code, message) => {
    const { searchGenstockProducts } = await import("@/server/genstock");
    process.env.GENSTOCK_BASE_URL = "https://genstock.local";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed", { cause: Object.assign(new Error(code), { code }) });
      }),
    );

    const err = await searchGenstockProducts({ query: "cemento" }).catch((e: unknown) => e);
    expect(err).toMatchObject({ code: "GENSTOCK_UNAVAILABLE", status: 502 });
    expect((err as Error).message).toMatch(message);
  });

  describe("enteros escalados (contrato de nivel 4)", () => {
    function stubJson(body: unknown) {
      const fetchMock = vi.fn(async () => new Response(JSON.stringify(body)));
      vi.stubGlobal("fetch", fetchMock);
      return fetchMock;
    }

    const wireItem = {
      product: {
        id: "p-1",
        name: "Cemento",
        product_code: "CEM",
        human_code: "CEM",
        unit_id: "u-bolsa",
        is_supply: true,
        is_active: true,
      },
      prices: [
        {
          price_list_id: "pl-1",
          currency_id: "ars",
          price: 125050,
          min_quantity: 350000000,
          currency_decimals: 2,
        },
        {
          price_list_id: "pl-2",
          currency_id: "ars",
          price: null,
          min_quantity: null,
          currency_decimals: 2,
        },
      ],
      warehouses: [
        { warehouse_id: "w-1", stock_mode: "controlled", stock_available: 2400000000 },
        { warehouse_id: "w-2", stock_mode: "uncontrolled", stock_available: null },
      ],
    };

    it.each([
      [125050, 2, "1250.50"],
      [5, 2, "0.05"],
      [0, 2, "0.00"],
      [-125050, 2, "-1250.50"],
      [350000000, 8, "3.50000000"],
      [100000, 8, "0.00100000"],
      [2500000000, 8, "25.00000000"],
    ])("convierte %d con escala %d en %s", async (value, scale, expected) => {
      const { scaledToDecimal } = await import("@/server/genstock");
      expect(scaledToDecimal(value, scale, "el valor")).toBe(expected);
    });

    it("convierte precios, cantidad mínima y stock del buscador a texto decimal exacto", async () => {
      const { searchGenstockProducts } = await import("@/server/genstock");
      process.env.GENSTOCK_BASE_URL = "http://genstock.local";
      stubJson({
        items: [wireItem],
        total: 1,
        limit: 12,
        offset: 0,
        has_more: false,
        exact_match_product_id: null,
      });

      const res = await searchGenstockProducts({ query: "cemento" });

      expect(res.total).toBe(1);
      expect(res.items[0].product.name).toBe("Cemento");
      expect(res.items[0].prices).toEqual([
        {
          price_list_id: "pl-1",
          currency_id: "ars",
          price: "1250.50",
          min_quantity: "3.50000000",
          currency_decimals: 2,
        },
        {
          price_list_id: "pl-2",
          currency_id: "ars",
          price: null,
          min_quantity: null,
          currency_decimals: 2,
        },
      ]);
      expect(res.items[0].warehouses).toEqual([
        { warehouse_id: "w-1", stock_mode: "controlled", stock_available: "24.00000000" },
        { warehouse_id: "w-2", stock_mode: "uncontrolled", stock_available: null },
      ]);
    });

    it("convierte el producto pedido por id", async () => {
      const { getGenstockItem } = await import("@/server/genstock");
      process.env.GENSTOCK_BASE_URL = "http://genstock.local";
      const fetchMock = stubJson(wireItem);

      const item = await getGenstockItem("p-1");

      expect(fetchMock).toHaveBeenCalledWith("http://genstock.local/search/p-1", {
        cache: "no-store",
        headers: { "X-Client-Contract": "4" },
      });
      expect(item.prices[0].price).toBe("1250.50");
      expect(item.warehouses[0].stock_available).toBe("24.00000000");
    });

    it("escala el dinero a 2 aunque currency_decimals diga otra cosa", async () => {
      const { getGenstockItem } = await import("@/server/genstock");
      process.env.GENSTOCK_BASE_URL = "http://genstock.local";
      stubJson({
        ...wireItem,
        prices: [{ ...wireItem.prices[0], currency_decimals: 4 }],
      });

      const item = await getGenstockItem("p-1");

      expect(item.prices[0].price).toBe("1250.50");
    });

    it("convierte el factor de las unidades del contexto", async () => {
      const { getGenstockContext } = await import("@/server/genstock");
      process.env.GENSTOCK_BASE_URL = "http://genstock.local";
      stubJson({
        price_lists: [{ id: "pl-1", name: "Mostrador", currency_id: "ars" }],
        currencies: [{ id: "ars", code: "ARS", symbol: "$", decimals: 2 }],
        warehouses: [{ id: "w-1", name: "Central" }],
        units: [
          {
            id: "u-g",
            name: "Gramo",
            abbreviation: "g",
            magnitude: "kg",
            factor: 100000,
            is_base: false,
            allows_decimal: true,
          },
          {
            id: "u-kg",
            name: "Kilogramo",
            abbreviation: "kg",
            magnitude: "kg",
            factor: 100000000,
            is_base: true,
            allows_decimal: true,
          },
        ],
      });

      const context = await getGenstockContext();

      expect(context.currencies[0].decimals).toBe(2);
      expect(context.units?.map((unit) => unit.factor)).toEqual(["0.00100000", "1.00000000"]);
    });

    it.each([
      ["el precio", { ...wireItem, prices: [{ ...wireItem.prices[0], price: "1250.50" }] }],
      [
        "el stock",
        {
          ...wireItem,
          warehouses: [{ ...wireItem.warehouses[0], stock_available: "24.00000000" }],
        },
      ],
    ])("falla con 502 si %s llega como texto (Genstock anterior a la 1.17)", async (_, body) => {
      const { getGenstockItem } = await import("@/server/genstock");
      process.env.GENSTOCK_BASE_URL = "http://genstock.local";
      stubJson(body);

      const err = await getGenstockItem("p-1").catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ApiError);
      expect(err).toMatchObject({ code: "GENSTOCK_INCOMPATIBLE", status: 502 });
      expect((err as Error).message).toMatch(/texto.*1\.17/);
    });

    it("falla con 502 si el factor de una unidad llega como texto", async () => {
      const { getGenstockContext } = await import("@/server/genstock");
      process.env.GENSTOCK_BASE_URL = "http://genstock.local";
      stubJson({
        price_lists: [],
        currencies: [],
        warehouses: [],
        units: [
          {
            id: "u-g",
            name: "Gramo",
            abbreviation: "g",
            magnitude: "kg",
            factor: "0.00100000",
            is_base: false,
            allows_decimal: true,
          },
        ],
      });

      await expect(getGenstockContext()).rejects.toMatchObject({
        code: "GENSTOCK_INCOMPATIBLE",
        status: 502,
      });
    });

    it.each([[1.5], [Number.MAX_SAFE_INTEGER + 2], [true]])(
      "rechaza %s porque no es un entero escalado",
      async (value) => {
        const { scaledToDecimal } = await import("@/server/genstock");
        expect(() => scaledToDecimal(value, 2, "el precio")).toThrow(ApiError);
      },
    );
  });
});
