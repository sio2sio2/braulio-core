import * as usuario from "./usuarios.js";
import * as grupo from "./grupos.js";
import {interpretarResultado} from "./misc.js";


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
 * @param {String} tipo: "usuario" o "grupo".
 * @param {Object} entidad: Objeto que representa al grupo o usuario.
 * @param {boolean} crear: Fuerza la modificación, aunque contenga no
 *    se contenga un identificador (lo cual requerirá el email).
 *
 * La función decide qué hacer dependiendo de qué atributos contenga
 * el objeto:
 *
 * + Si posee ID, se actualizan datos (email, name, etc.)
 * + Si no lo posee, se intenta crear.
 *
 */
export function operar(tipo, entidad, crear) {
   tipo = tipo === "usuario"?usuario:grupo;
   const operacion = (entidad.id && !crear)?"actualizar":"crear";

   if(operacion === "crear" && !entidad.id && !entidad.email) {
      throw new Error("Imposible crear la entidad: no hay identificador ni correo electrónico.")
   }

   return tipo[operacion](entidad);
}
