/**
 * template.ts — plantilla HTML de la alerta por email (FR-020).
 * Estilo visual propio: nombre, descripción, fecha y botón al vínculo si existe.
 * Inline styles (los clientes de email no respetan <style>/CSS externo).
 */

export interface ReminderEmailData {
  title: string;
  description?: string | null;
  dateLabel: string; // fecha/hora ya formateada en la tz del sistema
  timezoneLabel: string;
  linkUrl?: string | null;
  linkLabel?: string | null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Devuelve `{ subject, html }` del email de recordatorio. */
export function renderReminderEmail(data: ReminderEmailData): { subject: string; html: string } {
  const subject = `🔔 Recordatorio: ${data.title}`;
  const desc = data.description?.trim()
    ? `<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.5;">${escapeHtml(
        data.description,
      )}</p>`
    : "";
  const button =
    data.linkUrl != null
      ? `<a href="${escapeHtml(data.linkUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:600;">${escapeHtml(
          data.linkLabel || "Abrir en genwork",
        )}</a>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="es"><body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#111827;padding:16px 24px;">
      <span style="color:#ffffff;font-size:16px;font-weight:700;">genwork</span>
      <span style="color:#9ca3af;font-size:13px;"> · recordatorio</span>
    </div>
    <div style="padding:24px;">
      <h1 style="margin:0 0 12px;font-size:20px;color:#111827;">${escapeHtml(data.title)}</h1>
      ${desc}
      <p style="margin:0 0 20px;color:#6b7280;font-size:13px;">📅 ${escapeHtml(
        data.dateLabel,
      )} <span style="color:#9ca3af;">(${escapeHtml(data.timezoneLabel)})</span></p>
      ${button}
    </div>
    <div style="padding:12px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <span style="color:#9ca3af;font-size:12px;">Este aviso lo generó tu recordatorio en genwork.</span>
    </div>
  </div>
</body></html>`;

  return { subject, html };
}
