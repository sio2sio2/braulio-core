import {fqda} from "../misc.js";

/**
 * Clase que crea la base común para manipulación de grupos, usuarios,
 * unidades organizativas y esquemas.
 */
class EntidadBase {
   // Patrón singleton
   get singleton() {
      return this._singleton;
   }

   set singleton(value) {
      Object.defineProperty(this, "_singleton", {
         value: value,
      });
   }

   constructor() {
      try { this.idField; }
      catch(error) { throw new Error(`${this.constructor.name}: clase abstracta`); }

      if(this.singleton) return this.singleton;
      this.singleton = this;
   }

   get tipo() {
      throw new Error('Atributo abstracto');
   }

   get idField() {
      throw new Error('Atributo abstracto');
   }

   get emailField() {
      throw new Error('Atributo abstracto');
   }

   get customer() {
      throw new Error('Atributo abstracto');
   }

   /**
    * Obtiene toda la información de la entidad.
    */
   obtener(id, params) {
      id = this.constructor.parseID(id);
      const req = {
         path: `https://www.googleapis.com/admin/directory/v1/${this.customer}${this.tipo}/${id}`,
         method: "GET"
      }
      if(params) Object.assign(req, {params: params});

      const request = gapi.client.request(req);
      request.operacion = "obtener";
      request.id = id;
      request.entidad = this.constructor.name;

      return request;
   }

   crear(info) {
      if(info[this.emailField]) info[this.emailField] = this.constructor.parseID(info[this.emailField]);

      const request = gapi.client.request({
         path: `https://www.googleapis.com/admin/directory/v1/${this.customer}${this.tipo}`,
         method: "POST",
         body: info
      });
      request.operacion = "crear";
      request.id = info[this.emailField];
      request.entidad = this.constructor.name;

      return request;
   }

   actualizar(info) {
      if(info[this.emailField]) info[this.emailField] = this.constructor.parseID(info[this.emailField]);

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
         path: `https://www.googleapis.com/admin/directory/v1/${this.customer}${this.tipo}/${id}`,
         method: "PUT",
         body: info
      });
      request.operacion = "actualizar";
      request.id = id;
      request.entidad = this.constructor.name;

      return request;
   }

   /**
    * Borra un usuario.
    *
    * @param {String} id: Identificador o dirección del usuario.
    */
   borrar(id) {
      id = this.constructor.parseID(id);
      const request = gapi.client.request({
         path: `https://www.googleapis.com/admin/directory/v1/${this.customer}${this.tipo}/${id}`,
         method: "DELETE"
      });
      request.operacion = "borrar";
      request.id = id;
      request.entidad = this.constructor.name;

      return request;
   }

   /**
    * Crea, actualiza o borra según sea más apropiado.
    *
    * @param {Object} entidad: Un objeto de la forma {grupo: entidad}
    *    o {usuario: entidad}. La clave sirve para saber en tipo de entidad, y
    *    el valor representa la propia entidad.
    *
    * La función decide qué operación hacer dependiendo del valor de entidad
    * suministrado:
    *
    * * Si la entidad es una cadena, entonces se sobrentiende que tal cadena
    *   es un ID o un email y lo que se pretende es borrar.
    * * En caso de ser un objeto:
    *   - Si posee ID, se actualizan datos (email, name, etc.)
    *   - Si no lo posee, se intenta crear.
    *   - Excepcionalmente, si la entidad posee el atributo "modify" a true,
    *     se procederá a la modificación aunque no haya identificador.
    */
   operar(info) {
      let id, email, operacion;

      if(typeof info === "string") operacion = "borrar";
      else if(!info[this.idField] && !info[this.emailField]) {
         throw new Error(`Imposible operar con el ${this.tipo}: no hay identificador ni dirección única.`)
      }
      else if(info.action) {
         operacion = info.action
         info = Object.assign({}, info);
         delete info.action;
      }
      else if(info[this.idField]) operacion = "actualizar";
      else operacion = "crear";

      return this[operacion](info);
   }

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
   static listarPaginado(args, listattr, limit) {
      function getAttr(obj, list) {
         list = list.split(".");
         while(list.length>0) obj = obj[list.shift()];
         return obj;
      }

      args.params.maxResults = Math.min(limit || args.params.maxResults, args.params.maxResults);

      // Iterador asíncrono. Si se han de hacer varias consultas para
      // obtener la lista completa, va devolviendo loss resultados de las
      // consultas y no espera a hacerlas todas.
      async function* iter() {
         const iargs = Object.assign({}, args);
         let   ilimit = limit;
         iargs.params = Object.assign({}, args.params);

         do {
            const response = await gapi.client.request(iargs),
                  buffer = getAttr(response, listattr);

            iargs.params.pageToken = response.result.nextPageToken;

            while(buffer && buffer.length) yield buffer.shift();
            if(ilimit) ilimit -= iargs.params.maxResults;

         } while(iargs.params.pageToken && (ilimit === undefined || ilimit > 0));
      }

      return {
         [Symbol.asyncIterator]: iter,
         then: async function(callback, fallback) {
               const lista = [];
               try {
                  for await (const user of iter()) lista.push(user);
               }
               catch(error) { return fallback(error); }
               return callback(lista);
         },
         operacion: "listar",
         tipo: this.name
      }
   }

   /**
    * Comprueba si la cadena proporcionada es una identificador.
    *
    * @param {String} string: Cadena a comprobar.
    */
   static isID(string) {
      throw new Error("Método estático abstracto");
   }
}


export class GrUsers extends EntidadBase {
   static parseID(string) {
      return this.isID(string)?string:fqda(string);
   }

   listar(args) {
      args = args || {};
      const limit = args.limit;
      delete args.limit;
      
      args = Object.assign({orderBy: 'email'}, args)

      const query_params = {
         path: `https://www.googleapis.com/admin/directory/v1/${this.tipo}`,
         method: "GET",
         params: args
      }

      return this.constructor.listarPaginado(query_params, `result.${this.tipo}`, limit);
   }
}


export class OuSchemas extends EntidadBase {
   static parseID(string) { return string; }

   listar(args) {
      const request = gapi.client.request({
         path: `https://www.googleapis.com/admin/directory/v1/customer/my_customer/${this.tipo}`,
         method: "GET",
         params: args
      });

      request.operacion = "listar";
      request.tipo = this.constructor.name;
      return request;
   }
}
