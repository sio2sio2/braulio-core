import * as usuario from "./usuarios.js";
import * as grupo from "./grupos.js";

/**
 * Obtiene listas completas de G-Śuite que limitan el número
 * máximo de resultados por consulta.
 *
 * @oaram {Object} args: Los argumentos de la petición tal como los
 *    exige gapi.client.request
 *    (https://github.com/google/google-api-javascript-client/blob/master/docs/reference.md#----gapiclientrequestargs--).
 * @param {String} listattr: Dónde se encuentra la lista devuelta en la respuesta a la petición.
 *    Por ejemplo, si la lista de respuesta se encuentra en response.result.groups. el valor
 *    de este parámetro será "result.groups".
 * @param {limit} int: Número máximo de resultados que se desean obtener.
 *
 * @returns {Object} Objeto con dos métodos, uno que devuelve un iterador asíncrono
 * que en cada iteración devuelve un elemento; y otro que devuelve una promesa
 * con la lista completa.
 */
export function listarEntidad(args, listattr, limit) {
   function getAttr(obj, list) {
      list = list.split(".");
      while(list.length>0) obj = obj[list.shift()];
      return obj;
   }

   args.params.maxResults = Math.min(limit || args.params.maxResults, args.params.maxResults);

   async function* iter() {
      const iargs = Object.assign({}, args);
      let   ilimit = limit;
      iargs.params = Object.assign({}, args.params);

      do {
         var buffer = await new Promise((resolve, reject) => {
            gapi.client.request(iargs).then(function(response) {
               iargs.params.pageToken = response.result.nextPageToken;
               resolve(getAttr(response, listattr));
            }, error => reject(error));
         });
         
         while(buffer && buffer.length) yield buffer.shift();
         if(ilimit) ilimit -= iargs.params.maxResults;

      } while(iargs.params.pageToken && (ilimit === undefined || ilimit > 0));
   }

   return {
      iter: iter,  // Itera sobre cada usuario.
      get: function() {  // Devuelve una promesa con la lista completa.
        return new Promise(async (resolve, reject) => {
            const lista = [];
            try {
               for await (const user of iter()) lista.push(user);
            }
            catch(error) { reject(error); }
            resolve(lista);
         });
      }
   }
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
 *       {entity: {...}, error: {code: codigo, raw: error}}
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
            code: response.status === obj.codigo?obj.res:10,
            raw: response.result.error
         }
      }
   }
}
