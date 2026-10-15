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
});
