// Procesa la configuración.

import DEFAULT_CONFIG from "./config.json";
import {normalizar, generarCuentaDepartamento} from "../utils.js";
import {patchString} from "../api/misc.js";
import * as Grupos from "../api/grupos.js"; 
import * as Miembros from "../api/miembros.js"; 
import * as Ou from "../api/ou.js"; 
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
         existentes = Object.fromEntries((await Grupos.listar().get()).map(gr => [gr.email, gr])),
         // {path1: ou, path2: ou, etc.}. Relación de todas las ou existentes.
         ous = Object.fromEntries((await Ou.listar()).result.organizationUnits.map(ou => [ou.orgUnitPath, ou]));

   let batch = newBatch();

   // Unidades organizativas
   const ous_inexistentes = {};
   for(const ou of Object.values(seed.ou)) {
      ou.name = "BORRAR-" + ou.name;  // TODO: Eliminar esto.
      try { ou.orgUnitId = ous[`/${ou.name}`].orgUnitId; }
      catch(error) {
         ous_inexistentes[`/${ou.name}`] = ou;
      }
      batch.add(ou.orgUnitId?Ou.actualizar(ou):Ou.crear(ou));
   }

   // Contenedores
   const cont = seed.contenedores,
         inexistentes = {};
   for(const attr in cont) {
      cont[attr].email = patchString(cont[attr].email || generarCuentaDepartamento(cont[attr].name));
      cont[attr].email = "borrar-" + cont[attr].email;  // TODO: Eliminar esto.

      try { cont[attr].id = existentes[cont[attr].email].id }
      catch(error) {
         inexistentes[cont[attr].email] = cont[attr];
      }
      batch.add({grupo: cont[attr]});
   }

   // Departamentos
   for(const dpto of seed.departamentos) {
      dpto.email = patchString(dpto.email || generarCuentaDepartamento(dpto.name));
      dpto.email = "borrar-" + dpto.email;  // TODO: Eliminar esto.
      dpto.description = `Departamento de ${dpto.name}`;
      try { dpto.id = existentes[dpto.email].id }
      catch(error) {
         inexistentes[dpto.email] = dpto;
      }
      batch.add({grupo: dpto});
   }

   res.creacion = await batch.end();

   // Apunta los identificadores de los grupos y ou recientemente creados.
   for(const result of Object.values(res.creacion)) {
      if(!result.value) continue;
      if(result.value.email) {
         if(!inexistentes[result.value.email]) continue;
         inexistentes[result.value.email].id = result.value.id;
      }
      else {
         if(!ous_inexistentes[result.value.orgUnitPath]) continue;
         ous_inexistentes[result.value.orgUnitPath].orgUnitId = result.value.orgUnitId;
      }
   }

   batch = newBatch();

   for(const dpto of seed.departamentos) {
      batch.add(Miembros.agregar(cont.claustro.id, dpto.id));
   }

   res.agregacion = await batch.end();

   console.log("DEBUG", res);

   return seed;
}
