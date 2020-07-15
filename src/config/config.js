import DEFAULT_CONFIG from "./config.json";
import {procesar} from "./departamentos.js";

const singleton = null;

/**
 * Manipula la configuración del programa almacenada en el Drive del usuaario.
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
      "name": { value: name },
      "_nueva": { 
         enumerable: false,
         writable: true,
         value: false
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
      get() {
         if(!this._id) this._id = getFileID(this.name);
         return this._id;
      }
   },
   nueva: {
      get() { return this._nueva };
   }
});


/**
 * Obtiene el identificador del fichero de configuración y, si no
 * existe, crea el fichero JSON vació y devuelve su identificador.
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
            case 0:  // El fichero no existe: hay que crearlo.
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
                        body: await Config.procesar(DEFAULT_CONFIG)
                     }).then(response => resolve(id));
                     this._nueva = true;
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
                  this._content = response.result;
                  resolve(response.result);
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
               body: JSON.stringify(content),
            }).then(response => {
                  this._content = content;
                  resolve(response);
               });
          });
}


Config.procesar = function(info) {
   return procesar(info);
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
                  this._nueva = true;
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

export default Config; 
