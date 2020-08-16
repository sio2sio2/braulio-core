/**
 * Implementa los métodos de manipulación de usuarios, grupos, esquemas y ous.
 */

import {patchString} from "../misc.js";
import {listarEntidad} from "./utils.js";

/**
 * Obtiene una objeto thenable a partir del cual
 * puede obtenerse una lista de entidades.
 *
 * @param {Object} args: Argumentos de la petición. Ver:
 *    https://developers.google.com/admin-sdk/directory/v1/reference/users/list#parameters
 *
 *    Añade, además, "limit" para no obtener más de N usuarios.
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
 *   api.obtUsuarios(params).then(users => {
 *      console.log("Estos son 100 primeros profesores");
 *      users.forEach((u, i) => console.log(i + ". " + u.primaryEmail));
 *   });
 *
 *   // 2) 
 *   const users = await api.obtUsuarios(params);
 *   console.log("Estos son 100 primeros profesores");
 *   users.forEach((u, i) => console.log(i + ". " + u.primaryEmail));
 *
 *    // 3) Iterador asíncrono: no espera a tener los 100 profesores,
 *    //    sino que imprmirá 50 y luego otros 50.
 *    console.log("Estos son 100 primeros profesores");
 *    var i = 0;
 *    for await (const u of api.obtUsuarios(params)) {
 *       i++;
 *       console.log(i + ". " + u.primaryEmail);
 *    }
 */
function listarPaginado(args) {
   args = args || {};
   const limit = args.limit;
   delete args.limit;
   
   args = Object.assign({orderBy: 'email'}, args)

   const query_params = {
      path: `https://www.googleapis.com/admin/directory/v1/${this.tipo}`,
      method: "GET",
      params: args
   }

   return listarEntidad(query_params, `result.${this.tipo}`, limit);
}


function listar() {
   const request = gapi.client.request({
      path: `https://www.googleapis.com/admin/directory/v1/customer/my_customer/${this.tipo}`,
      method: "GET"
   });

   request.operacion = "listar";
   return request;
}


/**
 * Obtiene la información sobre una entidad
 *
 * @param {String{ id: La dirección o el identificador de la entidad.
 */
function obtener(id, params) {
   const customer = (this.tipo === "users" || this.tipo === "groups")?"":"customer/my_customer/";

   const req = {
      path: `https://www.googleapis.com/admin/directory/v1/${customer}${this.tipo}/${id}`,
      method: "GET"
   }
   if(params) Object.assign(req, {params: params});

   const request = gapi.client.request(req);
   request.operacion = "obtener";
   request.id = id;

   return request;
}


function crear(info) {
   const customer = (this.tipo === "users" || this.tipo === "groups")?"":"customer/my_customer/";

   const request = gapi.client.request({
      path: `https://www.googleapis.com/admin/directory/v1/${customer}${this.tipo}`,
      method: "POST",
      body: info
   });
   request.operacion = "crear";
   request.id = info[this.emailField];

   return request;
}


function actualizar(info) {
   let id;
   info = Object.assign({}, info);

   if(info[this.idField]) {
      id = info[this.idField];
      delete info[this.idField];
   }
   else if(info[this.emailField]) {
      id = info[this.emailField];
      delete info[this.emailField];
   }

   const request = gapi.client.request({
      path: `https://www.googleapis.com/admin/directory/v1/${this.tipo}/${id}`,
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
function borrar(id) {
   const customer = (this.tipo === "users" || this.tipo === "groups")?"":"customer/my_customer/";

   const request = gapi.client.request({
      path: `https://www.googleapis.com/admin/directory/v1/${customer}${this.tipo}/${id}`,
      method: "DELETE"
   });
   request.operacion = "borrar";
   request.id = id;

   return request;
}


const usuario = {
   tipo: "users",
   idField: "id",
   emailField: "primaryEmail",
   listar: function(args) {
      args = Object.assign({customer: 'my_customer', maxResults: 500}, args);

      return listarPaginado.call(this, args);
   },
   obtener: function(id, params) {
      id = patchString(id);
      return obtener.call(this, id, params);
   },
   borrar: function(id) {
      id = patchString(id);
      return borrar.call(this, id);
   },
   crear: function(info) {
      if(info[this.emailField]) info[this.emailField] = patchString(info[this.emailField]);
      return crear.call(this, info);
   },
   actualizar: function(info) {
      if(info[this.emailField]) info[this.emailField] = patchString(info[this.emailField]);
      return actualizar.call(this, info);
   }
};

const grupo = {
   tipo: "groups",
   idField: "id",
   emailField: "email",
   listar: function(args) {
      args = Object.assign({maxResults: 200}, args);
      if(args.userKey) args.userKey = patchString(args.userKey);
      else args = Object.assign({customer: 'my_customer'}, args);

      return listarPaginado.call(this, args);
   },
   obtener: function(id, params) {
      id = patchString(id);
      return obtener.call(this, id, params);
   },
   borrar: function(id) {
      id = patchString(id);
      return borrar.call(this, id);
   },
   crear: function(info) {
      if(info[this.emailField]) info[this.emailField] = patchString(info[this.emailField]);
      return crear.call(this, info);
   },
   actualizar: function(info) {
      if(info[this.emailField]) info[this.emailField] = patchString(info[this.emailField]);
      return actualizar.call(this, info);
   }
};

const esquema = {
   tipo: "schemas",
   idField: "schemaId",
   emailField: "schemaName",
   listar: listar,
   obtener: obtener,
   crear: crear,
   borrar: borrar
}

const ou = {
   tipo: "orgunits",
   idField: "orgUnitId",
   emailField: "name",
   listar: listar,
   obtener: obtener,
   crear: function(info) {
      const body = Object.assign({parentOrgUnitPath: "/", description: info.name}, info);
      info.orgUnitPath = `/${info.name}`;
      return crear.call(this, body);
   },
   borrar: borrar,
   actualizar: actualizar
}

export {usuario, grupo, esquema, ou};
