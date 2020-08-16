import {usuario, grupo} from "./grusers.js";
import * as ou from "./ou.js";
import * as miembro from "./miembros.js";
import * as esquema from "./esquemas.js";

export {usuario, grupo, ou, miembro, esquema}

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
export function operar(entidad) {
   let tipo, operacion;

   if(entidad.usuario) tipo = usuario;
   else if(entidad.grupo) tipo = grupo;
   else throw new Error("Tipo de entidad desconocido");

   entidad = entidad.usuario || entidad.grupo;

   if(typeof entidad === "string") operacion = "borrar";
   else if(!entidad.id && !entidad.email) {
      throw new Error("Imposible operar con la entidad: no hay identificador ni correo electrónico.")
   }
   else if(entidad.modify) {
      operacion = "actualizar";
      entidad = Object.assign({}, entidad);
      delete entidad.modify;
   }
   else if(entidad.id) operacion = "actualizar";
   else operacion = "crear";

   return tipo[operacion](entidad);
}
