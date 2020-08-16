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

   if(tipo === "groups" && args.userKey) {
      // Cuando se piden los grupos a los que pertenece
      // un usuarios, no puede inclurse customer.
      delete args.customer;
      args.userKey = patchString(args.userKey);
   }

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
function obtener(tipo, id, params) {
   id = patchString(id);
   const request = gapi.client.request({
      path: `https://www.googleapis.com/admin/directory/v1/${tipo}/${id}`,
      method: "GET",
      params: params || {}
   });

   request.operacion = "obtener";
   request.id = id;
   return request;
}


function crear(tipo, info) {
   const emailField = tipo === "users"?"primaryEmail":"email";

   if(info[emailField]) info[emailField] = patchString(info[emailField]);

   const request = gapi.client.request({
      path: `https://www.googleapis.com/admin/directory/v1/${tipo}`,
      method: "POST",
      body: info
   });

   request.operacion = "crear";
   request.id = info[emailField];
   return request;
}


function actualizar(tipo, info) {
   const emailField = tipo === "users"?"primaryEmail":"email";
   let id;
   info = Object.assign({}, info);

   if(info[emailField]) info[emailField] = patchString(info[emailField]);
   if(info.id) {
      id = info.id;
      delete info.id;
   }
   else if(info[emailField]) {
      id = info[emailField];
      delete info[emailField];
   }

   const request = gapi.client.request({
      path: `https://www.googleapis.com/admin/directory/v1/${tipo}/${id}`,
      method: "PUT",
      body: info
   });

   request.operacion = "actualizar";
   request.id = id;
   return request;
}


/**
 * Borra un usuario.
 *
 * @param {String} id: Identificador o dirección del usuario.
 */
function borrar(tipo, id) {
   id = patchString(id);
   const request = gapi.client.request({
      path: `https://www.googleapis.com/admin/directory/v1/${tipo}/${id}`,
      method: "DELETE"
   });

   request.operacion = "borrar";
   request.id = id;
   return request;
}


const usuario = {
   listar: args => listar("users", args),
   obtener: (id, params) => obtener("users", id, params),
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
