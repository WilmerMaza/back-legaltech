import { ApiError } from "../../../../shared/http/error-handler.js";
import type {
  ConceptoPago,
  EstadoPago,
  HistorialPago,
  PropiedadesPersistencePort,
} from "../../domain/ports/propiedades-persistence.port.js";

export class UpdateHistorialPagoUseCase {
  constructor(private readonly deps: { propiedadesPersistence: PropiedadesPersistencePort }) {}

  async execute(input: {
    propiedadId: string;
    historialId: string;
    periodo: string;
    concepto: ConceptoPago;
    valor_cobrado: number;
    valor_pagado: number;
    fecha_pago?: string | null;
    estado_pago: EstadoPago;
    observaciones?: string;
    fecha_inicio_cobro?: string | null;
    fecha_fin_cobro?: string | null;
  }): Promise<HistorialPago> {
    const propiedad = await this.deps.propiedadesPersistence.getPropiedadById(input.propiedadId);
    if (!propiedad) {
      throw new ApiError(404, "NOT_FOUND", "Propiedad no encontrada");
    }

    return this.deps.propiedadesPersistence.updateHistorialPagoAndUpdateSaldo({
      propiedadId: input.propiedadId,
      historialId: input.historialId,
      periodo: input.periodo,
      concepto: input.concepto,
      valor_cobrado: input.valor_cobrado,
      valor_pagado: input.valor_pagado,
      fecha_pago: input.fecha_pago,
      estado_pago: input.estado_pago,
      observaciones: input.observaciones,
      fecha_inicio_cobro: input.fecha_inicio_cobro,
      fecha_fin_cobro: input.fecha_fin_cobro,
    });
  }
}
