// Procesa la configuración.

import {normalizar} from "../utils.js";
import * as Grupos from "../api/grupos.js"; 
import * as Miembros from "../api/miembros.js"; 


export function crearNombreUsuario(nombre) {
   return normalizar(nombre).replace(/ /g, "");
}


export function inicializar(config) {

   return new Promise((resolve, reject) => {

      inicializarGrupo(config.claustro, config.departamentos).then(response => {
         const res = response;

         const creacion = new Promise((resolve, reject) => {
            Grupos.crear(config.alumnos)
               .then(response => {
                  res.creacion[config.alumnos.email] = {grupo: response.result, code: response.status};
                  resolve(response.result.id);
               })
               .catch(error => {
                  res.creacion[config.alumnos.email] = {code: error.result.error.code, message: error.result.error.message};
                  Grupos.obtener(config.alumnos.email)
                     .then(response => {
                        resolve(response.result.id);
                     })
                     .catch(error => {
                        reject(error.result);
                     });
               });
         });

         creacion.then(id => {
            config.alumnos.id = id;
            this.set(config).then(response => {
               resolve(res);
            });
         });
      });
   });
}


function getBatchResult(result) {
   return Object.fromEntries
            (Object.entries(result).map(
               ([email, result]) => {
                  const error = result.result.error;
                  if(error) result = {code: error.code, message: error.message}
                  else result = {grupo: result.result, code: result.status}
                  return [email, result];
               }));
}


/**
 * Puebla de miembros un grupo.
 *
 * @param {Object} grupo: Objeto que representa al grupo y que se intenta crear,
 *    por si no existe. El objeto es {email: xxx, name: xxx, description: xxx}
 * @param {array} miembros: Lista de miembros que pertenencen al grupo.
 */
function inicializarGrupo(grupo, miembros) {
   return new Promise((resolve, reject) => {

      const res = {},
            batch = gapi.client.newBatch();

      let   miembros_extendido = [grupo].concat(miembros);

      // Intenta añadir el grupo contenedor y los miembros.
      for(const m of miembros_extendido) {
         batch.add(Grupos.crear(m), {id: m.email});
      }

      miembros_extendido = Object.fromEntries(miembros_extendido.map(m => [m.email, m]));

      const creacion = new Promise(resolve => {
         batch.then(response => {
            const creacion = getBatchResult(response.result);
            for(const [email, result] of Object.entries(creacion)) {
               if(!result.grupo) continue;
               miembros_extendido[email].id = result.grupo.id;
               delete miembros_extendido[email];
            }
            resolve(creacion);
            // Cuando todas las operaciones fallan, batch da error.
         }, error => resolve(Object.fromEntries(
                              Object.keys(miembros_extendido).map(email => [email, {code: 409, message: "Entity already exists."}]))));
      });

      const obtencion = new Promise(resolve => {
         creacion.then(result => {
            res.creacion = result;
            const existentes = Object.keys(miembros_extendido);
            if(existentes.length === 0) resolve(res);
            const batch = gapi.client.newBatch();
            existentes.forEach(m => batch.add(Grupos.obtener(m), {id: m}));
            batch.then(response => {
               for(const [email, result] of Object.entries(response.result)) {
                  if(result.result.error) {
                     throw new Error(`No se pueden obtener el identificador de ${email}`)
                  }
                  else {
                     miembros_extendido[email].id = result.result.id;                     
                  }
               }
               resolve(res);
            }).catch(error => {
               throw new Error("No se pueden obtener los identificadores de los grupos")
            });
         });
      });

      obtencion.then(result => {
         const batch = gapi.client.newBatch();
         miembros.forEach(m => batch.add(Miembros.agregar(grupo.id, m.id), {id: m.email}));
         batch.then(response => {
            res.insercion = [];
            for(const [email, result] of Object.entries(response.result)) {
               if(!result.result.error) res.insercion.push(email);
               
            }
            resolve(res);
         }).catch(error => {
            res.insercion = [];
            resolve(res);
         });
      });
   });
}
