import DEFAULT_CONFIG from "./config.json";
import * as utils from "./utils.js";
import {inicializar} from "./init.js";
import * as grupos from "../api/grupos.js";
import * as ou from "../api/ou.js";

const default_config = JSON.stringify(DEFAULT_CONFIG);
let singleton = null;

/**
 * Manipula la configuración del programa almacenada en el Drive del usuaario.
 * Se utiliza el patrón Singleton para devolver siempre el mismo objeto
 *
 * @param {Object} auth: Objeto de autenticación al que se asocia la configuración.
 * @param {String} name: Nombre del fichero de configuración.
 */
function Config(auth, name) {
   if(singleton) return singleton;
   singleton = this;

   Object.defineProperties(this, {
      "name": {
         enumerable: true,
         writable: false,
         value: name
      },
      "auth": {
         enumerable: true,
         writable: false,
         value: auth
      },
      "_id": {
         enumerable: false,
         writable: true,
         value: null
      },
      "_content": {
         enumerable: false,
         writable: true,
         value: null
      }
   });
}

Object.defineProperties(Config.prototype, {
   /**
    * Identificador del fichero de configuración en el Drive.
    */
   id: {
      get() { return this._id; }
   },
   content: {
      get() { return this._content; }
   },
   status: {
      get() {
         if(this.content === null) return "UNAVAILABLE";
         else if(Object.keys(this.content).length === 0) return "NOCONFIG";
         else return "READY";
      }
   },
   utils: { value: utils }
});


/**
 * Obtiene el identificador del fichero de configuración y, si no
 * existe, crea el fichero JSON vació y devuelve su identificador.
 *
 * @returns {Promise}: Promesa con el identificador.
 */
Config.prototype.init = function() {
   if(this.id) return;

   gapi.client.request({
      path: "https://www.googleapis.com/drive/v3/files",
      method: "GET",
      params: {
         spaces: "appDataFolder",
         q: "name = '" + this.name + "'"
      }
   }).then(response => {
      const files = response.result.files;

      switch(files.length) {
         case 0:
            console.warn("No hay configuración previa");
            const params = {
                     name: this.name,
                     parents: ['appDataFolder'],
                     description: "Configuración de Braulio",
                     mimeType: "application/json"
                  };
            gapi.client.request({
               path: "https://www.googleapis.com/drive/v3/files",
               method: "POST",
               body: params
            }).then(response => {
                  this._id = response.result.id;
                  this.set(null);  // Almacenamos una configuración vacía.
               });
            break;
         case 1:
            // El fichero existe, se devuelve su ID.
            this._id = files[0].id;
            gapi.client.request({
               path: "https://www.googleapis.com/drive/v3/files/" + this.id,
               method: "GET",
               params: {alt: "media"}  // Para que devuelva el fichero y no los metadatos.
            }).then(response => {
                  // Añadimos emails, descripciones, etc.
                  getInfo(response.result).then(response => {
                     this._content = response;
                     this.auth.fire("onready", {action: "get"});
                  });
               });
            break;
         default:
            throw new Error("Hay más de un fichero de configuración");
      }
   });
}


/**
 * Fija la configuración en el Drive.
 *
 * @param {Object} content: Objeto que será el nuevo contenido.
 */
Config.prototype.set = function(content) {
   if(this.id === null) throw new Error("Configuración no inicializada");
   const body = content?JSON.stringify(mrproper(JSON.parse(JSON.stringify(content)))):{},
         prestatus = this.status;

   this._content = content || null;

   gapi.client.request({
      path: "https://www.googleapis.com/upload/drive/v3/files/" + this.id,
      method: "PATCH",
      body: body,
   }).then(response => {
         if(content) {
            // El evento sólo se desencadena si previamente no había configuración.
            if(prestatus !== "READY") this.auth.fire("onready", {action: "set"});
            this.auth.fire("savedconfig");
         }
         else {
            const seed = JSON.parse(default_config);
            // Este método no es enumerable,
            // así que no aparecerá al recorrer el objeto.
            Object.defineProperty(seed, "set", {
               value: config => inicializar.call(this, config || seed)
            });
            this.auth.fire("noconfig", {seed: seed});
         }
      });
}


/**
 * Elimina el fichero de configuración
 *
 * @returns {Promise} Promesa con la respuesta a la eliminación.
 */
Config.prototype.remove = function() {
   if(!this.id) throw new Error("Configuración no inicializada");

   return new Promise(resolve => {
      gapi.client.request({
         path: "https://www.googleapis.com/drive/v3/files/" + this.id,
         method: "DELETE"
      }).then(response => {
            this.reset();
            resolve(response);
         });
   });
}


/**
 * Resetea el objeto para dejarlo en el mismo estado
 * qye cuando se crea (sin identificador ni contenido).
 *
 */
Config.prototype.reset = function() {
   this._content = this._id = null;
   this.auth.fire("onreset");
}


/*
Config.prototype.removeAll = function() {
   const batch = gapi.client.newBatch();
   gapi.client.request({
      path: "https://www.googleapis.com/drive/v3/files",
      method: "GET",
      params: { spaces: "appDataFolder", }
   }).then(response => {
         response.result.files.forEach(f => {
            batch.add(gapi.client.request({
                  path: "https://www.googleapis.com/drive/v3/files/" + f.id,
                  method: "DELETE"
               }));
         });
         if(response,result.files.length > 0) {
            batch.then(response => console.log("DEBUG: Borrado", response));
         }
   });
}
*/


/**
 * Elimina de la configuración proporcionada
 * las dirección de email, las descripciones y los nombres
 * (útil para guardar la configuración en el Drive).
 */
function mrproper(config) {
   if(config.email && config.id) {
      delete config.email;
      delete config.description;
      delete config.name;
   }
   if(config.name && config.orgUnitId) {
      delete config.orgUnitPath;
      delete config.name;
   }
   for(const attr in config) {
      if(!config[attr]) continue;
      switch(config[attr].constructor) {
         case Object:
            mrproper(config[attr]);
            break;
         case Array:
            for(const element of config[attr]) mrproper(element);
      }
   }

   return config;
}


/**
 * Añade a la configuración email, descripción y nombre.
 * (Útil tras cargarla desde el Drive).
 */
function getInfo(config, deep, res) {
   deep = deep || 0;
   res = res || {};

   if(config.id || config.orgUnitId) {
      res[config.id || config.orgUnitId] = config;
   }
   for(const attr in config) {
      switch(config[attr].constructor) {
         case Object:
            getInfo(config[attr], deep + 1, res);
            break;
         case Array:
            for(const element of config[attr]) getInfo(element, deep + 1, res);
      }
   }

   if(deep > 0) return
   if(Object.keys(res).length === 0) return Promise.resolve(config);

   const batch = gapi.client.newBatch();
   for(const id in res) {
      if(res[id].id) batch.add(grupos.obtener(id), {id: id});
      else batch.add(ou.obtener(id), {id: id});
   }

   return new Promise((resolve, reject) => {
      batch.then(response => {
         for(let [id, result] of Object.entries(response.result)) {
            if(result.error) reject(`Imposible obtener la información del grupo con ID ${id}`);
            result = result.result;
            if(result.email) res[id].email = result.email;
            if(result.name) res[id].name = result.name;
            if(result.description) res[id].description = result.description;
            if(result.orgUnitPath) res[id].orgUnitPath = result.orgUnitPath;
         }
         resolve(config);
      }).catch(error => {
         reject("Imposible obtener la información de los grupos");
      });
   });
}

export default Config; 
