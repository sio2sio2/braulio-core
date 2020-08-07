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

   client.on("noconfig", function(e) {
      appendPre("NO HAY CONFIGURACIÖN, así que se genera una a partir de una inicial");
   });

   // Cuando no se detecta configuración previa,
   // se desencadena el evento "noconfig" que proporciona
   // un objeto e.seed con una preconfiguración.
   client.on("preconfig", function(e) {
      appendPre("CONFIGURACIÓN GENERADA. Ahora debería darse la posibilidad de modificación interactiva.\n" +
                "En este ejemplo, nos limitamos a aceptarla");

      client.fire("onready", {action: "set"});
   });

   client.on("onready", function(e) {
      if(e.action === "set") appendPre("Hecho");
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
      client.api.grupos.listar({query: "email:BORRAR-*"}).get().then(grupos => {
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

         const config = client.config.content;
         for(const ou of Object.values(config.ou || {})) {
            if(!ou.orgUnitId) continue;
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


   document.getElementById("ce").addEventListener("click", async function(e) {
      clearPre();
      const grupos = [
         {
            name: "REBORRAR-grupotest",
            email: "REBORRAR-grupotest",
            description: "Grupo de pruebas REBORRAR",
         },
         {
            name: "REBORRAR-grupotest2",
            email: "REBORRAR-grupotest2",
            description: "Grupo de pruebas REBORRAR2.",
         }
      ]

      const batch = client.api.newBatch();
      grupos.forEach(gr => batch.add({grupo: gr}));

      appendPre("Grupos creados::\n");
      let i=0;
      for(const [email, result] of Object.entries(await batch.end())) {
         i++;
         appendPre(`${i}. ${email}: ${result.error.code === 0?"OK":"Fallo"}`);
      }
   });

   document.getElementById("me").addEventListener("click", function(e) {
      clearPre();
      client.api.grupos.listar({query: "email:REBORRAR-*"}).get().then(grupos => {
         if(grupos.length === 0) {
            appendPre("No hay grupos de prueba que modificar");
            return;
         }

         const batch = client.api.newBatch();
         grupos.forEach(gr => {
            const grupo = {id: gr.id, description: `${gr.description}. Modificado`};
            batch.add({grupo: grupo});
         });

         batch.then(response => {
            appendPre("Grupos a los que se les ha modificado la descripción:\n");
            let i=0;
            for(const [email, result] of Object.entries(response)) {
               i++;
               appendPre(`${i}. ${email}: ${result.error.code === 0?"OK":"Fallo"}`);
            }
         });
      });
   });

   document.getElementById("be").addEventListener("click", async function(e) {
      clearPre();

      const grupos = await client.api.grupos.listar({query: "email:REBORRAR-*"}).get();

      if(grupos.length === 0) {
         appendPre("No hay grupos de prueba que borrar");
         return;
      }

      const batch = client.api.newBatch();
      grupos.forEach(gr => batch.add({grupo: gr.email}));

      appendPre("Borrando los grupos de prueba... ");

      const response = await batch.end();
      let i=0;
      for(const [email, result] of Object.entries(response)) {
         i++;
         appendPre(`${i}. ${email}: ${result.error.code === 0?"OK":"Fallo"}`);
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
