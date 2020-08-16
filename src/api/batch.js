/**
 * Implementación propia de newBatch para poder
 * manipilar el formato de los resultados.
 */

function delay(func) {
   const ms = 100*(1 + Math.random());
   setTimeout(func, ms);
}


function procesarItem(item, params) {
   let id, formatter;

   params = params || {};

   if(!item.then) throw new Error("La operación debe ser un objeto thenable");

   id = params.id || item.id ||  Math.floor(Math.random()*10**15);
   formatter = params.formatter || item.formatter || (value => formatear(item.operacion, value));

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
 * @param {Object} item: Petición que deben ser un objeto thenable,
 *    como las gapi.client.Request.
 * @param {Object}: Parámetros para el procesamiento de la petición.
 *    Básicamente el identificador que se desea asociar a la petición
 *    y si se desea usar un formateador particular.
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
            ok = formatter(await request);
      ok.index = index;
      yield [id, ok];
   }
   this._done = true;
}


Batch.prototype.then = async function(callback) {
   const res = [];
   this._done = true;
   for await(const r of this) res.push(r);
   return callback(Object.fromEntries(res));
}


/**
 * Interpreta el resultado de unaa operación de creación o actualización.
 *
 * @param {String} operacion: Operación que se llevó a cabo (creacion, actualizacion)
 * @oaram {Object} response: Respuesta que generó la operación
 *
 * @returns {Object}: Devuelve un objeto con el resultado de la operación.
 *    
 *       {value: {...}, error: {code: codigo, raw: error}}
 *
 *    donde entity es la entidad creada o modificada (será undefined, si no tuvo éxito);
 *    code: el código o estado que devuelve la gapi al realizar la operación.
 *    error: 0, si no se produjo error, 1: la entidad ya existe, 2: la entidad no existe;
 *       10, cualquier otro error. raw contiene el error crudo.
 */
export function formatear(operacion, response) {
   let res, obj;

   switch(operacion) {
      case "crear":
         obj = {
            codigo: 409,
            res: 1
         }
         break;
      case "actualizar":
         obj = {
            codigo: 404,
            res: 2
         }
         break;
      case "borrar":
         obj = {
            codigo: 404,
            res: 3
         }
         break;
      default:
         obj = {
            codigo: 404,
            res: 4
         }
   }

   if(String(response.status).charAt(0) === "2") {
      return {
         value: response.result,
         operacion: operacion,
         error: { code: 0 }
      }
   }
   else {
      return {
         operacion: operacion,
         error: {
            code: response.status === obj.codigo?obj.res:response.status,
            raw: response.result.error
         }
      }
   }
}


export default Batch;
