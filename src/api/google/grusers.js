import {patchString} from "../misc.js";
import {listarEntidad} from "./utils.js";

/**
 * Obtiene una lista de usuarios.
 *
 * @param {Object} args: Argumentos de la petición. Ver:
 *    https://developers.google.com/admin-sdk/directory/v1/reference/users/list#parameters
 *
 *    Añade, además, "limit" para no obtener más de N usuarios.
 *
 * @returns {Object}: iter(), para un iterador asíncrono; y get(), para una promesa
 *    que devuelve la lista completa.
 *
 * Ejemplos:
 *
 *   // Para completarse la consulta,
 *   // puede que se requieran dos peticiones.
 *   const params = {
 *            limit: 100,
 *            maxResults: 50,
 *            query: "orgUnitPath=/claustro"
 *         }
 *
 *   // 1)
 *   api.obtUsuarios(params).get().then(users => {
 *      console.log("Estos son 100 primeros profesores");
 *      users.forEach((u, i) => console.log(i + ". " + u.primaryEmail));
 *   });
 *
 *   // 2) 
 *   const users = await api.obtUsuarios(params).get();
 *   console.log("Estos son 100 primeros profesores");
 *   users.forEach((u, i) => console.log(i + ". " + u.primaryEmail));
 *
 *    // 3) Iterador asíncrono: no espera a tener los 100 profesores,
 *    //    sino que imprmirá 50 y luego otros 50.
 *    console.log("Estos son 100 primeros profesores");
 *    var i = 0;
 *    for await (const u of api.obtUsuarios(params).iter()) {
 *       i++;
 *       console.log(i + ". " + u.primaryEmail);
 *    }
 */
function listar(tipo, args) {
   args = args || {};
   const limit = args.limit;
   delete args.limit;
   
   args = Object.assign({
      'customer': 'my_customer',
      'orderBy': 'email',
      'maxResults': tipo === "users"?500:200,
   }, args)

   // Cuando se piden los grupos a los que pertenece
   // un usuarios, no puede inclurse customer.
   if(tipo === "groups" && args.userKey) delete args.customer;

   const query_params = {
      path: `https://www.googleapis.com/admin/directory/v1/${tipo}`,
      method: "GET",
      params: args
   }

   return listarEntidad(query_params, `result.${tipo}`, limit);
}

/**
 * Obtiene la información sobre un usuario..
 *
 * @param {String{ usuario: La dirección o el identificador del usuario.
 */
function obtener(tipo, id) {
   id = patchString(id);
   return gapi.client.request({
      path: `https://www.googleapis.com/admin/directory/v1/${tipo}/${id}`,
      method: "GET"
   });
}


function crear(tipo, info) {
   const domain = gapi.auth2.getAuthInstance().currentUser.get().getHostedDomain();
   if(info.email && !info.email.includes('@')) info.email = `${info.email}@${domain}`;
   return gapi.client.request({
            path: `https://www.googleapis.com/admin/directory/v1/${tipo}`,
            method: "POST",
            body: info
          });
}


function actualizar(tipo, info) {
   let id;
   info = Object.assign({}, info);

   if(info.email) info.email = patchString(info.email);
   if(info.id) {
      id = info.id;
      delete info.id;
   }
   else if(info.email) {
      id = info.email;
      delete info.email;
   }

   return gapi.client.request({
            path: `https://www.googleapis.com/admin/directory/v1/${tipo}/${id}`,
            method: "PUT",
            body: info
          });
}


/**
 * Borra un usuario.
 *
 * @param {String} id: Identificador o dirección del usuario.
 */
function borrar(tipo, id) {
   id = patchString(id);
   return gapi.client.request({
            path: `https://www.googleapis.com/admin/directory/v1/${tipo}/${id}`,
            method: "DELETE"
          });
}

const usuario = {
   listar: args => listar("users", args),
   obtener: id => obtener("users", id),
   borrar: id => borrar("users", id),
   crear: info => crear("users", info),
   actualizar: info => actualizar("users", info)
};

const grupo = {
   listar: args => listar("groups", args),
   obtener: id => obtener("groups", id),
   borrar: id => borrar("groups", id),
   crear: info => crear("groups", info),
   actualizar: info => actualizar("groups", info)
};

export {usuario, grupo};