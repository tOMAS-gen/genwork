# Vínculo por QR y multi-servidor — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La web muestra un QR con la dirección del servidor; la app móvil lo escanea, guarda varios servidores y permite cambiar entre ellos sin cerrar sesión.

**Architecture:** Web: página server-component `/settings/movil` que renderiza un QR SVG con el payload `genwork://connect?server=…&name=…` (sin credenciales); `/api/auth/mobile/info` suma `name`. Móvil: `ServerRegistry` (perfiles en SharedPreferences) + `TokenStore` por perfil (SecureStorage); `SessionController` pasa de "un servidor" a `addServer/switchServer/removeServer`. El router ya se recrea al cambiar de identidad (`app_router.dart`, `ref.invalidateSelf()`), y `apiClientProvider` depende de la sesión, así que el estado de un servidor no se filtra al otro.

**Tech Stack:** Next.js (App Router) + vitest + `qrcode`; Flutter + Riverpod 3 + go_router + `mobile_scanner` + `app_links` + `shared_preferences` + `flutter_secure_storage`.

**Spec:** `docs/superpowers/specs/2026-10-15-vinculo-qr-multiservidor-design.md`

## Global Constraints

- QR visible para **todo usuario interno**; el layout de `(main)` ya deja afuera a los clientes externos.
- Payload del QR: `genwork://connect?server=<origen>&name=<nombre>` (valores URL-encoded). **Nunca** credenciales ni tokens.
- Ruta web nueva: `/settings/movil`, junto a `/settings/claude`.
- `/api/auth/mobile/info`: el campo `name` es **opcional y compatible hacia atrás** (apps viejas lo ignoran; la app nueva usa el host si falta).
- Móvil: tokens por perfil en SecureStorage con clave `auth_token:<id>` / `auth_user:<id>`; perfiles + `active_server_id` en SharedPreferences. `id` = primeros 16 hex de SHA-256 del origen normalizado.
- **Migración obligatoria**: un usuario con `server_url` + `auth_token` viejos no pierde la sesión al actualizar.
- Se mantiene la **escritura manual de URL** como respaldo (emulador, cámara denegada).
- `logout` y `handleUnauthorized` afectan solo el perfil activo; el perfil queda guardado.
- `http://` se sigue aceptando (LAN/dev); producción usa `https`.
- Reglas del móvil (`mobile/AGENTS.md`, `test/design_tokens_guard_test.dart`): en `lib/features/**` y `lib/shared/**` **no** usar `Icons.*` (usar `AppIcons`), `AlertDialog`, `showDialog`, `BorderRadius.circular(<n>)` (usar `AppGeometry`), `SizedBox`/`EdgeInsets` con números sueltos (usar `AppSpacing`), `Colors.*` (usar `context.colors`). Confirmaciones con `confirmAction`.
- Convenciones del repo: comentarios y UI en español; commits en español, estilo `feat(...)`/`test(...)`/`docs(...)`; **sin** `Co-Authored-By` ni mención a Claude/Anthropic (regla del usuario).
- AGENTS.md de la raíz: este Next.js tiene cambios incompatibles. Antes de escribir código web, correr `npm ci` y leer la guía relevante de `node_modules/next/dist/docs/` (en el worktree actual `node_modules` no está instalado).

## Review Focus

Entradas que el spec insinúa y ninguna tarea cubriría sola; cada una tiene su test en la tarea dueña:

1. **QR ajeno o ruido** (texto cualquiera, QR de otro sitio, `genwork://connect` sin `server`): mensaje "No es un QR de genwork", no se guarda ningún perfil. → Task 3 (parser) y Task 6 (pantalla).
2. **Mismo servidor escrito distinto** (`HTTPS://Work.Test/`, `work.test`, con `:443`): no duplica el perfil, solo lo activa. → Task 3.
3. **Usuario actual con datos viejos** (`server_url` + token global): tras actualizar sigue logueado en ese servidor. → Task 4.
4. **Quitar el servidor activo**: con otros guardados pasa a otro sin crash; si era el último, vuelve a "primer inicio". → Task 4 y Task 7.
5. **El escáner dispara la misma lectura muchas veces**: una sola conexión/verificación, sin parpadeos ni perfiles duplicados. → Task 6.

---

## Mapa de archivos

**Web (raíz del repo)**
- Create `src/lib/mobile/connect.ts` — `buildConnectPayload`, `systemName`, `isLocalOrigin` (funciones puras).
- Create `src/lib/mobile/qr.ts` — `renderQrSvg(payload)`.
- Create `src/app/(main)/settings/movil/page.tsx` — página.
- Modify `src/app/api/auth/mobile/info/route.ts` — agrega `name`.
- Modify `src/components/nav/SettingsNav.tsx` — nueva pestaña.
- Modify `docs/api-contract.md` — documenta `name`.
- Create `tests/unit/mobile-connect.test.ts`, `tests/unit/mobile-info-route.test.ts`.

**Móvil (`mobile/`)**
- Create `lib/core/servers/connect_payload.dart` — `ConnectTarget`, `parseConnectPayload`.
- Create `lib/core/servers/server_profile.dart` — `ServerProfile`.
- Create `lib/core/servers/server_registry.dart` — `ServerRegistry`.
- Modify `lib/core/auth/token_store.dart` — por perfil + `adoptLegacy`.
- Modify `lib/data/repositories/auth_repository.dart` — `ServerInfo`, `checkServer` devuelve info.
- Modify `lib/core/auth/session_controller.dart`, `lib/core/providers.dart`.
- Delete `lib/core/config/server_config_store.dart`.
- Modify `lib/core/router/routes.dart`, `auth_redirect.dart`, `app_router.dart`.
- Create `lib/features/setup/qr_scanner_view.dart`; modify `lib/features/setup/server_setup_screen.dart`.
- Create `lib/features/setup/servers_screen.dart`.
- Modify `lib/features/auth/login_screen.dart`, `lib/features/account/account_screen.dart`, `lib/core/theme/app_icons.dart`.
- Create `lib/features/setup/connect_link_listener.dart`; modify `lib/app.dart`.
- Modify `pubspec.yaml`, `android/app/src/main/AndroidManifest.xml`, `ios/Runner/Info.plist`, `README.md`.
- Tests: `test/core/connect_payload_test.dart`, `test/core/server_registry_test.dart`, `test/core/token_store_test.dart`, `test/core/session_servers_test.dart`, `test/core/auth_redirect_test.dart` (modify), `test/features/server_setup_test.dart`, `test/features/servers_screen_test.dart`, `test/features/connect_link_test.dart`, y se actualizan `test/widget_setup_test.dart` y `test/core/session_refresh_test.dart`.

Todos los comandos Flutter se corren desde `mobile/`; los de web desde la raíz del repo.

---

## Parte A — Web

### Task 1: Payload del QR y `name` en `/info`

**Files:**
- Create: `src/lib/mobile/connect.ts`
- Modify: `src/app/api/auth/mobile/info/route.ts`
- Modify: `docs/api-contract.md`
- Test: `tests/unit/mobile-connect.test.ts`, `tests/unit/mobile-info-route.test.ts`

**Interfaces:**
- Produces: `buildConnectPayload(origin: string, name: string): string`, `systemName(baseUrl: string, envName?: string): string`, `isLocalOrigin(origin: string): boolean`. La route `GET /api/auth/mobile/info` devuelve además `name: string`.

- [ ] **Step 0: Preparar entorno web**

Run: `npm ci`
Luego leer la guía de Route Handlers / Server Components en `node_modules/next/dist/docs/` (regla de `AGENTS.md`) y confirmar que el patrón actual de `route.ts` y de las pages (`settings/claude/page.tsx`) sigue vigente.

- [ ] **Step 1: Escribir los tests que fallan**

`tests/unit/mobile-connect.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildConnectPayload, isLocalOrigin, systemName } from "@/lib/mobile/connect";

describe("buildConnectPayload", () => {
  it("arma genwork://connect con server y name codificados", () => {
    expect(buildConnectPayload("https://work.test", "Taller Norte")).toBe(
      "genwork://connect?server=https%3A%2F%2Fwork.test&name=Taller+Norte",
    );
  });

  it("round-trip: se puede leer con URL", () => {
    const url = new URL(buildConnectPayload("https://work.test/base", "Ñandú & Co"));
    expect(url.protocol).toBe("genwork:");
    expect(url.host).toBe("connect");
    expect(url.searchParams.get("server")).toBe("https://work.test/base");
    expect(url.searchParams.get("name")).toBe("Ñandú & Co");
  });

  it("nunca incluye credenciales", () => {
    const payload = buildConnectPayload("https://work.test", "x");
    expect(payload).not.toMatch(/token|password|secret/i);
  });
});

describe("systemName", () => {
  it("usa SYSTEM_NAME si está definido", () => {
    expect(systemName("https://work.test", "  Taller Norte ")).toBe("Taller Norte");
  });
  it("cae al host del servidor", () => {
    expect(systemName("https://work.gen.net.ar", undefined)).toBe("work.gen.net.ar");
    expect(systemName("https://work.gen.net.ar", "   ")).toBe("work.gen.net.ar");
  });
  it("incluye el puerto si no es el estándar", () => {
    expect(systemName("http://192.168.0.10:3010", undefined)).toBe("192.168.0.10:3010");
  });
});

describe("isLocalOrigin", () => {
  it("detecta orígenes que el teléfono no puede alcanzar", () => {
    expect(isLocalOrigin("http://localhost:3010")).toBe(true);
    expect(isLocalOrigin("http://127.0.0.1:3010")).toBe(true);
    expect(isLocalOrigin("https://work.gen.net.ar")).toBe(false);
    expect(isLocalOrigin("http://192.168.0.10:3010")).toBe(false);
  });
});
```

`tests/unit/mobile-info-route.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/reminders/link", () => ({ appBaseUrl: () => "https://work.test" }));

import { GET } from "@/app/api/auth/mobile/info/route";

describe("GET /api/auth/mobile/info", () => {
  it("mantiene el contrato y suma el nombre del sistema", async () => {
    const body = await (await GET()).json();
    expect(body.app).toBe("genwork");
    expect(body.mobileApi).toBe(1);
    expect(body.auth.callbackScheme).toBe("genwork");
    expect(body.name).toBe("work.test");
  });
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `npx vitest run tests/unit/mobile-connect.test.ts tests/unit/mobile-info-route.test.ts`
Expected: FAIL (módulo `@/lib/mobile/connect` inexistente; `body.name` undefined).

- [ ] **Step 3: Implementar**

`src/lib/mobile/connect.ts`:

```ts
/**
 * Vínculo de la app móvil por QR: el QR lleva solo la dirección pública del
 * servidor (nunca credenciales). La app lo escanea, valida la dirección contra
 * /api/auth/mobile/info y recién después pide el login.
 */

const CONNECT_BASE = "genwork://connect";

/** Payload del QR: `genwork://connect?server=<origen>&name=<nombre>`. */
export function buildConnectPayload(origin: string, name: string): string {
  const params = new URLSearchParams({ server: origin, name });
  return `${CONNECT_BASE}?${params.toString()}`;
}

/** Nombre visible del sistema: `SYSTEM_NAME` o, si falta, el host público. */
export function systemName(baseUrl: string, envName: string | undefined): string {
  const fromEnv = envName?.trim();
  if (fromEnv) return fromEnv;
  return new URL(baseUrl).host;
}

/** True si el origen apunta a la propia máquina: un teléfono no podría usarlo. */
export function isLocalOrigin(origin: string): boolean {
  const { hostname } = new URL(origin);
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}
```

`src/app/api/auth/mobile/info/route.ts` (reemplazar el archivo):

```ts
import { NextResponse } from "next/server";
import { appBaseUrl } from "@/lib/reminders/link";
import { systemName } from "@/lib/mobile/connect";

/**
 * Feature 064: la app móvil pide la URL del sistema en el primer inicio y la valida
 * contra este endpoint público antes de guardarla. No expone datos sensibles: solo
 * confirma que del otro lado hay un genwork con login móvil y cómo se llama
 * (`name`, para distinguir servidores en la lista de la app).
 */
