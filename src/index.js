import OAuthClient from "./auth.js";
import * as api from "./api";
import Config from "./config";

function crearCliente(name, params) {
   const cliente = new OAuthClient(Object.assign(params, {
                     discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/admin/directory_v1/rest"],
                     scope: ("https://www.googleapis.com/auth/admin.directory.user " +
                             "https://www.googleapis.com/auth/admin.directory.group " +
                             "https://www.googleapis.com/auth/apps.groups.settings " +
                             "https://www.googleapis.com/auth/drive.appdata " +
                             "https://www.googleapis.com/auth/admin.directory.orgunit")
                   }));

   // Consigue el fichero de configuración al identificarse.
   // Si no hay configuración, se desencadena el evento noconfig.
   cliente.addEventListener("signedin", async e => {
      const config = e.target.config = new Config(name);
      if(await config.vacia) {
         (e.target._events["noconfig"] || []).forEach(f => f.call(e.target, {
            type: "noconfig",
            target: this
         }));
      }
   });
   cliente.addEventListener("signedout", e => e.target.config = null);

   cliente.api = api;  // API de comunicación con G-Suite.

   return cliente;
}

export default crearCliente;
