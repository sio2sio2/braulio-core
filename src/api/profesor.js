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
 * Obtiene el departamento al que está asociado un código de puesto.
 *
 * @param {String} puesto: Código del puesto.
 *
 * @returns {String} Identificador del departamento.
 */
export function obtenerDepartamento(puesto) {
   const config = new Config().content;
   for(const dpto of config.departamentos) {
      for(const exp of dpto.puestos) {
         if(exp.startsWith("/")) {  // Expresión regular
            exp = exp.slice(1, -1);
            if(!exp.startsWith("^")) exp = "^" + exp;
            if(!exp.endsWith("$")) exp += "$";
            if(puesto.match(exp)) return dpto.id;
         }
         else if(puesto === exp) return dpto.id;
      }
   }
   throw new Error(`Puesto '${puesto}' desconocido`);
}

/**
 * Crea un nuevo profesor.
 *
 * @param {Object} profesor: Objeto que describe el profesor. Debe incluir también
 * el atributo "puesto" para conocer en qué departamento hay que incluir al profesor.
 */
export async function crear(profesor) {
   // TODO: Falta comprobar si es tutor.
   if(!profesor.puesto) new Error(`${profesor.email} carece de puesto de desempeño`);
   
   const dpto = obtenerDepartamento(profesor.puesto);
   profesor = Object.assign({}, profesor);
   delete profesor.puesto;

   profesor = await google.usuario.crear(profesor);
   await google.miembro.agregar(dpto, profesor.id);

   return profesor;
}


/**
 * Borra un profesor
 *
 * @param {String} profesor: Identificador o dirección de correo del profesor
 */
export function borrar(profesor) {
   return google.usuario.borrar(profesor);
}
