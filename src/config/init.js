// Procesa la configuración.

import {normalizar} from "../utils.js";
import * as Grupos from "../api/grupos.js"; 
import * as Miembros from "../api/miembros.js"; 
import * as Ou from "../api/ou.js"; 


// Simplifica los resultados de un proceso batch.
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


export function inicializar(config) {
   crearObtener(Object.values(config.contenedores), true).then(creacion => {
      poblar(config.contenedores.claustro, config.departamentos).then(response => {
         Object.assign(response.creacion, creacion);
         crearOus(config.ou).then(r => {
            response.ou = r;
            this.set(config);
         });
      });
   });
}


/**
 * Crea los grupos proporcionados o, si existen, obtiene sus IDs
 * para apuntarlos en cada objeto.
 *
 * @param {Array} grupos: Lista de objetos que representan los grupos.
 * @param {boolean} vaciar: Si se desea vaciar los grupos.
 *
 * @returns {Object}: Resulrado de la operación en que las claves
 *    son las direcciones email de cada grupo y los valores un objeto
 *    que permite conocer qué ocurrió: si el grupo correspondiente, se creó;
 *    se obtuvo su ID o si falló por completo la operación.
 */
function crearObtener(grupos, vaciar) {
   return new Promise((resolve, reject) => {

      const res = {},
            batch = gapi.client.newBatch();

      for(const grupo of grupos) {
         batch.add(Grupos.crear(grupo), {id: grupo.email});
      }

      // Pasa el array [gr1, gr2, ...]
      // al objeto {gr1.email: gr1, gr2.email: gr2, ...}
      const grupos_obj = Object.fromEntries(grupos.map(grupo => [grupo.email, grupo]));

      const creacion = new Promise(resolve => {

         batch.then(response => {
            const creacion = getBatchResult(response.result);
            for(const [email, result] of Object.entries(creacion)) {
               if(!result.grupo) continue;
               grupos_obj[email].id = result.grupo.id;
               delete grupos_obj[email];
            }
            resolve(creacion);
            // Cuando todas las operaciones fallan, batch da error.
         }, error => resolve(Object.fromEntries(
                              Object.keys(grupos_obj).map(email => [email, {code: 409, message: "Entity already exists."}]))));
      });

      creacion.then(result => {
         const existentes = Object.keys(grupos_obj);
         // No existía ningún grupo y, por tanto,
         // se crearon todos y ya se tiene su ID.
         if(existentes.length === 0) {
            resolve(res);
            return;
         }

         const batch = gapi.client.newBatch();
         existentes.forEach(email => {
            batch.add(Grupos.obtener(email), {id: email})
            //if(vaciar) batch.add(Miembros.vaciar(email));
         });
         batch.then(async response => {
            for(const [email, result] of Object.entries(response.result)) {
               if(!email.includes('@')) continue;

               if(result.result.error) {
                  // TODO: Añadirlos a res como error.
                  throw new Error(`No se pueden obtener el identificador de ${email}`)
                  existentes.splice(existentes.indexOf(email), 1);
               }
               else {
                  grupos_obj[email].id = result.result.id;                     
               }
            }
            if(vaciar && existentes.length > 0) {
               const batch = gapi.client.newBatch();
               let procesar = false;

               for(const email of existentes) {
                  for await (const miembro of Miembros.listar(email).iter()) {
                     batch.add(Miembros.borrar(email, miembro.email), {id: miembro.email});
                     procesar = true;
                  }
               }

               if(procesar) batch.then(response => resolve(result));
               else resolve(result);
            }
            else resolve(result);
         }).catch(error => {
            // TODO: Añadirlos a res como error.
            throw new Error("No se pueden obtener los identificadores de los grupos")
         });
      });
   });
}


/**
 * Puebla de miembros un grupo.
 *
 * @param {Object} grupo: Objeto que representa a un grupo ya existente.
 * @param {array} miembros: Lista de miembros que pertenencen al grupo.
 */
function poblar(grupo, miembros) {
   return new Promise((resolve, reject) => {
      const res = {};

      crearObtener(miembros).then(response => {
         const batch = gapi.client.newBatch();
         res.creacion = response;

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


function crearOus(ous) {
   if(Object.keys(ous).length === 0) return Promise.resolve({result: null});

   const batch = gapi.client.newBatch();

   for(const ou of Object.values(ous)) {
      batch.add(Ou.crear(ou), {id: ou.name});
   }

   const creacion = new Promise(resolve => {
      batch
         .then(response => {
            resolve(getBatchResult(response.result));
         })
         .catch(error => resolve(Object.fromEntries(
                              Object.keys(ous).map(name => [name, {code: 409, message: "Entity already exists."}]))));
   });

   return new Promise((resolve, reject) => {
      creacion.then(result => {
         Ou.listar().then(response => {
            const result = Object.fromEntries(response.result.organizationUnits.map(ou => [ou.name, ou]));
            for(const ou of Object.values(ous)) {
               const id = result[ou.name].orgUnitId;
               if(id === undefined) {
                  reject("Imposible obtener el identificador de la unidad organizativa ''");
                  return;
               }
               ou.orgUnitId = id;
            }
            resolve(result);
         });
      });
   });
}
