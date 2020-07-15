import Listar from "./listar.js";
import {poblarGrupo} from "./miembros.js";

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


// TODO: Hay que borrar esto, porque se implementa en src/departamentos.js
/**
 * Crea el claustro de profesores como el grupo que incluye
 * a todos los departamentos del instituto.
 *
 * @param {String} grupo: Nombre del grupo que representa al claustro.
 * @param {array} departamentos: La lista de grupos que son departamentos.
 */
export async function crearClaustro(nombre, departamentos) {

   const batch = gapi.client.newBatch(),
         emails = departamentos.map(d => d.email);

   // Elimina departamentos repetidos.
   departamentos = departamentos
      .filter((d, i) => emails.indexOf(d.email) === i)  // Elimina departamentos repetidos.
      .map(d => Object({
         email: d.email,
         name: d.nombre,
         description: "Departamento de " + d.nombre
      }));

   if(departamentos.length) {
      departamentos.forEach(d => {
         batch.add(gapi.client.request({
            path: "https://www.googleapis.com/admin/directory/v1/groups",
            method: "POST",
            body: d
         }), {id: d.email})
      });

      try {
         await new Promise((resolve, reject) => batch.then(response => resolve(response),
                                                           error => reject(error)));
      }
      catch(error) {
         console.warn("Todos los departamentos estaban ya creados");
      }
   }

   return poblarGrupo({
            email: nombre,
            name: "Claustro de profesores",
            description: "Claustro que incluye todos los departamentos didácticos y de familia profesional"
          }, departamentos.map(d => d.email));
}
