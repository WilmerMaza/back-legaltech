import type { EstadoPago } from "./ports/cuentas-persistence.port.js";

/**
 * Regla de negocio de edad en mora (fuente de verdad).
 *
 * - El periodo `YYYY-MM` debe pagarse dentro de ese mes, a más tardar el día 30
 *   (si el mes tiene menos de 30 días, el último día del mes: febrero).
 * - Si no paga, el día 1 del mes siguiente ese periodo ya tiene 30 días de mora
 *   (mes comercial de 30 días) y sigue sumando.
 * - La mora de un movimiento se cierra solo si el cargo quedó cubierto
 *   (`valor_pagado` >= `valor_cobrado`) y el estado es `pagado`.
 *   Un abono parcial sigue contando hasta hoy, aunque el estado diga `pagado`.
 * - Obligación cubierta con `fecha_pago`: el cómputo cierra ese día.
 * - Obligación cubierta sin `fecha_pago` → 0 (dato incompleto).
 * - Cargo aún abierto (`pendiente` / `parcial` / `vencido`, o abono incompleto)
 *   → hasta `referenceTodayYmd` (America/Bogota).
 */
export type ComputeDiasEnMoraInput = {
  periodo: string;
  estado_pago: EstadoPago;
  fecha_pago: Date | null;
  /** YYYY-MM-DD en zona de negocio; inyectable en tests. */
  referenceTodayYmd: string;
  valor_cobrado?: number | null;
  valor_pagado?: number | null;
};

