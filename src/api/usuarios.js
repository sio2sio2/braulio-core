import Listar from "./listar.js";

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
export function obtUsuarios(args) {
   args = args || {};
   const limit = args.limit;
   delete args.limit;
   
   args = Object.assign({
      'customer': 'my_customer',
      'orderBy': 'email',
      'maxResults': 500,
   }, args)

   const query_params = {
      path: "https://www.googleapis.com/admin/directory/v1/users",
      method: "GET",
      params: args
   }

   return Listar(query_params, "result.users", limit);
}


// TODO: BORRAR ESTO.
/**
 * Crea los profesores contenidos en una lista.
 *
 * @param {array} lista: La lista de profesores. Cada uno de ellos
 *    es un objeto que contiene su nombre y el puesto que desempeña.
 * @param {function} crearNick: Función que genera el nombre de
 *    usuario a partir del nombre real del profesor.
 */
export function crearProfesores(lista, crearNick) {
   const batch = gapi.client.newBatch();
   lista.forEach(p => {
      true;
   });
}


export function crearAlumnos(nombre, lista, crearNick) {
}
