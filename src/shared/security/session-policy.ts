const SESSION_MAX_AGE = process.env.JWT_SESSION_MAX_AGE || "1d";
const IDLE_TIMEOUT = process.env.JWT_IDLE_TIMEOUT || "30m";

const UNIT_TO_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

function parseDurationToMs(value: string, envName: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    throw new Error(`Configuracion JWT invalida: ${envName} debe usar formato como 30m, 1d`);
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier = UNIT_TO_MS[unit];

  if (!multiplier || amount <= 0) {
    throw new Error(`Configuracion JWT invalida: ${envName} debe usar formato como 30m, 1d`);
  }

  return amount * multiplier;
}

const SESSION_MAX_AGE_MS = parseDurationToMs(SESSION_MAX_AGE, "JWT_SESSION_MAX_AGE");
const IDLE_TIMEOUT_MS = parseDurationToMs(IDLE_TIMEOUT, "JWT_IDLE_TIMEOUT");

export function getSessionMaxAgeMs(): number {
  return SESSION_MAX_AGE_MS;
}

export function getIdleTimeoutMs(): number {
  return IDLE_TIMEOUT_MS;
}

export function getIdleTimeoutSeconds(): number {
  return Math.floor(IDLE_TIMEOUT_MS / 1_000);
}

export function computeSessionExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + SESSION_MAX_AGE_MS);
}

export function getIdleCutoffDate(now: Date = new Date()): Date {
  return new Date(now.getTime() - IDLE_TIMEOUT_MS);
}

export function minDate(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}
