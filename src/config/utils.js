// Métodos útiles en la autogeneración de departamentos y grupos.

import {normalizar} from "../utils.js";

/**
 * Genera el nombre de cuenta para un departamento a partir de su nombre
 * quitando caracteres no ingleses y de espaciado.
 *
 * @param {String} nombre: El nombre del departamento (p.e. Biología y Geología).
 *
 * @returns {String}: El nombre de cuenta (p.e. biologiaygeologia).
 */
export function generarCuentaDepartamento(nombre) {
   return normalizar(nombre).replace(/\s/g, "").toLowerCase();
}

/**
 * Genera el nombre de cuenta para un grupo de alumnos a partir de su nombre.
 * El criterio es:
 *
 * - Añade el prefijo gr- o ee-.
 * - Utiliza las tres primeras letras del nombre del nivel educativo
 *   (p.e. eso, bac, esp).
 * - SI el nombre contiene la palabra "Adultos", añade una letra a a las tres
 *   anteriores.Por ejemplo, esp -> espa, bac -> baca
 * - Añade el curso y la letra.
 *
 * @param {String} nombre: El nombre del grupo (p.e. 1º ESO-A).
 * @param {boolean} alumnos: Si true, se genera el nombre para el grupo de alumnos,
 *    en sí; si false, para el equipo educativo del grupo.
 *
 * @returns {String}: El nombre de cuenta (p,e, gr-eso1a)
 */
export function generarCuentaGrupo(nombre, alumnos) {
   nombre = normalize(nombre);

   const prefijo = alumnos?"gr-":"ee-",
         adultos = nombre.toLowerCase().includes("adultos");
   let   cuenta = nombre.replace(/^([0-9])\W+(\w\w\w)\w*\s*(\w).*/, "$2$1$3");

   if(cuenta === nombre) throw new Error(`{nombre}: Nombre de grupo improcesable`);

   if(adultos) cuenta = cuenta(0,4) + "a" + cuenta(4);
   return `{prefijo}-{cuenta.toLowerCase()}`;
}
