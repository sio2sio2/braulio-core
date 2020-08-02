import {Evented} from "./utils";

/**
 * Autenticación OAuth2 de Google.
 *
 * Uso:
 *
 *    const cliente = new OAuthClient({
 *       discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/admin/directory_v1/rest"],
 *       scope: "https://a https://b https://c",  // a,b,c habrá que verlos en la documentación de Google.
 *       clientId: "xxxxxx",
 *       apiKey: "AAAAAAA",
 *       hosted_domain: "nuestro@dominio"  // Esto es opcional.
 *    });
 *
 *    // Añadimos con cliente.on lo que queremos hacer cuando se produzcan
 *    // los eventos "succeed", "failed", "signedin", "signedout".
 *
 *    cliente.init();
 */

function OAuthClient(params) {
   this.params = params;
   this.identity = null;
   this._events = {};     // Eventos registrados.
}

Object.assign(OAuthClient.prototype, Evented);

/**
 * Inicializa el objeto propiamente.
 */
OAuthClient.prototype.init = function() {
   gapi.load('client:auth2', () => {
       gapi.client.init(this.params).then(() => {
          gapi.auth2.getAuthInstance().isSignedIn.listen(s => this._updateSigninStatus(s));
          this._updateSigninStatus(this._isSignedIn());
          // TODO: Controlar esto. ¿Puede usarse en vez de como está hecho hasta ahora para indicar el usuario en la web?
          //gapi.auth2.getAuthInstance().currentUser.listen(s => console.log("DEBUG", s));
          // Ejecutamos todas las acciones asociadas a la inicialización.
          this.fire("succeed");
       }, error => this.fire("failed"));
   });
}


// QUé se hace cuando cambia de estado el objeto,
// o sea, cuando el usuario ingresa o sale.
OAuthClient.prototype._updateSigninStatus = function(isSignedIn) {
   if(isSignedIn) {
      const identity = gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile();
      this.identity = {
         email: identity.getEmail(),
         name: identity.getName()
      }
      this.fire("signedin");
   }
   else {
      this.identity = null;
      this.fire("signedout");
   }
   
}

OAuthClient.prototype._isSignedIn = function() {
   return gapi.auth2.getAuthInstance().isSignedIn.get()
}

/**
 * Inicia el proceso de autenticación
 */
OAuthClient.prototype.signin = function() {
   gapi.auth2.getAuthInstance().signIn();
}

/**
 * Inicia el proceso de desautenticación.
 */
OAuthClient.prototype.signout = function() {
   gapi.auth2.getAuthInstance().signOut();
}

/**
 * Dominio en el que se está autenticado.
 *
 * @returns {String} El dominio.
 */
OAuthClient.prototype.domain = function() {
   return this.identity?gapi.auth2.getAuthInstance().currentUser.get().getHostedDomain():null;
}

export default OAuthClient;
