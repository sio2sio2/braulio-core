// Manipulación de esquemas de usuario

export function listar() {
   return gapi.client.request({
      path: "https://www.googleapis.com/admin/directory/v1/customer/my_customer/schemas",
      method: "GET"
   });
}


export function obtener(id) {
   return gapi.client.request({
      path: `https://www.googleapis.com/admin/directory/v1/customer/my_customer/schemas/${id}`,
      method: "GET"
   });
}


export function crear(esquema) {
   return gapi.client.request({
      path: "https://www.googleapis.com/admin/directory/v1/customer/my_customer/schemas",
      method: "POST",
      body: esquema
   });
}


export function borrar(id) {
   return gapi.client.request({
      path: `https://www.googleapis.com/admin/directory/v1/customer/my_customer/schemas/${id}`,
      method: "DELETE"
   });
}
