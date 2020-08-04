/**
 * Implementación propia de newBatch para poder
 * manipilar el formato de los resultados.
 */

export default function(formatter) {
   formatter = formatter || (i => i);

   const _requests = {};
   let fresolve, freject;

   const p = new Promise(function(resolve, reject) {
      fresolve = resolve;
      freject = reject;
   });

   p.add = function(request, params) {
      params = params || {}
      if(params.id === undefined) params.id = Math.floor(Math.random()*10**15);
      _requests[params.id] = request;
   }

   p.then = function(fok, frej) {
      Promise.allSettled(Object.values(_requests))
         .then(ok => fresolve(Object.fromEntries(Object.keys(_requests).map((k, i) => [k, formatter(ok[i])]))));
      return Promise.prototype.then.call(this, fok, frej);
   }

   return p;
}
