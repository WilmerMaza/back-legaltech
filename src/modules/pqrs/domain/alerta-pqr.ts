import type { TipoAlertaTermino } from "../../../shared/infrastructure/email/alerta-terminos.layout.js";
import { diasHabilesEntre, sumarDiasHabiles } from "../../tutelas/domain/dias-habiles-co.js";

/** Término legal del derecho de petición (Ley 1755 de 2015, art. 14). */
export const DIAS_HABILES_TERMINO_PQR = 15;

export const DIAS_HABILES_AVISO_PQR = 2;

export function calcularVencimientoPqr(fechaRadicacionYmd: string): string {
  return sumarDiasHabiles(fechaRadicacionYmd, DIAS_HABILES_TERMINO_PQR);
}

/**
 * Si cambian el estado y la PQR sigue abierta, el término vuelve a contar
 * 15 días hábiles desde hoy. Una fecha de vencimiento distinta, escrita a mano, se respeta.
 * `undefined` = este cambio de estado no reinicia el conteo.
 */
export function vencimientoTrasCambioDeEstado(input: {
  estadoCambia: boolean;
  quedaAbierta: boolean;
  vencimientoActual: string | null;
  vencimientoEnviado: string | null | undefined;
  hoyYmd: string;
}): string | null | undefined {
  if (!input.estadoCambia || !input.quedaAbierta) return undefined;
  const enviado = input.vencimientoEnviado;
  if (enviado !== undefined && enviado !== input.vencimientoActual) return enviado;
  return calcularVencimientoPqr(input.hoyYmd);
}

export type EstadoAlertaPqr = {
  cerrada: boolean;
  vencimiento: string | null;
  alerta_por_vencer_enviada_at: Date | null;
  alerta_vencida_enviada_at: Date | null;
};

/**
 * Qué alerta corresponde hoy.
 * «Por vencer» una vez, a 2 días hábiles. «Vencida» cada día hábil mientras
 * no cambien el estado. Al cambiarlo, el conteo de 15 días hábiles vuelve a empezar.
 */
export function clasificarAlertaPqr(pqr: EstadoAlertaPqr, hoyYmd: string): TipoAlertaTermino | null {
  if (!pqr.vencimiento || pqr.cerrada) return null;

  if (pqr.vencimiento < hoyYmd) return "vencida";

  const restantes = diasHabilesEntre(hoyYmd, pqr.vencimiento);
  if (restantes <= DIAS_HABILES_AVISO_PQR && !pqr.alerta_por_vencer_enviada_at) {
    return "por_vencer";
  }
  return null;
}
