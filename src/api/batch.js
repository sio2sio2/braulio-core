/**
 * Implementación propia de newBatch para poder
 * manipilar el formato de los resultados.
 */

import {formatear, operar} from "./entidades.js";

export default function() {
   const requests = [];
   let fresolve, freject;

   const p = new Promise(function(resolve, reject) {
      fresolve = resolve;
      freject = reject;
   });

   /**
    * @param {Object} request: Petición que se añade al procesamiento.
    * Puede ser un objeto gapi.client.request o una entidad como la
    * que hay que pasar a la función operar.
    */
   p.add = function(request, params) {
      let id, formatter;

      if(request.then) {  // Es directamente una petición
         params = params || {}
         id = params.id = Math.floor(Math.random()*10**15);
         formatter = value => value;
      }
      else {
         const entidad = (request.grupo || request.usuario);
         id = typeof entidad === "string"?entidad:(entidad.email || entidad.id);

         if(requests.map(e => e[0]).includes(id)) throw new Error(`Identificador '${id} repetido`);

         request = operar(request);
         formatter = value => formatear(request.operacion, value);
      }

      requests.push([id, request, formatter]);
   }

   p.then = function(fok, frej) {
      Promise.allSettled(requests.map(e => e[1]))
         .then(ok => fresolve(Object.fromEntries(requests.map((k, i) => [k[0], k[2](ok[i].value || ok[i].reason)]))));
      return Promise.prototype.then.call(this, fok, frej);
   }

   return p;
}
