/**
 * Manipula la configuración del programa almacenada en el Drive del usuaario.
 *
 * @param {String} name: Nombre del fichero de configuración.
 */
function Config(name) {
   Object.defineProperties(this, {
      "_id": {
         enumerable: false,
         writable: true,
         value: null
      },
      "id": { 
         get: function() {
            if(!this._id) this._id = getFileID(name);
            return this._id;
         }
      }
   });
}


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
               }).then(response => {
                     const id = response.result.id;
                     gapi.client.request({
                        path: "https://www.googleapis.com/upload/drive/v3/files/" + id,
                        method: "PATCH",
                        body: '{}' // Fichero vacío.
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
 * Obtiene el contenido del fichero de configuración
 *
 * @returns {Promise} Promesa con el contenido.
 */
Config.prototype.read = function() {
   return new Promise(async resolve => {
            const id = await this.id;

            gapi.client.request({
               path: "https://www.googleapis.com/drive/v3/files/" + id,
               method: "GET",
               params: {alt: "media"}  // Para que devuelva el fichero y no los metadatos.
            }).then(response => resolve(response.result));
          });
}


/**
 * Sobrescribe el fichero de configuración.
 *
 * @param {Object} content: Objeto que será el nuevo contenido.
 *
 * @returns {Promise} Promesa con la respuesta a la acción.
 */
Config.prototype.write = function(content) {
   return new Promise(async resolve => {
            gapi.client.request({
               path: "https://www.googleapis.com/upload/drive/v3/files/" + await this.id,
               method: "PATCH",
               body: JSON.stringify(content),
            }).then(response => resolve(response));
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
                  this._id = null;
                  resolve(response);
               });
          });
}

export default Config; 
