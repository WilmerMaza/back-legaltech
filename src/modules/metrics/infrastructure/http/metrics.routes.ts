import { Router } from "express";
import { prisma } from "../../../../shared/infrastructure/prisma/prisma.client.js";
import { requireAuth, requireStaff } from "../../../../shared/security/auth.middleware.js";

export const metricsRouter = Router();
metricsRouter.use(requireAuth, requireStaff());

metricsRouter.get("/dashboard", async (_req, res, next) => {
  try {
    const [totalAgg, recogidoAgg, clientesActivos, procesosLegalesActivos] = await Promise.all([
      prisma.cuenta.aggregate({ _sum: { monto_a_la_fecha: true } }),
      prisma.historialPago.aggregate({
        where: { deleted_at: null },
        _sum: { valor_pagado: true },
      }),
      prisma.cliente.count({ where: { is_active: true } }),
      prisma.procesoLegal.count({ where: { estado: "activa", deleted_at: null } }),
    ]);

    res.json({
      total_cartera: Number(totalAgg._sum.monto_a_la_fecha ?? 0),
      total_recogido: Number(recogidoAgg._sum.valor_pagado ?? 0),
      clientes_activos: clientesActivos,
      procesos_legales_activos: procesosLegalesActivos,
    });
  } catch (error) {
    next(error);
  }
});

metricsRouter.get("/abonos-por-cliente", async (_req, res, next) => {
  try {
    const grouped = await prisma.historialPago.groupBy({
      by: ["cuenta_id"],
      where: { deleted_at: null },
      _sum: { valor_pagado: true },
    });
    const cuentaIds = grouped.map((row) => row.cuenta_id);
    const cuentas = cuentaIds.length
      ? await prisma.cuenta.findMany({
          where: { id: { in: cuentaIds } },
          select: { id: true, cliente_id: true, cliente: { select: { nombre: true } } },
        })
      : [];
    const porCuenta = new Map(cuentas.map((cuenta) => [cuenta.id, cuenta]));
    const porCliente = new Map<string, { cliente_id: string; nombre: string; abono: number }>();

    for (const row of grouped) {
      const abono = Number(row._sum.valor_pagado ?? 0);
      if (!(abono > 0)) continue;
      const cuenta = porCuenta.get(row.cuenta_id);
      const clienteId = cuenta?.cliente_id ?? "sin-cliente";
      const nombre = cuenta?.cliente?.nombre?.trim() || "Sin cliente";
      const prev = porCliente.get(clienteId);
      if (prev) prev.abono = Math.round((prev.abono + abono) * 100) / 100;
      else porCliente.set(clienteId, { cliente_id: clienteId, nombre, abono });
    }

    const items = [...porCliente.values()].sort((a, b) => {
      if (b.abono !== a.abono) return b.abono - a.abono;
      return a.nombre.localeCompare(b.nombre, "es");
    });
    res.json(items);
  } catch (error) {
    next(error);
  }
});

metricsRouter.get("/distribucion-estados", async (_req, res, next) => {
  try {
    const grouped = await prisma.procesoLegal.groupBy({
      by: ["estado"],
      where: { deleted_at: null },
      _count: { _all: true },
    });

    const result: Record<string, number> = { activa: 0, en_proceso: 0, cerrada: 0 };
    for (const row of grouped) {
      result[row.estado] = row._count._all;
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

metricsRouter.get("/evolucion-cartera", async (req, res, next) => {
  try {
    const months = Math.min(Math.max(Number(req.query.months) || 12, 1), 24);
    const now = new Date();
    const periods: string[] = [];
    for (let i = months - 1; i >= 0; i -= 1) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      periods.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
    }

    const grouped = await prisma.historialPago.groupBy({
      by: ["periodo"],
      where: {
        periodo: { in: periods },
        deleted_at: null,
      },
      _sum: { valor_cobrado: true, valor_pagado: true },
    });

    const map = new Map<string, number>();
    for (const row of grouped) {
      map.set(row.periodo.trim(), Number(row._sum.valor_cobrado ?? 0) - Number(row._sum.valor_pagado ?? 0));
    }

    const series = periods.map((periodo) => ({
      periodo,
      total: map.get(periodo) ?? 0,
    }));
    res.json({ series });
  } catch (error) {
    next(error);
  }
});
