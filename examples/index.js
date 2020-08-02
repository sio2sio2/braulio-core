function interfaz(client) {
   client.on("succeed", function(e) {
      document.getElementById("authorize").addEventListener("click", e => {
         client[e.target.textContent === "Entrar"?"signin":"signout"](e);
      });

      window.CLIENTE = client;
   });

   client.on("failed", function(e) {
      appendPre(JSON.stringify(e.error, null, 2));
   });

   client.on("signedin", function(e) {
      const button = document.getElementById("authorize");
      button.textContent = "Salir";

      const span = document.createElement("span");
      span.appendChild(document.createTextNode(client.identity.name + " <" + client.identity.email + ">"));
      button.parentNode.insertBefore(span, button.nextElementSibling);
   });

   // Cuando no se detecta configuración previa,
   // se desencadena el evento "noconfig" que proporciona
   // un objeto e.seed con una preconfiguración.
   client.on("noconfig", function(e) {
      generarConfiguracion(e.seed, client.config.utils.generarCuentaDepartamento);


      // Añadimos el prefijo "BORRAR-" a todos los grupos
      // para no interferir con los ya creados en el dominio.
      {
         e.seed.contenedores.claustro.email = `BORRAR-${e.seed.contenedores.claustro.email}`
         e.seed.contenedores.alumnos.email = `BORRAR-${e.seed.contenedores.alumnos.email}`
         e.seed.contenedores.tutores.email = `BORRAR-${e.seed.contenedores.tutores.email}`
         e.seed.ou.claustro.name = `BORRAR-${e.seed.ou.claustro.name}`
         e.seed.ou.alumnos.name = `BORRAR-${e.seed.ou.alumnos.name}`
         e.seed.ou.misc.name = `BORRAR-${e.seed.ou.misc.name}`
         e.seed.departamentos = e.seed.departamentos.map(dpto => Object.assign(dpto, {email: `BORRAR-${dpto.email}`}));
      }

      appendPre("NO HAY CONFIGURACIÖN: Debe forzarse al usuario a definir una.\n" +
                "En en el ejemplo. Construimos una ex novo sin intervención del usuario.");

      // Guardamos la configuración, tras lo cual
      // se desencadena el evento "onready" de client.
      e.seed.set();
   });

   client.on("onready", function(e) {
      if(e.action === "set") appendPre("\n\nConfiguración GENERADA");
      else appendPre("Configuración CARGADA");
      
      Array.from(document.querySelectorAll("p button")).forEach(b => b.disabled = false);
   });

   client.on("signedout", function(e) {
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


   document.getElementById("bc").addEventListener("click", function(e) {
      clearPre();
      client.api.grupos.listar({query: "email:BORRAR-*"}).get().then(async grupos => {
         // Evitamos aposta eliminar un grupo.
         grupos = grupos.filter(gr => gr.name !== "Música" && gr.name !== "Tutores");

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

         const config = await client.config.get();
         for(const ou of Object.values(config.ou)) {
            batch.add(client.api.ou.borrar(ou.orgUnitId), {id: ou.orgUnitPath});
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
function generarConfiguracion(config, generarCuenta) {
   const cont = config.contenedores;

   cont.claustro.email = cont.claustro.email || generarCuenta(cont.claustro.name);
   cont.alumnos.email = cont.alumnos.email || generarCuenta(cont.alumnos.name);
   cont.tutores.email = cont.tutores.email || generarCuenta(cont.tutores.name);
   config.departamentos.forEach(dpto => {
      dpto.email = dpto.email || generarCuenta(dpto.name);
      dpto.description = `Departamento de ${dpto.name}`;
   });

   return config;
}
