// Prueba de API usando Request.
// TODO: Esto hay que quitarlo de aquí e implementarlo donde corresponda.
// Sirve para manipular los permisos sobre los grupos.
export function testGroupsRequest(grupo) {
   gapi.client.request({
      path: "https://www.googleapis.com/groups/v1/groups/" + grupo,
      method: "GET",
      params: {alt: "JSON"},
   }).then(response => console.log(response.body), error => console.log(error));
}

import * as google from "./google";
import {isID} from "./misc.js";
import Batch from "./batch.js";
import * as profesor from "./profesor.js";
import * as dpto from "./departamento.js";

export {google, isID, Batch, profesor, dpto};
