function appendPre(message) {
  var pre = document.getElementById('content');
  pre.appendChild(document.createTextNode(message + '\n'));
}

function clearPre() {
  var pre = document.getElementById('content');
   pre.innerHTML = "";
}


// Convierte la configuración precargada en apta.
// Para ello, obtiene la dirección de email a partir del nombre
// quitando espacios y caracteres no ingleses.
function generarConfiguracion(client) {
   const utils = client.config.utils,
         config = client.config.seed;

   config.claustro.email = config.claustro.email || utils.generarCuentaDepartamento(config.claustro.name);
   config.alumnos.email = config.alumnos.email || utils.generarCuentaDepartamento(config.alumnos.name);
   config.departamentos.forEach(dpto => {
      dpto.email = dpto.email || utils.generarCuentaDepartamento(dpto.name);
      dpto.description = `Departamento de ${dpto.name}`;
   });
   config.grupos.forEach(gr => gr.email = gr.email || utils.generarCuentaGrupo(gr.name, true));

   return config;
}


function interfaz(client) {
   client.addEventListener("succeed", function(e) {
      document.getElementById("authorize").addEventListener("click", e => {
         client[e.target.textContent === "Entrar"?"signin":"signout"](e);
      });
      window.CONFIG = client.config;
   });

   client.addEventListener("failed", function(e) {
      appendPre(JSON.stringify(e.error, null, 2));
   });

   // Cuando no hay creada configuración, debe construirse una a partir de la semilla.
   client.addEventListener("noconfig", function(e) {
      // Añadimos los nombres de cuentas a la semilla de configuración.
      const config = generarConfiguracion(client);

      // Interactivamente, el usuario debería poder cambiar los nombres de cuentas
      // y añadir otros departamentos y grupos.

      // Añadimos el prefijo "BORRAR-" a todos estos grupos para no interferir
      // con los grupos ya creados en el dominio.
      config.claustro.email = `BORRAR-${config.claustro.email}`
      config.alumnos.email = `BORRAR-${config.alumnos.email}`
      config.departamentos = config.departamentos.map(dpto => Object.assign(dpto, {email: `BORRAR-${dpto.email}`}));
      config.grupos = config.grupos.map(gr => Object.assign(gr, {email: `BORRAR-${gr.email}`}));

      client.config.inicializar(config).then(response => {
         console.log("DEBUG: seed", config);
         console.log("DEBUG", response);
      });

      appendPre("NO HAY CONFIGURACIÖN: Debe forzarse al usuario a definir una.\n" +
                "En en el ejemplo. Construimos una ex novo sin intervención del usuario.");

   });

   client.addEventListener("signedin", function(e) {
      const button = document.getElementById("authorize");
      button.textContent = "Salir";

      const span = document.createElement("span");
      span.appendChild(document.createTextNode(client.identity.name + " <" + client.identity.email + ">"));

      button.parentNode.insertBefore(span, button.nextElementSibling);
      Array.from(document.querySelectorAll("p button")).forEach(b => b.disabled = false);
   });

   client.addEventListener("signedout", function(e) {
      const button = document.getElementById("authorize");
      button.textContent = 'Entrar';

      const span = document.querySelector("span");
      if(span) span.remove();

      Array.from(document.querySelectorAll("p button")).forEach(b => b.disabled = true);
   });

   document.getElementById("lu").addEventListener("click", async function(e) {
      clearPre();
      var i = 1;
      for await (const user of client.api.obtUsuarios({limit: 60, maxResults: 30}).iter()) {
         console.log("DEBUG", user);
         const cuenta = user.primaryEmail.slice(0, user.primaryEmail.indexOf('@')),
               ce = client.api.isID(cuenta),
               cid = client.api.isID(user.id);
         let pre = "";
         if(ce) pre = `${cuenta}>>>`
         else if(!cid) pre = `${user.id}>>>`
         appendPre(`${pre}${i}. ${user.primaryEmail} (${user.name.fullName})`);
         i++;
      }
      //client.api.testGroupsRequest("informatica@iescastillodeluna.es");
   });

   document.getElementById("lp").addEventListener("click", function(e) {
      clearPre();
      client.api.obtUsuarios({maxResults: 100, query: "orgUnitPath=/claustro"}).get().then(users => {
         users.forEach((user, i) => {
            appendPre(i + '. ' + user.primaryEmail + ' (' + user.name.fullName + ')');
         });
      });
   });

   document.getElementById("lg").addEventListener("click", async function(e) {
      clearPre();
      var i = 1;
      for await (const grp of client.api.obtGrupos().iter()) {
         const cuenta = grp.email.slice(0, grp.email.indexOf('@')),
               ce = client.api.isID(cuenta),
               cid = client.api.isID(grp.id);
         let pre = "";
         if(ce) pre = `${cuenta}>>>`
         else if(!cid) pre = `${grp.id}>>>`
         appendPre(`${pre}${i}. ${grp.email} (${grp.description})`);
         i++;
      }
   });

   document.getElementById("lgu").addEventListener("click", async function(e) {
      /*
      clearPre();
      try {
         var i = 1;
         for await (const grp of client.api.obtGrupos({userKey: "josemiguelsanchez@iescastillodeluna.es"}).iter()) {
            appendPre(i + '. ' + grp.email + ' (' + grp.description + ')');
            i++;
         }
      }
      catch(error) {
         console.log(error.body);
      }
      */

      // content = await client.config.get();
      // console.log("DEBUG", content, await client.config.isEmpty);
      // client.config.set({"ab": 1, "xxDDxx": 12345}).then(response => console.log("DEBUGx", response));
      // client.config.remove().then(response => console.log("DEBUGr", response));
      
      client.api.obtGrupos({query: "email:BORRAR-*"}).get().then(grupos => {
         console.log("DEBUG: Lista", grupos);
         if(grupos.length === 0) return;

         const batch = gapi.client.newBatch();
         for(const grupo of grupos) {
            if(grupo.name === "Música") continue;
            batch.add(client.api.borrarGrupo(grupo.email));
         }
         batch.then(response => {
            client.config.remove().then(r => {
               console.log("DEBUG", response);
            });
         });
      });
   });

   document.getElementById("im").addEventListener("click", function(e) {
      clearPre();
      client.api.crearClaustro("borrar@iescastillodeluna.es",
         [{
            email: "borrar2@iescastillodeluna.es",
            nombre: "Borrarlo2"
         }, {
            email: "noexiste@iescastillodeluna.es",
            nombre: "Inexistente"
         }])
         .then(response => {
            appendPre('Departamento: ' + response.dpto.code + " (" + response.dpto.message + ")");
            for(const dpto in response.members) {
               appendPre(dpto + ': ' + response.members[dpto].code + " (" + response.members[dpto].message + ")");
            }
         });
   });

   document.getElementById("lm").addEventListener("click", async function(e) {
      clearPre();
      try {
         var i = 1;
         for await (const miembro of client.api.obtMiembros("borrar@iescastillodeluna.es").iter()) {
            appendPre(i + ". " + miembro.email + " (" + miembro.type + ")");
            i++;
         } 
      }
      catch(error) {
         appendPre("ERROR: "+ error.status);
      }
   });

   document.getElementById("vm").addEventListener("click", function(e) {
      const grupo = "borrar@iescastillodeluna.es";
      try {
         client.api.vaciarGrupo(grupo).then(response => {
            clearPre();
            var i = 1;
            for(const email in response) {
               appendPre(i + ". " + email + ": " + response[email].code + " (" + response[email].message + ")");
               i++;
            }
         });
      }
      catch(error) {
         console.warn("ERROR CAZADO:", error);
      }

   });
}

window.onload = function(e) {
   const cliente = Braulio("config.json", {
      clientId: clientId,
      apiKey: apiKey,
      hosted_domain: hosted_domain
   });
   interfaz(cliente);
   cliente.init();
}