export type MovimientoMora = {
  periodo: string;
  estado_pago: EstadoPago;
  fecha_pago: Date | null;
  valor_cobrado?: number | null;
  valor_pagado?: number | null;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function parsePeriodo(periodo: string): { year: number; month: number } {
  const m = periodo.match(/^(\d{4})-(\d{2})$/);
  if (!m) throw new Error(`periodo invalido: ${periodo}`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) throw new Error(`periodo invalido: ${periodo}`);
  return { year, month };
}

function parseYmd(ymd: string): { year: number; month: number; day: number } {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error(`fecha invalida: ${ymd}`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

/** Último día del mes del periodo YYYY-MM, como YYYY-MM-DD (UTC civil). */
export function lastDayYmdOfPeriod(periodo: string): string {
  const { year, month } = parsePeriodo(periodo);
  const last = new Date(Date.UTC(year, month, 0));
  const d = last.getUTCDate();
  return `${year}-${pad2(month)}-${pad2(d)}`;
}

/**
 * Plazo de pago: día 30 del mes del periodo.
 * Si el mes no tiene día 30 (febrero), vence el último día del mes.
 */
export function dueYmdOfPeriod(periodo: string): string {
  const last = lastDayYmdOfPeriod(periodo);
  const { year, month } = parsePeriodo(periodo);
  const lastDay = Number(last.slice(8, 10));
  return `${year}-${pad2(month)}-${pad2(Math.min(30, lastDay))}`;
}

export function addDaysToYmd(ymd: string, deltaDays: number): string {
  const [ys, ms, ds] = ymd.split("-").map(Number);
  const t = Date.UTC(ys, ms - 1, ds + deltaDays, 12, 0, 0);
  const dt = new Date(t);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

export function compareYmd(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** Fecha almacenada @db.Date → YYYY-MM-DD en UTC (componentes UTC del instante). */
export function dateToYmdUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Días inclusivos entre dos YYYY-MM-DD; si fin < inicio → 0. */
export function inclusiveCalendarDays(startYmd: string, endYmd: string): number {
  if (compareYmd(endYmd, startYmd) < 0) return 0;
  const [ys, ms, ds] = startYmd.split("-").map(Number);
  const [ye, me, de] = endYmd.split("-").map(Number);
  const s = Date.UTC(ys, ms - 1, ds, 12, 0, 0);
  const e = Date.UTC(ye, me - 1, de, 12, 0, 0);
  const diff = Math.round((e - s) / 86400000);
  return diff + 1;
}

/** Primer día calendario posterior al plazo (día 30 o último día del mes). */
export function moraStartYmdForPeriod(periodo: string): string {
  return addDaysToYmd(dueYmdOfPeriod(periodo), 1);
}

/**
 * Meses comerciales de 30 días desde una fecha de plazo (día 30 del periodo, o
 * fecha de inicio de cobro / alta de la cuenta si no hay historial).
 * El 1 del mes siguiente = 30 días; en el mismo mes, días posteriores al plazo.
 */
export function commercialMoraDaysFromDue(dueYmd: string, endYmd: string): number {
  if (compareYmd(endYmd, dueYmd) <= 0) return 0;

  const due = parseYmd(dueYmd);
  const end = parseYmd(endYmd);
  const monthDiff = end.year * 12 + end.month - (due.year * 12 + due.month);

  if (monthDiff <= 0) {
    return Math.max(0, end.day - due.day);
  }

  return monthDiff * 30 + (end.day - 1);
}

export function commercialMoraDays(periodo: string, endYmd: string): number {
  return commercialMoraDaysFromDue(dueYmdOfPeriod(periodo), endYmd);
}

/**
 * El cargo sigue abierto si no está cubierto. Sin montos, solo `pagado` cierra la mora.
 * Un abono (`valor_pagado` < `valor_cobrado`) no cierra la mora aunque el estado sea `pagado`.
 */
export function movimientoSigueEnMora(input: {
  estado_pago: EstadoPago;
  valor_cobrado?: number | null;
  valor_pagado?: number | null;
}): boolean {
  const tieneMontos = input.valor_cobrado != null || input.valor_pagado != null;
  if (!tieneMontos) return input.estado_pago !== "pagado";

  const cobrado = Number(input.valor_cobrado ?? 0);
  const pagado = Number(input.valor_pagado ?? 0);
  if (Number.isFinite(cobrado) && Number.isFinite(pagado) && cobrado > pagado) return true;
  if (input.estado_pago === "pagado") return false;
  if (cobrado > 0 && pagado >= cobrado) return false;
  return true;
}

export function computeDiasEnMora(input: ComputeDiasEnMoraInput): number {
  const sigue = movimientoSigueEnMora(input);
  if (!sigue) {
    if (!input.fecha_pago) return 0;
    return commercialMoraDays(input.periodo, dateToYmdUtc(input.fecha_pago));
  }

  return commercialMoraDays(input.periodo, input.referenceTodayYmd);
}

/** Edad de mora de la cuenta: máximo de días entre movimientos activos. */
export function maxEdadMoraDias(
  movimientos: MovimientoMora[],
  referenceTodayYmd: string,
): number | null {
  if (!movimientos.length) return null;
  let max: number | null = null;
  for (const m of movimientos) {
    const dias = computeDiasEnMora({
      periodo: m.periodo,
      estado_pago: m.estado_pago,
      fecha_pago: m.fecha_pago,
      valor_cobrado: m.valor_cobrado,
      valor_pagado: m.valor_pagado,
      referenceTodayYmd,
    });
    max = max === null ? dias : Math.max(max, dias);
  }
  return max;
}

function oldestPeriodDueYmd(movimientos: MovimientoMora[]): string | null {
  let oldest: string | null = null;
  for (const m of movimientos) {
    if (!/^\d{4}-\d{2}$/.test(m.periodo)) continue;
    if (oldest == null || m.periodo < oldest) oldest = m.periodo;
  }
  return oldest ? dueYmdOfPeriod(oldest) : null;
}

/**
 * Sin historial: usa inicio de cobro o, si no hay, el alta de la cuenta como plazo.
 * Con historial y saldo pendiente: MAX de periodos aún abiertos (un abono no la borra).
 * Con historial y deuda en 0: 0 días (cuenta saldada; no conserva la mora histórica).
 */
export function resolveEdadMoraDias(input: {
  movimientos: MovimientoMora[];
  fechaInicioCobroYmd: string | null;
  createdAtYmd: string;
  referenceTodayYmd: string;
  /** Saldo de la cuenta. Si se omite, se conserva el máximo histórico. */
  saldoCuenta?: number | null;
}): number | null {
  const saldo =
    input.saldoCuenta == null || !Number.isFinite(Number(input.saldoCuenta))
      ? null
      : Number(input.saldoCuenta);

  if (saldo != null && saldo <= 0 && input.movimientos.length > 0) return 0;

  const fromHist = maxEdadMoraDias(input.movimientos, input.referenceTodayYmd);
  if (saldo != null && saldo > 0 && (fromHist == null || fromHist === 0)) {
    const hayAbierta = input.movimientos.some((m) => movimientoSigueEnMora(m));
    if (!hayAbierta) {
      const dueYmd = input.fechaInicioCobroYmd || oldestPeriodDueYmd(input.movimientos);
      if (dueYmd) return commercialMoraDaysFromDue(dueYmd, input.referenceTodayYmd);
    }
  }
  if (fromHist != null) return fromHist;
  const dueYmd = input.fechaInicioCobroYmd || input.createdAtYmd;
  if (!dueYmd) return null;
  return commercialMoraDaysFromDue(dueYmd, input.referenceTodayYmd);
}
