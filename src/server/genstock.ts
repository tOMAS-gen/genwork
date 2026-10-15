import { ApiError } from "@/server/api";
import { prisma } from "@/lib/db/client";

export interface GenstockSearchProduct {
  id: string;
  name: string;
  product_code: string;
  human_code: string;
  unit_id: string;
  is_supply: boolean;
  is_active: boolean;
  brand?: { id: string; name: string } | null;
  categories?: { id: string; name: string }[];
  tag_values?: { id: string; name: string; key_id?: string; key_name?: string }[];
}

export interface GenstockSearchPrice {
  price_list_id: string;
  currency_id: string;
  price: string | null;
  min_quantity: string | null;
}

export interface GenstockWarehouseStock {
  warehouse_id: string;
  stock_mode: string;
  stock_available: string | null;
}

export interface GenstockSearchItem {
  product: GenstockSearchProduct;
  prices: GenstockSearchPrice[];
  warehouses: GenstockWarehouseStock[];
}

export interface GenstockSearchResponse {
  items: GenstockSearchItem[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
  exact_match_product_id: string | null;
}

export interface GenstockSearchContext {
  price_lists: { id: string; name: string; currency_id: string }[];
  currencies: { id: string; code: string; symbol: string; decimals: number }[];
  warehouses: { id: string; name: string }[];
  units?: {
    id: string;
    name: string;
    abbreviation: string;
    magnitude: string;
    factor: string;
    is_base: boolean;
    allows_decimal: boolean;
  }[];
}

export function genstockUrl(
  path: string,
  params?: URLSearchParams,
  baseUrl = process.env.GENSTOCK_BASE_URL,
): string {
  const base = baseUrl?.trim().replace(/\/+$/, "");
  if (!base) {
    throw new ApiError(
      503,
      "GENSTOCK_NOT_CONFIGURED",
      "Configurá GENSTOCK_BASE_URL para buscar productos de Genstock",
    );
  }
  const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);
  if (params) {
    for (const [key, value] of params) url.searchParams.append(key, value);
  }
  return url.toString();
}

export async function getGenstockBaseUrl(): Promise<string> {
  const config = await prisma.accessConfig.findUnique({
    where: { id: 1 },
    select: { genstockBaseUrl: true },
  });
  return config?.genstockBaseUrl?.trim() || process.env.GENSTOCK_BASE_URL?.trim() || "";
}

export async function getGenstockConfig() {
  const config = await prisma.accessConfig.findUnique({
    where: { id: 1 },
    select: { genstockBaseUrl: true },
  });
  const storedUrl = config?.genstockBaseUrl?.trim();
  const envUrl = process.env.GENSTOCK_BASE_URL?.trim();
  const baseUrl = storedUrl || envUrl || "";
  return {
    baseUrl,
    source: storedUrl ? "database" : "env",
    configured: Boolean(baseUrl),
  };
}

export async function searchGenstockProducts({
  query,
  limit,
  supplyOnly,
}: {
  query: string;
  limit?: number;
  supplyOnly?: boolean;
}): Promise<GenstockSearchResponse> {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (limit) params.set("limit", String(limit));
  if (supplyOnly) params.set("is_supply", "true");
  return fetchGenstock<GenstockSearchResponse>(
    genstockUrl("/search", params, await getGenstockBaseUrl()),
  );
}

export async function getGenstockItem(productId: string): Promise<GenstockSearchItem> {
  return fetchGenstock<GenstockSearchItem>(
    genstockUrl(`/search/${productId}`, undefined, await getGenstockBaseUrl()),
  );
}

export async function getGenstockContext(): Promise<GenstockSearchContext> {
  return fetchGenstock<GenstockSearchContext>(
    genstockUrl("/search/context", undefined, await getGenstockBaseUrl()),
  );
}

async function fetchGenstock<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (err) {
    throw new ApiError(502, "GENSTOCK_UNAVAILABLE", connectionErrorMessage(err));
  }

  if (!res.ok) {
    throw new ApiError(502, "GENSTOCK_UNAVAILABLE", "Genstock no respondió correctamente");
  }

  return (await res.json()) as T;
}

// fetch (undici) envuelve la causa real en `cause.code`: distinguir un
// certificado HTTPS rechazado de un servidor caído ahorra adivinar qué falló.
const TLS_ERROR_CODES = new Set([
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "UNABLE_TO_GET_ISSUER_CERT",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "CERT_HAS_EXPIRED",
  "CERT_NOT_YET_VALID",
  "CERT_UNTRUSTED",
]);

function connectionErrorMessage(err: unknown): string {
  const code = (err as { cause?: { code?: unknown } } | null)?.cause?.code;
  if (typeof code === "string") {
    if (TLS_ERROR_CODES.has(code) || code.startsWith("ERR_TLS_") || code.startsWith("ERR_SSL_")) {
      return "No se pudo conectar con Genstock: el certificado HTTPS no es válido o no es de confianza";
    }
    if (code === "ECONNREFUSED") {
      return "No se pudo conectar con Genstock: el servidor no responde en esa dirección";
    }
    if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
      return "No se pudo conectar con Genstock: no se encontró el servidor";
    }
  }
  return "No se pudo conectar con Genstock";
}
