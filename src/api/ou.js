// Gestión de unidades organizativas.
// El programa no da opción de cambiarlas, así que la API
// sólo incluye la forma de crearlas durante la inicialización.

export function crear(name, description) {
   return gapi.client.request({
      path: "https://www.googleapis.com/admin/directory/v1/customer/my_customer/orgunits",
      method: "POST",
      body: {
         name: name,
         parentOrgUnitPath: "/",
         description: desciption || name
      }
   });
}
