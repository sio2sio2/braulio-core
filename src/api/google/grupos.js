import {GrUsers} from "./base.js";
import {fqda} from "../misc.js";

class Groups extends GrUsers {
   get tipo() { return "groups"; }
   get idField() { return "id"; }
   get emailField() { return "email"; }
   get customer() { return ""; }

   static isID(string) {
      // Quince letras y números.
      // Probablemente no haya nunca más de 6 letras seguidas.
      // /así distinguimos de una dirección no cualificada)
      return (string.length === 15         &&
              string.match(/^[a-z0-9]+$/)  &&
              !string.match(/[a-z]{7}/))
   }

   listar(args) {
      args = Object.assign({maxResults: 200}, args);
      if(args.userKey) args.userKey = fqda(args.userKey);
      else args = Object.assign({customer: 'my_customer'}, args);
      return super.listar(args);
   }
}

export default Groups;
