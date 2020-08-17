import {usuario, grupo, ou, esquema} from "./entidades.js";
import * as miembro from "./miembros.js";

export {usuario, grupo, ou, miembro, esquema}

const entidad = {
   usuario: usuario,
   grupo: grupo,
   ou: ou,
   miembro: miembro,
   esquema: esquema
}

/**
 * Crea o actualiza el grupo o usuario que se proporciona.
 *
 * @param {Object} entidad: Un objeto de la forma {grupo: entidad}
 *    o {usuario: entidad}. La clave sirve para saber en tipo de entidad, y
 *    el valor representa la propia entidad.
 *
 * La función decide qué operación hacer dependiendo del valor de la entidad.
 *
 * * Si la entidad es una cadena, entonces se sobrentiende que tal cadena
 *   es un ID o un email y lo que se pretende es borrar.
 * * En caso de ser un objeto:
 *   - Si posee ID, se actualizan datos (email, name, etc.)
 *   - Si no lo posee, se intenta crear.
 *   - Excepcionalmente, si la entidad posee el atributo "modify" a true,
 *     se procederá a la modificación aunque no haya identificador.
 */
export function operar(info) {
   let id, email, operacion;

   if(typeof info === "string") operacion = "borrar";
   else if(!info[this.idField] && !info[this.emailField]) {
      throw new Error(`Imposible operar con el ${this.tipo}: no hay identificador ni dirección única.`)
   }
   else if(info.action) {
      operacion = info.action
      info = Object.assign({}, info);
      delete info.action;
   }
   else if(info[this.idField]) operacion = "actualizar";
   else operacion = "crear";

   return this[operacion](info);
}

usuario.operar = operar
grupo.operar = operar
ou.operar = operar
esquema.operar = operar
