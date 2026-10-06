import type { TipoAlertaTutela } from "../../domain/alerta-tutela.js";

export type TutelaAlertaItem = {
  tipo: TipoAlertaTutela;
  radicado: string | null;
  juzgado: string | null;
  accionante: string;
  accionado: string;
  derecho: string;
  etapa_label: string;
  vencimiento: string;
  cliente_nombre: string | null;
  nota: string | null;
};

export type TutelaAlertaLink = {
  label: string;
  url: string;
};

export type TutelaAlertaEmailInput = {
  hoy: string;
  items: TutelaAlertaItem[];
  logo_cid: string;
  tutelas_links: TutelaAlertaLink[];
};

const BRAND = "#611374";
const MAX_FILAS = 15;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDmy(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

function ellipsize(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

export function withFiltroVencidas(url: string, hayVencidas: boolean): string {
  if (!hayVencidas) return url;
  const join = url.includes("?") ? "&" : "?";
  return `${url}${join}filtro=vencidas`;
}

function ctaButton(href: string, label: string, primary: boolean): string {
  const style = primary
    ? `display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;border-radius:4px;padding:12px 20px;font-size:13px;font-weight:700;letter-spacing:0.02em;font-family:Arial,Helvetica,sans-serif;`
    : `display:inline-block;background:#ffffff;color:${BRAND};text-decoration:none;border:1px solid ${BRAND};border-radius:4px;padding:11px 20px;font-size:13px;font-weight:700;letter-spacing:0.02em;font-family:Arial,Helvetica,sans-serif;`;
  return `<a href="${escapeHtml(href)}" style="${style}">${escapeHtml(label)}</a>`;
}

function badge(tipo: TipoAlertaTutela): string {
  if (tipo === "vencida") {
    return `<span style="display:inline-block;background:#fde8e8;color:#9b1c1c;border:1px solid #f5c2c2;border-radius:3px;padding:2px 7px;font-size:10px;font-weight:700;letter-spacing:0.04em;">VENCIDA</span>`;
  }
  return `<span style="display:inline-block;background:#fff7e6;color:#92400e;border:1px solid #f3d19e;border-radius:3px;padding:2px 7px;font-size:10px;font-weight:700;letter-spacing:0.04em;">POR VENCER</span>`;
}

function sortItems(items: TutelaAlertaItem[]): TutelaAlertaItem[] {
  return [...items].sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === "vencida" ? -1 : 1;
    return a.vencimiento.localeCompare(b.vencimiento);
  });
}

function fila(item: TutelaAlertaItem, zebra: boolean): string {
  const bg = zebra ? "#faf8fb" : "#ffffff";
  const radicado = escapeHtml(item.radicado?.trim() || "Sin radicado");
  const partes = escapeHtml(
    ellipsize(`${item.accionante} c/ ${item.accionado}`, 42),
  );
  const nota = item.nota?.trim()
    ? escapeHtml(item.nota.trim()).replaceAll("\n", "<br />")
    : `<span style="color:#aaaaaa;">—</span>`;
  return `<tr>
    <td style="padding:10px 8px 10px 12px;border-bottom:1px solid #ece6f0;background:${bg};white-space:nowrap;">${badge(item.tipo)}</td>
    <td style="padding:10px 8px;border-bottom:1px solid #ece6f0;background:${bg};font-size:13px;color:#1a1520;font-family:Arial,Helvetica,sans-serif;">${radicado}</td>
    <td style="padding:10px 8px;border-bottom:1px solid #ece6f0;background:${bg};font-size:13px;color:#444444;font-family:Arial,Helvetica,sans-serif;">${partes}</td>
    <td style="padding:10px 8px;border-bottom:1px solid #ece6f0;background:${bg};font-size:12px;line-height:1.45;color:#444444;word-break:break-word;font-family:Arial,Helvetica,sans-serif;">${nota}</td>
    <td style="padding:10px 12px 10px 8px;border-bottom:1px solid #ece6f0;background:${bg};font-size:13px;color:#1a1520;white-space:nowrap;text-align:right;font-family:Arial,Helvetica,sans-serif;">${formatDmy(item.vencimiento)}</td>
  </tr>`;
}

