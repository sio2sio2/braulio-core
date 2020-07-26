// Funciones relacionadas con la membresía.
import {patchString, listarEntidad} from "./misc.js";

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
export function listar(groupKey, args) {
   groupKey = patchString(groupKey);
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

   return listarEntidad(query_params, "result.members", limit);
}


/**
 * Borrar un miembro de un grupo.
 *
 * @param {String} grupo: Identificador o dirección del grupo.
 * @param {String} miembro: Identificador o dirección del miembro.
 */
export function borrar(grupo, miembro) {
   grupo = patchString(grupo);
   miembro = patchString(miembro);
   return gapi.client.request({
            path: `https://www.googleapis.com/admin/directory/v1/groups/${grupo}/members/${miembro}`,
            method: "DELETE"
          });
}


/**
 * Añade un miembro a un grupo.
 *
 * @param {String} grupo: Identificador o dirección del grupo.
 * @param {String} miembro: Identificador o Dirección del miembro.
 */
export function agregar(grupo, miembro) {
   const body = { role: "MEMBER" };

   grupo = patchString(grupo);
   miembro = patchString(miembro);

   if(miembro.includes('@')) body.email = miembro
   else body.id = miembro;

   return gapi.client.request({
      path: `https://www.googleapis.com/admin/directory/v1/groups/${grupo}/members`,
      method: "POST",
      body: body
   });
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
export async function vaciar(grupo) {
   const batch = gapi.client.newBatch();

   grupo = patchString(grupo);

   const miembros = await listar(grupo).get();
   for(const m of miembros) batch.add(borrar(grupo, m.email));

   return new Promise((resolve, reject) => {
      if(miembros.length) {
         batch.then(response => {
            resolve(Object.fromEntries(Object.entries(response.result)
               .map(([email, value]) => [email, value.result && value.result.error || {code: value.status, message: "OK"}])));
         }).catch(error => reject(error.result.error)); 
      }
      else resolve({});
   });
}
