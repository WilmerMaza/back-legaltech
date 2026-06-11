export {
  PAYMENT_REMINDER_LOGO_CID,
  PAYMENT_REMINDER_ICON_PHONE_CID,
  PAYMENT_REMINDER_ICON_EMAIL_CID,
  PAYMENT_REMINDER_ICON_INSTAGRAM_CID,
  getPaymentReminderEmailAttachments,
} from "./payment-reminder-email-assets.js";

import { getPaymentReminderEmailAttachments } from "./payment-reminder-email-assets.js";

/** @deprecated Usa getPaymentReminderEmailAttachments(). */
export function getPaymentReminderLogoAttachment() {
  return getPaymentReminderEmailAttachments()[0];
}
