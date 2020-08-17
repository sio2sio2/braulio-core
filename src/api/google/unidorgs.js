import {OuSchemas} from "./base.js";

class OrgUnits extends OuSchemas {
   get idField() { return "orgUnitId"; }
   get emailField() { return "name"; }
   get customer() { return "customer/my_customer/"; }

   crear(info) {
      const body = Object.assign({parentOrgUnitPath: "/", description: info.name}, info);
      info.orgUnitPath = `/${info.name}`;
      return super.crear(body);
   }
}

export default OrgUnits;;
