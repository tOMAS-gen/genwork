import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { SettingsGroup, SettingsRow } from "@/components/ui/SettingsRows";
import { User } from "@/components/ui/icons";

// T41 (spec 066): filas de ajuste agrupadas, campo y vacío como la app.
describe("filas de ajuste", () => {
  it("grupo con rótulo y fila que navega con chevron", () => {
    const html = renderToString(
      <SettingsGroup label="Cuenta">
        <SettingsRow href="/settings" icon={User} title="Mi cuenta" subtitle="Una línea" />
      </SettingsGroup>,
    );
    expect(html).toContain('class="settings-group-label">Cuenta</h2>');
    expect(html).toContain('href="/settings"');
    expect(html).toContain("settings-row-chevron");
    expect(html).toContain('class="settings-row-subtitle">Una línea</span>');
  });

  it("Configuración arma los cuatro grupos de la app", () => {
    const page = readFileSync("src/app/(main)/admin/page.tsx", "utf8");
    for (const label of ["Cuenta", "Equipo", "Catálogos", "Sistema"]) {
      expect(page).toContain(`<SettingsGroup label="${label}">`);
    }
    expect(page).not.toContain("card-grid");
  });

  it("rótulo de campo y vacío con la receta de la app", () => {
    const t41 = readFileSync("src/app/globals.css", "utf8").split("Spec 066, T41")[1];
    expect(t41).toMatch(/\.settings-row \{[^}]*min-height: 56px;/);
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toMatch(/\.field-label \{\s*font-size: 12px;\s*font-weight: 600;\s*color: var\(--muted\);/);
    expect(css).toMatch(/\.empty-state-title \{\s*font-size: 15px;/);
  });

  it("las acciones de fila van en el «⋯», no a la vista", () => {
    const clients = readFileSync("src/app/(main)/admin/clients/page.tsx", "utf8");
    expect(clients).toContain('label: "Dar de baja"');
    expect(clients).not.toContain("Trash2");
    const statuses = readFileSync("src/components/admin/TaskStatusSettings.tsx", "utf8");
    expect(statuses).toMatch(/<Menu[\s\S]*label: "Eliminar"/);
    expect(statuses).not.toContain("ArrowUp");
  });
});
