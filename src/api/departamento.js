import * as google from "./google";
import {fqda, fallback as fallback_default} from "./misc.js";
import Batch from "./batch.js";
import BaseComun from "./base.js"

// Métodos asociados a la manipulación de departamentos.

// TODO: A mi largo plaza habrá que poder manipular los permisos del grupo.
class Departamento extends BaseComun(google.clase.Groups) {
   get identificador() { return "claustro"; }

   listar() {
      return google.miembro.listar(this.organizador.id);
   }

   /**
    * Crea un departamento.
    *
    * El método no altera la configuración.
    *
    * @param {Object} dpto: Objeto que describe el departamento. Debe incluir
    *    un atributo puestos con los códigos de los puestos de desempeño asociados.
    * @param {String} claustro: Identificador o dirección de correo del grupo
    *    que representa al claustro. Si no se proporciona, se tomará del
    *    fichero de configuración.
    *
    * @returns {Object.Thenable}: El primer argumento de then será la respuesta
    *    obtennida de intentar crear el departmaneto que añade un atributo additonal
    *    con:
    *
    *    + La respuesta de haber intentado añadir el departamento al claustro.
    *    + La definición del departamento que deberá incluirse en la configuració.
    */
   crear(dpto, claustro) {
      if(!dpto.puestos || !dpto.puestos[Symbol.iterator]) throw new Error("Puestos de desempeño incompresibles o inexistentes");
      dpto = Object.assign({}, dpto);
      
      const puestos = dpto.puestos;
      delete dpto.puestos;

      dpto.description = dpto.description || `Departamento de ${dpto.name}`;

      const request = super.crear(dpto);
      return Object.assign({}, request, {
         then: async (callback, fallback) => {
            fallback = fallback || fallback_default;

            // Creación
            try { var response = await request; }
            catch(error) { return fallback(error); }

            const extra = response.additional = {};

            // Adición al contenedor.
            try {
               extra.inclusion = await google.miembro.agregar(claustro || this.organizador.id, response.result.id);
            }
            catch(error) {
               console.error("Imposible agregar el departamento al claustro", error);
               extra.inclusion = error;
            }

            // Generación de la información para el fichero de configuración.
            extra.config = Object.assign(dpto, {id: response.result.id, puestos: puestos, email: response.result.email});
            return callback(response);
         }
      });
   }

   actualizar(dpto) {
      const orig = dpto;

      if(!dpto.puestos || !dpto.puestos[Symbol.iterator]) throw new Error("Puestos de desempeño incompresibles o inexistentes");
      dpto = Object.assign({}, dpto);

      const puestos = dpto.puestos;
      delete dpto.puestos;

      const request = super.actualizar(dpto);
      return Object.assign({}, request, {
         then: async (callback, fallback) => {
            // Actualiza el departamento.
            try { var response = await request; }
            catch(error) { return fallback(error); }

            // Incluye información adicional para poder actualizar la configuración.
            response.additional = {config: Object.assign({}, orig, {email: response.result.email})};
            return callback(response);
         }
      });
   }

   miembros(id) {
      return google.miembro.listar(id);
   }
}

export default Departamento;
