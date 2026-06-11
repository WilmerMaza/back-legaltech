import { ApiError } from "../../../../shared/http/error-handler.js";
import { getGmailFromAddress } from "../../../../shared/infrastructure/email/gmail-transport.js";
import { assertSafeReminderEmailBody } from "../../domain/validate-email-body.js";
import type { EmailSenderPort, SendEmailAttachment } from "../../domain/ports/email-sender.port.js";
import type { PaymentRemindersPersistencePort } from "../../domain/ports/payment-reminders-persistence.port.js";
import { embedReminderBrandingInHtml } from "../../infrastructure/email/embed-reminder-email-assets.js";
import { getPaymentReminderEmailAttachments } from "../../infrastructure/email/payment-reminder-email-assets.js";

function mergeRecipients(primary: string, extras?: string[]): string {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const raw of [primary, ...(extras ?? [])]) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(trimmed);
  }
  return list.join(", ");
}

export class SendPaymentReminderEmailUseCase {
  constructor(
    private readonly deps: {
      persistence: PaymentRemindersPersistencePort;
      emailSender: EmailSenderPort;
    },
  ) {}

  async execute(input: {
    propiedad_id: string;
    subject?: string;
    extra_recipients?: string[];
    body_html: string;
    body_text: string;
    attachments?: {
      filename: string;
      content: Buffer;
      contentType?: string;
    }[];
  }) {
    assertSafeReminderEmailBody(input.body_html);

    const propiedad = await this.deps.persistence.findPropiedadForReminder(input.propiedad_id);
    if (!propiedad) {
      throw new ApiError(404, "NOT_FOUND", "Propiedad no encontrada");
    }

    if (propiedad.monto_a_la_fecha <= 0) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "La propiedad no tiene saldo pendiente para recordatorio",
      );
    }

    const to = propiedad.cobro_email.trim();
    if (!to) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "La propiedad no tiene un email de cobro válido",
      );
    }

    const subject =
      input.subject?.trim() || `Recordatorio de pago - ${propiedad.identificador}`;
    const recipients = mergeRecipients(to, input.extra_recipients);
    const html = embedReminderBrandingInHtml(input.body_html);

    const log = await this.deps.persistence.createQueued({
      propiedad_id: propiedad.id,
      cliente_email: recipients,
      subject,
      body_html: html,
      body_text: input.body_text,
    });

    const brandedAttachments: SendEmailAttachment[] = getPaymentReminderEmailAttachments().map(
      (file) => ({
        filename: file.filename,
        content: file.content,
        cid: file.cid,
        contentDisposition: "inline" as const,
      }),
    );

    const userAttachments: SendEmailAttachment[] =
      input.attachments?.map((file) => ({
        filename: file.filename,
        content: file.content,
        contentType: file.contentType,
        contentDisposition: "attachment" as const,
      })) ?? [];

    try {
      const sent = await this.deps.emailSender.send({
        from: getGmailFromAddress(),
        to: recipients,
        subject,
        html,
        text: input.body_text,
        attachments: [...brandedAttachments, ...userAttachments],
      });

      return await this.deps.persistence.markSent({
        id: log.id,
        provider_id: sent.provider_id,
        sent_at: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al enviar correo";
      await this.deps.persistence.markFailed({
        id: log.id,
        error_message: message,
      });
      throw error;
    }
  }
}
