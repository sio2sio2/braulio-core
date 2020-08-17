import {OuSchemas} from "./base.js";

class Schemas extends OuSchemas {
   get idField() { return "schemaId"; }
   get emailField() { return "schemaName"; }
   get customer() { return "customer/my_customer/"; }

   crear(info) {
      const body = Object.assign({parentOrgUnitPath: "/", description: info.name}, info);
      info.orgUnitPath = `/${info.name}`;
      return super.crear(body);
   }
}

export default Schemas;