export function buildTutelaAlertaEmail(input: TutelaAlertaEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const ordered = sortItems(input.items);
  const vencidas = ordered.filter((i) => i.tipo === "vencida").length;
  const porVencer = ordered.filter((i) => i.tipo === "por_vencer").length;
  const resumen = [
    vencidas ? `${vencidas} vencida${vencidas === 1 ? "" : "s"}` : null,
    porVencer ? `${porVencer} por vencer` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const subject = `Alerta interna de tutelas (${resumen})`;
  const visible = ordered.slice(0, MAX_FILAS);
  const ocultas = ordered.length - visible.length;
  const hayVencidas = vencidas > 0;
  const links = input.tutelas_links.map((link) => ({
    label: link.label,
    url: withFiltroVencidas(link.url, hayVencidas),
  }));

  const intro =
    vencidas > 0
      ? `Se identificaron <strong>${vencidas}</strong> tutela${vencidas === 1 ? "" : "s"} con término vencido${
          porVencer ? ` y <strong>${porVencer}</strong> por vencer` : ""
        }. A continuación el listado para gestión interna; las vencidas van primero.`
      : `Se identificaron <strong>${porVencer}</strong> tutela${porVencer === 1 ? "" : "s"} con término próximo a vencer. A continuación el listado para gestión interna.`;

  const tabla = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid #e4dcea;margin:0 0 18px;">
    <tr>
      <th align="left" style="padding:9px 8px 9px 12px;background:${BRAND};color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Estado</th>
      <th align="left" style="padding:9px 8px;background:${BRAND};color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Radicado</th>
      <th align="left" style="padding:9px 8px;background:${BRAND};color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Partes</th>
      <th align="left" style="padding:9px 8px;background:${BRAND};color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Nota</th>
      <th align="right" style="padding:9px 12px 9px 8px;background:${BRAND};color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Vence</th>
    </tr>
    ${visible.map((item, i) => fila(item, i % 2 === 1)).join("")}
  </table>`;

  const resto = ocultas
    ? `<p style="margin:0 0 16px;font-size:13px;color:#666666;font-family:Arial,Helvetica,sans-serif;">Y ${ocultas} expediente${ocultas === 1 ? "" : "s"} más en LegalTech.</p>`
    : "";

  const cta = links.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:8px 0 4px;">${links
        .map(
          (link, i) =>
            `<tr><td style="padding:0 0 10px 0;">${ctaButton(link.url, link.label, i === 0)}</td></tr>`,
        )
        .join("")}</table>`
    : "";

  const year = new Date().getFullYear();
  const html = `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;width:100%;background-color:#ececec;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(`Términos de tutela · ${resumen}`)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ececec" style="background-color:#ececec;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:16px 8px;">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:640px;background-color:#ffffff;border-collapse:collapse;border:1px solid #dddddd;">
          <tr>
            <td style="background:${BRAND};padding:24px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td valign="middle" width="58" style="padding-right:14px;">
                    <img src="cid:${input.logo_cid}" alt="LegalTech" width="48" height="48" style="display:block;width:48px;height:48px;border:0;border-radius:10px;" />
                  </td>
                  <td valign="middle">
                    <p style="margin:0;font-size:20px;line-height:1.2;font-weight:700;color:#ffffff;font-family:Segoe UI,Helvetica,Arial,sans-serif;">LegalTech</p>
                    <p style="margin:5px 0 0;font-size:12px;line-height:1.4;color:rgba(255,255,255,0.9);font-family:Segoe UI,Helvetica,Arial,sans-serif;">Acciones de tutela · uso interno</p>
                  </td>
                  <td valign="middle" align="right">
                    <p style="margin:0;font-size:13px;line-height:1.4;color:rgba(255,255,255,0.95);font-family:Segoe UI,Helvetica,Arial,sans-serif;">${formatDmy(input.hoy)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#333333;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND};">Alerta de términos</p>
              <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;font-weight:700;color:#1a1520;">Términos de tutela pendientes de revisión</h1>
              <p style="margin:0 0 18px;font-size:14px;line-height:1.55;color:#444444;">${intro}</p>
              ${tabla}
              ${resto}
              ${cta}
              <p style="margin:8px 0 0;font-size:12px;line-height:1.45;color:#888888;">Comunicación automática de uso interno. No se envía a clientes ni a contrapartes.</p>
            </td>
          </tr>
          <tr>
            <td style="background:${BRAND};padding:16px 28px;">
              <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.04em;color:#ffffff;font-family:Segoe UI,Helvetica,Arial,sans-serif;">LEGALTECH</p>
              <p style="margin:3px 0 0;font-size:10px;letter-spacing:0.1em;color:#ffffff;font-family:Segoe UI,Helvetica,Arial,sans-serif;">ABOGADOS DIGITALES</p>
              <p style="margin:8px 0 0;font-size:11px;color:rgba(255,255,255,0.9);font-family:Arial,Helvetica,sans-serif;">
                <a href="https://abogadosdigitales.com.co/" style="color:#eeacff;text-decoration:underline;">abogadosdigitales.com.co</a>
                &nbsp;·&nbsp;© ${year} LegalTech
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    "LEGALTECH — Acciones de tutela (uso interno)",
    `Alerta de términos · ${formatDmy(input.hoy)}`,
    "",
    intro.replaceAll(/<\/?strong>/g, ""),
    "",
    ...visible.map(
      (item) =>
        `- ${item.tipo === "vencida" ? "VENCIDA" : "POR VENCER"} · ${item.radicado || "Sin radicado"} · ${item.accionante} c/ ${item.accionado} · vence ${formatDmy(item.vencimiento)}${item.nota?.trim() ? ` · Nota: ${item.nota.trim()}` : ""}`,
    ),
    ocultas ? `Y ${ocultas} expedientes más en LegalTech.` : "",
    ...links.map((link) => `${link.label}: ${link.url}`),
    "",
    "Comunicación automática de uso interno. No se envía a clientes ni a contrapartes.",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
