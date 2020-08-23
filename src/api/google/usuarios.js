import {GrUsers} from "./base.js";

class Users extends GrUsers {
   get tipo() { return "users"; }
   get idField() { return "id"; }
   get emailField() { return "primaryEmail"; }
   get customer() { return ""; }

   listar(args) {
      args = Object.assign({customer: 'my_customer', maxResults: 500}, args);
      return super.listar(args);
   }
}

export default Users;
