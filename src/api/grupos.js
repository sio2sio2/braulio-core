import Listar from "./listar.js";

/**
 * Obtiene una lista de de grupos.
 * @param {Object} args: Argumentos de la petición. Ver:
 *    https://developers.google.com/admin-sdk/directory/v1/reference/groups/list#parameters
 *
 *    Añade, además, "limit" para no obtener más de N grupos..
 *
 * @returns {Object}: iter(), para un iterador asíncrono; y get(), para una promesa
 *    que devuelve la lista completa.
 *
 * Véanse los ejemplos de obtUsuarios.
 */
export function obtGrupos(args) {
   args = args || {};
   const limit = args.limit;
   delete args.limit;
   
   args = Object.assign({
      'customer': 'my_customer',
      'orderBy': 'email',
      'maxResults': 200,
   }, args);

   // Cuando se piden los grupos a los que pertenece
   // un usuarios, no puede inclurse customer.
   if(args.userKey) delete args.customer;

   const query_params = {
      path: "https://www.googleapis.com/admin/directory/v1/groups",
      method: "GET",
      params: args
   }

   return Listar(query_params, "result.groups", limit);
}

/**
 * Obtiene la información sobre un grupo.
 *
 * @param {String{ grupo: La dirección o el identificador del grupo.
 */
export function obtGrupo(grupo) {
   return gapi.client.request({
      path: `https://www.googleapis.com/admin/directory/v1/groups/${grupo}`,
      method: "GET"
   });
}

export function crearGrupo(info) {
   return gapi.client.request({
            path: "https://www.googleapis.com/admin/directory/v1/groups",
            method: "POST",
            body: info
          });
}


export function actualizarGrupo(id, info) {
   return gapi.client.request({
            path: `https://www.googleapis.com/admin/directory/v1/groups/${id}`,
            method: "PUT",
            body: info
          });
}


/**
 * Borra un grupo.
 *
 * @param {String} id: Identificador o dirección del grupo.
 */
export function borrarGrupo(id) {
   return gapi.client.request({
            path: `https://www.googleapis.com/admin/directory/v1/groups/${id}`,
            method: "DELETE"
          });
}
