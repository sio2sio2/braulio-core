// Gestión de unidades organizativas.
// El programa no da opción de cambiarlas, así que la API
// sólo incluye la forma de crearlas durante la inicialización.

export function crear(info) {
   const body = Object.assign({parentOrgUnitPath: "/", description: info.name}, info);
   info.orgUnitPath = `/${info.name}`;
   return gapi.client.request({
      path: "https://www.googleapis.com/admin/directory/v1/customer/my_customer/orgunits",
      method: "POST",
      body: body
   });
}

export function listar() {
   return gapi.client.request({
      path: "https://www.googleapis.com/admin/directory/v1/customer/my_customer/orgunits",
      method: "GET",
      params: { orgUnitPath: "/" }
   });
}

export function obtener(ou) {
   return gapi.client.request({
      path: `https://www.googleapis.com/admin/directory/v1/customer/my_customer/orgunits/${ou}`,
      method: "GET",
   });
}


export function actualizar(ou) {
   const id = ou.orgUnitId || ou.orgUbitPath;

   if(ou.orgUnitId) {
      ou = Object.assign({}, ou);
      delete ou.orgUnitId;
   }

   return gapi.client.request({
      path: `https://www.googleapis.com/admin/directory/v1/customer/my_customer/orgunits/${id}`,
      method: "PUY",
      body: ou
   });
}

/**
 * Borra una unidad de organización.
 *
 * @param {String} ou: Path o ID de la unidad.
 */
export function borrar(ou) {
   return gapi.client.request({
      path: `https://www.googleapis.com/admin/directory/v1/customer/my_customer/orgunits/${ou}`,
      method: "DELETE"
   });
}
