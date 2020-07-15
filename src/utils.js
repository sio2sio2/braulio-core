/**
 * Elimina caractere s no ingleses de la cadena.
 *
 * @param {String} cadena Cadena a transformar en UTF-8.
 * @returns {String}
 */
export function normalizar(cadena) {
   return cadena.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
