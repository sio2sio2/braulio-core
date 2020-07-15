// Procesa la configuración.

import {normalizar} from "../utils.js";
import {crearGrupo, actualizarGrupo} from "../api/grupos.js"; 
import {poblarGrupo} from "../api/miembros.js"; 


export function crearNombreUsuario = function(nombre) {
   return normalizar(nombre).replace(/ /g, "");
}


export async function procesar(config) {
   procesarDepartamentos(config);
   procesarGrupos(config);
}


async function procesarDepartamentos(config) {
   const batch = gapi.client.newBatch(),
         claustro = config.claustro,
         dptos = config.departamentos || [];
         
   if(!claustro && dptos.length > 0) {
      console.warn("El grupo de claustro es desconocido. No pueden procesarse los departamentos.");
      return;
   }

   const params = {
      email: `${dpto.usuario || crearNombreUsuario(dpto.nombre)}@${hosted_domain}`,
      name: dpto.nombre
   }

   if(claustro.id) batch.add(actualizarGrupo(claustro.id, params));
   else batch,add(crearGrupo(params));

   // Da de alta/modifica los grupos de departamento.
   for(const dpto of info) {
      const params = {
         description: `Departamento de ${dpto.nombre}`,
         email: `${dpto.usuario || crearNombreUsuario(dpto.nombre)}@${hosted_domain}`,
         name: dpto.nombre
      }

      if(dpto.id) batch.add(actualizarGrupo(dpto.id, params));
      else batch,add(crearGrupo(params));
   }

   batch.then(response => {
      console.log("DEBUG", response.result);
      // TODO: Con poblarGrupo, rellenar el grupo claustro.
   });
}


async function procesarGrupos(config) {
   const batch = gapi.client.newBatch(),
         alumnos = config.alumnos,
         grupos = config.grupos || [];
         
   if(!alumnos && grupos.length > 0) {
      console.warn("El grupo de alumnos es desconocido. No pueden procesarse los grupos.");
      return;
   }

   // TODO: Implementar esto...
}
