// Funciones relacionadas con la membresía.

import Listar from "./listar.js";

/**
 * Lista todos los miemnbros de un grupo.
 *
 * @param {String} groupKey: Grupo del que quieren obtenerse los miembros.
 * @param {Object} args: Argumentos de la petición. Ver:
 *    https://developers.google.com/admin-sdk/directory/v1/reference/members/list#parameters
 *
 *    Añade, además, "limit" para no obtener más de N miembros.
 *
 * @returns {Object}: iter(), para un iterador asíncrono; y get(), para una promesa
 *    que devuelve la lista completa.
 *
 * Véanse los ejemplos de obtUsuarios.
 */
export function obtMiembros(groupKey, args) {
   args = args || {};
   const limit = args.limit;
   delete args.limit;
   
   args = Object.assign({
      includeDerivedMembership: false,
      'maxResults': 200,
   }, args);

   const query_params = {
      path: "https://www.googleapis.com/admin/directory/v1/groups/" + groupKey + "/members",
      method: "GET",
      params: args
   }

   return Listar(query_params, "result.members", limit);
}


/**
 * Elimina todos los miembros de un grupo
 *
 * @param {String} grupo: Dirección del grupo del que se quieren obtener los miembros.
 *
 * @returns {Promise} Promeesa que devuelve un objeto cuyas claves son
 *    los miembros eliminados del grupo, y cuyas claves el resultado de esa eliminación
 *    (siempre debería ser éxito).
 */
export async function vaciarGrupo(grupo) {
   const batch = gapi.client.newBatch();

   const miembros = await obtMiembros(grupo).get();
   for(const m of miembros) {
      batch.add(gapi.client.directory.members.delete({
            groupKey: grupo,
            memberKey: m.email
         }), {id: m.email});
   }

   return new Promise(resolve => {
      if(miembros.length) {
         batch.then(response => {
            resolve(Object.fromEntries(Object.entries(response.result)
               .map(([email, value]) => [email, value.result && value.result.error || {code: value.status, message: "OK"}])));
         }); 
      }
      else resolve({});
   });
}


/**
 * Puebla de miembros un grupo.
 *
 * @param {Object} grupo: Objeto que representa al grupo y que se intanta crear,
 *    por si no existe. El objeto es {email: xxx, name: xxx, description: xxx}
 * @param {array} miembros: Direcciones de los miembros que pertenecerán al grupo.
 */
export function poblarGrupo(grupo, miembros) {
   return new Promise(resolve => {

      // Intenta crear el grupo por si no existe.
      gapi.client.directory.groups.insert(grupo)
        .then(response => agregarMiembros({dpto: {code: response.status, message: null}}),
              error => agregarMiembros({dpto: error.result.error}));

      function agregarMiembros(resgrupo) {
         // Eliminamos miembros repetidos
         miembros = miembros.filter((e, i) => miembros.indexOf(e) === i);

         const batch = gapi.client.newBatch(),
               requests = miembros.map(member => gapi.client.directory.members.insert({
            groupKey: grupo.email,
            email: member
         }));

         for(let i=0; i<miembros.length; i++) batch.add(requests[i], {id: miembros[i]});
         batch.then(response => {
            var results = Object.fromEntries(Object.entries(response.result)
               .map(([email, value]) => [email, value.result.error || {code: value.status, message: "OK"}]));
            resolve(Object.assign(resgrupo, {members: results}));
         });
      } 
   });
}
