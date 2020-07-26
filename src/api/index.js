// Prueba de API usando Request.
export function testGroupsRequest(grupo) {
   gapi.client.request({
      path: "https://www.googleapis.com/groups/v1/groups/" + grupo,
      method: "GET",
      params: {alt: "JSON"},
   }).then(response => console.log(response.body), error => console.log(error));
}

import {obtUsuarios, crearProfesores, crearAlumnos} from "./usuarios.js";
import {obtGrupos, borrarGrupo} from "./grupos.js";
import {obtMiembros, vaciarGrupo, poblarGrupo, borrarMiembro} from "./miembros.js";
import {isID} from "./misc.js";

export {obtUsuarios, crearProfesores, crearAlumnos, borrarGrupo,
        obtGrupos, obtMiembros, vaciarGrupo, borrarMiembro, isID};
