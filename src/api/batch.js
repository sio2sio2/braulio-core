/**
 * Implementación propia de newBatch para poder
 * manipilar el formato de los resultados.
 */

import {formatear, operar} from "./google";

function delay(func) {
   const ms = 100*(1 + Math.random());
   setTimeout(func, ms);
}


function procesarItem(item, params) {
   let id, formatter;

   params = params || {};

   if(item.then) {  // Es directamene una petición.
      id = params.id || Math.floor(Math.random()*10**15);
      formatter = value => formatear("otra", value);
   }
   else {
      const entidad = (item.grupo || item.usuario);
      id = params.id || (typeof entidad === "string")?entidad:(entidad.email || entidad.id);

      item = operar(item);
      formatter = value => formatear(item.operacion, value);
   }

   delay(() => item.then(() => true));  // Forzamos a que se empiece a hacer la petición.
   return [id, item, formatter];
}


/**
 * Clase para procesar un conjunto de peticiones a la API de G-Suite.
 * El objeto permite ir añadiendo una a una las peticiones y se asegura
 * de que todas están acabadas. Presenta una interfaz Thenable e implementa,
 * además un iterador asíncrono:
 *
 *    const batch = new Batch();
 *    batch.add(req1, {id: "req1"});
 *    batch.add(req2, {id: "req2"});
 *    batch.add(req3, {id: "req3});
 * 
 * Una vez añadidas todas las peticiones que forman el lote, tenemos estas
 * tres alternativas para obtener los resultados:
 *
 * 1. Iterador asíncrono:
 *
 *    for await(const [id, result] of batch) {
 *       console.log(`ID: ${id} -- RESULT:`, result);
 *    }
 *
 * 2. Objeto Thenable con then:
 *
 *    batch.then(resp => console.log(resp));
 *
 * 3. Objeto Thenable con await (habrá que estar dentro de una función asíncrona):
 *
 *    const resp = await batch;
 *    console.log(resp);
 *
 */
function Batch() {
   Object.defineProperties(this, {
      _buffer: {
         value: [],
         ennumerable: false,
         writable: false
      },
      _done: {
         value: false,
         enumerable: false,
         writable: true
      }
   });
}


/**
 * Añade una nueva petición al procesamiento por lotes.
 *
 * @param {Object} item: Petición que puede ser una gapi.client.Request
 *    o un objeto de los que acepta la función "operar".
 * @param {Object}: Parámetros para el procesamiento de la petición.
 *    Básicamente el identificador que se desea asociar a la petición.
 */
Batch.prototype.add = function(item, params) {
   if(this._done) throw new Error("Batch cerrado: no pueden añadirse más peticiones");
   this._buffer.push(procesarItem(item, params));
   return this;
}


Batch.prototype[Symbol.asyncIterator] = async function*() {
   let index = 0;
   while(index < this._buffer.length) {
      const [id, request, formatter] = this._buffer[index++],
            ok = await request;
      yield [id, formatter(ok)];
   }
   this._done = true;
}


Batch.prototype.then = async function(callback) {
   const res = [];
   this._done = true;
   for await(const r of this) res.push(r);
   return callback(Object.fromEntries(res));
}

export default Batch;
