// Procesa la configuración.

import DEFAULT_CONFIG from "./config.json";
import {normalizar, generarCuentaDepartamento} from "../utils.js";
import {fqda} from "../api/misc.js";
import * as google from "../api/google";
import Batch from "../api/batch.js"; 

const default_config = JSON.stringify(DEFAULT_CONFIG);

/**
 * Genera la organización del dominio de G-Suite
 * a partir de la semilla de configuración.
 */
export async function inicializar() {
   const res = {},
         seed = JSON.parse(default_config),
         // {email1: grupo, email2: grupo, etc.}: Relación de grupos existentes.
         existentes = Object.fromEntries((await google.grupo.listar()).map(gr => [gr.email, gr])),
         // {path1: ou, path2: ou, etc.}. Relación de todas las ou existentes.
         ous = Object.fromEntries(((await google.ou.listar()).result.organizationUnits || []).map(ou => [ou.name, ou])),
         esquemas = Object.fromEntries(((await google.esquema.listar()).result.schemas || []).map(sc => [sc.schemaName, sc]));

   // Intenta averiguar los IDs existentes y crea los grupos y ou inexistentes.
   async function vuelta(seed) {
      const batch = new Batch();

      // Esquemas de usuario: apuntamos IDs o los marcamos como inexistentes.
      const esq_inexistentes = {}
      for(const sc of Object.values(seed.esquemas)) {
         try {
            sc.schemaId = esquemas[sc.schemaName].schemaId;
         }
         catch(error) {
            esq_inexistentes[sc.schemaName] = sc;
         }
         batch.add(google.esquema.operar(sc));
      }

      // Unidades organizativas: apuntamos IDs o las marcamos como inexistentes.
      const ous_inexistentes = {};
      for(const ou of Object.values(seed.ou)) {
         if(ou.name && !ou.name.startsWith("BORRAR-")) ou.name = "BORRAR-" + ou.name;  // TODO: Eliminar esto.
         try { 
            ou.orgUnitId = ous[ou.name].orgUnitId;
            ou.orgUnitPath = ou.orgUnitPath || ous[ou.name].orgUnitPath;
         }
         catch(error) {
            ous_inexistentes[ou.name] = ou;
         }
         batch.add(google.ou.operar(ou));
      }

      // Contenedores: apuntamos IDs o los marcamos como inexistentes.
      const cont = seed.contenedores,
            inexistentes = {};
      for(const attr in cont) {
         cont[attr].email = fqda(cont[attr].email || generarCuentaDepartamento(cont[attr].name));
         if(!cont[attr].email.startsWith("borrar-")) cont[attr].email = "borrar-" + cont[attr].email;  // TODO: Eliminar esto.

         try { cont[attr].id = existentes[cont[attr].email].id }
         catch(error) {
            inexistentes[cont[attr].email] = cont[attr];
         }
         batch.add(google.grupo.operar(cont[attr]));
      }

      // Departamentos: apuntamos IDs o los marcamos como inexistentes.
      for(const dpto of seed.departamentos) {
         dpto.email = fqda(dpto.email || generarCuentaDepartamento(dpto.name));
         if(!dpto.email.startsWith("borrar-")) dpto.email = "borrar-" + dpto.email;  // TODO: Eliminar esto.
         dpto.description = `Departamento de ${dpto.name}`;
         try { dpto.id = existentes[dpto.email].id }
         catch(error) {
            inexistentes[dpto.email] = dpto;
         }
         batch.add(google.grupo.operar(dpto));
      }

      const nocreados = {
         departamentos: [],
         contenedores: {},
         ou: {},
         esquemas: {}
      };

      // Apunta los identificadores de grupos y ous recientemente creados.
      for await(const [key, result] of batch) {
         if(result.operacion === "actualizar") continue;
         // Ha habido un error en la creación de la entidad.
         // Se apuntan tales errores para volver a intentarlo.
         switch (result.request.entidad) {
            case "Groups":
               const grupo = inexistentes[key];
               if(!grupo) continue;
               if(result.value) grupo.id = result.value.id;
               else if(dpto.description.startsWith("Departamento")) {
                  nocreados.departamentos.push(dpto);
               }
               else nocreados.contenedores[key] = dpto;
               break;
            case "OrgUnits":
               const ou = ous_inexistentes[key];
               if(!ou) continue;
               if(result.value) {
                  ou.orgUnitId = result.value.orgUnitId;
                  ou.orgUnitPath = result.value.orgUnitPath;
               }
               else nocreados.ou[key] = ou;
               break;
            case "Schemas":
               const sc = esq_inexistentes[key];
               if(!sc) continue;
               if(result.value) sc.schemaId = result.value.schemaId;
               else nocreados.esquemas[key] = sc;
               break;
            default:
               console.error(`${result.request.tipo}: Tipo de entidad desconocido.`)
               continue
         }
      }

      return nocreados;
   }

   function contarEntidades(seed) {
      return Object.keys(seed.ou || {}).length + 
                           (seed.departamentos || []).length + 
                              Object.keys(seed.contenedores || {}).length +
                                 Object.keys(seed.esquemas || {}).length;

   }
      
   function wait() {
      return new Promise(resolve => setTimeout(() => resolve(true), parseInt(500 + Math.random()*1000)));
   }

   let contador = 0, nocreados = seed,
       delay, cuantos_prev, cuantos_post;
   do {
      cuantos_prev = contarEntidades(nocreados);
      nocreados = await vuelta(nocreados);
      cuantos_post = contarEntidades(nocreados);
      if(cuantos_prev === cuantos_post) contador++;
   } while(cuantos_post > 0 && contador < 3 && await wait());

   const batch = new Batch();

   for(const dpto of seed.departamentos) {
      if(!dpto.id) {
         console.error(`${dpto.email} no ha podido añadirse al claustro por no tener ID`);
         continue;
      }
      batch.add(google.miembro.agregar(seed.contenedores.claustro.id, dpto.id));
   }

   await batch;

   if(cuantos_post > 0) {
      this.auth.fire("configerror", {pending: nocreados});
   }

   return seed;
}
