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

   // Iterador asíncrono. Si se han de hacer varias consultas para
   // obtener la lista completa, va devolviendo loss resultados de las
   // consultas y no espera a hacerlas todas.
   async function* iter() {
      const iargs = Object.assign({}, args);
      let   ilimit = limit;
      iargs.params = Object.assign({}, args.params);

      do {
         const response = await gapi.client.request(iargs),
               buffer = getAttr(response, listattr);

         iargs.params.pageToken = response.result.nextPageToken;

         while(buffer && buffer.length) yield buffer.shift();
         if(ilimit) ilimit -= iargs.params.maxResults;

      } while(iargs.params.pageToken && (ilimit === undefined || ilimit > 0));
   }

   return {
      [Symbol.asyncIterator]: iter,
      then: async function(callback, fallback) {
            const lista = [];
            try {
               for await (const user of iter()) lista.push(user);
            }
            catch(error) { fallback(error); }
            callback(lista);
      }
   }
}
