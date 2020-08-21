import {GrUsers} from "./base.js";

class Users extends GrUsers {
   get tipo() { return "users"; }
   get idField() { return "id"; }
   get emailField() { return "primaryEmail"; }
   get customer() { return ""; }

   // args.cesado = true, sólo lista los profesores/alumnos cesados.
   listar(args) {
      args = Object.assign({customer: 'my_customer', maxResults: 500}, args);
      if(this.constructor !== Users) {  // Es objeto de una subclase.
         const path = this.organizador.orgUnitPath || `/${this.organizador.name}`
         args.query = `orgUnitPath=${path}`;
         if(args.cesado) {
            const hoy = new Date().toISOString().slice(0, 10);
            args.query += ` profesor.cese<=${hoy}`;
         }
         delete args.cesado;
      }
      return super.listar(args);
   }
}

export default Users;
