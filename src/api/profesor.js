import Config from "../config";
import * as google from "./google";

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
   if(!profesor.puesto) throw new Error(`'${profesor.primaryEmail}' carece de
   puesto de desempeño`);
   
   const config = new Config().content,
         dpto = obtenerDepartamento(profesor.puesto);

   // TODO: Falta información sobre tutoría.
   profesor = Object.assign({
      password: "12341234",
      orgUnitPath: config.ou.claustro.orgUnitPath,
      changePasswordAtNextLogin: true,
      keywords: [{
         type: "mission",
         value: profesor.puesto
      }]
   }, profesor);

   delete profesor.puesto;

   return {
      then: (callback, fallback) => {
         google.usuario.crear(profesor)
            .then(response => google.miembro.agregar(dpto, response.result.id).then(r => callback(response)),
                  error => fallback(error));
      }
   }
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


export function actualizar(profesor) {
   const puesto = profesor.puesto;
   delete profesor.puesto;

   return {
      then: (callback, fallback) => {
         if(puesto) {
            const kw = buscarKeyword("mission", profesor);
            if(kw === null) {
               google.usuario.obtener(profesor.id || profesor.primaryEmail)
                  .then(response => {
                           const kw = buscarKeyword("mission", profesor);
                           switch(kw) {
                              case null:
                                 kw = [];
                              case undefined:
                                 kw.push({type: "mission", value: puesto});
                                 profesor.keywords = kw;
                                 break;
                              defailt:
                                 kw.value = puesto;
                           }
                           google.usuario.actualizar(profesor)
                              .then(response => callback(response),
                                    error => fallback(error));
                        },
                        error => { throw new Error("Profesor inexistente"); });
            }
            else {
               if(kw) kw.value = puesto
               else kw.push({type: "mission", value: puesto});
               google.usuario.actualizar(profesor)
                  .then(response => callback(response),
                        error => fallback(error));
            }
         }
         else {
            google.usuario.actualizar(profesor)
               .then(response => callback(response),
                     error => fallback(error));
         }
      }
   }
}
