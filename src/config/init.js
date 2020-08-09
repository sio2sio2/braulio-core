// Procesa la configuración.

import DEFAULT_CONFIG from "./config.json";
import {normalizar, generarCuentaDepartamento} from "../utils.js";
import {patchString} from "../api/misc.js";
import * as google from "../api/google";
import newBatch from "../api/batch.js"; 

const default_config = JSON.stringify(DEFAULT_CONFIG);

/**
 * Genera la organización del dominio de G-Suite
 * a partir de la semilla de configuración.
 */
export async function inicializar() {
   const res = {},
         seed = JSON.parse(default_config),
         // {email1: grupo, email2: grupo, etc.}: Relación de grupos existentes.
         existentes = Object.fromEntries((await google.grupo.listar().get()).map(gr => [gr.email, gr])),
         // {path1: ou, path2: ou, etc.}. Relación de todas las ou existentes.
         ous = Object.fromEntries((await google.ou.listar()).result.organizationUnits.map(ou => [ou.orgUnitPath, ou]));

   // Intenta averiguar los IDs existentes y crea los grupos y ou inexistentes.
   async function vuelta(seed) {
      const batch = newBatch();

      // Unidades organizativas: apuntamos IDs o las marcamos como inexistentes.
      const ous_inexistentes = {};
      for(const ou of Object.values(seed.ou)) {
         if(ou.name && !ou.name.startsWith("BORRAR-")) ou.name = "BORRAR-" + ou.name;  // TODO: Eliminar esto.
         try { ou.orgUnitId = ous[`/${ou.name}`].orgUnitId; }
         catch(error) {
            ous_inexistentes[`/${ou.name}`] = ou;
         }
         batch.add(ou.orgUnitId?google.ou.actualizar(ou):google.ou.crear(ou), {id: `${ou.name}`});
      }

      // Contenedores: apuntamos IDs o los marcomos como inexistentes.
      const cont = seed.contenedores,
            inexistentes = {};
      for(const attr in cont) {
         cont[attr].email = patchString(cont[attr].email || generarCuentaDepartamento(cont[attr].name));
         if(!cont[attr].email.startsWith("borrar-")) cont[attr].email = "borrar-" + cont[attr].email;  // TODO: Eliminar esto.

         try { cont[attr].id = existentes[cont[attr].email].id }
         catch(error) {
            inexistentes[cont[attr].email] = cont[attr];
         }
         batch.add({grupo: cont[attr]});
      }

      // Departamentos: apuntamos IDs o los marcamos como inexistentes.
      for(const dpto of seed.departamentos) {
         dpto.email = patchString(dpto.email || generarCuentaDepartamento(dpto.name));
         if(!dpto.email.startsWith("borrar-")) dpto.email = "borrar-" + dpto.email;  // TODO: Eliminar esto.
         dpto.description = `Departamento de ${dpto.name}`;
         try { dpto.id = existentes[dpto.email].id }
         catch(error) {
            inexistentes[dpto.email] = dpto;
         }
         batch.add({grupo: dpto});
      }

      const creacion = await batch.end(),
            nocreados = {};

      // Apunta los identificadores de los grupos y ou recientemente creados.
      for(const [key, result] of Object.entries(creacion)) {
         // Ha habido un error en la creación del ou o el grupo.
         // Se apuntan tales errores para volver a intentarlo.
         if(!result.value) {
            if(key.startsWith("/")) {
               const ou = ous_inexistentes[key];
               if(!ou) continue;
               nocreados.ou = nocreados.ou || {};
               nocreados.ou[key] = {name: key};
            }
            else {
               const dpto = inexistentes[key];
               if(!dpto) continue;
               if(dpto.description.startsWith("Departamento")) {
                  nocreados.departamentos = nocreados.departamentos || []
                  nocreados.departamentos.push(dpto);
               }
               else {
                  nocreados.contenedores = nocreados.contenedores || {}
                  nocreados.contenedores[key] = dpto;
               }
            }
            continue;
         }
         if(result.value.email) {
            if(!inexistentes[result.value.email]) continue;
            inexistentes[result.value.email].id = result.value.id;
         }
         else {
            if(!ous_inexistentes[result.value.orgUnitPath]) continue;
            ous_inexistentes[result.value.orgUnitPath].orgUnitId = result.value.orgUnitId;
         }
      }

      return nocreados;
   }

   function contarEntidades(seed) {
      return Object.keys(seed.ou || {}).length + 
                           (seed.departamentos || []).length + 
                              Object.keys(seed.contenedores || {}).length;

   }
      
   function wait() {
      return new Promise(resolve => setTimeout(() => resolve(true), parseInt(Math.random()*1000)));
   }

   let contador = 0, nocreados = seed,
       delay, cuantos_prev, cuantos_post;
   do {
      cuantos_prev = contarEntidades(nocreados);
      nocreados = await vuelta(nocreados);
      cuantos_post = contarEntidades(nocreados);
      if(cuantos_prev === cuantos_post) contador++;
   } while(cuantos_post > 0 && contador < 3 && await wait());

   const batch = newBatch();

   for(const dpto of seed.departamentos) {
      if(!dpto.id) {
         console.error(`${dpto.email} no ha podido añadirse al claustro por no tener ID`);
         continue;
      }
      batch.add(google.miembro.agregar(seed.contenedores.claustro.id, dpto.id));
   }

   await batch.end();

   console.log("DEBUG", nocreados, seed);

   if(cuantos_post > 0) {
      this.auth.fire("configerror", {pending: nocreados});
   }

   return seed;
}
