import DEFAULT_CONFIG from "./config.json";
import * as utils from "./utils.js";
import {inicializar} from "./init.js";
import {obtGrupo} from "../api/grupos.js";

const default_config = JSON.stringify(DEFAULT_CONFIG);
let singleton = null;

/**
 * Manipula la configuración del programa almacenada en el Drive del usuaario.
 * Se utiliza el patrón Singleton para devolver siempre el mismo objeto
 *
 * @param {String} name: Nombre del fichero de configuración.
 */
function Config(name) {
   if(singleton) return singleton;
   singleton = this;

   Object.defineProperties(this, {
      "_id": {
         enumerable: false,
         writable: true,
         value: null
      },
      "name": { value: name || "config.json" },
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
      get() {
         if(!this._id) this._id = getFileID(this.name);
         return this._id;
      }
   },
   /**
    * Promesa qie indica si el fichero de configuración está vacío.
    */
   vacia: {
      get() { 
         return new Promise(async resolve => {
                  const config = await this.get();
                  resolve(Object.keys(config).length === 0);
                });
      }
   },
   utils: { value: utils },
   inicializar: { value: inicializar},
   seed: {
      get() { return JSON.parse(default_config); }
   }
});


/**
 * Obtiene el identificador del fichero de configuración y, si no
 * existe, crea el fichero JSON vació y devuelve su identificador.
 *
 * @returns {Promise}: Promesa con el identificador.
 */
function getFileID(name) {
   return new Promise((resolve, reject) => {
      gapi.client.request({
         path: "https://www.googleapis.com/drive/v3/files",
         method: "GET",
         params: {
            spaces: "appDataFolder",
            q: "name = '" + name + "'"
         }
      }).then(response => {
         const files = response.result.files;
         switch(files.length) {
            case 0:  // El fichero no existe: se crea
               console.warn("No hay configuración previa");
               const params = {
                        name: name,
                        parents: ['appDataFolder'],
                        description: "Configuración de Braulio",
                        mimeType: "application/json"
                     };
               gapi.client.request({
                  path: "https://www.googleapis.com/drive/v3/files",
                  method: "POST",
                  body: params
               }).then(async response => {
                     const id = response.result.id;
                     gapi.client.request({
                        path: "https://www.googleapis.com/upload/drive/v3/files/" + id,
                        method: "PATCH",
                        body: {}
                     }).then(response => resolve(id));
                  });
               break;
            case 1:  // El fichero existe, se devuelve su ID.
               resolve(files[0].id);
               break;
            default:
               reject("Hay más de un fichero de configuración");
         }
      });
   });
}


/**
 * Obtiene la configuración.
 *
 * @returns {Promise} Promesa con el contenido.
 */
Config.prototype.get = function() {
   return new Promise(async resolve => {
            if(this._content) resolve(this._content);

            const id = await this.id;

            gapi.client.request({
               path: "https://www.googleapis.com/drive/v3/files/" + id,
               method: "GET",
               params: {alt: "media"}  // Para que devuelva el fichero y no los metadatos.
            }).then(response => {
                  // Añadimos emails, descripciones, etc.
                  getInfo(response.result).then(response => {
                     this._content = response;
                     resolve(response);
                  });
               });
          });
}


/**
 * Fija la configuración en el Drive.
 *
 * @param {Object} content: Objeto que será el nuevo contenido.
 *
 * @returns {Promise} Promesa con la respuesta a la acción.
 */
Config.prototype.set = function(content) {
   return new Promise(async resolve => {
            gapi.client.request({
               path: "https://www.googleapis.com/upload/drive/v3/files/" + await this.id,
               method: "PATCH",
               body: JSON.stringify(mrproper(content)),
            }).then(response => {
                  this._content = content;
                  resolve(response);
               });
          });
}


/**
 * Elimina el fichero de configuración
 *
 * @returns {Promise} Promesa con la respuesta a la eliminación.
 */
Config.prototype.remove = function() {
   return new Promise(async resolve => {
            gapi.client.request({
               path: "https://www.googleapis.com/drive/v3/files/" + await this.id,
               method: "DELETE"
            }).then(response => {
                  this._content = this._id = null;
                  resolve(response);
               });
          });
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
   for(const attr in config) {
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

   if(config.id) {
      res[config.id] = config;
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
   if(Object.keys(res) === 0) return Promise.resolve(config);

   const batch = gapi.client.newBatch();
   for(const id in res) {
      batch.add(obtGrupo(id), {id: id});
   }

   return new Promise((resolve, reject) => {
      batch.then(response => {
         for(let [id, result] of Object.entries(response.result)) {
            if(result.error) reject(`Imposible obtener la información del grupo con ID ${id}`);
            result = result.result;
            if(result.email) res[id].email = result.email;
            if(result.name) res[id].name = result.name;
            if(result.description) res[id].description = result.description;
         }
         resolve(config);
      }).catch(error => {
         reject("Imposible obtener la información de los grupos");
      });
   });
}

export default Config; 
