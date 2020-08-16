// Manipulación de esquemas de usuario

export function listar() {
   const request = gapi.client.request({
      path: "https://www.googleapis.com/admin/directory/v1/customer/my_customer/schemas",
      method: "GET"
   });

   request.operacion = "listar";
   return request;
}


export function obtener(id) {
   const request = gapi.client.request({
      path: `https://www.googleapis.com/admin/directory/v1/customer/my_customer/schemas/${id}`,
      method: "GET"
   });

   request.operacion = "obtener";
   request.id = id;
   return request
}


export function crear(esquema) {
   const request = gapi.client.request({
      path: "https://www.googleapis.com/admin/directory/v1/customer/my_customer/schemas",
      method: "POST",
      body: esquema
   });

   request.operacion = "crear";
   request.id = esquema.schemaName;
   return request;
}


export function borrar(id) {
   const request = gapi.client.request({
      path: `https://www.googleapis.com/admin/directory/v1/customer/my_customer/schemas/${id}`,
      method: "DELETE"
   });

   request.operacion = "borrar";
   request.id = id;
   return request;
}
