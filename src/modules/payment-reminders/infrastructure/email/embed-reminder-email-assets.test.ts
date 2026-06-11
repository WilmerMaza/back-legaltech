import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { embedReminderBrandingInHtml } from "./embed-reminder-email-assets.js";
import {
  PAYMENT_REMINDER_ICON_EMAIL_CID,
  PAYMENT_REMINDER_LOGO_CID,
} from "./payment-reminder-email-assets.js";

describe("embedReminderBrandingInHtml", () => {
  it("reemplaza URLs /brand/ por cid embebido", () => {
    const html =
      '<img src="http://localhost:4200/brand/legaltech-logo.png" alt="logo" />' +
      '<img src="/brand/icon-email.png" alt="mail" />';

    const out = embedReminderBrandingInHtml(html);

    assert.match(out, new RegExp(`cid:${PAYMENT_REMINDER_LOGO_CID}`));
    assert.match(out, new RegExp(`cid:${PAYMENT_REMINDER_ICON_EMAIL_CID}`));
    assert.doesNotMatch(out, /localhost:4200/);
  });
});
