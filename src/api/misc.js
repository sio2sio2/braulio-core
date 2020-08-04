/**
 * Comprueba si la cadena proporcionada es una identificador.
 */
export function isID(string) {
   const longitud = string.length;

   return (longitud > 15 && string.match(/^\d+$/))  // Usuarios: Identificadores numéricos.
          || (longitud === 15 &&                    // Grupos: - 15 caracteres.
              string.match(/^[a-z0-9]+$/)      &&   //         - Sólo letras y números.
              !string.match(/[a-z]{7}/))            //         - Hasta seis letras seguidas.
}


/**
 * Añade el dominio en caso de que false.
 */
export function patchString(string) {
   const domain = gapi.auth2.getAuthInstance().currentUser.get().getHostedDomain();
   return (string.includes('@') || isID(string))?string:`${string}@${domain}`;
}


/**
 * Interpreta el resultado de unaa operación de creación o actualización.
 *
 * @param {String} operacion: Operación que se llevó a cabo (creacion, actualizacion)
 * @oaram {Object} response: Respuesta que generó la operación
 *
 * @returns {Object}: Devuelve un objeto con el resultado de la operación.
 *    
 *       {entity: {...}, error: {code: codigo, raw: error}}
 *
 *    donde entity es la entidad creada o modificada (será undefined, si no tuvo éxito);
 *    code: el código o estado que devuelve la gapi al realizar la operación.
 *    error: 0, si no se produjo error, 1: la entidad ya existe, 2: la entidad no existe;
 *       10, cualquier otro error. raw contiene el error crudo.
 */
export function interpretarResultado(operacion, response) {
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
      default:
         throw new Error("Operación no soportada");
   }

   if(response.result.error) {
      return {
         operacion: operacion,
         error: {
            code: response.status === obj.codigo?obj.res:10,
            raw: response.result.error
         }
      }
   }
   else {
      return {
         value: response.result,
         operacion: operacion,
         error: { code: 0 }
      }
   }
}
