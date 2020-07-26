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


