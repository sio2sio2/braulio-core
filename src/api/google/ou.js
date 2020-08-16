// Gestión de unidades organizativas.
// El programa no da opción de cambiarlas, así que la API
// sólo incluye la forma de crearlas durante la inicialización.

export function crear(info) {
   const body = Object.assign({parentOrgUnitPath: "/", description: info.name}, info);
   info.orgUnitPath = `/${info.name}`;
   const request = gapi.client.request({
      path: "https://www.googleapis.com/admin/directory/v1/customer/my_customer/orgunits",
      method: "POST",
      body: body
   });

   request.operacion = "crear";
   request.id = info.orgUnitPath;
   return request;
}

export function listar() {
   const request = gapi.client.request({
      path: "https://www.googleapis.com/admin/directory/v1/customer/my_customer/orgunits",
      method: "GET",
      params: { orgUnitPath: "/" }
   });

   request.operacion = "listar";
   return request;
}

export function obtener(ou) {
   const request = gapi.client.request({
      path: `https://www.googleapis.com/admin/directory/v1/customer/my_customer/orgunits/${ou}`,
      method: "GET",
   });

   request.operacion = "obtener";
   request.id = ou;
   return request;
}


export function actualizar(ou) {
   const id = ou.orgUnitId || ou.orgUbitPath;

   if(ou.orgUnitId) {
      ou = Object.assign({}, ou);
      delete ou.orgUnitId;
   }

   const request = gapi.client.request({
      path: `https://www.googleapis.com/admin/directory/v1/customer/my_customer/orgunits/${id}`,
      method: "PUT",
      body: ou
   });

   request.operacion = "actualizar";
   request.id = id;
   return request;
}

/**
 * Borra una unidad de organización.
 *
 * @param {String} ou: Path o ID de la unidad.
 */
export function borrar(ou) {
   const request = gapi.client.request({
      path: `https://www.googleapis.com/admin/directory/v1/customer/my_customer/orgunits/${ou}`,
      method: "DELETE"
   });

   request.operacion = "borrar";
   request.id = ou;
   return request;
}
