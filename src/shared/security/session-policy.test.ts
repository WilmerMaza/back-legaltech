import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeSessionExpiresAt,
  getIdleCutoffDate,
  getIdleTimeoutSeconds,
  getSessionMaxAgeMs,
  minDate,
} from "./session-policy.js";

describe("session-policy", () => {
  it("expone duraciones por defecto de 1d y 30m", () => {
    assert.equal(getSessionMaxAgeMs(), 86_400_000);
    assert.equal(getIdleTimeoutSeconds(), 1_800);
  });

  it("computeSessionExpiresAt suma el tope absoluto", () => {
    const from = new Date("2026-06-09T10:00:00.000Z");
    const expiresAt = computeSessionExpiresAt(from);
    assert.equal(expiresAt.toISOString(), "2026-06-10T10:00:00.000Z");
  });

  it("getIdleCutoffDate resta la ventana de inactividad", () => {
    const now = new Date("2026-06-09T10:30:00.000Z");
    const cutoff = getIdleCutoffDate(now);
    assert.equal(cutoff.toISOString(), "2026-06-09T10:00:00.000Z");
  });

  it("minDate devuelve la fecha mas temprana", () => {
    const earlier = new Date("2026-06-09T10:00:00.000Z");
    const later = new Date("2026-06-10T10:00:00.000Z");
    assert.equal(minDate(earlier, later).toISOString(), earlier.toISOString());
    assert.equal(minDate(later, earlier).toISOString(), earlier.toISOString());
  });
});