export function GET() {
  return NextResponse.json({
    app: "genwork",
    mobileApi: 1,
    name: systemName(appBaseUrl(), process.env.SYSTEM_NAME),
    auth: {
      startPath: "/api/auth/mobile/start",
      tokenPath: "/api/auth/mobile/token",
      callbackScheme: "genwork",
    },
  });
}
```

En `docs/api-contract.md`, en la sección de `/api/auth/mobile/info` (buscarla con `grep -n "mobile/info" docs/api-contract.md`), agregar la línea: `name` (string, opcional): nombre visible del sistema (`SYSTEM_NAME` o el host público); la app lo muestra en la lista de servidores y usa el host si falta.

- [ ] **Step 4: Verificar que pasan**

Run: `npx vitest run tests/unit/mobile-connect.test.ts tests/unit/mobile-info-route.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/mobile/connect.ts src/app/api/auth/mobile/info/route.ts docs/api-contract.md tests/unit/mobile-connect.test.ts tests/unit/mobile-info-route.test.ts
git commit -m "feat(mobile): payload del QR de vínculo y nombre del sistema en /info"
```

### Task 2 (web): Página `/settings/movil`

**Files:**
- Create: `src/lib/mobile/qr.ts`
- Create: `src/app/(main)/settings/movil/page.tsx`
- Modify: `src/components/nav/SettingsNav.tsx:7-10`
- Modify: `package.json` (dependencias)
- Test: `tests/unit/mobile-qr.test.ts`

**Interfaces:**
- Consumes: `buildConnectPayload`, `systemName`, `isLocalOrigin` (Task 1).
- Produces: `renderQrSvg(payload: string): Promise<string>`.

- [ ] **Step 1: Instalar dependencias**

Run: `npm install qrcode && npm install -D @types/qrcode`

- [ ] **Step 2: Escribir el test que falla**

`tests/unit/mobile-qr.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildConnectPayload } from "@/lib/mobile/connect";
import { renderQrSvg } from "@/lib/mobile/qr";

describe("renderQrSvg", () => {
  it("devuelve un SVG con el QR", async () => {
    const svg = await renderQrSvg(buildConnectPayload("https://work.test", "work.test"));
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("</svg>");
  });

  it("es determinístico para el mismo payload", async () => {
    const payload = buildConnectPayload("https://work.test", "work.test");
    expect(await renderQrSvg(payload)).toBe(await renderQrSvg(payload));
  });
});
```

- [ ] **Step 3: Verificar que falla**

Run: `npx vitest run tests/unit/mobile-qr.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 4: Implementar**

`src/lib/mobile/qr.ts`:

```ts
import QRCode from "qrcode";

/** QR como SVG (vectorial, nítido en cualquier pantalla). Corrección de error media. */
export function renderQrSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
}
```

`src/app/(main)/settings/movil/page.tsx`:

```tsx
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { CopyButton } from "@/components/ui/CopyButton";
import { appBaseUrl } from "@/lib/reminders/link";
import { buildConnectPayload, isLocalOrigin, systemName } from "@/lib/mobile/connect";
import { renderQrSvg } from "@/lib/mobile/qr";

export const metadata: Metadata = { title: "App móvil · Configuración" };

/**
 * App móvil: muestra el QR con la dirección de este servidor para vincular el
 * teléfono. El QR NO lleva credenciales: la app solo aprende a qué servidor
 * conectarse y después pide el login. La dirección sale de la config del
 * servidor (misma fuente que "Vincular con Claude"), no del navegador.
 */
export default async function MobileLinkPage() {
  const origin = appBaseUrl();
  const name = systemName(origin, process.env.SYSTEM_NAME);
  const svg = await renderQrSvg(buildConnectPayload(origin, name));

  return (
    <div className="page-stack">
      <PageHeader
        title="App móvil"
        description="Escaneá este código con la app de Genwork para conectarla a este sistema."
        icon="settings"
      />

      {isLocalOrigin(origin) && (
        <p role="alert" className="muted" style={{ fontSize: "var(--text-sm)" }}>
          La dirección configurada ({origin}) es local: un teléfono no podrá alcanzarla. Definí
          NEXTAUTH_URL con la dirección pública del sistema.
        </p>
      )}

      <div
        role="img"
        aria-label={`Código QR para vincular la app móvil con ${name}`}
        style={{ background: "#fff", padding: 16, borderRadius: 8, width: "fit-content" }}
      >
        <div style={{ width: 240, height: 240 }} dangerouslySetInnerHTML={{ __html: svg }} />
      </div>

      <div>
        <p className="muted" style={{ fontSize: "var(--text-sm)" }}>Dirección de este sistema</p>
        <p style={{ fontFamily: "var(--font-mono, monospace)" }}>{origin}</p>
        <CopyButton value={origin} label="dirección del sistema" />
      </div>

      <ol className="muted" style={{ fontSize: "var(--text-sm)", paddingLeft: 20 }}>
        <li>Instalá la app de Genwork en el teléfono.</li>
        <li>En el primer inicio, elegí «Escanear QR» y apuntá a este código.</li>
        <li>Ingresá con tu cuenta de Google. Para sumar otro sistema, usá «Agregar servidor» en la app.</li>
      </ol>
    </div>
  );
}
```

El SVG lo genera la librería a partir de nuestro propio payload (no hay entrada del usuario), por lo que `dangerouslySetInnerHTML` es seguro aquí.

En `src/components/nav/SettingsNav.tsx`, agregar la pestaña en `ACCOUNT_ITEMS`:

```ts
const ACCOUNT_ITEMS = [
  ["/settings", "Mi cuenta"],
  ["/settings/claude", "Vincular con Claude"],
  ["/settings/movil", "App móvil"],
] as const;
```

- [ ] **Step 5: Verificar tests, tipos y build de la página**

Run: `npx vitest run tests/unit/mobile-qr.test.ts && npx tsc --noEmit`
Expected: PASS y sin errores de tipos. (El lint del repo está roto según la memoria del proyecto: no bloquea.)

Run: `npm run dev` y abrir `http://localhost:3010/settings/movil` con un usuario interno.
Expected: aparece el QR, la advertencia de dirección local (en dev), la URL y el botón Copiar. Escanear el QR con la cámara del teléfono y confirmar que el texto leído empieza con `genwork://connect?server=`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/mobile/qr.ts "src/app/(main)/settings/movil/page.tsx" src/components/nav/SettingsNav.tsx package.json package-lock.json tests/unit/mobile-qr.test.ts
git commit -m "feat(mobile): página App móvil con QR de vínculo (/settings/movil)"
```

---

## Parte B — Móvil (núcleo)

### Task 3 (móvil): Parser del payload, `ServerProfile` y `ServerRegistry`

**Files:**
- Create: `mobile/lib/core/servers/connect_payload.dart`
- Create: `mobile/lib/core/servers/server_profile.dart`
- Create: `mobile/lib/core/servers/server_registry.dart`
- Test: `mobile/test/core/connect_payload_test.dart`, `mobile/test/core/server_registry_test.dart`

**Interfaces:**
- Consumes: `normalizeServerUrl(String) → Uri?` (`lib/core/config/server_url.dart`).
- Produces:
  - `class ConnectTarget { const ConnectTarget({required Uri url, String? name}); final Uri url; final String? name; }`
  - `ConnectTarget? parseConnectPayload(String raw)`
  - `class ServerProfile { final String id; final Uri url; final String name; factory ServerProfile.forUrl(Uri url, {String? name}); static String idFor(Uri url); Map<String, Object?> toJson(); static ServerProfile? tryFromJson(Object?); ServerProfile withName(String) }`
  - `class ServerRegistry { ServerRegistry(SharedPreferences); List<ServerProfile> profiles(); ServerProfile? byId(String?); ServerProfile? active(); Future<ServerProfile> upsert(Uri url, {String? name}); Future<void> setActive(String id); Future<void> remove(String id); Future<ServerProfile?> migrateLegacy(); }`

- [ ] **Step 1: Escribir los tests que fallan**

`mobile/test/core/connect_payload_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/servers/connect_payload.dart';

void main() {
  test('lee el payload del QR de la web', () {
    final t = parseConnectPayload(
      'genwork://connect?server=https%3A%2F%2Fwork.test&name=Taller+Norte',
    )!;
    expect(t.url.toString(), 'https://work.test');
    expect(t.name, 'Taller Norte');
  });

  test('acepta una URL plana como respaldo', () {
    expect(parseConnectPayload('https://work.test/')!.url.toString(), 'https://work.test');
    expect(parseConnectPayload('work.test')!.url.toString(), 'https://work.test');
    expect(parseConnectPayload('work.test')!.name, isNull);
  });

  test('conserva el puerto y el path base', () {
    final t = parseConnectPayload(
      'genwork://connect?server=http%3A%2F%2F192.168.0.10%3A3010%2Fbase',
    )!;
    expect(t.url.toString(), 'http://192.168.0.10:3010/base');
  });

  test('rechaza lo que no es de genwork', () {
    expect(parseConnectPayload(''), isNull);
    expect(parseConnectPayload('genwork://connect'), isNull);
    expect(parseConnectPayload('genwork://connect?server='), isNull);
    expect(parseConnectPayload('genwork://auth?code=abc'), isNull);
    expect(parseConnectPayload('otraapp://connect?server=https%3A%2F%2Fx.test'), isNull);
    expect(parseConnectPayload('genwork://connect?server=ftp%3A%2F%2Fx.test'), isNull);
  });
}
```

`mobile/test/core/server_registry_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/servers/server_profile.dart';
import 'package:genwork_mobile/core/servers/server_registry.dart';
import 'package:shared_preferences/shared_preferences.dart';

Future<ServerRegistry> _registry([Map<String, Object> initial = const {}]) async {
  SharedPreferences.setMockInitialValues(initial);
  return ServerRegistry(await SharedPreferences.getInstance());
}

