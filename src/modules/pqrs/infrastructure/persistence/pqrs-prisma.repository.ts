import type { Prisma } from "@prisma/client";
import { listarHistorial } from "../../../../shared/infrastructure/historial/historial-cambios.js";
import { prisma } from "../../../../shared/infrastructure/prisma/prisma.client.js";
import { STAFF_ROLES } from "../../../../shared/security/roles.js";
import {
  dateFromYmd,
  ymdFromDate,
} from "../../../tutelas/infrastructure/persistence/tutelas-prisma.repository.js";
import type {
  PqrParaAlerta,
  PqrsAlertaRepository,
} from "../../application/enviar-alertas-pqrs.use-case.js";

export const pqrInclude = {
  responsable: { select: { email: true } },
  cliente: { select: { nombre: true } },
} satisfies Prisma.PqrInclude;

type PqrRow = Prisma.PqrGetPayload<{ include: typeof pqrInclude }>;

/** Correo del responsable; sin responsable asignado, las iniciales legacy del Excel. */
function responsableEmail(row: PqrRow): string | null {
  return row.responsable?.email ?? row.gestion;
}

export function toPqrResponse(row: PqrRow) {
  const { responsable: _responsable, cliente, ...pqr } = row;
  return {
    ...pqr,
    fecha_radicacion: ymdFromDate(row.fecha_radicacion),
    vencimiento: ymdFromDate(row.vencimiento),
    responsable_email: responsableEmail(row),
    cliente_nombre: cliente?.nombre ?? null,
  };
}

/** Campos internos que no salen en el informe del propietario. */
const CAMPOS_INTERNOS_INFORME = new Set(["cliente_nombre", "responsable_email"]);

/** PQRS del cliente para su informe general. */
export async function listarPqrsParaInformeCliente(clienteId: string) {
  const rows = await prisma.pqr.findMany({
    where: { cliente_id: clienteId, deleted_at: null },
    orderBy: [{ fecha_radicacion: "desc" }, { created_at: "desc" }],
  });
  const historial = await listarHistorial(
    "pqr",
    rows.map((r) => r.id),
  );
  return rows.map((row) => ({
    id: row.id,
    radicado: row.radicado,
    solicitante: row.solicitante,
    entidad: row.entidad,
    asunto: row.asunto,
    estado: row.estado,
    cerrada: row.cerrada,
    fecha_radicacion: ymdFromDate(row.fecha_radicacion),
    vencimiento: ymdFromDate(row.vencimiento),
    created_at: row.created_at.toISOString(),
    historial: historial
      .filter((h) => h.registro_id === row.id)
      .map((h) => ({
        accion: h.accion,
        created_at: h.created_at,
        cambios: h.cambios.filter((c) => !CAMPOS_INTERNOS_INFORME.has(c.campo)),
      }))
      .filter((h) => h.accion !== "actualizada" || h.cambios.length > 0),
  }));
}

function toPqrParaAlerta(row: PqrRow): PqrParaAlerta {
  return {
    id: row.id,
    gestion: responsableEmail(row),
    solicitante: row.solicitante,
    entidad: row.entidad,
    asunto: row.asunto,
    radicado: row.radicado,
    estado: row.estado,
    cerrada: row.cerrada,
    vencimiento: ymdFromDate(row.vencimiento),
    alerta_por_vencer_enviada_at: row.alerta_por_vencer_enviada_at,
    alerta_vencida_enviada_at: row.alerta_vencida_enviada_at,
  };
}

/** Staff activo que puede llevar una PQR. */
export async function listarResponsablesPqr() {
  return prisma.usuario.findMany({
    where: {
      role: { in: [...STAFF_ROLES] },
      cliente_id: null,
      is_active: true,
      activated_at: { not: null },
    },
    select: { id: true, email: true },
    orderBy: { email: "asc" },
  });
}

export async function esResponsableValido(usuarioId: string): Promise<boolean> {
  const count = await prisma.usuario.count({
    where: {
      id: usuarioId,
      role: { in: [...STAFF_ROLES] },
      cliente_id: null,
      is_active: true,
    },
  });
  return count > 0;
}

export class PqrsAlertaPrismaRepository implements PqrsAlertaRepository {
  async listarCandidatas(hastaYmd: string): Promise<PqrParaAlerta[]> {
    const rows = await prisma.pqr.findMany({
      where: {
        deleted_at: null,
        cerrada: false,
        vencimiento: { not: null, lte: dateFromYmd(hastaYmd) as Date },
      },
      include: pqrInclude,
    });
    return rows.map(toPqrParaAlerta);
  }

  async marcarAlertas(input: {
    por_vencer: string[];
    vencidas: string[];
    at: Date;
    hoyYmd: string;
  }): Promise<{ claimed: number }> {
    const inicioHoy = dateFromYmd(input.hoyYmd);
    const avisos = [];
    if (input.por_vencer.length > 0) {
      avisos.push(
        prisma.pqr.updateMany({
          where: { id: { in: input.por_vencer }, alerta_por_vencer_enviada_at: null },
          data: { alerta_por_vencer_enviada_at: input.at },
        }),
      );
    }
    if (input.vencidas.length > 0 && inicioHoy) {
      avisos.push(
        prisma.pqr.updateMany({
          where: {
            id: { in: input.vencidas },
            OR: [
              { alerta_vencida_enviada_at: null },
              { alerta_vencida_enviada_at: { lt: inicioHoy } },
            ],
          },
          data: { alerta_vencida_enviada_at: input.at },
        }),
      );
    }
    if (avisos.length === 0) return { claimed: 0 };
    const results = await prisma.$transaction(avisos);
    return { claimed: results.reduce((n, r) => n + r.count, 0) };
  }
}
