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
function getList(args, listattr, limit) {
   function getAttr(obj, list) {
      list = list.split(".");
      while(list.length>0) obj = obj[list.shift()];
      return obj;
   }

   args.params.maxResults = Math.min(limit || args.params.maxResults, args.params.maxResults);

   async function* iter() {
      const iargs = Object.assign({}, args);
      let   ilimit = limit;
      iargs.params = Object.assign({}, args.params);

      do {
         var buffer = await new Promise((resolve, reject) => {
            gapi.client.request(iargs).then(function(response) {
               iargs.params.pageToken = response.result.nextPageToken;
               resolve(getAttr(response, listattr));
            }, error => reject(error));
         });
         
         while(buffer && buffer.length) yield buffer.shift();
         if(ilimit) ilimit -= iargs.params.maxResults;

      } while(iargs.params.pageToken && (ilimit === undefined || ilimit > 0));
   }

   return {
      iter: iter,  // Itera sobre cada usuario.
      get: function() {  // Devuelve una promesa con la lista completa.
        return new Promise(async (resolve, reject) => {
            const lista = [];
            try {
               for await (const user of iter()) lista.push(user);
            }
            catch(error) { reject(error); }
            resolve(lista);
         });
      }
   }
}


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

   return getList(query_params, "result.users", limit);
}


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

   return getList(query_params, "result.groups", limit);
}


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
export function listarMiembros(groupKey, args) {
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

   return getList(query_params, "result.members", limit);
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

   const miembros = await listarMiembros(grupo).get();
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


/**
 * Crea la estructura de departamentos.
 *
 * @param {String} grupo: Nombre del grupo que incluye todos los grupos de departamento..
 * @param {array} departamentos: La lista de grupos que son departamentos.
 */
export async function crearDepartamentos(nombre, departamentos) {

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
            name: "Departamentos didácticos",
            description: "Todos los departamentos didácticos y de familia profesional"
          }, departamentos.map(d => d.email));
}


// Prueba de API usando Request.
export function testGroupsRequest(grupo) {
   gapi.client.request({
      path: "https://www.googleapis.com/groups/v1/groups/" + grupo,
      method: "GET",
      params: {alt: "JSON"},
   }).then(response => console.log(response.body), error => console.log(error));
}

// str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

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


