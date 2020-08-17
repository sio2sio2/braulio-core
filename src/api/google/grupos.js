import {GrUsers} from "./base.js";
import {fqda} from "../misc.js";

class Groups extends GrUsers {
   get idField() { return "id"; }
   get emailField() { return "email"; }
   get customer() { return ""; }

   listar(args) {
      args = Object.assign({maxResults: 200}, args);
      if(args.userKey) args.userKey = fqda(args.userKey);
      else args = Object.assign({customer: 'my_customer'}, args);
      return super.listar(args);
   }
}

export default Groups;
