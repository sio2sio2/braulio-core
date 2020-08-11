import {usuario, grupo} from "./grusers.js";
import * as ou from "./ou.js";
import * as miembro from "./miembros.js";

export {usuario, grupo, ou, miembro}

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

   const request = tipo[operacion](entidad);
   request.operacion = operacion;

   return request;
}


/**
 * Interpreta el resultado de unaa operación de creación o actualización.
 *
 * @param {String} operacion: Operación que se llevó a cabo (creacion, actualizacion)
 * @oaram {Object} response: Respuesta que generó la operación
 *
 * @returns {Object}: Devuelve un objeto con el resultado de la operación.
 *    
 *       {value: {...}, error: {code: codigo, raw: error}}
 *
 *    donde entity es la entidad creada o modificada (será undefined, si no tuvo éxito);
 *    code: el código o estado que devuelve la gapi al realizar la operación.
 *    error: 0, si no se produjo error, 1: la entidad ya existe, 2: la entidad no existe;
 *       10, cualquier otro error. raw contiene el error crudo.
 */
export function formatear(operacion, response) {
   let res, obj;

   switch(operacion) {
      case "crear":
         obj = {
            codigo: 409,
            res: 1
         }
         break;
      case "actualizar":
         obj = {
            codigo: 404,
            res: 2
         }
         break;
      case "borrar":
         obj = {
            codigo: 404,
            res: 3
         }
         break;
      default:
         obj = {
            codigo: 404,
            res: 4
         }
   }

   if(String(response.status).charAt(0) === "2") {
      return {
         value: response.result,
         operacion: operacion,
         error: { code: 0 }
      }
   }
   else {
      return {
         operacion: operacion,
         error: {
            code: response.status === obj.codigo?obj.res:response.status,
            raw: response.result.error
         }
      }
   }
}
