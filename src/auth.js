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
 *    // Añadimos con cliente.addEvenListener lo que queremos hacer cuando se produzcan
 *    // los eventos "succeed", "failed", "signedin", "signedout".
 *
 *    cliente.init();
 */

function OAuthClient(params) {
   this.params = params;
   this.identity = null;
   this._events = {};     // Eventos registrados.
}

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
          (this._events["succeed"] || []).forEach(f => f.call(this, {
             type: "succeed",
             target: this
          }));
       }, error => {
          (this._events["failed"] || []).forEach(f => f.call(this, {
             type: "failed",
             target: this,
             error: error
          }));
       });
   });
}

/**
 * Añade eventos que se disparan cuando:
 *
 * * succeed, el objeto se carga adecuadamente.
 * * failed, el objeto no puede cargarse.
 * * signedid, el usuario se autentica.
 * * signedout, el usuario se desautentica.
 */
OAuthClient.prototype.addEventListener = function(eventname, f) {
   this._events[eventname] = this._events[eventname] || []
   this._events[eventname].push(f);
}

// QUé se hace cuando cambia de estado el objeto,
// o sea, cuando el usuario ingresa o sale.
OAuthClient.prototype._updateSigninStatus = function(isSignedIn) {
   let e = isSignedIn;

   if(isSignedIn) {
      e = "signedin";
      const identity = gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile();
      this.identity = {
         email: identity.getEmail(),
         name: identity.getName()
      }
   }
   else {
      e = "signedout";
      this.identity = null;
   }
   
   (this._events[e] || []).forEach(f => f.call(this, {
       type: e,
       target: this
   }));
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
   if(!this.identity) return null;
   else return this.identity.email.split('@')[1];
}

export default OAuthClient;
