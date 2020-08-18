import * as google from "./google";
import {fqda, fallback as fallback_default} from "./misc.js";
import Batch from "./batch.js";
import BaseComun from "./base.js"


class Profesor extends BaseComun(google.clase.Users) {
   get identificador() { return "claustro"; }

   listar(args) {
      const path = this.organizador.orgUnitPath || `/${this.organizador.name}`
      args = Object.assign({query: `orgUnitPath=${path}`}, args);
      return super.listar(args);
   }

   /**
    * Devuelve la lista de grupos a los que pertenece el profesor
    *
    * @param {String} profesor: Identificador o dirección de correo del profesor.
    *
    */
   grupos(profesor) {
      return google.grupo.listar({userKey: profesor});
   }

   obtenerDepartamento(puesto) {
      for(const dpto of this.config.content.departamentos) {
         for(let exp of dpto.puestos) {
            if(exp.startsWith("/")) {  // Expresión regular
               exp = exp.slice(1, -1);
               if(!exp.startsWith("^")) exp = "^" + exp;
               if(!exp.endsWith("$")) exp += "$";
               if(puesto.match(exp)) return dpto.id;
            }
            else if(puesto === exp) return dpto.id;
         }
      }
      throw new Error(`Puesto '${puesto}' desconocido`);
   }

   // Convierte los atributos puesto y tutoria en keywords
   modificarProfesor(profesor) {
      let puesto = profesor.puesto,
          tutoria = profesor.tutoria && fqda(profesor.tutoria),
          esquema = {};

      profesor = Object.assign({}, profesor)
      delete profesor.puesto;
      delete profesor.tutoria;

      if(puesto) esquema.puesto = puesto;
      if(tutoria !== undefined) esquema.tutoria = tutoria;
      if(Object.keys(esquema).length > 0) {
         profesor.customSchemas = this.mergeSchemas(profesor.customSchemas, {[this.schema]: esquema});
      }

      return profesor;
   }

   /**
    * Crea un nuevo profesor, lo cual implica:
    *
    * + Crear el usuario.
    * + Añadirlo a su departamento correspondiente.
    *
    * La función se comporta como una gapi.client.Request, por lo que devuelve un
    * objeto thenable, que sólo llevará a cabo de forma efectiva la operación
    * cuando se use la propia operacion then (o se use await). La función de callback
    * recibirá como argumento el resultado de crear el profesor (no de agragarlo
    * al departamento) y la de callback, el fallo al intentar crearlo
    *
    * @param {Object} profesor: Objeto que describe el profesor. Debe incluir
    *    también el atributo "puesto" para conocer en qué departamento hay que
    * incluir al profesor.
    */
   crear(profesor) {
      if(!profesor.puesto) throw new Error(`'${profesor[this.emailField]}' carece de puesto de desempeño`);
      
      const config = this.config.content,
            tutoria = profesor.tutoria,
            tutores = config.contenedores.tutores.id,
            dpto = this.obtenerDepartamento(profesor.puesto);

      profesor = Object.assign({
         password: "12341234",
         orgUnitPath: config.ou.claustro.orgUnitPath,
         changePasswordAtNextLogin: true,
         customSchemas: {
            // Para buscar por "cese" es necesario que todos tengan una fecha.
            // Así que, en principio, se fija para todos una fecha inalcanzable.
            [this.schema]: { cese: "2100-08-31" }
         }
      }, profesor);
      profesor = this.modificarProfesor(profesor);

      const request = super.crear(profesor);
      return Object.assign({}, request, {
         then: async (callback, fallback) => {
            fallback = fallback || fallback_default;

            let response;

            // Creación
            try {
               response = await request;
            }
            catch(error) { return fallback(error); }
           
            const extra = response.additional = {};

            // Dpto.
            try {
               extra.dpto = await google.miembro.agregar(dpto, response.result.id);
            }
            catch(error) { 
               extra.dpto = error;
               return fallback(response); 
            }

            // Tutoría
            if(tutoria) {
               try {
                  extra.tutoria = await google.miembro.agregar(tutores, response.result.id);
               }
               catch(error) { 
                  extra.tutoria = error;
                  return fallback(error); 
               }
            }

            return callback(response);   
         }
      });
   }

