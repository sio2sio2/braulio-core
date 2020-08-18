import Config from "../config";
import {clase} from "./google";

function isSubclass(A, B) {
   return A.prototype instanceof B || A === B;
}

export default Base => class extends Base {
   get config() {
      return this._config || Object.defineProperty(this, "_config", {value: new Config()})._config;
   }

   get identificador() { throw new Error("Atributo abstracto"); }

   // TODO: Hay que obtener este valor de this.config.
   get schema() { return this.identificador; }
   get organizador() { 
      // Los usuarios están agrupados por unidades organizativas,
      // los grupos por grupos contenedores.
      const seccion = this instanceof clase.Users?"ou":"contenedores";
      return this.config.content && this.config.content[seccion][this.identificador];
   }

   // Buscan campos en los esquemas.
   obtenerValor(clave, entidad) {
      if(!entidad.customSchemas) return null;

      try {
         return entidad.customSchemas[this.schema][clave];
      }
      catch(error) { 
         return undefined; 
      }
   }

   // Mezcla dos o más esquemas.
   mergeSchemas(target, ...sources) {
      const schemas = {};
      for(const obj of [target, ...sources]) {
         for(const [key, fields] of Object.entries(obj || {})) {
            schemas[key] = schemas[key] || [];
            schemas[key].push(fields);
         }
      }

      return Object.fromEntries(Object.entries(schemas).map(([k, v]) => [k, Object.assign(...v)]));
   }

   obtener(entidad) {
      const args = this instanceof clase.Users?{projection: "custom", customFieldMask: this.schema}:{};
      return super.obtener(entidad, args);
   }
}
