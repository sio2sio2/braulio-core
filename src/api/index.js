// Prueba de API usando Request.
export function testGroupsRequest(grupo) {
   gapi.client.request({
      path: "https://www.googleapis.com/groups/v1/groups/" + grupo,
      method: "GET",
      params: {alt: "JSON"},
   }).then(response => console.log(response.body), error => console.log(error));
}

import * as google from "./google";
import {isID} from "./misc.js";
import newBatch from "./batch.js";
import * as profesor from "./profesor.js";

export {google, isID, newBatch, profesor};
