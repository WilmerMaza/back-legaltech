export type PropiedadForReminder = {
  id: string;
  identificador: string;
  direccion: string | null;
  monto_a_la_fecha: number;
  cobro_nombre: string;
  cobro_email: string;
};

export type PaymentReminderEmailRecord = {
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

export type PaymentReminderEmailWithBody = PaymentReminderEmailRecord & {
  body_html: string | null;
  body_text: string | null;
};

export interface PaymentRemindersPersistencePort {
  findPropiedadForReminder(propiedadId: string): Promise<PropiedadForReminder | null>;
  createQueued(input: {
    propiedad_id: string;
    cliente_email: string;
    subject: string;
    body_html: string;
    body_text: string;
  }): Promise<PaymentReminderEmailRecord>;
  markSent(input: {
    id: string;
    provider_id: string;
    sent_at: Date;
  }): Promise<PaymentReminderEmailRecord>;
  markFailed(input: {
    id: string;
    error_message: string;
  }): Promise<PaymentReminderEmailRecord>;
  listByPropiedad(propiedadId: string, limit: number): Promise<PaymentReminderEmailWithBody[]>;
}
