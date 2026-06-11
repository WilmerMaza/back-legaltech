import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { ApiError } from "../../http/error-handler.js";

let cached: Transporter | null = null;

/** Dirección visible permitida (alias). Nunca expongas GMAIL_USER al cliente. */
export function getGmailFromEmail(): string {
  const from = process.env.GMAIL_FROM?.trim() || process.env.GMAIL_USER?.trim();
  if (!from) {
    throw new Error("GMAIL_FROM o GMAIL_USER debe estar configurado como remitente visible");
  }
  return from;
}

export type OutboundFromOverride = {
  /** Debe coincidir con GMAIL_FROM del servidor (lista blanca). */
  from_email?: string;
  from_name?: string;
};

/**
 * Arma el header From. El front puede enviar from_name/from_email;
 * el servidor solo acepta el email configurado en GMAIL_FROM.
 */
export function resolveOutboundFrom(override?: OutboundFromOverride): string {
  const allowedEmail = getGmailFromEmail().toLowerCase();
  const requestedEmail = override?.from_email?.trim().toLowerCase();

  if (requestedEmail && requestedEmail !== allowedEmail) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "from_email no autorizado; use el remitente configurado para cartera",
    );
  }

  const name =
    override?.from_name?.trim() ||
    process.env.GMAIL_FROM_NAME?.trim() ||
    "notificaciones-cartera-abogadosdigitales";

  return `"${name}" <${allowedEmail}>`;
}

/** @deprecated Usa resolveOutboundFrom() para soportar overrides del API. */
export function getGmailFromAddress(): string {
  return resolveOutboundFrom();
}

export function createGmailTransporter(): Transporter {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_PASS?.trim().replace(/\s+/g, "");
  if (!user || !pass) {
    throw new Error("GMAIL_USER y GMAIL_PASS son requeridos para enviar correos");
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user, pass },
  });
}

export function getGmailTransporter(): Transporter {
  if (!cached) {
    cached = createGmailTransporter();
  }
  return cached;
}

export function resetGmailTransporterForTests() {
  cached = null;
}