void main() {
  final a = Uri.parse('https://a.test');
  final b = Uri.parse('https://b.test');

  test('arranca vacío', () async {
    final r = await _registry();
    expect(r.profiles(), isEmpty);
    expect(r.active(), isNull);
  });

  test('upsert agrega y el nombre por defecto es el host', () async {
    final r = await _registry();
    final p = await r.upsert(a);
    expect(p.name, 'a.test');
    expect(r.profiles().single.url, a);
  });

  test('upsert del mismo servidor no duplica y actualiza el nombre', () async {
    final r = await _registry();
    await r.upsert(a);
    await r.upsert(Uri.parse('HTTPS://A.test/'.toLowerCase()), name: 'Taller A');
    expect(r.profiles(), hasLength(1));
    expect(r.profiles().single.name, 'Taller A');
  });

  test('el puerto estándar no genera otro perfil', () async {
    expect(
      ServerProfile.idFor(Uri.parse('https://a.test:443')),
      ServerProfile.idFor(Uri.parse('https://a.test')),
    );
  });

  test('setActive/active y fallback al primero si falta el activo', () async {
    final r = await _registry();
    final pa = await r.upsert(a);
    final pb = await r.upsert(b);
    await r.setActive(pb.id);
    expect(r.active()!.id, pb.id);
    await r.remove(pb.id);
    expect(r.active()!.id, pa.id);
  });

  test('remove del último deja NeedsServer (active null)', () async {
    final r = await _registry();
    final pa = await r.upsert(a);
    await r.setActive(pa.id);
    await r.remove(pa.id);
    expect(r.profiles(), isEmpty);
    expect(r.active(), isNull);
  });

  test('migrateLegacy convierte server_url en el primer perfil activo', () async {
    final r = await _registry({'server_url': 'https://old.test'});
    final p = await r.migrateLegacy();
    expect(p!.url, Uri.parse('https://old.test'));
    expect(r.active()!.id, p.id);
    expect(await r.migrateLegacy(), isNull); // idempotente: la clave vieja ya no está
  });

  test('datos corruptos no rompen la app', () async {
    final r = await _registry({'server_profiles': '{no es json'});
    expect(r.profiles(), isEmpty);
  });
}
```

- [ ] **Step 2: Verificar que fallan**

Run: `cd mobile && flutter test test/core/connect_payload_test.dart test/core/server_registry_test.dart`
Expected: FAIL (archivos `lib/core/servers/*` inexistentes).

- [ ] **Step 3: Implementar**

`mobile/lib/core/servers/connect_payload.dart`:

```dart
import '../config/server_url.dart';

/// Servidor al que apunta un QR de vínculo (o una URL escrita a mano).
class ConnectTarget {
  const ConnectTarget({required this.url, this.name});

  final Uri url;
  final String? name;
}

/// Lee el payload del QR de la web (`genwork://connect?server=…&name=…`) o, como
/// respaldo, una URL plana. Devuelve null si no es algo que pueda ser un genwork.
/// La verificación real (`/api/auth/mobile/info`) la hace después `addServer`.
ConnectTarget? parseConnectPayload(String raw) {
  final text = raw.trim();
  if (text.isEmpty) return null;

  if (text.contains('://') && !text.startsWith('http://') && !text.startsWith('https://')) {
    final uri = Uri.tryParse(text);
    if (uri == null || uri.scheme != 'genwork' || uri.host != 'connect') return null;
    final server = uri.queryParameters['server'];
    if (server == null) return null;
    final url = normalizeServerUrl(server);
    if (url == null) return null;
    final name = uri.queryParameters['name']?.trim();
    return ConnectTarget(url: url, name: (name == null || name.isEmpty) ? null : name);
  }

  final url = normalizeServerUrl(text);
  return url == null ? null : ConnectTarget(url: url);
}
```

`mobile/lib/core/servers/server_profile.dart`:

```dart
import 'dart:convert';

import 'package:crypto/crypto.dart';

/// Un servidor genwork guardado en el teléfono. El `id` sale del origen, así
/// que el mismo servidor escrito distinto (mayúsculas, barra final, `:443`)
/// es siempre el mismo perfil.
class ServerProfile {
  const ServerProfile({required this.id, required this.url, required this.name});

  factory ServerProfile.forUrl(Uri url, {String? name}) {
    final clean = name?.trim();
    return ServerProfile(
      id: idFor(url),
      url: url,
      name: (clean == null || clean.isEmpty) ? url.host : clean,
    );
  }

  final String id;
  final Uri url;
  final String name;

  /// Primeros 16 hex de SHA-256 del origen normalizado.
  static String idFor(Uri url) =>
      sha256.convert(utf8.encode(url.toString())).toString().substring(0, 16);

  Map<String, Object?> toJson() => {'id': id, 'url': url.toString(), 'name': name};

  static ServerProfile? tryFromJson(Object? json) {
    if (json is! Map) return null;
    final url = Uri.tryParse('${json['url']}');
    if (url == null || url.host.isEmpty) return null;
    final name = json['name'];
    return ServerProfile.forUrl(url, name: name is String ? name : null);
  }

  ServerProfile withName(String newName) =>
      ServerProfile(id: id, url: url, name: newName);
}
```

`mobile/lib/core/servers/server_registry.dart`:

```dart
import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import 'server_profile.dart';

/// Lista de servidores guardados + cuál está activo (SharedPreferences). Los
/// tokens NO viven acá: están por perfil en el almacenamiento seguro.
class ServerRegistry {
  ServerRegistry(this._prefs);

  static const _profilesKey = 'server_profiles';
  static const _activeKey = 'active_server_id';
  static const _legacyKey = 'server_url';
  final SharedPreferences _prefs;

  List<ServerProfile> profiles() {
    final raw = _prefs.getString(_profilesKey);
    if (raw == null) return const [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return const [];
      return decoded.map(ServerProfile.tryFromJson).whereType<ServerProfile>().toList();
    } on FormatException {
      return const [];
    }
  }

  ServerProfile? byId(String? id) {
    if (id == null) return null;
    for (final p in profiles()) {
      if (p.id == id) return p;
    }
    return null;
  }

  /// El perfil activo; si el guardado ya no existe, el primero. Null = primer inicio.
  ServerProfile? active() =>
      byId(_prefs.getString(_activeKey)) ?? profiles().firstOrNull;

  /// Agrega el servidor o, si ya estaba, actualiza su nombre. No lo activa.
  Future<ServerProfile> upsert(Uri url, {String? name}) async {
    final list = profiles();
    final id = ServerProfile.idFor(url);
    final i = list.indexWhere((p) => p.id == id);
    final clean = name?.trim();
    final ServerProfile profile;
    if (i >= 0) {
      profile = (clean == null || clean.isEmpty) ? list[i] : list[i].withName(clean);
      list[i] = profile;
    } else {
      profile = ServerProfile.forUrl(url, name: clean);
      list.add(profile);
    }
    await _save(list);
    return profile;
  }

  Future<void> setActive(String id) => _prefs.setString(_activeKey, id);

  /// Quita el perfil. Si era el activo, pasa el activo al primero que quede.
  Future<void> remove(String id) async {
    final list = profiles()..removeWhere((p) => p.id == id);
    await _save(list);
    if (_prefs.getString(_activeKey) == id) {
      if (list.isEmpty) {
        await _prefs.remove(_activeKey);
      } else {
        await _prefs.setString(_activeKey, list.first.id);
      }
    }
  }

  /// Versiones anteriores guardaban un solo `server_url`. Lo convierte en el
  /// primer perfil (activo) y borra la clave vieja. Devuelve null si no había.
  Future<ServerProfile?> migrateLegacy() async {
    final legacy = _prefs.getString(_legacyKey);
    if (legacy == null) return null;
    await _prefs.remove(_legacyKey);
    final url = Uri.tryParse(legacy);
    if (url == null || url.host.isEmpty) return null;
    final profile = await upsert(url);
    await setActive(profile.id);
    return profile;
  }

  Future<void> _save(List<ServerProfile> list) =>
      _prefs.setString(_profilesKey, jsonEncode(list.map((p) => p.toJson()).toList()));
}
```

- [ ] **Step 4: Verificar que pasan**

Run: `cd mobile && flutter test test/core/connect_payload_test.dart test/core/server_registry_test.dart`
Expected: PASS. Si falla `el puerto estándar no genera otro perfil`, normalizar el puerto por defecto en `ServerProfile.idFor` (quitar `:443` en https y `:80` en http antes de hashear) y repetir.

- [ ] **Step 5: Commit**

```bash
git add mobile/lib/core/servers mobile/test/core/connect_payload_test.dart mobile/test/core/server_registry_test.dart
git commit -m "feat(mobile): parser del QR de vínculo y registro de servidores"
```

### Task 4 (móvil): Token por perfil, `SessionController` multi-servidor y migración

**Files:**
- Modify: `mobile/lib/core/auth/token_store.dart`
- Modify: `mobile/lib/data/repositories/auth_repository.dart`
- Modify: `mobile/lib/core/auth/session_controller.dart`
- Modify: `mobile/lib/core/providers.dart`
- Delete: `mobile/lib/core/config/server_config_store.dart`
- Modify: `mobile/lib/features/setup/server_setup_screen.dart:34` (`setServer` → `addServer`)
- Modify: `mobile/test/widget_setup_test.dart`, `mobile/test/core/session_refresh_test.dart` (fakes con la firma nueva)
- Test: `mobile/test/core/token_store_test.dart`, `mobile/test/core/session_servers_test.dart`

**Interfaces:**
- Consumes: `ServerRegistry`, `ServerProfile`, `parseConnectPayload` (Task 3).
- Produces:
  - `abstract class TokenStore { Future<StoredSession?> read(String profileId); Future<void> write(String profileId, StoredSession session); Future<void> clear(String profileId); Future<void> adoptLegacy(String profileId); }`
  - `class ServerInfo { const ServerInfo({required this.name}); final String name; }` y `Future<ServerInfo> AuthRepository.checkServer()`.
  - Providers: `serverRegistryProvider` (Provider<ServerRegistry>), `serverListProvider` (Provider<List<ServerProfile>>), `authRepositoryProvider` (Provider.family<AuthRepository, Uri>).
  - `SessionController`: `addServer(String input, {String? name})`, `switchServer(String id)`, `removeServer(String id)`; `changeServer()` queda como shim temporal (se elimina en Task 8).

- [ ] **Step 1: Escribir los tests que fallan**

`mobile/test/core/token_store_test.dart`:

```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/auth/token_store.dart';
import 'package:genwork_mobile/data/models/app_user.dart';

AppUser _user(String id) => AppUser.fromJson({
      'id': id, 'email': '$id@test', 'name': id, 'globalRole': 'MEMBER',
    });

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('cada perfil guarda su propio token', () async {
    FlutterSecureStorage.setMockInitialValues({});
    final store = SecureTokenStore();
    await store.write('a', StoredSession(token: 'ta', user: _user('ua')));
    await store.write('b', StoredSession(token: 'tb', user: _user('ub')));
    expect((await store.read('a'))!.token, 'ta');
    expect((await store.read('b'))!.user.id, 'ub');
    await store.clear('a');
    expect(await store.read('a'), isNull);
    expect((await store.read('b'))!.token, 'tb');
  });

  test('adoptLegacy mueve el token único al perfil y borra el viejo', () async {
    FlutterSecureStorage.setMockInitialValues({
      'auth_token': 'viejo',
      'auth_user': '{"id":"u","email":"u@test","name":"U","globalRole":"MEMBER"}',
    });
    final store = SecureTokenStore();
    await store.adoptLegacy('p1');
    expect((await store.read('p1'))!.token, 'viejo');
    await store.adoptLegacy('p2'); // ya no queda nada que adoptar
    expect(await store.read('p2'), isNull);
  });
}
```

`mobile/test/core/session_servers_test.dart`:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/auth/session.dart';
import 'package:genwork_mobile/core/auth/token_store.dart';
import 'package:genwork_mobile/core/network/api_exception.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/core/servers/server_profile.dart';
import 'package:genwork_mobile/data/models/app_user.dart';
import 'package:genwork_mobile/data/repositories/auth_repository.dart';
import 'package:shared_preferences/shared_preferences.dart';

class MemoryTokenStore implements TokenStore {
  final Map<String, StoredSession> byProfile = {};
  StoredSession? legacy;

  @override
  Future<StoredSession?> read(String id) async => byProfile[id];
  @override
  Future<void> write(String id, StoredSession s) async => byProfile[id] = s;
  @override
  Future<void> clear(String id) async => byProfile.remove(id);
  @override
  Future<void> adoptLegacy(String id) async {
    final l = legacy;
    legacy = null;
    if (l != null) byProfile[id] = l;
  }
}

class FakeAuthRepository extends AuthRepository {
  FakeAuthRepository(Uri url, {this.valid = true}) : super(serverUrl: url);
  final bool valid;
  @override
  Future<ServerInfo> checkServer() async {
    if (!valid) {
      throw const ApiException(code: 'NOT_GENWORK', message: 'No es genwork');
    }
    return ServerInfo(name: 'Sistema ${serverUrl.host}');
  }

  @override
  Future<void> logout(String token) async {}
}

AppUser _user(String id) => AppUser.fromJson({
      'id': id, 'email': '$id@test', 'name': id, 'globalRole': 'MEMBER',
    });

StoredSession _session(String token, String user) =>
    StoredSession(token: token, user: _user(user));

Future<(ProviderContainer, MemoryTokenStore)> _fixture({
  Map<String, Object> prefs = const {},
  Set<String> invalidHosts = const {},
  StoredSession? legacy,
}) async {
  SharedPreferences.setMockInitialValues(prefs);
  final instance = await SharedPreferences.getInstance();
  final store = MemoryTokenStore()..legacy = legacy;
  final container = ProviderContainer(overrides: [
    sharedPreferencesProvider.overrideWithValue(instance),
    tokenStoreProvider.overrideWithValue(store),
    authRepositoryProvider.overrideWith(
      (ref, url) => FakeAuthRepository(url, valid: !invalidHosts.contains(url.host)),
    ),
  ]);
  addTearDown(container.dispose);
  return (container, store);
}

void main() {
  test('sin perfiles → NeedsServer', () async {
    final (c, _) = await _fixture();
    expect(await c.read(sessionProvider.future), isA<NeedsServer>());
  });

  test('migra server_url + token global y conserva la sesión', () async {
    final (c, store) = await _fixture(
      prefs: {'server_url': 'https://old.test'},
      legacy: _session('viejo', 'u1'),
    );
    final s = await c.read(sessionProvider.future);
    expect(s, isA<SignedIn>());
    expect((s as SignedIn).token, 'viejo');
    expect(s.serverUrl, Uri.parse('https://old.test'));
    expect(c.read(serverListProvider), hasLength(1));
    expect(store.legacy, isNull);
  });

  test('addServer guarda con el nombre de /info, activa y queda SignedOut', () async {
    final (c, _) = await _fixture();
    await c.read(sessionProvider.future);
    await c.read(sessionProvider.notifier).addServer('https://a.test');
    expect(c.read(sessionProvider).value, isA<SignedOut>());
    expect(c.read(serverListProvider).single.name, 'Sistema a.test');
  });

  test('addServer con un servidor inválido no guarda nada', () async {
    final (c, _) = await _fixture(invalidHosts: {'x.test'});
    await c.read(sessionProvider.future);
    await expectLater(
      c.read(sessionProvider.notifier).addServer('https://x.test'),
      throwsA(isA<ApiException>()),
    );
    expect(c.read(serverListProvider), isEmpty);
    expect(c.read(sessionProvider).value, isA<NeedsServer>());
  });

  test('addServer del mismo servidor escrito distinto no duplica', () async {
    final (c, _) = await _fixture();
    await c.read(sessionProvider.future);
    final n = c.read(sessionProvider.notifier);
    await n.addServer('https://a.test');
    await n.addServer('A.TEST/');
    expect(c.read(serverListProvider), hasLength(1));
  });

  test('switchServer cambia entre dos sesiones sin pedir login', () async {
    final a = ServerProfile.idFor(Uri.parse('https://a.test'));
    final b = ServerProfile.idFor(Uri.parse('https://b.test'));
    final (c, store) = await _fixture();
    store.byProfile[a] = _session('ta', 'ua');
    store.byProfile[b] = _session('tb', 'ub');
    await c.read(sessionProvider.future);
    final n = c.read(sessionProvider.notifier);
    await n.addServer('https://a.test');
    await n.addServer('https://b.test');
    expect((c.read(sessionProvider).value as SignedIn).token, 'tb');

    await n.switchServer(a);
    final s = c.read(sessionProvider).value as SignedIn;
    expect(s.token, 'ta');
    expect(s.serverUrl, Uri.parse('https://a.test'));
  });

  test('switchServer a uno sin token queda SignedOut de ese servidor', () async {
    final (c, _) = await _fixture();
    await c.read(sessionProvider.future);
    final n = c.read(sessionProvider.notifier);
    await n.addServer('https://a.test');
    await n.addServer('https://b.test');
    await n.switchServer(ServerProfile.idFor(Uri.parse('https://a.test')));
    final s = c.read(sessionProvider).value;
    expect(s, isA<SignedOut>());
    expect((s as SignedOut).serverUrl, Uri.parse('https://a.test'));
  });

  test('logout y 401 afectan solo al perfil activo', () async {
    final a = ServerProfile.idFor(Uri.parse('https://a.test'));
    final b = ServerProfile.idFor(Uri.parse('https://b.test'));
    final (c, store) = await _fixture();
    store.byProfile[a] = _session('ta', 'ua');
    store.byProfile[b] = _session('tb', 'ub');
    await c.read(sessionProvider.future);
    final n = c.read(sessionProvider.notifier);
    await n.addServer('https://a.test');
    await n.addServer('https://b.test');
    await n.logout();
    expect(store.byProfile.containsKey(b), isFalse);
    expect(store.byProfile.containsKey(a), isTrue);
    expect(c.read(serverListProvider), hasLength(2)); // el perfil sigue guardado
  });

  test('removeServer del activo pasa a otro; del último vuelve a NeedsServer', () async {
    final a = ServerProfile.idFor(Uri.parse('https://a.test'));
    final b = ServerProfile.idFor(Uri.parse('https://b.test'));
    final (c, store) = await _fixture();
    store.byProfile[a] = _session('ta', 'ua');
    store.byProfile[b] = _session('tb', 'ub');
    await c.read(sessionProvider.future);
    final n = c.read(sessionProvider.notifier);
    await n.addServer('https://a.test');
    await n.addServer('https://b.test'); // activo = b

    await n.removeServer(b);
    expect((c.read(sessionProvider).value as SignedIn).token, 'ta');
    expect(store.byProfile.containsKey(b), isFalse);

    await n.removeServer(a);
    expect(c.read(sessionProvider).value, isA<NeedsServer>());
    expect(c.read(serverListProvider), isEmpty);
  });

  test('removeServer de uno inactivo no toca la sesión actual', () async {
    final a = ServerProfile.idFor(Uri.parse('https://a.test'));
    final (c, store) = await _fixture();
    store.byProfile[a] = _session('ta', 'ua');
    await c.read(sessionProvider.future);
    final n = c.read(sessionProvider.notifier);
    await n.addServer('https://a.test');
    await n.addServer('https://b.test'); // activo = b (SignedOut)
    await n.removeServer(a);
    expect(c.read(sessionProvider).value, isA<SignedOut>());
    expect(c.read(serverListProvider), hasLength(1));
  });
}
```

- [ ] **Step 2: Verificar que fallan**

Run: `cd mobile && flutter test test/core/token_store_test.dart test/core/session_servers_test.dart`
Expected: FAIL (no compila: firmas nuevas inexistentes).

- [ ] **Step 3: Implementar `TokenStore` por perfil**

Reemplazar `mobile/lib/core/auth/token_store.dart`:

```dart
import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../data/models/app_user.dart';

/// Token Bearer de la app y el usuario con el que se emitió, **uno por servidor
/// guardado** (`profileId`), en el almacenamiento seguro del sistema (Keychain /
/// Keystore).
abstract class TokenStore {
  Future<StoredSession?> read(String profileId);
  Future<void> write(String profileId, StoredSession session);
  Future<void> clear(String profileId);

  /// Versiones anteriores guardaban un único token global. Lo mueve al perfil
  /// indicado y borra el viejo; si no hay nada, no hace nada.
  Future<void> adoptLegacy(String profileId);
}

class StoredSession {
  const StoredSession({required this.token, required this.user});

  final String token;
  final AppUser user;
}

class SecureTokenStore implements TokenStore {
  SecureTokenStore([FlutterSecureStorage? storage]) : _storage = storage ?? const FlutterSecureStorage();

  static const _tokenKey = 'auth_token';
  static const _userKey = 'auth_user';
  final FlutterSecureStorage _storage;

  String _t(String id) => '$_tokenKey:$id';
  String _u(String id) => '$_userKey:$id';

  StoredSession? _decode(String? token, String? user) {
    if (token == null || user == null) return null;
    try {
      return StoredSession(
        token: token,
        user: AppUser.fromJson(jsonDecode(user) as Map<String, dynamic>),
      );
    } on FormatException {
      return null;
    }
  }

  @override
  Future<StoredSession?> read(String profileId) async => _decode(
        await _storage.read(key: _t(profileId)),
        await _storage.read(key: _u(profileId)),
      );

  @override
  Future<void> write(String profileId, StoredSession session) async {
    await _storage.write(key: _t(profileId), value: session.token);
    await _storage.write(key: _u(profileId), value: jsonEncode(session.user.toJson()));
  }

  @override
  Future<void> clear(String profileId) async {
    await _storage.delete(key: _t(profileId));
    await _storage.delete(key: _u(profileId));
  }

  @override
  Future<void> adoptLegacy(String profileId) async {
    final token = await _storage.read(key: _tokenKey);
    final user = await _storage.read(key: _userKey);
    if (token != null && user != null && await read(profileId) == null) {
      await _storage.write(key: _t(profileId), value: token);
      await _storage.write(key: _u(profileId), value: user);
    }
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _userKey);
  }
}
```

- [ ] **Step 4: `AuthRepository.checkServer` devuelve `ServerInfo`**

En `mobile/lib/data/repositories/auth_repository.dart`, agregar antes de `class AuthRepository`:

```dart
/// Lo que el servidor cuenta de sí mismo en `/api/auth/mobile/info`.
class ServerInfo {
  const ServerInfo({required this.name});

  /// Nombre visible (`name` de `/info`; el host si el servidor es una versión vieja).
  final String name;
}
```

y reemplazar `checkServer` por:

```dart
  /// Verifica que la URL apunte a un genwork con login móvil (`/api/auth/mobile/info`).
  Future<ServerInfo> checkServer() async {
    try {
      final res = await _dio.get<Object?>('/api/auth/mobile/info');
      final data = res.data;
      if (data is Map && data['app'] == 'genwork') {
        final name = data['name'];
        return ServerInfo(
          name: name is String && name.trim().isNotEmpty ? name.trim() : serverUrl.host,
        );
      }
    } on DioException catch (e) {
      if (e.response == null) throw ApiException.fromDio(e);
    }
    throw const ApiException(
      code: 'NOT_GENWORK',
      message: 'Esa dirección no es un servidor de genwork compatible con la app.',
    );
  }
```

- [ ] **Step 5: Providers**

En `mobile/lib/core/providers.dart`: quitar el import de `config/server_config_store.dart` y reemplazar `serverConfigStoreProvider` por:

```dart
import 'servers/server_profile.dart';
import 'servers/server_registry.dart';
import '../data/repositories/auth_repository.dart';
```
(en la zona de imports) y

```dart
final serverRegistryProvider = Provider<ServerRegistry>(
  (ref) => ServerRegistry(ref.watch(sharedPreferencesProvider)),
);

/// Servidores guardados. `SessionController` lo invalida cada vez que cambia la
/// lista, así las pantallas se reconstruyen.
final serverListProvider = Provider<List<ServerProfile>>(
  (ref) => ref.watch(serverRegistryProvider).profiles(),
);

/// Repositorio de login/verificación de un servidor. Se puede sobreescribir en tests.
final authRepositoryProvider = Provider.family<AuthRepository, Uri>(
  (ref, url) => AuthRepository(serverUrl: url),
);
```

- [ ] **Step 6: Reescribir `SessionController`**

Reemplazar `mobile/lib/core/auth/session_controller.dart` conservando `refreshUser` y `updateStoredUser` (ya existentes) y cambiando el resto:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/foundation.dart';

import '../config/server_url.dart';
import '../network/api_exception.dart';
import '../providers.dart';
import '../servers/server_profile.dart';
import 'session.dart';
import 'token_store.dart';

/// Dueño del ciclo servidor → login → sesión, con **varios servidores
/// guardados**: uno activo a la vez, cada uno con su propio token. Las pantallas
/// solo llaman a estos métodos; el router redirige según el estado.
class SessionController extends AsyncNotifier<SessionState> {
  @override
  Future<SessionState> build() async {
    final registry = ref.read(serverRegistryProvider);
    final migrated = await registry.migrateLegacy();
    if (migrated != null) {
      await ref.read(tokenStoreProvider).adoptLegacy(migrated.id);
    }
    final active = registry.active();
    if (active == null) return const NeedsServer();
    return _stateFor(active);
  }

  Future<SessionState> _stateFor(ServerProfile profile) async {
    final stored = await ref.read(tokenStoreProvider).read(profile.id);
    if (stored == null) return SignedOut(profile.url);
    return SignedIn(serverUrl: profile.url, token: stored.token, user: stored.user);
  }

  String _idOf(Uri url) => ServerProfile.idFor(url);

  /// Valida la URL contra `/api/auth/mobile/info`, la guarda (o actualiza si ya
  /// estaba) y pasa a ese servidor. Lanza [ApiException] si no es un genwork.
  Future<void> addServer(String input, {String? name}) async {
    final url = normalizeServerUrl(input);
    if (url == null) {
      throw const ApiException(
        code: 'INVALID_URL',
        message: 'Ingresá una dirección válida, ej. work.empresa.com',
      );
    }
    final info = await ref.read(authRepositoryProvider(url)).checkServer();
    final profile = await ref.read(serverRegistryProvider).upsert(url, name: info.name);
    await _activate(profile);
  }

  /// Pasa a un servidor ya guardado: con token entra directo, sin token pide login.
  Future<void> switchServer(String id) async {
    final profile = ref.read(serverRegistryProvider).byId(id);
    if (profile == null) return;
    await _activate(profile);
  }

  /// Olvida un servidor: borra su token local (y lo revoca en el servidor si hay
  /// red). Si era el activo, pasa a otro; si era el último, vuelve al primer inicio.
  Future<void> removeServer(String id) async {
    final registry = ref.read(serverRegistryProvider);
    final profile = registry.byId(id);
    if (profile == null) return;
    final tokens = ref.read(tokenStoreProvider);
    final stored = await tokens.read(id);
    if (stored != null) {
      await ref.read(authRepositoryProvider(profile.url)).logout(stored.token);
    }
    await tokens.clear(id);
    final wasActive = registry.active()?.id == id;
    await registry.remove(id);
    ref.invalidate(serverListProvider);
    if (!wasActive) return;
    final next = registry.active();
    if (next == null) {
      state = const AsyncData(NeedsServer());
    } else {
      await _activate(next);
    }
  }

  Future<void> _activate(ServerProfile profile) async {
    await ref.read(serverRegistryProvider).setActive(profile.id);
    ref.invalidate(serverListProvider);
    final next = await _stateFor(profile);
    if (!ref.mounted) return;
    state = AsyncData(next);
  }

  /// TEMPORAL: se elimina en la tarea de la lista de servidores. Solo muestra la
  /// pantalla de alta sin borrar nada.
  Future<void> changeServer() async {
    state = const AsyncData(NeedsServer());
  }

  /// Login con el navegador del sistema. Lanza [LoginCancelled] o [ApiException].
  Future<void> login() async {
    final current = state.value;
    if (current is! SignedOut) return;
    final stored = await ref.read(authRepositoryProvider(current.serverUrl)).login();
    await ref.read(tokenStoreProvider).write(_idOf(current.serverUrl), stored);
    state = AsyncData(
      SignedIn(serverUrl: current.serverUrl, token: stored.token, user: stored.user),
    );
  }

  Future<void> logout() async {
    final current = state.value;
    if (current is! SignedIn) return;
    await ref.read(authRepositoryProvider(current.serverUrl)).logout(current.token);
    await ref.read(tokenStoreProvider).clear(_idOf(current.serverUrl));
    state = AsyncData(SignedOut(current.serverUrl));
  }

  /// Un 401 de la API: el token fue revocado → sesión local fuera, al login.
  Future<void> handleUnauthorized() async {
    final current = state.value;
    if (current is! SignedIn) return;
    await ref.read(tokenStoreProvider).clear(_idOf(current.serverUrl));
    state = AsyncData(SignedOut(current.serverUrl));
  }

  // refreshUser() — sin cambios respecto del archivo actual.

  /// Actualiza el usuario guardado (ej. tras refrescar `/api/me`).
  Future<void> updateStoredUser(StoredSession session) async {
    final current = state.value;
    if (current is! SignedIn ||
        current.token != session.token ||
        current.user.id != session.user.id) {
      return;
    }
    await ref.read(tokenStoreProvider).write(_idOf(current.serverUrl), session);
    if (!ref.mounted || !identical(state.value, current)) return;
    state = AsyncData(
      SignedIn(serverUrl: current.serverUrl, token: session.token, user: session.user),
    );
  }
}
```

Importante: dejar `refreshUser()` exactamente como está hoy en el archivo (copiarlo del original; solo usa `meRepositoryProvider` y `updateStoredUser`). Quitar el import no usado de `auth_repository.dart` si el analizador lo marca.

- [ ] **Step 7: Borrar `ServerConfigStore` y adaptar llamadores y fakes**

Run: `git rm mobile/lib/core/config/server_config_store.dart`

En `mobile/lib/features/setup/server_setup_screen.dart`, cambiar `ref.read(sessionProvider.notifier).setServer(_controller.text)` por `ref.read(sessionProvider.notifier).addServer(_controller.text)`.

En `mobile/test/widget_setup_test.dart`, reemplazar `_MemoryTokenStore` por:

```dart
class _MemoryTokenStore implements TokenStore {
  final Map<String, StoredSession> sessions = {};

  @override
  Future<void> clear(String id) async => sessions.remove(id);

  @override
  Future<StoredSession?> read(String id) async => sessions[id];

  @override
  Future<void> write(String id, StoredSession s) async => sessions[id] = s;

  @override
  Future<void> adoptLegacy(String id) async {}
}
```

En `mobile/test/core/session_refresh_test.dart`, reemplazar `MemoryStore` por la versión con firmas nuevas (el `value` se comparte entre perfiles; el test usa uno solo):

```dart
class MemoryStore implements TokenStore {
  StoredSession? value = StoredSession(
    token: 'test',
    user: AppUser.fromJson({
      'id': 'u',
      'email': 'u@test',
      'name': 'Persona',
      'globalRole': 'SUPERADMIN',
    }),
  );
  int writes = 0;
  @override
  Future<StoredSession?> read(String profileId) async => value;
  @override
  Future<void> write(String profileId, StoredSession session) async {
    value = session;
    writes++;
  }

  @override
  Future<void> clear(String profileId) async {
    value = null;
  }

  @override
  Future<void> adoptLegacy(String profileId) async {}
}
```
(Ambos tests siguen usando `server_url` en prefs: ahora ejercitan la migración.)

- [ ] **Step 8: Verificar**

Run: `cd mobile && dart analyze lib test && flutter test`
Expected: analyze sin errores; toda la suite PASS (incluidos `token_store_test`, `session_servers_test`, `widget_setup_test`, `session_refresh_test`). Si `FlutterSecureStorage.setMockInitialValues` no existe en la versión instalada (`^11.2.0`), usar el mecanismo equivalente de mock que documente el paquete (`read_package_uris`/`rip_grep_packages` del MCP de dart) y mantener los mismos asserts.

- [ ] **Step 9: Commit**

```bash
git add -A mobile
git commit -m "feat(mobile): sesión multi-servidor (token por perfil, migración y switch/remove)"
```

### Task 5 (móvil): Rutas y `authRedirect` para la gestión de servidores

**Files:**
- Modify: `mobile/lib/core/router/routes.dart:5-7`
- Modify: `mobile/lib/core/router/auth_redirect.dart`
- Test: `mobile/test/core/auth_redirect_test.dart`

**Interfaces:**
- Produces: `Routes.servers = '/servers'`, `Routes.addServer = '/servers/add'`. `authRedirect` deja pasar `/servers*` a `SignedOut` y `SignedIn` (cualquier rol); a `NeedsServer` lo manda a `/setup`.

- [ ] **Step 1: Escribir el test que falla** (agregar al `main()` de `test/core/auth_redirect_test.dart`)

```dart
  test('las rutas de servidores están disponibles con y sin sesión', () {
    for (final location in [Routes.servers, Routes.addServer]) {
      expect(authRedirect(SignedOut(server), location), isNull);
      expect(authRedirect(signedIn, location), isNull);
    }
  });

  test('clientes y lectores también pueden cambiar de servidor', () {
    const client = AppUser(id: 'c', email: 'c@b.c', name: 'C', role: GlobalRole.client, roleRaw: 'CLIENT');
    const reader = AppUser(id: 'r', email: 'r@b.c', name: 'R', role: GlobalRole.reader, roleRaw: 'READER');
    for (final u in [client, reader]) {
      final s = SignedIn(serverUrl: server, token: 't', user: u);
      expect(authRedirect(s, Routes.servers), isNull);
      expect(authRedirect(s, Routes.addServer), isNull);
    }
  });

  test('sin servidores, /servers/add redirige a setup', () {
    expect(authRedirect(const NeedsServer(), Routes.addServer), Routes.setup);
    expect(authRedirect(const NeedsServer(), Routes.servers), Routes.setup);
  });
```

- [ ] **Step 2: Verificar que falla**

Run: `cd mobile && flutter test test/core/auth_redirect_test.dart`
Expected: FAIL (`Routes.servers` no existe).

- [ ] **Step 3: Implementar**

En `routes.dart`, después de `static const login = '/login';`:

```dart
  /// Servidores guardados (cambiar/quitar) y alta de uno nuevo por QR.
  static const servers = '/servers';
  static const addServer = '/servers/add';
```

En `auth_redirect.dart`, agregar helper y regla inicial:

```dart
bool _isServerRoute(String location) =>
    location == Routes.servers || location.startsWith('${Routes.servers}/');
```

y al comienzo de `authRedirect`, antes del `return switch`:

```dart
  // Cambiar de servidor está disponible para todos los roles, con o sin sesión.
  if ((session is SignedOut || session is SignedIn) && _isServerRoute(location)) {
    return null;
  }
```

Actualizar el comentario de doc de la función con la línea "- Con o sin sesión → /servers* queda accesible (cambiar de servidor)."

- [ ] **Step 4: Verificar**

Run: `cd mobile && flutter test test/core/auth_redirect_test.dart`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/lib/core/router mobile/test/core/auth_redirect_test.dart
git commit -m "feat(mobile): rutas /servers y /servers/add accesibles con y sin sesión"
```

---

## Parte C — Móvil (UI)

> Estas pantallas pueden implementarse por otro agente (según el reparto del proyecto: núcleo Claude, pantallas Codex) **después** de las Tasks 3–5. Orden: Task 6 → 7 → 8. Seguir `mobile/AGENTS.md` y la guardia de tokens (ver Global Constraints).

### Task 6 (móvil): Escáner QR en el alta de servidor

**Files:**
- Modify: `mobile/pubspec.yaml` (dependencia `mobile_scanner`)
- Modify: `mobile/android/app/src/main/AndroidManifest.xml:2`
- Modify: `mobile/ios/Runner/Info.plist`
- Modify: `mobile/lib/core/theme/app_icons.dart`
- Create: `mobile/lib/features/setup/qr_scanner_view.dart`
- Modify: `mobile/lib/features/setup/server_setup_screen.dart`
- Modify: `mobile/lib/core/router/app_router.dart` (ruta `addServer`)
- Modify: `mobile/test/widget_setup_test.dart`
- Test: `mobile/test/features/server_setup_test.dart`

**Interfaces:**
- Consumes: `parseConnectPayload`, `ConnectTarget` (Task 3); `SessionController.addServer(String, {String? name})`, `authRepositoryProvider` (Task 4); `Routes.addServer` (Task 5).
- Produces: `typedef QrScannerBuilder = Widget Function(BuildContext context, ValueChanged<String> onCode)`, `qrScannerBuilderProvider` (Provider<QrScannerBuilder>), `QrScannerView({required ValueChanged<String> onCode, VoidCallback? onUnavailable})`. `ServerSetupScreen({bool canGoBack = false})`.
- Keys de UI: `setup_scanner`, `setup_manual_toggle`, `setup_scan_toggle`, `setup_url_field`, `setup_continue`.

- [ ] **Step 1: Dependencia y permisos**

Run: `cd mobile && flutter pub add mobile_scanner`

`AndroidManifest.xml`, junto al permiso INTERNET:

```xml
    <uses-permission android:name="android.permission.CAMERA"/>
    <uses-feature android:name="android.hardware.camera" android:required="false"/>
```

`ios/Runner/Info.plist`, dentro del `<dict>` principal:

```xml
		<key>NSCameraUsageDescription</key>
		<string>La cámara se usa solo para escanear el código QR que vincula la app con tu servidor.</string>
```

En `lib/core/theme/app_icons.dart` agregar:

```dart
  static const qrScanner = Icons.qr_code_scanner_outlined;
  static const keyboard = Icons.keyboard_outlined;
```

- [ ] **Step 2: Escribir los tests que fallan**

`mobile/test/features/server_setup_test.dart` (usa un escáner falso y un `AuthRepository` falso; reutiliza el patrón de `widget_setup_test.dart`):

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/app.dart';
import 'package:genwork_mobile/core/auth/token_store.dart';
import 'package:genwork_mobile/core/network/api_exception.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/data/repositories/auth_repository.dart';
import 'package:genwork_mobile/features/setup/qr_scanner_view.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _Tokens implements TokenStore {
  @override
  Future<StoredSession?> read(String id) async => null;
  @override
  Future<void> write(String id, StoredSession s) async {}
  @override
  Future<void> clear(String id) async {}
  @override
  Future<void> adoptLegacy(String id) async {}
}

class _FakeAuth extends AuthRepository {
  _FakeAuth(Uri url, this.calls) : super(serverUrl: url);
  final List<Uri> calls;
  @override
  Future<ServerInfo> checkServer() async {
    calls.add(serverUrl);
    if (serverUrl.host == 'ajeno.test') {
      throw const ApiException(code: 'NOT_GENWORK', message: 'No es genwork');
    }
    return ServerInfo(name: 'Sistema ${serverUrl.host}');
  }
}

/// Escáner falso: un botón por payload, para disparar "lecturas".
Widget _fakeScanner(BuildContext context, ValueChanged<String> onCode) => Column(
      key: const ValueKey('fake_scanner'),
      children: [
        for (final p in ['genwork://connect?server=https%3A%2F%2Fa.test&name=A', 'texto cualquiera', 'https://ajeno.test'])
          TextButton(key: ValueKey('scan:$p'), onPressed: () => onCode(p), child: Text(p)),
      ],
    );

Future<List<Uri>> _pump(WidgetTester tester) async {
  tester.view.physicalSize = const Size(400, 900);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await initializeDateFormatting('es');
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  final calls = <Uri>[];
  await tester.pumpWidget(ProviderScope(
    retry: (_, _) => null,
    overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      tokenStoreProvider.overrideWithValue(_Tokens()),
      qrScannerBuilderProvider.overrideWithValue(_fakeScanner),
      authRepositoryProvider.overrideWith((ref, url) => _FakeAuth(url, calls)),
    ],
    child: const GenworkApp(),
  ));
  await tester.pumpAndSettle();
  return calls;
}

void main() {
  testWidgets('primer inicio muestra el escáner y permite escribir a mano', (tester) async {
    await _pump(tester);
    expect(find.byKey(const ValueKey('fake_scanner')), findsOneWidget);
    expect(find.byKey(const ValueKey('setup_url_field')), findsNothing);

    await tester.tap(find.byKey(const ValueKey('setup_manual_toggle')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('setup_url_field')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('setup_scan_toggle')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('fake_scanner')), findsOneWidget);
  });

  testWidgets('un QR válido guarda el servidor y sigue al login', (tester) async {
    final calls = await _pump(tester);
    await tester.tap(find.byKey(const ValueKey('scan:genwork://connect?server=https%3A%2F%2Fa.test&name=A')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('login_google')), findsOneWidget);
    expect(find.text('a.test'), findsOneWidget);
    expect(calls, [Uri.parse('https://a.test')]);
  });

  testWidgets('QR de ruido: avisa y no guarda ni consulta ningún servidor', (tester) async {
    final calls = await _pump(tester);
    await tester.tap(find.byKey(const ValueKey('scan:texto cualquiera')));
    await tester.pumpAndSettle();
    expect(find.text('No es un QR de genwork.'), findsOneWidget);
    expect(find.byKey(const ValueKey('login_google')), findsNothing);
    // "texto cualquiera" se normaliza a una URL; igual no puede haber alta exitosa.
    expect(calls.length, lessThanOrEqualTo(1));
  });

  testWidgets('QR de un servidor que no es genwork muestra el error y sigue en setup', (tester) async {
    await _pump(tester);
    await tester.tap(find.byKey(const ValueKey('scan:https://ajeno.test')));
    await tester.pumpAndSettle();
    expect(find.text('No es genwork'), findsOneWidget);
    expect(find.byKey(const ValueKey('login_google')), findsNothing);
  });

  testWidgets('lecturas repetidas del mismo QR hacen una sola verificación', (tester) async {
    final calls = await _pump(tester);
    final key = const ValueKey('scan:genwork://connect?server=https%3A%2F%2Fa.test&name=A');
    await tester.tap(find.byKey(key));
    await tester.tap(find.byKey(key), warnIfMissed: false);
    await tester.tap(find.byKey(key), warnIfMissed: false);
    await tester.pumpAndSettle();
    expect(calls.where((u) => u.host == 'a.test').length, 1);
  });
}
```

En `test/widget_setup_test.dart`, el test "primer inicio pide la URL del sistema" ahora debe pasar por el modo manual:

```dart
  testWidgets('primer inicio ofrece escribir la URL a mano', (tester) async {
    await _pump(tester, {});
    await tester.tap(find.byKey(const ValueKey('setup_manual_toggle')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('setup_url_field')), findsOneWidget);
    expect(find.text('Continuar'), findsOneWidget);
  });
```
y en el `overrides` de su `_pump` agregar un escáner falso mínimo: `qrScannerBuilderProvider.overrideWithValue((context, onCode) => const SizedBox(key: ValueKey('setup_scanner')))` (importar `qr_scanner_view.dart`), para que el test no abra la cámara.

- [ ] **Step 3: Verificar que fallan**

Run: `cd mobile && flutter test test/features/server_setup_test.dart test/widget_setup_test.dart`
Expected: FAIL (`qr_scanner_view.dart` inexistente).

- [ ] **Step 4: Implementar `QrScannerView`**

`mobile/lib/features/setup/qr_scanner_view.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';

/// Cómo se construye el visor de QR. Se puede reemplazar en tests (la cámara no
/// existe en `flutter test`).
typedef QrScannerBuilder =
    Widget Function(BuildContext context, ValueChanged<String> onCode);

final qrScannerBuilderProvider = Provider<QrScannerBuilder>(
  (ref) =>
      (context, onCode) => QrScannerView(onCode: onCode),
);

/// Visor de cámara que entrega el texto de cada QR leído. Quien lo usa decide
/// qué hacer con repeticiones (la cámara puede leer el mismo QR muchas veces).
class QrScannerView extends StatefulWidget {
  const QrScannerView({super.key, required this.onCode});

  final ValueChanged<String> onCode;

  @override
  State<QrScannerView> createState() => _QrScannerViewState();
}

class _QrScannerViewState extends State<QrScannerView> {
  final _controller = MobileScannerController(
    formats: const [BarcodeFormat.qrCode],
    detectionSpeed: DetectionSpeed.noDuplicates,
  );

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return AspectRatio(
      aspectRatio: 1,
      child: ClipRRect(
        borderRadius: AppGeometry.card,
        child: MobileScanner(
          key: const ValueKey('setup_scanner'),
          controller: _controller,
          onDetect: (capture) {
            for (final barcode in capture.barcodes) {
              final value = barcode.rawValue;
              if (value != null && value.isNotEmpty) {
                widget.onCode(value);
                return;
              }
            }
          },
          errorBuilder: (context, error) => ColoredBox(
            color: c.surface,
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(AppIcons.qrScanner, color: c.muted),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      'No se pudo usar la cámara. Revisá el permiso o escribí la dirección a mano.',
                      textAlign: TextAlign.center,
                      style: AppTextStyles.supporting.copyWith(color: c.muted),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
```

Nota: la firma exacta de `errorBuilder` (y si recibe un `child`) depende de la versión instalada de `mobile_scanner`. Ajustar a la que reporte `dart analyze`, manteniendo el mismo contenido de error.

- [ ] **Step 5: Reescribir `ServerSetupScreen`**

Reemplazar `mobile/lib/features/setup/server_setup_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../core/router/routes.dart';
import '../../core/servers/connect_payload.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../shared/widgets/app_inline_notice.dart';
import '../../shared/widgets/auth_card.dart';
import '../../shared/widgets/state_views.dart';
import 'qr_scanner_view.dart';

/// Alta de servidor. Primer inicio (`/setup`) o «Agregar servidor» (`/servers/add`):
/// se escanea el QR de «Configuración › App móvil» de la web, o se escribe la
/// dirección a mano. Se valida contra `/api/auth/mobile/info` y se guarda; después
/// sigue el login con Google.
class ServerSetupScreen extends ConsumerStatefulWidget {
  const ServerSetupScreen({super.key, this.canGoBack = false});

  /// True cuando ya hay servidores guardados y se puede volver a la lista.
  final bool canGoBack;

  @override
  ConsumerState<ServerSetupScreen> createState() => _ServerSetupScreenState();
}

class _ServerSetupScreenState extends ConsumerState<ServerSetupScreen> {
  final _controller = TextEditingController();
  bool _manual = false;
  bool _checking = false;
  String? _error;
  String? _connectingTo;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _connect(ConnectTarget target) async {
    if (_checking) return; // el escáner dispara la misma lectura varias veces
    setState(() {
      _checking = true;
      _error = null;
      _connectingTo = target.name ?? target.url.host;
    });
    try {
      await ref
          .read(sessionProvider.notifier)
          .addServer(target.url.toString(), name: target.name);
      if (mounted && widget.canGoBack) context.go(Routes.myDay);
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  void _onCode(String raw) {
    if (_checking) return;
    final target = parseConnectPayload(raw);
    if (target == null) {
      setState(() => _error = 'No es un QR de genwork.');
      return;
    }
    _connect(target);
  }

  void _submitManual() {
    final target = parseConnectPayload(_controller.text);
    if (target == null) {
      setState(() => _error = 'Ingresá una dirección válida, ej. work.empresa.com');
      return;
    }
    _connect(target);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return AuthCard(
      children: [
        Text(
          _manual
              ? 'Ingresá la dirección de tu sistema'
              : 'Escaneá el QR de tu sistema',
          textAlign: TextAlign.center,
          style: AppTextStyles.body.copyWith(color: c.text),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          _manual
              ? 'La encontrás en la barra del navegador.'
              : 'Lo ves en Configuración › App móvil, en la web.',
          textAlign: TextAlign.center,
          style: AppTextStyles.supporting.copyWith(color: c.muted),
        ),
        const SizedBox(height: AppSpacing.md),
        if (_manual) ...[
          TextField(
            key: const ValueKey('setup_url_field'),
            controller: _controller,
            enabled: !_checking,
            enableSuggestions: false,
            keyboardType: TextInputType.url,
            autocorrect: false,
            textInputAction: TextInputAction.go,
            onSubmitted: (_) => _submitManual(),
            decoration: const InputDecoration(
              labelText: 'URL del sistema',
              hintText: 'work.empresa.com',
            ),
          ),
        ] else
          ref.watch(qrScannerBuilderProvider)(context, _onCode),
        if (_checking && _connectingTo != null) ...[
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Conectando con $_connectingTo…',
            textAlign: TextAlign.center,
            style: AppTextStyles.supporting.copyWith(color: c.muted),
          ),
        ],
        if (_error != null) ...[
          const SizedBox(height: AppSpacing.sm),
          AppInlineNotice.error(message: _error!),
        ],
        const SizedBox(height: AppSpacing.md),
        if (_manual)
          FilledButton(
            key: const ValueKey('setup_continue'),
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(AppSpacing.xxxl),
            ),
            onPressed: _checking ? null : _submitManual,
            child: _checking
                ? const Text('Verificando conexión…')
                : const Text('Continuar'),
          ),
        TextButton.icon(
          key: ValueKey(_manual ? 'setup_scan_toggle' : 'setup_manual_toggle'),
          onPressed: _checking
              ? null
              : () => setState(() {
                  _manual = !_manual;
                  _error = null;
                }),
          icon: Icon(_manual ? AppIcons.qrScanner : AppIcons.keyboard),
          label: Text(_manual ? 'Escanear QR' : 'Escribir dirección a mano'),
        ),
        if (widget.canGoBack)
          TextButton(
            key: const ValueKey('setup_back'),
            onPressed: _checking ? null : () => context.pop(),
            child: const Text('Cancelar'),
          ),
      ],
    );
  }
}
```

- [ ] **Step 6: Ruta `addServer`**

En `app_router.dart`, junto a las rutas `setup`/`login` agregar:

```dart
      GoRoute(
        path: Routes.addServer,
        builder: (_, _) => const ServerSetupScreen(canGoBack: true),
      ),
```
(La pantalla de lista `/servers` se agrega en Task 7; hasta entonces `canGoBack`'s `context.pop()` se usa solo si se llegó con `push`.)

- [ ] **Step 7: Verificar**

Run: `cd mobile && dart analyze lib test && flutter test test/features/server_setup_test.dart test/widget_setup_test.dart test/design_tokens_guard_test.dart`
Expected: analyze limpio; tests PASS (incluida la guardia de tokens: sin `Icons.`, sin literales).

Verificación manual en dispositivo: `flutter run` en un teléfono real, primer inicio → se ve la cámara (acepta el permiso) → escanear el QR de `/settings/movil` → pasa al login mostrando el host. Denegar el permiso de cámara → aparece el aviso y «Escribir dirección a mano» funciona.

- [ ] **Step 8: Commit**

```bash
git add mobile
git commit -m "feat(mobile): alta de servidor por QR con respaldo manual"
```

### Task 7 (móvil): Lista de servidores (cambiar, agregar, quitar)

**Files:**
- Create: `mobile/lib/features/setup/servers_screen.dart`
- Modify: `mobile/lib/core/router/app_router.dart`
- Modify: `mobile/lib/features/auth/login_screen.dart:70-77`
- Modify: `mobile/lib/features/account/account_screen.dart` (tile «Servidores»)
- Modify: `mobile/lib/core/auth/session_controller.dart` (eliminar el shim `changeServer`)
- Modify: `mobile/test/widget_setup_test.dart` (si referencia «Cambiar servidor»)
- Test: `mobile/test/features/servers_screen_test.dart`

**Interfaces:**
- Consumes: `serverListProvider`, `sessionProvider`, `SessionController.switchServer/removeServer` (Task 4); `Routes.servers`, `Routes.addServer` (Task 5); `confirmAction` (`shared/widgets/action_confirmation_dialog.dart`).
- Produces: `ServersScreen`. Keys: `server_<id>`, `server_remove_<id>`, `servers_add`, `account_servers`, `login_change_server` (se conserva).

- [ ] **Step 1: Escribir el test que falla**

`mobile/test/features/servers_screen_test.dart` (ambos servidores sin token → todo queda en `SignedOut`, sin necesidad de montar el shell):

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/app.dart';
import 'package:genwork_mobile/core/auth/token_store.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/core/router/app_router.dart';
import 'package:genwork_mobile/core/router/routes.dart';
import 'package:genwork_mobile/core/servers/server_profile.dart';
import 'package:genwork_mobile/data/repositories/auth_repository.dart';
import 'package:genwork_mobile/features/setup/qr_scanner_view.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _Tokens implements TokenStore {
  @override
  Future<StoredSession?> read(String id) async => null;
  @override
  Future<void> write(String id, StoredSession s) async {}
  @override
  Future<void> clear(String id) async {}
  @override
  Future<void> adoptLegacy(String id) async {}
}

class _FakeAuth extends AuthRepository {
  _FakeAuth(Uri url) : super(serverUrl: url);
  @override
  Future<void> logout(String token) async {}
}

final _a = ServerProfile.forUrl(Uri.parse('https://a.test'), name: 'Taller A');
final _b = ServerProfile.forUrl(Uri.parse('https://b.test'), name: 'Taller B');

Future<ProviderContainer> _pump(WidgetTester tester) async {
  tester.view.physicalSize = const Size(400, 900);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await initializeDateFormatting('es');
  SharedPreferences.setMockInitialValues({
    'server_profiles':
        '[${[_a, _b].map((p) => '{"id":"${p.id}","url":"${p.url}","name":"${p.name}"}').join(',')}]',
    'active_server_id': _a.id,
  });
  final prefs = await SharedPreferences.getInstance();
  await tester.pumpWidget(ProviderScope(
    retry: (_, _) => null,
    overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      tokenStoreProvider.overrideWithValue(_Tokens()),
      qrScannerBuilderProvider.overrideWithValue((c, onCode) => const SizedBox()),
      authRepositoryProvider.overrideWith((ref, url) => _FakeAuth(url)),
    ],
    child: const GenworkApp(),
  ));
  await tester.pumpAndSettle();
  final container = ProviderScope.containerOf(tester.element(find.byType(MaterialApp)));
  container.read(routerProvider).go(Routes.servers);
  await tester.pumpAndSettle();
  return container;
}

void main() {
  testWidgets('lista los servidores y marca el activo', (tester) async {
    await _pump(tester);
    expect(find.text('Taller A'), findsOneWidget);
    expect(find.text('Taller B'), findsOneWidget);
    expect(find.text('https://a.test'), findsOneWidget);
    expect(find.byKey(const ValueKey('servers_add')), findsOneWidget);
  });

  testWidgets('tocar otro servidor lo activa (sin token → login de ese servidor)', (tester) async {
    await _pump(tester);
    await tester.tap(find.byKey(ValueKey('server_${_b.id}')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('login_google')), findsOneWidget);
    expect(find.text('b.test'), findsOneWidget);
  });

  testWidgets('quitar pide confirmación y deja el otro servidor', (tester) async {
    await _pump(tester);
    await tester.tap(find.byKey(ValueKey('server_remove_${_b.id}')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Quitar').last);
    await tester.pumpAndSettle();
    expect(find.text('Taller B'), findsNothing);
    expect(find.text('Taller A'), findsOneWidget);
  });

  testWidgets('quitar todos vuelve al primer inicio', (tester) async {
    await _pump(tester);
    for (final p in [_b, _a]) {
      await tester.tap(find.byKey(ValueKey('server_remove_${p.id}')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Quitar').last);
      await tester.pumpAndSettle();
    }
    expect(find.byKey(const ValueKey('setup_manual_toggle')), findsOneWidget);
  });

  testWidgets('«Agregar servidor» abre el alta con escáner', (tester) async {
    await _pump(tester);
    await tester.tap(find.byKey(const ValueKey('servers_add')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('setup_manual_toggle')), findsOneWidget);
    expect(find.byKey(const ValueKey('setup_back')), findsOneWidget);
  });
}
```

- [ ] **Step 2: Verificar que falla**

Run: `cd mobile && flutter test test/features/servers_screen_test.dart`
Expected: FAIL (`/servers` no tiene pantalla).

- [ ] **Step 3: Implementar `ServersScreen`**

`mobile/lib/features/setup/servers_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/session.dart';
import '../../core/providers.dart';
import '../../core/router/routes.dart';
import '../../core/servers/server_profile.dart';
import '../../core/theme/app_geometry.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/gen_colors.dart';
import '../../shared/widgets/action_confirmation_dialog.dart';
import '../../shared/widgets/state_views.dart';
import '../../shared/widgets/workspace_panel.dart';

/// Servidores guardados en este teléfono: tocar uno cambia a ese sistema (con su
/// propia sesión, sin volver a ingresar); «Agregar servidor» pide otro QR.
class ServersScreen extends ConsumerWidget {
  const ServersScreen({super.key});

  Uri? _activeUrl(SessionState? s) => switch (s) {
    SignedIn(:final serverUrl) => serverUrl,
    SignedOut(:final serverUrl) => serverUrl,
    _ => null,
  };

  Future<void> _switch(BuildContext context, WidgetRef ref, ServerProfile p) async {
    try {
      await ref.read(sessionProvider.notifier).switchServer(p.id);
      // Si el router se recreó (otra sesión), este contexto ya no existe.
      if (context.mounted) context.go(Routes.myDay);
    } catch (e) {
      if (context.mounted) showErrorSnack(context, e);
    }
  }

  Future<void> _remove(BuildContext context, WidgetRef ref, ServerProfile p) =>
      confirmAction(
        context,
        title: 'Quitar servidor',
        message:
            'Se cierra la sesión en este teléfono y se olvida «${p.name}». '
            'Podés volver a vincularlo con su QR.',
        confirmLabel: 'Quitar',
        danger: true,
        onConfirm: () => ref.read(sessionProvider.notifier).removeServer(p.id),
      );

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profiles = ref.watch(serverListProvider);
    final activeUrl = _activeUrl(ref.watch(sessionProvider).value);
    final c = context.colors;

    return Scaffold(
      appBar: AppBar(title: const Text('Servidores')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            WorkspaceListPanel(
              children: [
                for (final p in profiles)
                  ListTile(
                    key: ValueKey('server_${p.id}'),
                    leading: Icon(
                      p.url == activeUrl ? AppIcons.success : AppIcons.server,
                      color: p.url == activeUrl ? c.brand : c.muted,
                    ),
                    title: Text(p.name),
                    subtitle: Text(
                      p.url.toString(),
                      style: AppTextStyles.technical.copyWith(color: c.muted),
                    ),
                    trailing: IconButton(
                      key: ValueKey('server_remove_${p.id}'),
                      tooltip: 'Quitar ${p.name}',
                      icon: const Icon(AppIcons.delete),
                      onPressed: () => _remove(context, ref, p),
                    ),
                    onTap: p.url == activeUrl
                        ? () => context.canPop() ? context.pop() : context.go(Routes.myDay)
                        : () => _switch(context, ref, p),
                  ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            FilledButton.icon(
              key: const ValueKey('servers_add'),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(AppSpacing.xxxl),
              ),
              onPressed: () => context.push(Routes.addServer),
              icon: const Icon(AppIcons.qrScanner),
              label: const Text('Agregar servidor'),
            ),
          ],
        ),
      ),
    );
  }
}
```

- [ ] **Step 4: Ruta, login y cuenta**

`app_router.dart`: importar `servers_screen.dart` y agregar junto a `addServer` (la ruta hija no es necesaria; ambas son top-level):

```dart
      GoRoute(path: Routes.servers, builder: (_, _) => const ServersScreen()),
```

`login_screen.dart`: el botón «Cambiar servidor» abre la lista:

```dart
        TextButton(
          key: const ValueKey('login_change_server'),
          onPressed: _busy ? null : () => context.push(Routes.servers),
          child: const Text('Cambiar servidor'),
        ),
```
(importar `package:go_router/go_router.dart` y `../../core/router/routes.dart`).

`account_screen.dart`: debajo del tile «Servidor» agregar (visible para todos los roles):

```dart
              ListTile(
                key: const ValueKey('account_servers'),
                leading: const Icon(AppIcons.qrScanner),
                title: const Text('Servidores'),
                subtitle: Text(
                  '${ref.watch(serverListProvider).length} vinculados · cambiar o agregar',
                ),
                trailing: Icon(
                  AppIcons.chevronRight,
                  size: AppIconSizes.action,
                  color: c.muted,
                ),
                onTap: () => context.push(Routes.servers),
              ),
```

`session_controller.dart`: eliminar el método `changeServer()` (shim) con su comentario. Run `grep -rn changeServer mobile/lib mobile/test` y confirmar que no quedan referencias.

- [ ] **Step 5: Verificar**

Run: `cd mobile && dart analyze lib test && flutter test`
Expected: analyze limpio; suite completa PASS (incluida `design_tokens_guard_test.dart`).

Verificación manual: con dos servidores locales (:3010 y otro), vincular ambos, iniciar sesión en los dos, abrir Mi cuenta › Servidores y alternar: cada uno entra sin pedir login y sin mostrar datos del otro.

- [ ] **Step 6: Commit**

```bash
git add -A mobile
git commit -m "feat(mobile): lista de servidores para cambiar, agregar y quitar"
```

### Task 8 (móvil): Deep link `genwork://connect`

> **Puerta de decisión:** en Android, `flutter_web_auth_2` registra `CallbackActivity` para **todo** `genwork://*`. Un intent-filter más específico (`host="connect"`) en `MainActivity` debería ganar la resolución, pero hay que **confirmarlo en un teléfono real**. Si al abrir el QR con la cámara nativa Android abre `CallbackActivity` (la app no reacciona), **no forzar**: descartar esta tarea, dejar el QR como está (la app lo lee con el escáner interno) y avisar al usuario.

**Files:**
- Modify: `mobile/pubspec.yaml` (dependencia `app_links`)
- Modify: `mobile/android/app/src/main/AndroidManifest.xml` (intent-filter en `MainActivity`)
- Create: `mobile/lib/features/setup/connect_link_listener.dart`
- Modify: `mobile/lib/app.dart`
- Test: `mobile/test/features/connect_link_test.dart`

**Interfaces:**
- Consumes: `parseConnectPayload` (Task 3), `SessionController.addServer` (Task 4).
- Produces: `incomingLinksProvider` (Provider<Stream<Uri>>), `initialLinkProvider` (FutureProvider<Uri?>), `ConnectLinkListener({required Widget child})`.

- [ ] **Step 1: Dependencia y manifest**

Run: `cd mobile && flutter pub add app_links`

`AndroidManifest.xml`, dentro del `<activity android:name=".MainActivity">`, después del intent-filter MAIN/LAUNCHER:

```xml
            <!-- Vínculo por QR: genwork://connect?server=… (cámara nativa → app). -->
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="genwork" android:host="connect" />
            </intent-filter>
```

iOS ya declara el esquema `genwork` en `Info.plist` (`CFBundleURLTypes`); no requiere cambios.

- [ ] **Step 2: Escribir el test que falla**

`mobile/test/features/connect_link_test.dart`:

```dart
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/app.dart';
import 'package:genwork_mobile/core/auth/token_store.dart';
import 'package:genwork_mobile/core/providers.dart';
import 'package:genwork_mobile/data/repositories/auth_repository.dart';
import 'package:genwork_mobile/features/setup/connect_link_listener.dart';
import 'package:genwork_mobile/features/setup/qr_scanner_view.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _Tokens implements TokenStore {
  @override
  Future<StoredSession?> read(String id) async => null;
  @override
  Future<void> write(String id, StoredSession s) async {}
  @override
  Future<void> clear(String id) async {}
  @override
  Future<void> adoptLegacy(String id) async {}
}

class _FakeAuth extends AuthRepository {
  _FakeAuth(Uri url, this.calls) : super(serverUrl: url);
  final List<Uri> calls;
  @override
  Future<ServerInfo> checkServer() async {
    calls.add(serverUrl);
    return ServerInfo(name: 'Sistema ${serverUrl.host}');
  }
}

Future<(StreamController<Uri>, List<Uri>)> _pump(WidgetTester tester) async {
  await initializeDateFormatting('es');
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  final links = StreamController<Uri>();
  addTearDown(links.close);
  final calls = <Uri>[];
  await tester.pumpWidget(ProviderScope(
    retry: (_, _) => null,
    overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      tokenStoreProvider.overrideWithValue(_Tokens()),
      qrScannerBuilderProvider.overrideWithValue((c, onCode) => const SizedBox()),
      authRepositoryProvider.overrideWith((ref, url) => _FakeAuth(url, calls)),
      incomingLinksProvider.overrideWithValue(links.stream),
      initialLinkProvider.overrideWith((ref) async => null),
    ],
    child: const GenworkApp(),
  ));
  await tester.pumpAndSettle();
  return (links, calls);
}

void main() {
  testWidgets('un genwork://connect agrega el servidor y sigue al login', (tester) async {
    final (links, calls) = await _pump(tester);
    links.add(Uri.parse('genwork://connect?server=https%3A%2F%2Fa.test&name=A'));
    await tester.pumpAndSettle();
    expect(calls, [Uri.parse('https://a.test')]);
    expect(find.byKey(const ValueKey('login_google')), findsOneWidget);
  });

  testWidgets('ignora el callback de login y links ajenos', (tester) async {
    final (links, calls) = await _pump(tester);
    links.add(Uri.parse('genwork://auth?code=abc&state=xyz'));
    links.add(Uri.parse('https://otro.test/'));
    links.add(Uri.parse('genwork://connect')); // sin server
    await tester.pumpAndSettle();
    expect(calls, isEmpty);
    expect(find.byKey(const ValueKey('setup_manual_toggle')), findsOneWidget);
  });
}
```

- [ ] **Step 3: Verificar que falla**

Run: `cd mobile && flutter test test/features/connect_link_test.dart`
Expected: FAIL (`connect_link_listener.dart` inexistente).

- [ ] **Step 4: Implementar**

`mobile/lib/features/setup/connect_link_listener.dart`:

```dart
import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/servers/connect_payload.dart';
import '../../shared/widgets/state_views.dart';

/// Links entrantes mientras la app está abierta. Se puede reemplazar en tests.
final incomingLinksProvider = Provider<Stream<Uri>>(
  (ref) => AppLinks().uriLinkStream,
);

/// Link con el que se abrió la app (arranque en frío).
final initialLinkProvider = FutureProvider<Uri?>(
  (ref) => AppLinks().getInitialLink(),
);

/// Escucha `genwork://connect?server=…` (el QR leído con la cámara nativa) y
/// agrega ese servidor. Ignora el callback del login (`genwork://auth`) y todo
/// lo demás.
class ConnectLinkListener extends ConsumerStatefulWidget {
  const ConnectLinkListener({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<ConnectLinkListener> createState() => _ConnectLinkListenerState();
}

class _ConnectLinkListenerState extends ConsumerState<ConnectLinkListener> {
  StreamSubscription<Uri>? _sub;

  @override
  void initState() {
    super.initState();
    _sub = ref.read(incomingLinksProvider).listen(_handle);
    ref.read(initialLinkProvider.future).then((uri) {
      if (uri != null) _handle(uri);
    }, onError: (_) {});
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  Future<void> _handle(Uri uri) async {
    if (uri.scheme != 'genwork' || uri.host != 'connect') return;
    final target = parseConnectPayload(uri.toString());
    if (target == null) return;
    try {
      await ref
          .read(sessionProvider.notifier)
          .addServer(target.url.toString(), name: target.name);
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    }
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
```

En `mobile/lib/app.dart`, envolver el contenido del router:

```dart
      builder: (context, child) => ConnectLinkListener(child: child ?? const SizedBox.shrink()),
```
(parámetro `builder` de `MaterialApp.router`; importar `features/setup/connect_link_listener.dart`).

- [ ] **Step 5: Verificar**

Run: `cd mobile && dart analyze lib test && flutter test`
Expected: analyze limpio; suite PASS.

Verificación en teléfono real (puerta de decisión): generar el QR en `/settings/movil`, leerlo con la **cámara nativa** del teléfono y tocar la sugerencia. Esperado: abre genwork y entra al login del servidor. Android: confirmar además que el login con Google sigue volviendo a la app (regresión de `CallbackActivity`). Si cualquiera de las dos falla, revertir esta tarea (`git revert`) y reportarlo.

- [ ] **Step 6: Commit**

```bash
git add -A mobile
git commit -m "feat(mobile): abrir genwork://connect desde la cámara nativa"
```

### Task 9: Documentación y verificación final

**Files:**
- Modify: `mobile/README.md` (sección «Cómo funciona el ingreso»)
- Modify: `mobile/PLAN.md` (estado) si lista el flujo de URL del primer inicio

- [ ] **Step 1: Actualizar `mobile/README.md`**

Reemplazar los pasos 1 y 3 de «Cómo funciona el ingreso»:

```markdown
1. **Vincular el servidor**: en la web, **Configuración › App móvil** muestra un
   QR con la dirección del sistema (sin credenciales). La app lo escanea en el
   primer inicio (o se escribe la dirección a mano), lo valida contra
   `GET /api/auth/mobile/info` y lo guarda. El QR también abre la app si se lee
   con la cámara del teléfono (`genwork://connect?server=…`).
...
3. **Cerrar sesión** revoca el token en el servidor, solo del servidor activo.
   **Mi cuenta › Servidores** lista los sistemas vinculados: tocar uno cambia a
   ese sistema con su propia sesión (sin volver a ingresar); «Agregar servidor»
   pide otro QR; quitar uno cierra su sesión y lo olvida.
```

Y en la lista de variables/operación del servidor, mencionar `SYSTEM_NAME` (opcional: nombre que muestra la app; por defecto el host) y que `NEXTAUTH_URL` debe ser la dirección pública, porque es la que lleva el QR.

- [ ] **Step 2: Verificación completa**

Run: `cd mobile && dart analyze && flutter test` → todo PASS.
Run (raíz): `npx vitest run && npx tsc --noEmit` → todo PASS.

- [ ] **Step 3: E2E manual (checklist, con teléfono real y dos servidores)**

1. Web A (`/settings/movil`): QR visible, URL copiable, sin advertencia de local en el servidor real.
2. App recién instalada: primer inicio → escanear QR de A → login Google → entra.
3. Mi cuenta › Servidores › Agregar servidor → escanear QR de B → login → entra a B.
4. Alternar A ↔ B desde Servidores: sin pedir login, sin datos cruzados (proyectos y recordatorios de cada uno).
5. Cerrar sesión en B: A conserva su sesión; B queda guardado pidiendo login.
6. Quitar B (con confirmación): desaparece de la lista; A sigue funcionando. Quitar A: vuelve al primer inicio.
7. Actualización desde la versión anterior (con `server_url` + token guardados): tras instalar, la app abre ya logueada en ese servidor y aparece en la lista.
8. Cámara denegada: aviso claro y alta manual funcional.
9. Escanear un QR cualquiera (ej. de una URL de otra web): «No es un QR de genwork.» o error de servidor incompatible; no se agrega nada.

- [ ] **Step 4: Commit**

```bash
git add mobile/README.md mobile/PLAN.md
git commit -m "docs(mobile): flujo de vínculo por QR y multi-servidor"
```

---

## Autoevaluación del plan contra el spec

- **Web `/settings/movil` + QR + copiar + advertencia local + enlace en nav:** Tasks 1–2. **`/info.name` compatible:** Task 1.
- **Modelo `ServerProfile`/`ServerRegistry`, tokens por perfil, migración:** Tasks 3–4. **`addServer/switchServer/removeServer`, logout/401 solo al activo:** Task 4. **`changeServer` eliminado:** Task 7.
- **Escáner + manual + permisos + cámara denegada:** Task 6. **Deep link:** Task 8 (con puerta de decisión por el conflicto de `CallbackActivity`).
- **Selector (lista, cambiar, agregar, quitar con confirmación; accesible desde login y Cuenta):** Task 7. **Rutas para todos los roles, con y sin sesión:** Task 5.
- **Errores y bordes (QR inválido, duplicado, servidor no genwork, quitar activo/último):** tests en Tasks 3, 4, 6, 7.
- **Riesgo principal (mezcla de datos entre servidores):** `apiClientProvider` depende de `sessionProvider` y el router se recrea al cambiar de identidad (`app_router.dart`); el test de `switchServer` (Task 4) verifica token/URL por servidor y la verificación manual E2E (Task 9, paso 4) verifica que no se crucen datos. Si el E2E muestra datos viejos en alguna pantalla, es un provider que usa `ref.read` en vez de `ref.watch` de la sesión: arreglarlo en esa pantalla.
- **Fuera de alcance respetado:** sin permisos por servidor, sin sincronizar la lista entre dispositivos, sin credenciales en el QR.
