import { ApiError } from "../../../shared/http/error-handler.js";

export function assertSafeReminderEmailBody(html: string): void {
  if (/<script\b/i.test(html) || /javascript:/i.test(html)) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "El HTML del correo contiene contenido no permitido",
    );
  }
}
