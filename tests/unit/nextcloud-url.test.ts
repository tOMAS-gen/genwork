import { describe, it, expect } from "vitest";

/**
 * Replica el cálculo de nextcloudUrl usado en
 * src/app/api/works/[id]/files/route.ts, para validar el patrón de URL
 * sin depender del wrapper de auth ni de la base de datos.
 */
function buildNextcloudUrl(nextcloudUrlEnv: string | undefined, dir: string): string | null {
  const ncUrl = nextcloudUrlEnv?.replace(/\/$/, "") ?? "";
  return ncUrl ? `${ncUrl}/apps/files/?dir=${encodeURIComponent(dir)}` : null;
}

describe("nextcloud URL — construcción del link a la carpeta", () => {
  it("genera la URL correcta para un path simple", () => {
    const url = buildNextcloudUrl("http://localhost:8080", "/genwork/Grupo/001-Test");
    expect(url).toBe("http://localhost:8080/apps/files/?dir=%2Fgenwork%2FGrupo%2F001-Test");
  });

  it("quita la barra final de NEXTCLOUD_URL antes de concatenar", () => {
    const url = buildNextcloudUrl("http://localhost:8080/", "/genwork/Grupo/001-Test");
    expect(url).toBe("http://localhost:8080/apps/files/?dir=%2Fgenwork%2FGrupo%2F001-Test");
  });

  it("encodea espacios y caracteres especiales del path", () => {
    const url = buildNextcloudUrl("http://localhost:8080", "/genwork/Grupo/005-Mi Proyecto");
    expect(url).toBe("http://localhost:8080/apps/files/?dir=%2Fgenwork%2FGrupo%2F005-Mi%20Proyecto");
  });

  it("encodea arroba y punto en espacios personales", () => {
    const url = buildNextcloudUrl(
      "http://localhost:8080",
      "/genwork-personal/user@mail.com/001-Test",
    );
    expect(url).toBe(
      "http://localhost:8080/apps/files/?dir=%2Fgenwork-personal%2Fuser%40mail.com%2F001-Test",
    );
  });

  it("devuelve null si no hay NEXTCLOUD_URL configurada", () => {
    const url = buildNextcloudUrl(undefined, "/genwork/Grupo/001-Test");
    expect(url).toBeNull();
  });

  it("soporta subpaths anidados dentro de la carpeta", () => {
    const url = buildNextcloudUrl(
      "https://nube.example.com",
      "/genwork/Grupo/001-Test/subcarpeta",
    );
    expect(url).toBe(
      "https://nube.example.com/apps/files/?dir=%2Fgenwork%2FGrupo%2F001-Test%2Fsubcarpeta",
    );
  });
});
