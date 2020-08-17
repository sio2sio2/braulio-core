// Funciones relacionadas con la membresía.
import {GrUsers} from "./base.js";

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
   groupKey = GrUsers.parseID(groupKey);
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

   return GrUsers.listarPaginado.call(this, query_params, "result.members", limit);
}


/**
 * Borrar un miembro de un grupo.
 *
 * @param {String} grupo: Identificador o dirección del grupo.
 * @param {String} miembro: Identificador o dirección del miembro.
 */
export function borrar(grupo, miembro) {
   grupo = GrUsers.parseID(grupo);
   miembro = GrUsers.parseID(miembro);

   const request = gapi.client.request({
      path: `https://www.googleapis.com/admin/directory/v1/groups/${grupo}/members/${miembro}`,
      method: "DELETE"
   });

   request.operacion = "borrar";
   request.id = `${grupo}|${miembro}`;
   return request;
}


/**
 * Añade un miembro a un grupo.
 *
 * @param {String} grupo: Identificador o dirección del grupo.
 * @param {String} miembro: Identificador o Dirección del miembro.
 */
export function agregar(grupo, miembro) {
   const body = { role: "MEMBER" };

   grupo = GrUsers.parseID(grupo);
   miembro = GrUsers.parseID(miembro);

   if(miembro.includes('@')) body.email = miembro
   else body.id = miembro;

   const request = gapi.client.request({
      path: `https://www.googleapis.com/admin/directory/v1/groups/${grupo}/members`,
      method: "POST",
      body: body
   });

   request.operacion = "agregar";
   request.id = `${grupo}|${miembro}`;
   return request;
}
