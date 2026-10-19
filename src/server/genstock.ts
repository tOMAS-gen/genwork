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

// Genwork trabaja los decimales de Genstock como TEXTO decimal exacto con la
// escala fija del tipo ("1250.50", "3.50000000"): así los guarda (unitFactor),
// los expone en su propia API y los muestra. Genstock 1.17 (contrato de nivel 4)
// los manda como ENTEROS ESCALADOS; la conversión ocurre solo acá, al leerlos.
export interface GenstockSearchPrice {
  price_list_id: string;
  currency_id: string;
  price: string | null;
  min_quantity: string | null;
  // Informativo: siempre 2 en nivel 4. No se usa para escalar el dinero.
  currency_decimals?: number;
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

export interface GenstockUnit {
  id: string;
  name: string;
  abbreviation: string;
  magnitude: string;
  factor: string;
  is_base: boolean;
  allows_decimal: boolean;
}

export interface GenstockSearchContext {
  price_lists: { id: string; name: string; currency_id: string }[];
  currencies: { id: string; code: string; symbol: string; decimals: number }[];
  warehouses: { id: string; name: string }[];
  units?: GenstockUnit[];
}

// Forma en el cable (contrato de nivel 4): cada decimal es un entero escalado.
type Wire<T, K extends keyof T> = Omit<T, K> & { [P in K]: unknown };
type WirePrice = Wire<GenstockSearchPrice, "price" | "min_quantity">;
type WireWarehouseStock = Wire<GenstockWarehouseStock, "stock_available">;
type WireSearchItem = Omit<GenstockSearchItem, "prices" | "warehouses"> & {
  prices?: WirePrice[] | null;
  warehouses?: WireWarehouseStock[] | null;
};
type WireSearchResponse = Omit<GenstockSearchResponse, "items"> & {
  items?: WireSearchItem[] | null;
};
type WireSearchContext = Omit<GenstockSearchContext, "units"> & {
  units?: Wire<GenstockUnit, "factor">[] | null;
};

// Contrato de la API de Genstock que habla este cliente.
export const GENSTOCK_CLIENT_CONTRACT = "4";

// Escalas fijas por tipo (GET /health → "scales"). El dinero va a 2 en toda
// moneda: currency_decimals es informativo y no se lee para escalar.
export const GENSTOCK_SCALE = { amount: 2, quantity: 8 } as const;

/**
 * Convierte un entero escalado de Genstock en texto decimal exacto, sin pasar
 * por punto flotante: 125050 con escala 2 → "1250.50"; 350000000 con escala 8
 * → "3.50000000". Falla con 502 si el valor no es un entero escalado: un
 * decimal en texto delata un Genstock anterior a la 1.17 (nivel 4).
 */
export function scaledToDecimal(value: unknown, scale: number, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    throw new ApiError(
      502,
      "GENSTOCK_INCOMPATIBLE",
      `Genstock devolvió ${field} como texto: el servidor es anterior a la 1.17 (contrato de nivel 4) y no es compatible. Actualizá Genstock.`,
    );
  }
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new ApiError(
      502,
      "GENSTOCK_INCOMPATIBLE",
      `Genstock devolvió ${field} con un formato inesperado: se esperaba un entero escalado`,
    );
  }
  const negative = value < 0;
  const digits = Math.abs(value).toString().padStart(scale + 1, "0");
  const whole = digits.slice(0, digits.length - scale);
  const fraction = digits.slice(digits.length - scale);
  return `${negative ? "-" : ""}${whole}${scale > 0 ? `.${fraction}` : ""}`;
}

function requiredDecimal(value: unknown, scale: number, field: string): string {
  const decimal = scaledToDecimal(value, scale, field);
  if (decimal === null) {
    throw new ApiError(502, "GENSTOCK_INCOMPATIBLE", `Genstock no devolvió ${field}`);
  }
  return decimal;
}

function fromWireItem(item: WireSearchItem): GenstockSearchItem {
  return {
    ...item,
    prices: (item.prices ?? []).map((price) => ({
      ...price,
      price: scaledToDecimal(price.price, GENSTOCK_SCALE.amount, "el precio"),
      min_quantity: scaledToDecimal(
        price.min_quantity,
        GENSTOCK_SCALE.quantity,
        "la cantidad mínima",
      ),
    })),
    warehouses: (item.warehouses ?? []).map((warehouse) => ({
      ...warehouse,
      stock_available: scaledToDecimal(
        warehouse.stock_available,
        GENSTOCK_SCALE.quantity,
        "el stock disponible",
      ),
    })),
  };
}

function fromWireSearch(response: WireSearchResponse): GenstockSearchResponse {
  return { ...response, items: (response.items ?? []).map(fromWireItem) };
}

function fromWireContext(context: WireSearchContext): GenstockSearchContext {
  const { units, ...rest } = context;
  if (!units) return rest;
  return {
    ...rest,
    units: units.map((unit) => ({
      ...unit,
      factor: requiredDecimal(unit.factor, GENSTOCK_SCALE.quantity, "el factor de la unidad"),
    })),
  };
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
  return fromWireSearch(
    await fetchGenstock<WireSearchResponse>(
      genstockUrl("/search", params, await getGenstockBaseUrl()),
    ),
  );
}

export async function getGenstockItem(productId: string): Promise<GenstockSearchItem> {
  return fromWireItem(
    await fetchGenstock<WireSearchItem>(
      genstockUrl(`/search/${productId}`, undefined, await getGenstockBaseUrl()),
    ),
  );
}

export async function getGenstockContext(): Promise<GenstockSearchContext> {
  return fromWireContext(
    await fetchGenstock<WireSearchContext>(
      genstockUrl("/search/context", undefined, await getGenstockBaseUrl()),
    ),
  );
}

async function fetchGenstock<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      headers: { "X-Client-Contract": GENSTOCK_CLIENT_CONTRACT },
    });
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
