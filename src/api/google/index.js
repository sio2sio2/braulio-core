import {usuario, grupo} from "./grusers.js";
import * as ou from "./ou.js";
import * as miembro from "./miembros.js";
import * as esquema from "./esquemas.js";

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
export function operar(tipo, info) {
   const modulo = entidad[tipo];
   let id, email, operacion;

   switch(tipo) {
      case "usuario":
         id = info.id;
         email = info.primaryEmail;
         break;
      case "grupo":
         id = info.id;
         email = info.email;
         break;
      case "esquema":
         id = info.schemaId;
         email = info.schemaName;
         break;
      case "ou":
         id = info.orgUnitId;
         email = info.orgUnitPath;
         break;
      default:
         throw new Error("Tipo de entidad desconocido");
   }

   if(typeof info === "string") operacion = "borrar";
   else if(!id && !email) {
      throw new Error(`Imposible operar con el ${tipo}: no hay identificador ni dirección única.`)
   }
   else if(info.action) {
      operacion = info.action
      info = Object.assign({}, info);
      delete info.action;
   }
   else if(id) operacion = "actualizar";
   else operacion = "crear";

   return modulo[operacion](info);
}

usuario.operar = usuario => operar("usuario", usuario);
grupo.operar = grupo => operar("grupo", grupo);
ou.operar = ou => operar("ou", ou);
esquema.operar = esquema => operar("esquema", esquema);
