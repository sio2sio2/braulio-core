import Config from "../config";
import * as google from "./google";

// Métodos asociados a la manipulación de departamentos.

/**
 * Lista todos los departamentos existentes.(o sea,
 * los grupos incluidos en el claustro).
 *
 */
export function listar() {
   const claustro = new Config().content.contenedores.claustro.id;
   return google.miembro.listar(claustro);
}

/**
 * Crea un departamento lo cual incluye:
 *
 * + Crear el grupo.
 * + Incluirlo dentro del claustro.
 */
export function crear(dpto) {
}
