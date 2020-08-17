import Users from "./usuarios.js";
import Groups from "./grupos.js";
import Schemas from "./esquemas.js";
import OrgUnits from "./unidorgs.js";
import * as miembro from "./miembros.js";

const clase = {
   Users: Users,
   Groups: Groups,
   Schemas: Schemas,
   OrgUnits: OrgUnits
}

export const usuario = new Users();
export const grupo = new Groups();
export const esquema = new Schemas();
export const ou = new OrgUnits();
export {miembro, clase};
