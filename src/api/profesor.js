import * as google from "./google";
import {fqda, fallback as fallback_default} from "./misc.js";
import Batch from "./batch.js";
import BaseComun from "./base.js"
import {merge} from "../utils.js"


class Profesor extends BaseComun(google.clase.Users) {
   get identificador() { return "claustro"; }

   /**
    * Devuelve la lista de grupos a los que pertenece el profesor
    *
    * @param {String} profesor: Identificador o dirección de correo del profesor.
    *
    */
   grupos(profesor) {
      return google.grupo.listar({userKey: profesor});
   }

   // Convierte los atributos puesto y tutoria en keywords
   modificarProfesor(profesor) {
      let puesto = profesor.puesto,
          tutoria = profesor.tutoria && fqda(profesor.tutoria),
          taquilla = profesor.taquilla,
          jefe = profesor.jefe,
          esquema = {};

      profesor = Object.assign({}, profesor)
      delete profesor.puesto;
      delete profesor.tutoria;
      delete profesor.taquilla;
      delete profesor.jefe;

      if(puesto) esquema.puesto = puesto;
      if(tutoria !== undefined) esquema.tutoria = tutoria;
      if(taquilla !== undefined) {
         esquema.taquilla = typeof taquilla === "number"?[taquilla]:taquilla;
         if(esquema.taquilla) esquema.taquilla = esquema.taquilla.map(num => new Object({value: num}));
      }
      if(jefe) esquema.jefe = true;

      if(Object.keys(esquema).length > 0) {
         profesor.customSchemas = merge(profesor.customSchemas, {[this.schema]: esquema});
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
      const config = this.config.content,
            detectarJefes = !profesor.noDetectarJefes,
            tutores = config.contenedores.tutores.id;

      profesor = Object.assign({
         password: "12341234",
         orgUnitPath: config.ou[this.identificador].orgUnitPath,
         changePasswordAtNextLogin: true,
         customSchemas: {
            // Para buscar por "cese" es necesario que todos tengan una fecha.
            // Así que, en principio, se fija para todos una fecha inalcanzable.
            [this.schema]: { cese: "2100-08-31", sustituto: "0" }
         }
      }, profesor);
      profesor = this.modificarProfesor(profesor);
      delete profesor.detectarJefes;

      const tutoria = this.obtenerCampo("tutoria", profesor),
            puesto = this.obtenerCampo("puesto", profesor),
            jefe =  this.obtenerCampo("jefe", profesor);

      if(!puesto) throw new Error(`'${profesor[this.emailField]}' carece de puesto de desempeño`);
      
      const dpto = this.config.obtenerDpto({puesto: puesto});
      const request = super.crear(profesor);

      return Object.assign({}, request, {
         then: async (callback, fallback) => {
            fallback = fallback || fallback_default;

            // Jefe: ¿es único?
            if(jefe && detectarJefes) {
               try { await comprobarJefes.call(this, dpto.id); }
               catch(error) { return fallback(error); }
            }

            // Creación
            try { var response = await request; }
            catch(error) { return fallback(error); }
           
            const extra = response.additional = {};

            // Dpto.
            try {
               extra.dpto = await google.miembro.agregar(dpto.id, response.result.id);
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
      const config = this.config.content,
            detectarJefes = !profesor.noDetectarJefes;
      profesor = this.modificarProfesor(profesor);
      delete profesor.DetectarJefes;

      let puesto = this.obtenerCampo("puesto", profesor),
          tutoria = this.obtenerCampo("tutoria", profesor),
          jefe = this.obtenerCampo("jefe", profesor)

      const request = super.actualizar(profesor);
      return Object.assign({}, request, {
         then: async (callback, fallback) => {
            fallback = fallback || fallback_default;

            let cambioDpto, cambioTutoria, olddpto, dpto;

            if(puesto || tutoria !== undefined) {
               const grupos = await this.grupos(profesor[this.idField] || profesor[this.emailField]);

               if(tutoria !== undefined) {
                  const esTutor = grupos.filter(gr => gr.id === config.contenedores.tutores.id).length > 0;
                  cambioTutoria = esTutor && tutoria === null || !esTutor && tutoria;
               }

               if(puesto) {
                  for(const grupo of grupos) {
                     olddpto = this.config.obtenerDpto(grupo.id);
                     if(olddpto) break;
                  }
                  if(!olddpto) fallback("El profesor no pertenece a ningún departamento");
                  else olddpto = olddpto.id;

                  try { dpto = this.config.obtenerDpto({puesto: puesto}).id; }
                  catch(error) { return fallback(`Puesto '${puesto}' desconocido`); }

                  cambioDpto = olddpto !== dpto;
               }
            }

            if(jefe && detectarJefes) { // Hay que averiguar su puesto.
               if(!puesto) {
                  let info;
                  try { info = await this.obtener(profesor[this.idField] || profesor[this.emailField]); }
                  catch(error) { return fallback(error); }
                  puesto = this.obtenerCampo("puesto", info);
                  dpto = this.config.obtenerDpto({puesto: puesto});
               }
               try { await comprobarJefes.call(this, dpto.id); }
               catch(error) { return fallback(error); }
            }

            // Actualizar el profesor.
            try { var response = await request; }
            catch(error) { return fallback(error); }
            
            const extra = response.additional = {
               dpto: {
                  borrar: null,
                  agregar: null
               },
               tutoria: null
            };

            if(cambioDpto) {
               try {
                  extra.dpto.borrar = await google.miembro.borrar(olddpto, response.result.id);
               }
               catch(error) {
                  console.error(error);
                  extra.dpto.borrar = error;
               }
               try {
                  extra.dpto.agregar = await google.miembro.agregar(dpto, response.result.id);
               }
               catch(error) {
                  console.error(error);
                  extra.dpto.agregar = error;
               }
            }

            if(cambioTutoria) {
               try {
                  const tutores = config.contenedores.tutores.id;
                  if(tutoria) {
                     extra,tutoria = await google.miembro.agregar(tutores, response.result.id);
                  }
                  else {
                     extra.tutoria = await google.miembro.borrar(tutores, response.result.id);
                  }
               }
               catch(error) { 
                  console.error(error);
                  extra.tutoria = error;
               }
            }

            return callback(response);
         }
      });
   }

   /**
    * Crea un profesor sustituto.
    *
    * @param {Object} substituto: Describe al profesor sustituto. Cualquier información
    *    de usuario que se incluya (p.e. puesto), será sobrescrita por la del sustituto,
    * @param {String} titular: Identificador o dirección de correo del profesor
    *    sustituido.
    */
   sustituir(sustituto, titular) {
      sustituto = this.modificarProfesor(sustituto);

      return {
         id: this.constructor.parseID(sustituto[this.idField] || sustituto[this.emailField]),
         operacion: sustituto.id?"actualizar":"crear",
         then: async (callback, fallback) => {
            fallback = fallback || fallback_default;

            try { var sustituido = (await this.obtener(titular)).result; }
            catch(error) { return fallback(`El sustituido '${titular}' no existe.`); }
            
            const cese = this.obtenerCampo("cese", sustituido);
            if(cese) {
               const hoy = new Date().toISOString().slice(0, 10);
               if(cese <= hoy) return fallback(`El sustituido '${sustituido[this.emailField]}' ha cesado`);
            }

            // Copiamps la información del sustituido en el sustituto
            sustituto.customSchemas = merge(sustituto.customSchemas, sustituido.customSchemas);

            // Si hereda el puesto de jefe de departanento, tenemos
            // el problema  de que como primero añadimos el sustituto,
            // el sustituido aún no se ha marcado como tal, y no puede
            // haber dos jefes de departamento a la vez en activo.
            // Así que primero lo creamos/actualizamos sin ese cargo.
            const jefe = this.obtenerCampo("jefe", sustituto);
            //if(jefe) delete sustituto.customSchemas[this.schema].jefe;
            //if(jefe) sustituto.noDetectarJefes = true;

            // Creaomos o actualizamos el sustituto
            try { var response = await this.operar(sustituto); }
            catch(error) { return fallback(error); }

            const extra = response.additional = {}

            // Añadimos el sustituto al profesor sustituido.
            sustituido = {id: sustituido.id, customSchemas: {[this.schema]: {sustituto: response.result.id}}}
            try { extra.sustituido = await this.actualizar(sustituido)}
            catch(error) { 
               console.error(error);
               extra.sustituido = error;
            }

            /*
            if(jefe) {
               sustituto.customSchemas[this.schema].jefe = true;
               sustituto = {
                  id: response.result.id,
                  //customSchemas: sustituto.customSchemas
                  customSchemas: { [this.schema]: { jefe: true }}
               }
               try { extra.jefe = await this.actualizar(sustituto) }
               catch(error) {
                  console.error(error);
                  extra.jefe = error;
               }
            }
            */

            return callback(response);
         }
      }
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
            [this.schema]: { cese: fecha, puesto: null, tutoria: null, taquilla: null}
         }
      }

      if(id.includes('@')) profesor[this.emailField] = id;
      else profesor[this.idField] = id;

      const request = this.actualizar(profesor);

      return Object.assign({}, request, {
         then: async (callback, fallback) => {
            try { 
               var response = await request;
               profesor = response.result;
            }
            catch(error) { return fallback(error); }

            try { var sustituido = await this.listar({query: `${this.schema}.sustituto=${profesor[this.idField]}`}); }
            catch(error) { console.error(error); }

            const batch = new Batch();

            if(sustituido.length === 0){
               // No sustituía a nadie: nada que hacer.
            }
            else {
               if(sustituido.length > 1) {
                  console.warn(`${profesor[this.emailField]} sustituye a más de un profesor`);
               }
               for(let sust of sustituido) {
                  sust = {id: sust.id, customSchemas: {[this.schema]: {sustituto: "0"}}}
                  batch.add(this.actualizar(sust));
               }
            }

            // Elimina al profesor de todos los grupos
            for await (const grupo of this.grupos(request.id)) {
               batch.add(google.miembro.borrar(grupo.email, request.id));
            }

            response.additional = await batch;
            return callback(response);
         }
      });
   }

   borrar(profesor) {
      let id = this.constructor.parseID(profesor),
            request = super.borrar(profesor);

      return Object.assign({}, request, {
         then: async (callback, fallback) => {
            fallback = fallback || fallback_default;

            if(id.includes('@')) {
               try { id = (await this.obtener(profesor)).result.id; }
               catch(error) { console.error(error); }
            }

            try { var sustituido = await this.listar({query: `${this.schema}.sustituto=${id}`}); }
            catch(error) { console.error(error); }

            if(sustituido.length > 1) {
               console.warn(`${profesor[this.emailField]} sustituye a más de un profesor`);
            }

            for(let sust of sustituido) {
               sust = {id: sust.id, customSchemas: {[this.schema]: {sustituto: "0"}}}
               try {
                  await this.actualizar(sust);
               }
               catch(error) { console.error(error); }
            }

            try { return callback(await request); }
            catch(error) { return fallback(error); }
         }
      });
   }

   // Añade activo y jefe.
   listar(args) {
      const jefe = args && args.jefe;
      args = Object.assign({}, args);

      const query = args.query?[args.query]:[]
      if(args.activo) {
         const hoy = new Date().toISOString().slice(0, 10);
         query.push(`${this.schema}.cese>${hoy} ${this.schema}.sustituto=0`);
      }
      if(args.jefe) {
         query.push(`${this.schema}.jefe=true`);
      }
      delete args.activo;
      delete args.jefe;

      if(query.length) args.query = query.join(" ");

      const request = super.listar(args);
      if(!jefe || jefe === true) return request;
      else return Object.assign({}, request, {
         operacion: request.operacion,
         id: request.id,
         then: async (callback, fallback) => {
            fallback = fallback || fallback_default;

            try { var response = await request; }
            catch(error) { return fallback(error); }

            const dpto = this.config.obtenerDpto(jefe);
            return callback(response.filter(profesor => {
               const puesto = this.obtenerCampo("puesto", profesor);
               return dpto === this.config.obtenerDpto({puesto: puesto});
            }));
         }
      });
   } 

}

async function comprobarJefes(dptoID) {
   try { var jefes = await this.listar({jefe: dptoID}); }
   catch(error) { 
      console.error(error);
      jefes = [];
   }
   // Sólo queremos jefes que no han sido sustituidos
   jefes = jefes.filter(jefe => this.obtenerCampo("sustituto", jefe) != "0");
   if(jefes.length) {
      throw new Error(`${jefes[0][this.emailField]} ya es jefe de ${dpto.name}`);
   }
   return jefes;
}

export default Profesor;
