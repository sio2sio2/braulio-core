/**
 * Implementación propia de newBatch para poder
 * manipilar el formato de los resultados.
 */

import {formatear, operar} from "./google";

export default function() {
   let fresolve;

   const items = [],
         promises = new Promise(resolve => {
            fresolve = resolve;
         });

   const p = new Promise(async resolve => {
      const requests = await items;
      Promise.allSettled(requests.map(e => e[1]))
        .then(ok => resolve(Object.fromEntries(requests.map((k, i) => [k[0], k[2](ok[i].value || ok[i].reason)]))));
   });

   p.end = function() {
      fresolve(items);
      return p;
   }

   p.then = function(fok, frej) {
      p.end();
      return Promise.prototype.then.call(this, fok, frej);
   }

   /**
    * Añade una nueva petición al procesamiento.
    *
    * @param {Object} item: Petición que puede ser una gapi.client.Request o
    * un objeto de los que acepta la función "operar".
    */
   p.add = function(item) {
      let id, formatter;

      if(item.then) {  // Es directamene una petición.
         id = Math.floor(Math.random()*10**15);
         formatter = value => formatear("otra", value);
      }
      else {
         const entidad = (item.grupo || item.usuario);
         id = typeof entidad === "string"?entidad:(entidad.email || entidad.id);

         item = operar(item);
         formatter = value => formatear(item.operacion, value);
      }

      items.push([id, item, formatter]);
   }

   return p;

}
