import Config from "../config";
import * as google from "./google";
import {fqda, fallback as fallback_default} from "./misc.js";
import Batch from "./batch.js";

//  Métodos asociados a la manipulación de profesores.

export function listar(args) {
   const config = new Config().content;
   const path = config.contenedores.claustro.orgUnitPath || `/${config.contenedores.claustro.name}`

   args = Object.assign({query: `orgUnitPath=${path}`}, args);
   return google.usuario.listar(args);
}


/**
 * Devuelve la lista de grupos a los que pertenece el profesor
 *
 * @param {String} profesor: Identificador o dirección de correo del profesor.
 *
 */
export function grupos(profesor) {
   return google.grupo.listar({userKey: profesor});
}


/**
 * Obtiene el departamento al que está asociado un código de puesto.
 *
 * @param {String} puesto: Código del puesto.
 *
 * @returns {String} Identificador del departamento.
 */
export function obtenerDepartamento(puesto) {
   const config = new Config().content;
   for(const dpto of config.departamentos) {
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


/**
 * Borra un profesor
 *
 * @param {String} profesor: Identificador o dirección de correo del profesor
 */
export function borrar(profesor) {
   return google.usuario.borrar(profesor);
}


/**
 * Obtiene la información sobre un profesor.
 *
 * @param {String} profesor: Identificador o dirección de correo del profesor
 */
export function obtener(profesor) {
   //TODO: La máscara debe obtenerse de la configuración.
   return google.usuario.obtener(profesor, {projection: "custom", customFieldMask: "profesor"});
}


// Buscan campos en los esquemas.
function obtenerValor(clave, profesor) {
   const [schema, key] = clave.split(".");

   if(!profesor.customSchemas) return null;

   try {
      return profesor.customSchemas[schema][key];
   }
   catch(error) { 
      return undefined; 
   }
}


function mergeSchemas(target, ...sources) {

   const schemas = {};
   for(const obj of [target, ...sources]) {
      for(const [key, fields] of Object.entries(obj || {})) {
         schemas[key] = schemas[key] || [];
         schemas[key].push(fields);
      }
   }

   return Object.fromEntries(Object.entries(schemas).map(([k, v]) => [k, Object.assign(...v)]));
}


// Convierte los atributos puesto y tutoria en keywords
function modificarProfesor(profesor) {
   let puesto = profesor.puesto,
       tutoria = profesor.tutoria && fqda(profesor.tutoria),
       esquema = {};

   profesor = Object.assign({}, profesor)
   delete profesor.puesto;
   delete profesor.tutoria;

   // TODO: Consultar config.
   const schema = "profesor";

   if(puesto) esquema.puesto = puesto;
   if(tutoria !== undefined) esquema.tutoria = tutoria;
   if(Object.keys(esquema).length > 0) {
      profesor.customSchemas = mergeSchemas(profesor.customSchemas, {[schema]: esquema});
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
export function crear(profesor) {
   profesor.primaryEmail = fqda(profesor.primaryEmail);
   if(!profesor.puesto) throw new Error(`'${profesor.primaryEmail}' carece de puesto de desempeño`);
   
   const config = new Config().content,
         tutoria = profesor.tutoria,
         tutores = config.contenedores.tutores.id,
         dpto = obtenerDepartamento(profesor.puesto);

   // TODO: El nombre del esquema hay que obtenerlo.
   const schema = "profesor";

   profesor = Object.assign({
      password: "12341234",
      orgUnitPath: config.ou.claustro.orgUnitPath,
      changePasswordAtNextLogin: true,
      customSchemas: {
         // Para buscar por "cese" es necesario que todos tengan una fecha.
         // Así que, en principio, se fija para todos una fecha inalcanzable.
         [schema]: { cese: "2100-08-31" }
      }
   }, profesor);
   profesor = modificarProfesor(profesor);

   return {
      then: async (callback, fallback) => {
         fallback = fallback || fallback_default;

         let response;

         // Creación
         try {
            response = await google.usuario.crear(profesor);
         }
         catch(error) { return fallback(error); }
        
         // Dpto.
         try {
            await google.miembro.agregar(dpto, response.result.id);
         }
         catch(error) { return fallback(error); }

         // Tutoría
         if(tutoria) {
            try {
               await google.miembro.agregar(tutores, response.result.id);
            }
            catch(error) { return fallback(error); }
         }

         return callback(response);   
      },
      operacion: "crear",
      id: profesor.primaryEmail
   }
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
export function actualizar(profesor) {
   const config = new Config().content;

   let puesto = profesor.puesto,
       tutoria = profesor.tutoria;

   profesor = modificarProfesor(profesor);

   return {
      operacion: "actualizar",
      id: fqda(profesor.primaryEmail || profesor.id),
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
               const response = await obtener(profesor.id || profesor.primaryEmail);
               oldprofesor = response.result;
            }
            catch(error) { return fallback(error); }

            // TODO:: El nombre del esquema hay que obtenerlo.
            const schema = "profesor";
            oldpuesto = obtenerValor(`${schema}.puesto`, oldprofesor);
            oldtutoria = obtenerValor(`${schema}.tutoria`, oldprofesor);
         }

         let response;
         try {
            response = await google.usuario.actualizar(profesor);
         }
         catch(error) { return fallback(error); }
         
         if(puesto) {
            if(oldpuesto) oldpuesto = obtenerDepartamento(oldpuesto);
            if(puesto) puesto = obtenerDepartamento(puesto);
            cambioDpto = oldpuesto !== puesto;
         }

         if(cambioDpto) {
            try {
               if(oldpuesto) await google.miembro.borrar(oldpuesto, response.result.id);
               if(puesto) await google.miembro.agregar(puesto, response.result.id);
            }
            catch(error) {
               console.error(error);
            }
         }

         const tutores = config.contenedores.tutores.id;
         try {
            if(oldtutoria && tutoria === null) {
               await google.miembro.borrar(tutores, response.result.id);
            }
            else if(!oldtutoria && tutoria) {
               await google.miembro.agregar(tutores, response.result.id);
            }
         }
         catch(error) { console.error(error); }

         return callback(response);
      }
   }
}


/**
 * Adivida cuál es la operación que desea hacer el individuo. Los criterios son los siguientes:
 *
 * - Si el argumento es una cadena, sobrentiende que es borrar.
 * - Si el argumento es un objeto:
 *   + Si el objeto pasee el atributo action, hará lo que diga
 *     el atributo ("actualizar" o "crear").
 *   + Si no dispone de ese atributo:
 *      + Si no dispone de identificador, intenta crear.
 *      + Si dospone de identificador, actualiza datos.
 *
 */
export function operar(profesor) {
   const action = profesor.action || (typeof profesor === "string"?"borrar":(profesor.id?"actualizar":"crear"));
   switch(action) {
      case "crear":
         return crear(profesor);
      case "borrar":
         return borrar(profesor);
      case "actualizar":
         return actualizar(profesor);
      default:
         throw new Error(`${æction}: Acción desconocida`);
   }
}


/**
 * Marca un profesor como cesado y lo saca de todos los grupos en los que está
 *
 * @param {String} profesor: Identificador o dirección de correo del usuario.
 * @param {String} fecha: Fecha del cese (YYYY-MM-DD). Si no se especifica,
 *    se entiende que el día en curso.
 */
export function cesar(profesor, fecha) {
   const id = fqda(profesor);
   fecha = fecha || new Date().toISOString().slice(0, 10);

   profesor = {}

   if(id.includes('@')) profesor.primaryEmail = id;
   else profesor.id = id;

   // TODO: Obtener el nombre del esquema.
   const schema = "profesor";

   profesor.customSchemas = {
      [schema]: { cese: fecha , puesto: null }
   }

   return {
      operacion: "actualizar",
      id: id,
      then: async (callback, fallback) => {
         const batch = new Batch();
         batch.add(actualizar(profesor));

         for await (const grupo of grupos(id)) {
            batch.add(google.miembro.borrar(grupo.email, id));
         }

         const response = await batch;

         return callback(response);
      }
   }
}
