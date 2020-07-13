import OAuthClient from "./auth.js";
import * as api from "./api";
import Config from "./config.js";

function crearCliente(name, params) {
   const cliente = new OAuthClient(Object.assign(params, {
                     discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/admin/directory_v1/rest"],
                     scope: ("https://www.googleapis.com/auth/admin.directory.user " +
                             "https://www.googleapis.com/auth/admin.directory.group " +
                             "https://www.googleapis.com/auth/apps.groups.settings " +
                             "https://www.googleapis.com/auth/drive.appdata")
                   }));

   // Enlaza con el fichero de configuración correspondiente,
   // cuando nos identificamos.
   cliente.addEventListener("signedin", e => e.target.config = new Config(name));
   cliente.addEventListener("signedout", e => e.target.config = null);

   cliente.api = api;  // API de comunicación con G-Suite.

   return cliente;
}

export default crearCliente;
