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
