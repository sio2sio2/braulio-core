import Config from "../config";
import * as google from "./google";

/**
 * Métodos asociados a la manipulación de profesores.
 */
export function listar() {
   const config = new Config().content;
   const path = config.contenedores.claustro.orgUnitPath || `/${config.contenedores.claustro.name}`

   return google.usuario.listar({query: `orgUnitPath=${path}`});
}


/**
 * Devuelve la lista de grupos a los que pertenece el profesor
 *
 * @param {String} profesor: Identificador o dirección de correo del profesor.
 *
 */
export function grupos(profesor) {
   return google.grupo.listar({userKey: profesor});
}

/**
 * Crea un nuevo profesor.
 *
 * @param {Object} profesor: Objeto que describe el profesor. Debe incluir también
 * el atributo puesto para conocer en qué departamento hay que incluir al profesor.
 */
export function crear(profesor) {
}


/**
 * Borra un profesor
 *
 * @param {String} profesor: Identificador o dirección de correo del profesor
 */
export function borrar(profesor) {
   return google.usuario.borrar(profesor);
}
