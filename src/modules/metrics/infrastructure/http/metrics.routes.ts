import { Router } from "express";
import { prisma } from "../../../../shared/infrastructure/prisma/prisma.client.js";
import { requireAuth, requireRole } from "../../../../shared/security/auth.middleware.js";

export const metricsRouter = Router();
metricsRouter.use(requireAuth, requireRole("admin"));

metricsRouter.get("/dashboard", async (_req, res, next) => {
  try {
    const [totalAgg, clientesActivos, cuentasActivas] = await Promise.all([
      prisma.propiedad.aggregate({ _sum: { monto_a_la_fecha: true } }),
      prisma.cliente.count({ where: { is_active: true } }),
      prisma.cuenta.count({ where: { estado: "activa" } }),
    ]);

    res.json({
      total_cartera: Number(totalAgg._sum.monto_a_la_fecha ?? 0),
      clientes_activos: clientesActivos,
      cuentas_activas: cuentasActivas,
    });
  } catch (error) {
    next(error);
  }
});

metricsRouter.get("/distribucion-estados", async (_req, res, next) => {
  try {
    const grouped = await prisma.cuenta.groupBy({
      by: ["estado"],
      _count: { _all: true },
    });

    const result = { activa: 0, en_proceso: 0, cerrada: 0 };
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
      where: { periodo: { in: periods } },
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
