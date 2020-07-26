// Prueba de API usando Request.
export function testGroupsRequest(grupo) {
   gapi.client.request({
      path: "https://www.googleapis.com/groups/v1/groups/" + grupo,
      method: "GET",
      params: {alt: "JSON"},
   }).then(response => console.log(response.body), error => console.log(error));
}

import * as usuarios from "./usuarios.js";
import * as grupos from "./grupos.js";
import * as miembros from "./miembros.js";
import {isID} from "./misc.js";

export {usuarios, grupos, miembros, isID};
