import { prisma } from "../../../../shared/infrastructure/prisma/prisma.client.js";
import type {
  PaymentReminderEmailRecord,
  PaymentReminderEmailWithBody,
  PaymentRemindersPersistencePort,
  PropiedadForReminder,
} from "../../domain/ports/payment-reminders-persistence.port.js";

type PaymentReminderEmailRow = {
  id: string;
  propiedad_id: string;
  cliente_email: string;
  subject: string;
  status: string;
  provider_id: string | null;
  error_message: string | null;
  sent_at: Date | null;
  created_at: Date;
};

function mapRecord(row: PaymentReminderEmailRow): PaymentReminderEmailRecord {
  return {
    id: row.id,
    propiedad_id: row.propiedad_id,
    cliente_email: row.cliente_email,
    subject: row.subject,
    status: row.status,
    provider_id: row.provider_id,
    error_message: row.error_message,
    sent_at: row.sent_at,
    created_at: row.created_at,
  };
}

function mapRecordWithBody(
  row: PaymentReminderEmailRow & { body_html: string | null; body_text: string | null },
): PaymentReminderEmailWithBody {
  return {
    ...mapRecord(row),
    body_html: row.body_html,
    body_text: row.body_text,
  };
}

export class PaymentRemindersPrismaRepository implements PaymentRemindersPersistencePort {
  async findPropiedadForReminder(propiedadId: string): Promise<PropiedadForReminder | null> {
    const row = await prisma.propiedad.findUnique({
      where: { id: propiedadId },
      select: {
        id: true,
        identificador: true,
        direccion: true,
        monto_a_la_fecha: true,
        cobro_nombre: true,
        cobro_email: true,
      },
    });
    if (!row) return null;

    const lastHistorial = await prisma.historialPago.findFirst({
      where: { propiedad_id: propiedadId },
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
    });
    const monto_a_la_fecha =
      lastHistorial != null
        ? Number(lastHistorial.monto_a_la_fecha)
        : Number(row.monto_a_la_fecha);

    return {
      id: row.id,
      identificador: row.identificador,
      direccion: row.direccion,
      monto_a_la_fecha,
      cobro_nombre: row.cobro_nombre,
      cobro_email: row.cobro_email,
    };
  }

  async createQueued(input: {
    propiedad_id: string;
    cliente_email: string;
    subject: string;
    body_html: string;
    body_text: string;
  }): Promise<PaymentReminderEmailRecord> {
    const row = await prisma.paymentReminderEmail.create({
      data: {
        propiedad_id: input.propiedad_id,
        cliente_email: input.cliente_email,
        subject: input.subject,
        body_html: input.body_html,
        body_text: input.body_text,
        status: "queued",
      },
    });
    return mapRecord(row);
  }

  async markSent(input: {
    id: string;
    provider_id: string;
    sent_at: Date;
  }): Promise<PaymentReminderEmailRecord> {
    const row = await prisma.paymentReminderEmail.update({
      where: { id: input.id },
      data: {
        status: "sent",
        provider_id: input.provider_id,
        sent_at: input.sent_at,
        error_message: null,
      },
    });
    return mapRecord(row);
  }

  async markFailed(input: {
    id: string;
    error_message: string;
  }): Promise<PaymentReminderEmailRecord> {
    const row = await prisma.paymentReminderEmail.update({
      where: { id: input.id },
      data: {
        status: "failed",
        error_message: input.error_message,
      },
    });
    return mapRecord(row);
  }

  async listByPropiedad(
    propiedadId: string,
    limit: number,
  ): Promise<PaymentReminderEmailWithBody[]> {
    const rows = await prisma.paymentReminderEmail.findMany({
      where: { propiedad_id: propiedadId },
      orderBy: { created_at: "desc" },
      take: limit,
    });
    return rows.map(mapRecordWithBody);
  }
}
