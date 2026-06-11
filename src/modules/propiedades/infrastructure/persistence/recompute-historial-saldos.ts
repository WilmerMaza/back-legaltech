import type { Prisma } from "@prisma/client";
import { getBusinessTodayYmd } from "../../domain/business-calendar.js";
import { computeDiasEnMora } from "../../domain/mora.js";
import { refreshPropiedadMoraAggregates } from "./refresh-mora-aggregates.js";

/** Recalcula monto_a_la_fecha de cada fila y el saldo agregado de la propiedad. */
export async function recomputeHistorialSaldosForPropiedad(
  tx: Prisma.TransactionClient,
  propiedadId: string,
): Promise<void> {
  const propiedad = await tx.propiedad.findUnique({ where: { id: propiedadId } });
  if (!propiedad) return;

  const rows = await tx.historialPago.findMany({
    where: { propiedad_id: propiedadId },
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
  });

  if (rows.length === 0) {
    await tx.propiedad.update({
      where: { id: propiedadId },
      data: { monto_a_la_fecha: 0 },
    });
    await refreshPropiedadMoraAggregates(tx, propiedadId);
    return;
  }

  const first = rows[0]!;
  let saldoAnterior =
    Number(first.monto_a_la_fecha) - Number(first.valor_cobrado) + Number(first.valor_pagado);

  const referenceTodayYmd = getBusinessTodayYmd();

  for (const row of rows) {
    const saldoNuevo = saldoAnterior + Number(row.valor_cobrado) - Number(row.valor_pagado);
    const diasEnMora = computeDiasEnMora({
      periodo: row.periodo,
      estado_pago: row.estado_pago,
      fecha_pago: row.fecha_pago,
      referenceTodayYmd,
    });

    await tx.historialPago.update({
      where: { id: row.id },
      data: {
        monto_a_la_fecha: saldoNuevo,
        dias_en_mora: diasEnMora,
      },
    });

    saldoAnterior = saldoNuevo;
  }

  await tx.propiedad.update({
    where: { id: propiedadId },
    data: { monto_a_la_fecha: saldoAnterior },
  });

  await refreshPropiedadMoraAggregates(tx, propiedadId);
}
