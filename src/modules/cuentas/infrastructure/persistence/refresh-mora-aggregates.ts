import type { Prisma } from "@prisma/client";
import { getBusinessTimeZone, getBusinessTodayYmd, formatYmdInTimeZone } from "../../domain/business-calendar.js";
import { dateToYmdUtc, resolveEdadMoraDias } from "../../domain/mora.js";

/** Recalcula columnas denormalizadas en `cuentas` a partir de `historial_pagos`. */
export async function refreshCuentaMoraAggregates(
  tx: Prisma.TransactionClient,
  cuentaId: string,
): Promise<void> {
  const [agg, cuenta, rows] = await Promise.all([
    tx.historialPago.aggregate({
      where: { cuenta_id: cuentaId, deleted_at: null },
      _max: { dias_en_mora: true, fecha_fin_cobro: true },
      _min: { fecha_inicio_cobro: true },
    }),
    tx.cuenta.findUnique({ where: { id: cuentaId } }),
    tx.historialPago.findMany({
      where: { cuenta_id: cuentaId, deleted_at: null },
      select: {
        periodo: true,
        estado_pago: true,
        fecha_pago: true,
        valor_cobrado: true,
        valor_pagado: true,
      },
    }),
  ]);

  const saldo = Number(cuenta?.monto_a_la_fecha ?? 0);
  let edad: number | null = agg._max.dias_en_mora ?? null;
  if (Number.isFinite(saldo) && saldo <= 0) {
    edad = rows.length > 0 ? 0 : null;
  } else if (cuenta?.created_at) {
    edad = resolveEdadMoraDias({
      movimientos: rows.map((row) => ({
        periodo: row.periodo,
        estado_pago: row.estado_pago,
        fecha_pago: row.fecha_pago,
        valor_cobrado: Number(row.valor_cobrado),
        valor_pagado: Number(row.valor_pagado),
      })),
      fechaInicioCobroYmd: cuenta.fecha_inicio_cobro ? dateToYmdUtc(cuenta.fecha_inicio_cobro) : null,
      createdAtYmd: formatYmdInTimeZone(cuenta.created_at, getBusinessTimeZone()),
      referenceTodayYmd: getBusinessTodayYmd(),
      saldoCuenta: saldo,
    });
  }

  await tx.cuenta.update({
    where: { id: cuentaId },
    data: {
      edad_mora_dias: edad,
      ...(agg._min.fecha_inicio_cobro != null
        ? { fecha_inicio_cobro: agg._min.fecha_inicio_cobro }
        : {}),
      ...(agg._max.fecha_fin_cobro != null ? { fecha_fin_cobro: agg._max.fecha_fin_cobro } : {}),
    },
  });
}
