import Config from "../config";
import * as google from "./google";
import {merge} from "../utils";

/**
 * Métodos asociados a la manipulación de profesores.
 */
export function listar() {
   const config = new Config().content;
   const path = config.contenedores.claustro.orgUnitPath || `/${config.contenedores.claustro.name}`

   return google.usuario.listar({query: `orgUnitPath=${path}`});
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
 * Obtiene una cuenta de profesor
 *
 * @param {String} profesor: Identificador o dirección de correo del profesor
 */
export function obtener(profesor) {
   return google.usuario.obtener(profesor);
}



function buscarKeyword(clave, profesor) {
   if(!profesor.keywords) return null;

   for(const kw of profesor.keywords) {
      if(kw.type === clave || kw.customType === "clave") return kw;
   }

   return undefined;
}


function mergeKeywords(target, ...sources) {

   function toObject(arr) {
      return Object.fromEntries((arr || []).map(e => [e.type === "custom"?e.customType:e.type, e]));
   }

   return Object.values(merge(toObject(target), ...sources.map(src => toObject(src))));
}


// Convierte los atributos puesto y tutoria en keywords
function modificarProfesor(profesor) {
   let puesto = profesor.puesto,
       tutoria = profesor.tutoria,
       keywords = [];

   profesor = Object.assign({}, profesor)
   delete profesor.puesto;
   delete profesor.tutoria;

   if(puesto) keywords.push({type: "mission", value: puesto})
   if(tutoria) keywords.push({type: "occupation", value: tutoria})
   if(keywords.length) {
      profesor.keywords = mergeKeywords(profesor.keywords, keywords);
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
   if(!profesor.puesto) throw new Error(`'${profesor.primaryEmail}' carece de puesto de desempeño`);
   
   const config = new Config().content,
         dpto = obtenerDepartamento(profesor.puesto);

   profesor = modificarProfesor(profesor);
   profesor = Object.assign({
      password: "12341234",
      orgUnitPath: config.ou.claustro.orgUnitPath,
      changePasswordAtNextLogin: true,
   }, profesor);

   return {
      then: (callback, fallback) => {
         google.usuario.crear(profesor)
            .then(response => google.miembro.agregar(dpto, response.result.id).then(r => callback(response)),
                  error => fallback(error));
      }
   }
}


/**
 * Actualiza un profesor lo cual implica:
 *
 * * Actulizar el propio profesor.
 * * Quizás dar de baja de su departamento antigio.
 * * Quizás dar de alta de su nuevo departamento.
 *
 *
 */
export function actualizar(profesor) {
   let puesto = profesor.puesto;

   profesor = modificarProfesor(profesor);

   return {
      then: async (callback, fallback) => {
         let keywords,
             cambioDpto = false,
             oldpuesto;

         // Se intenta actualizar el puesto, por lo que hay que manipular keywords.
         if(profesor.keywords) {
            try {
               const response = await google.usuario.obtener(profesor.id || profesor.primaryEmail);
               keywords = response.result.keywords;
            }
            catch(error) { delete profesor.keywords; }  // Acabará provocando un error.

            if(profesor.keywords) {
               profesor.keywords = mergeKeywords([]. keywords, profesor.keywords);
               try {
                  oldpuesto = buscarKeyword("mission", {keywords: keywords}).value;
               }
               catch(error) { oldpuesto = null; }

               cambioDpto = oldpuesto !== puesto;
            }
         }

         let response;
         try {
            response = await google.usuario.actualizar(profesor);
         }
         catch(error) { return fallback(error); }
         
         if(puesto && cambioDpto) {
            if(oldpuesto) oldpuesto = obtenerDepartamento(oldpuesto);
            if(puesto) puesto = obtenerDepartamento(puesto);
            cambioDpto = oldpuesto !== puesto;
         }

         if(puesto && cambioDpto) {
            try {
               if(oldpuesto) await google.miembro.borrar(oldpuesto, response.result.id);
               if(puesto) await google.miembro.agregar(puesto, response.result.id);
            }
            catch(error) {
               console.error(error);
            }
         }

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
 *     el atributo ("update" o "create").
 *   + Si no dispone de ese atributo:
 *      + Si no dispone de identificador, intenta crear.
 *      + Si dospone de identificador, actualiza datos.
 *
 */
export function operar(profesor) {
   const action = profesor.action || (typeof profesor === "string"?"delete":(profesor.id?"update":"create"));
   switch(action) {
      case "create":
         return crear(profesor);
      case "delete":
         return borrar(profesor);
      case "update":
         return actualizar(profesor);
      default:
         throw new Error(`${æction}: Acción desconocida`);
   }
}