   /**
    * Actualiza un profesor lo cual implica:
    *
    * * Actulizar el propio profesor.
    * * Quizás alturar su pertenencia a algún departamento.
    * * Quizás ponerlo o quitarlo de tutor.
    *
    * @param {Object} profesor: Usuario de G-Suite. Puede añadir los atributos
    * extra "puesto" y "tutoria". El primero es el código el puesto de desempeño
    * y el segundo la dirección de correo del grupo de clase del que es tutor.
    * Si esta segundo es "null", se sobrentiende que se quiere eliminar la tutoría
    * anteriormente asignada.
    *
    */
   actualizar(profesor) {
      const config = this.config.content;

      let puesto = profesor.puesto,
          tutoria = profesor.tutoria;

      profesor = this.modificarProfesor(profesor);

      const request = super.actualizar(profesor);
      return Object.assign({}, request, {
         then: async (callback, fallback) => {
            fallback = fallback || fallback_default;

            let cambioDpto = false,
                oldprofesor, oldpuesto, oldtutoria;

            // Los valores del esquema que no se proporcionan, no
            // cambian al actualizar el profesor, por lo que en principio
            // no es necesario obtener el esquema antiguo. Sin embargo,
            // el cambio de puesto o de tutoría, pueden provocar cambios
            // en la membresía, por lo que hay que cerciorarse de los cambios.
            if(puesto || tutoria !== undefined) {
               try {
                  const response = await this.obtener(profesor[this.idField] || profesor[this.emailField]);
                  oldprofesor = response.result;
               }
               catch(error) { return fallback(error); }

               oldpuesto = this.obtenerValor(`puesto`, oldprofesor);
               oldtutoria = this.obtenerValor(`tutoria`, oldprofesor);
            }

            let response;
            try {
               response = await request;
            }
            catch(error) { return fallback(error); }
            
            if(puesto) {
               if(oldpuesto) oldpuesto = this.obtenerDepartamento(oldpuesto);
               if(puesto) puesto = this.obtenerDepartamento(puesto);
               cambioDpto = oldpuesto !== puesto;
            }

            const extra = response.additional = {
               dpto: {
                  borrar: null,
                  agregar: null
               },
               tutoria: null
            };

            if(cambioDpto) {
               if(oldpuesto) {
                  try {
                     extra.dpto.borrar = await google.miembro.borrar(oldpuesto, response.result.id);
                  }
                  catch(error) {
                     console.error(error);
                     extra.dpto.borrar = error;
                  }
               }
               if(puesto) {
                  try {
                     extra.dpto.agregar = await google.miembro.agregar(puesto, response.result.id);
                  }
                  catch(error) {
                     console.error(error);
                     extra.dpto.agregar = error;
                  }
               }
            }

            const tutores = config.contenedores.tutores.id;
            try {
               if(oldtutoria && tutoria === null) {
                  extra.tutoria = await google.miembro.borrar(tutores, response.result.id);
               }
               else if(!oldtutoria && tutoria) {
                  extra,tutoria = await google.miembro.agregar(tutores, response.result.id);
               }
            }
            catch(error) { 
               console.error(error);
               extra.tutoria = error;
            }

            return callback(response);
         }
      });
   }

   /**
    * Marca un profesor como cesado y lo saca de todos los grupos en los que está
    *
    * @param {String} profesor: Identificador o dirección de correo del usuario.
    * @param {String} fecha: Fecha del cese (YYYY-MM-DD). Si no se especifica,
    *    se entiende que el día en curso.
    */
   cesar(profesor, fecha) {
      const id = this.constructor.parseID(profesor);
      fecha = fecha || new Date().toISOString().slice(0, 10);

      profesor = {
         customSchemas: {
            [this.schema]: { cese: fecha , puesto: null }
         }
      }

      if(id.includes('@')) profesor[this.emailField] = id;
      else profesor[this.idField] = id;

      const request = this.actualizar(profesor);

      return Object.assign({}, request, {
         then: async (callback, fallback) => {
            const batch = new Batch();
            batch.add(request);

            for await (const grupo of this.grupos(request.id)) {
               batch.add(google.miembro.borrar(grupo.email, request.id));
            }

            return callback(await batch);
         }
      });
   }
}

export default Profesor;
