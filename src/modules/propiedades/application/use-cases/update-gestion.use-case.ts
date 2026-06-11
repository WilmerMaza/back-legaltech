import { ApiError } from "../../../../shared/http/error-handler.js";
import type {
  Gestion,
  PropiedadesPersistencePort,
} from "../../domain/ports/propiedades-persistence.port.js";

export class UpdateGestionUseCase {
  constructor(private readonly deps: { propiedadesPersistence: PropiedadesPersistencePort }) {}

  async execute(input: {
    propiedadId: string;
    gestionId: string;
    fecha?: string;
    estado?: string;
    descripcion?: string;
  }): Promise<Gestion> {
    const propiedad = await this.deps.propiedadesPersistence.getPropiedadById(input.propiedadId);
    if (!propiedad) {
      throw new ApiError(404, "NOT_FOUND", "Propiedad no encontrada");
    }

    return this.deps.propiedadesPersistence.updateGestionForPropiedad({
      propiedadId: input.propiedadId,
      gestionId: input.gestionId,
      fecha: input.fecha,
      estado: input.estado,
      descripcion: input.descripcion,
    });
  }
}
