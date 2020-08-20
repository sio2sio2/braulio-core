import {OuSchemas} from "./base.js";

class Schemas extends OuSchemas {
   get tipo() { return "schemas"; }
   get idField() { return "schemaId"; }
   get emailField() { return "schemaName"; }
   get customer() { return "customer/my_customer/"; }
}

export default Schemas;
