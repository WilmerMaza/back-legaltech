import {
  PAYMENT_REMINDER_ICON_EMAIL_CID,
  PAYMENT_REMINDER_ICON_INSTAGRAM_CID,
  PAYMENT_REMINDER_ICON_PHONE_CID,
  PAYMENT_REMINDER_LOGO_CID,
} from "./payment-reminder-email-assets.js";

/** Reemplaza URLs /brand/ o localhost por referencias CID embebidas en el HTML del admin. */
export function embedReminderBrandingInHtml(html: string): string {
  const rules: Array<{ pattern: RegExp; cid: string }> = [
    { pattern: /legaltech-logo\.png/i, cid: PAYMENT_REMINDER_LOGO_CID },
    { pattern: /icon-telefono\.png/i, cid: PAYMENT_REMINDER_ICON_PHONE_CID },
    { pattern: /icon-email\.png/i, cid: PAYMENT_REMINDER_ICON_EMAIL_CID },
    { pattern: /icon-instagram\.png/i, cid: PAYMENT_REMINDER_ICON_INSTAGRAM_CID },
  ];

  return html.replace(/src=(["'])([^"']+)\1/gi, (full, quote: string, src: string) => {
    for (const rule of rules) {
      if (rule.pattern.test(src)) {
        return `src=${quote}cid:${rule.cid}${quote}`;
      }
    }
    return full;
  });
}
