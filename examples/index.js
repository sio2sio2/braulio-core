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

   // Cuando no se detecta configuración previa,
   // es necesario generar una a partir de la semilla.
   // Debe ser un proceso interactivo: aquí hacemos
   // una autogeneración con generarConfiguración.
   client.addEventListener("noconfig", function(e) {
      const config = generarConfiguracion(client);


      // Añadimos el prefijo "BORRAR-" a todos los grupos
      // para no interferir con los ya creados en el dominio.
      {
         config.claustro.email = `BORRAR-${config.claustro.email}`
         config.alumnos.email = `BORRAR-${config.alumnos.email}`
         config.departamentos = config.departamentos.map(dpto => Object.assign(dpto, {email: `BORRAR-${dpto.email}`}));
         config.grupos = config.grupos.map(gr => Object.assign(gr, {email: `BORRAR-${gr.email}`}));
      }

      appendPre("NO HAY CONFIGURACIÖN: Debe forzarse al usuario a definir una.\n" +
                "En en el ejemplo. Construimos una ex novo sin intervención del usuario.");

      client.config.inicializar(config).then(response => {
         console.log("DEBUG: seed", config);
         console.log("DEBUG", response);
         appendPre("\n\nConfiguración GENERADA");
      });

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
      for await (const user of client.api.usuarios.listar({limit: 60, maxResults: 30}).iter()) {
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
      client.api.usuarios.listar({maxResults: 100, query: "orgUnitPath=/claustro"}).get().then(users => {
         users.forEach((user, i) => {
            appendPre(`${i}. ${user.primaryEmail} (${user.name.fullName})`);
         });
      });
   });

   document.getElementById("lg").addEventListener("click", async function(e) {
      clearPre();
      var i = 1;
      for await (const grp of client.api.grupos.listar().iter()) {
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
      clearPre();
      try {
         var i = 1;
         for await (const grp of client.api.grupos.listar({userKey: "josemiguelsanchez@iescastillodeluna.es"}).iter()) {
            appendPre(i + '. ' + grp.email + ' (' + grp.description + ')');
            i++;
         }
      }
      catch(error) {
         console.log(error.body);
      }
   });


   document.getElementById("bc").addEventListener("click", async function(e) {
      clearPre();
      client.api.grupos.listar({query: "email:BORRAR-*"}).get().then(grupos => {
         // Evitamos aposta eliminar un grupo.
         grupos = grupos.filter(gr => gr.name !== "Música");

         if(grupos.length === 0) {
            client.config.remove().then(r => {
               appendPre("Borrada la configuración:");
            });
            return;
         }

         const batch = gapi.client.newBatch();
         for(const grupo of grupos) {
            batch.add(client.api.grupos.borrar(grupo.email), {id: grupo.email});
         }
         batch.then(response => {
            client.config.remove().then(r => {
               appendPre("Borrada la configuración y los grupos:");
               let i = 0;
               for(const [email, result] of Object.entries(response.result)) {
                  i++;
                  const res = result.status === 204?"OK":"Fallo";
                  appendPre(`${i}. ${email}: ${res}.`);
               }
            });
         })
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
         for await (const miembro of client.api.miembros.listar("borrar@iescastillodeluna.es").iter()) {
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
         client.api.miembros.vaciar(grupo).then(response => {
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
