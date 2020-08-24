import {OuSchemas} from "./base.js";

class OrgUnits extends OuSchemas {
   get tipo() { return "orgunits"; }
   get idField() { return "orgUnitId"; }
   get emailField() { return "name"; }
   get customer() { return "customer/my_customer/"; }

   static isID(string) {
      return string.startsWith("id:");
   }

   crear(info) {
      const body = Object.assign({description: info.name}, info);
      if(!body.hasOwnProperty("orgUnitPath")) body.parentOrgUnitPath = "/";
      return super.crear(body);
   }
}

export default OrgUnits;;
