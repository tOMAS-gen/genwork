import { PageHeader } from "@/components/ui/PageHeader";
import type { Metadata } from "next";
import { SettingsGroup, SettingsRow } from "@/components/ui/SettingsRows";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { Shield, HardDrive, Users, Tag, Layers, CheckSquare, AlertCircle, Eye, Bell, Bot, User, Globe } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Configuración" };

export default async function AdminHome() {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPERADMIN") redirect("/");

  return (
    <div className="admin-page">
      <PageHeader title="Configuración" icon="settings" />
      {/* Filas agrupadas como la app (spec 066, T41). */}
      <SettingsGroup label="Cuenta">
        <SettingsRow href="/settings" icon={User} title="Mi cuenta" subtitle="Almacenamiento vinculado, versión y estado del sistema" />
        <SettingsRow href="/settings/claude" icon={Bot} title="Vincular con Claude" subtitle="Vinculación de asistentes de IA a la cuenta vía MCP" />
      </SettingsGroup>
      <SettingsGroup label="Equipo">
        <SettingsRow href="/admin/access" icon={Shield} title="Control de acceso" subtitle="Quién puede ingresar: dominio corporativo o lista de correos" />
        <SettingsRow href="/admin/users" icon={Users} title="Usuarios y roles" subtitle="Rol Lector para pantallas/TV y grupos habilitados" />
        <SettingsRow href="/admin/clients" icon={Eye} title="Clientes" subtitle="Cuentas externas que ven el avance de sus proyectos, sin poder modificar nada" />
      </SettingsGroup>
      <SettingsGroup label="Catálogos">
        <SettingsRow href="/admin/labels" icon={Tag} title="Etiquetas" subtitle="Claves y valores de etiquetas para clasificar proyectos" />
        <SettingsRow href="/admin/stages" icon={Layers} title="Estados de producción" subtitle="Configurar las etapas de producción para los proyectos del grupo" />
        <SettingsRow href="/admin/task-statuses" icon={CheckSquare} title="Estados de tarea" subtitle="Conjunto general de estados de tarea (en curso/final) por grupo o personal" />
      </SettingsGroup>
      <SettingsGroup label="Sistema">
        <SettingsRow href="/admin/storage" icon={HardDrive} title="Almacenamiento (mini nube)" subtitle="Conexión con Nextcloud y estado del aprovisionamiento" />
        <SettingsRow href="/admin/genstock" icon={Globe} title="Integración con Genstock" subtitle="URL del server para buscar productos y materiales" />
        <SettingsRow href="/admin/reminders" icon={Bell} title="Recordatorios" subtitle="Calendario y avisos programados del grupo" />
        <SettingsRow href="/admin/errors" icon={AlertCircle} title="Errores" subtitle="Errores capturados automáticamente, listos para revisar y corregir" />
      </SettingsGroup>
    </div>
  );
}
