import OAuthClient from "./auth.js";
import * as api from "./api";
import Config from "./config";
import * as utils from "./utils.js";

export default function(name, params) {
   const cliente = new OAuthClient(Object.assign(params, {
                     discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/admin/directory_v1/rest"],
                     scope: ("https://www.googleapis.com/auth/admin.directory.user " +
                             "https://www.googleapis.com/auth/admin.directory.group " +
                             "https://www.googleapis.com/auth/apps.groups.settings " +
                             "https://www.googleapis.com/auth/drive.appdata " +
                             "https://www.googleapis.com/auth/admin.directory.orgunit " +
                             "https://www.googleapis.com/auth/admin.directory.userschema")
                   }));

   const config = cliente.config = new Config(cliente, name);

   cliente.on("signedin", e => config.init());
   cliente.on("signedout", e => config.reset());

   cliente.api = api;  // API de comunicación con G-Suite.
   cliente.utils = utils;

   return cliente;
}
