/**
 * Elimina caractere s no ingleses de la cadena.
 *
 * @param {String} cadena Cadena a transformar en UTF-8.
 * @returns {String}
 */
export function normalizar(cadena) {
   return cadena.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Interfaz para objetos que implementan eventos y disparadores.

export const Evented = {
   _getEvents(name) {
      this._events = this._events || {};
      this._events[name] = this._events[name] || [];
      return this._events[name];
   },
   _getEventsOnce(name) {
      this._eventsOnce = this._eventsOnce || {};
      this._eventsOnce[name] = this._eventsOnce[name] || [];
      return this._eventsOnce[name];
   },
   on(name, func) {
      this._getEvents(name).push(func);
      return this;
   },
   once(name, func) {
      this._getEventsOnce(name).push(func);
      return this;
   },
   off(name, func) {
      let idx;
      if(func) {
         if(idx = this._getEvents(name).indexOf(func) !== -1) this._getEvents(name).splice(idx, 1)[0];
         if(idx = this._getEventsOnce(name).indexOf(func) !== -1) this._getEventsOnce(name).splice(idx, 1)[0];
      }
      else this._getEvents(name).length = this._getEventsOnce(name).length = 0;
      return this;
   },
   fire(name, obj) {
      for(const func of this._getEvents(name)) {
         func.call(this, Object.assign({
            type: name,
            target: this
         }, obj));
      }

      while(this._getEventsOnce(name).length) {
         this._getEventsOnce(name).shift().call(this, Object.assign({
            type: name,
            target: this
         }), obj);
      }
   }
}

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


export function isObject(variable) {
   return typeof variable === "object" && variable !== null && !Array.isArray(variable);
}

/**
 * Mezcla de forma recursiva dos o más objetos.
 */
export function merge(target, ...sources) {
   if(sources.length === 0) return target;
   const source = sources.shift();

   if(!isObject(source) || !isObject(target)) return source;
   else {
      for(const [key, value] of Object.entries(source)) {
         if(target.hasOwnProperty(key)) target[key] = merge(target[key], value);
         else target[key] = value;
      }
   }
   
   return merge(target, ...sources);
}
