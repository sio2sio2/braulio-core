// Prueba de API usando Request.
export function testGroupsRequest(grupo) {
   gapi.client.request({
      path: "https://www.googleapis.com/groups/v1/groups/" + grupo,
      method: "GET",
      params: {alt: "JSON"},
   }).then(response => console.log(response.body), error => console.log(error));
}

import {obtUsuarios, crearProfesores, crearAlumnos} from "./usuarios.js";
import {obtGrupos, crearClaustro} from "./grupos.js";
import {obtMiembros, vaciarGrupo, poblarGrupo} from "./miembros.js";

export {obtUsuarios, crearProfesores, crearAlumnos,
        obtGrupos, crearClaustro,
        obtMiembros, vaciarGrupo, poblarGrupo}
