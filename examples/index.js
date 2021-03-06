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

   client.on("configerror", function(e) {
      appendPre("¡¡¡¡Errores en la configuración!!!");
      console.warn("DEBUG", e.pending);
   });

   document.getElementById("lu").addEventListener("click", async function(e) {
      clearPre();
      var i = 1;
      // Como es una prueba, Sólo ontiene los 60 primeros usuarios, en dos lotes de 30.
      for await (const user of client.api.google.usuario.listar({limit: 60, maxResults: 30})) {
         appendPre(`${i}. ${user.primaryEmail} (${user.name.fullName})`);
         i++;
      }
      //client.api.testGroupsRequest("informatica@iescastillodeluna.es");
   });

   document.getElementById("lp").addEventListener("click", function(e) {
      clearPre();
      client.api.profesor.listar().then(users => {
         users.forEach((user, i) => {
            appendPre(`${i+1}. ${user.primaryEmail} (${user.name.fullName})`);
         });
      });
   });

   document.getElementById("lg").addEventListener("click", async function(e) {
      clearPre();
      var i = 1;
      for await (const grp of client.api.google.grupo.listar()) {
         appendPre(`${i}. ${grp.email} (${grp.description})`);
         i++;
      }
   });

   document.getElementById("lgu").addEventListener("click", async function(e) {
      clearPre();
      try {
         var i = 1;
         for await (const grp of client.api.profesor.grupos("josemiguelsanchez")) {
            appendPre(i + '. ' + grp.email + ' (' + grp.description + ')');
            i++;
         }
      }
      catch(error) {
         console.log(error);
      }
   });


   document.getElementById("bc").addEventListener("click", async function(e) {
      clearPre();
      appendPre("Borrando configuración y grupos");
      const grupos = (await client.api.google.grupo.listar({query: "email:BORRAR-*"}))
               // Dejamos de borrar algrun grupo...
               .filter(gr => gr.name !== "Música" && gr.name !== "Tutores");

      const batch = new client.api.Batch();
      for(const grupo of grupos) batch.add(client.api.google.grupo.borrar(grupo.email));

      const config = client.config.content;
      for(const ou of Object.values(config.ou || {})) {
         if(!ou.orgUnitId) continue;
         batch.add(client.api.google.ou.borrar(ou.orgUnitId));
      }

      const response = await batch;
      await client.config.remove();

      let i = 0;
      for(const [email, result] of Object.entries(response)) {
         i++;
         const res = result.error.code === 0?"OK":"Fallo";
         appendPre(`${i}. ${email}: ${res}.`);
      }
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

      const batch = new client.api.Batch();
      grupos.forEach(gr => batch.add(client.api.google.grupo.operar(gr)));

      appendPre("Grupos creados::\n");
      let i=0;
      for await(const [email, result] of batch) {
         i++;
         appendPre(`${i}. ${email}: ${result.error.code === 0?"OK":"Fallo"}`);
      }
   });

   document.getElementById("me").addEventListener("click", function(e) {
      clearPre();
      client.api.google.grupo.listar({query: "email:REBORRAR-*"}).then(grupos => {
         if(grupos.length === 0) {
            appendPre("No hay grupos de prueba que modificar");
            return;
         }

         const batch = new client.api.Batch();
         grupos.forEach(gr => {
            const grupo = {id: gr.id, description: `${gr.description}. Modificado`};
            batch.add(client.api.google.grupo.operar(grupo));
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

      const grupos = await client.api.google.grupo.listar({query: "email:REBORRAR-*"});

      if(grupos.length === 0) {
         appendPre("No hay grupos de prueba que borrar");
         return;
      }

      const batch = new client.api.Batch();
      grupos.forEach(gr => batch.add(client.api.google.grupo.operar(gr.email)));

      appendPre("Borrando los grupos de prueba... ");

      const response = await batch;
      let i=0;
      for(const [email, result] of Object.entries(response)) {
         i++;
         appendPre(`${i}. ${email}: ${result.error.code === 0?"OK":"Fallo"}`);
      }
   });

   document.getElementById("cp"). addEventListener("click", async function(e) {
      const profesores = [
         {
            primaryEmail: "borrar-soyprofesor",
            name: {
               givenName: "Profesor",
               familyName: "Aburridamente Inteligente",
            },
            jefe: true,
            puesto: "11590006",
            tutoria: "eso1a"
         },
         {
            primaryEmail: "borrar-otroprofesor",
            name: {
               givenName: "Profesor",
               familyName: "Que también es aburrido",
            },
            puesto: "00590001"
         }
      ]

      clearPre();

      appendPre("Creación de profesores:")
      const batch = new client.api.Batch();
      profesores.forEach(p => batch.add(client.api.profesor.crear(p)));
      let i=0;
      for await(const [email, result] of batch) {
         i++;
         console.log("DEBUG", result);
         const res = result.error.code === 0?"OK":"Fallo";
         appendPre(`${i}. ${email}: ${res}`);
      }
   });

   document.getElementById("mp"). addEventListener("click", async function(e) {
      const profesor = {
         primaryEmail: "borrar-soyprofesor",
         name: {
            givenName: "Sabelotodo"
         },
         puesto: "00590010",
         tutoria: null,
         taquilla: 24
      }

      clearPre();
      appendPre("Modificación del profesor");
      client.api.profesor.actualizar(profesor)
         .then(response => {
            console.log("DEBUG", response);
            appendPre(`${response.result.primaryEmail}: OK`);
         }, error => {
            console.error("DEBUG", error);
            appendPre(`${profesor.primaryEmail}: Falló`);
         });
   });

   document.getElementById("zp").addEventListener("click", function(e) {
      const profesor = "borrar-profesorsustituto";

      clearPre();
      appendPre("Cesando profesor:");
      client.api.profesor.cesar(profesor)
         .then(response => {
            console.log("DEBUG", response);
            appendPre(`${profesor}: OK`);
         }, error => {
            console.error("DEBUG", error);
            appendPre(`${profesor}: Falló`);
         });
   });

   document.getElementById("sp").addEventListener("click", function(e) {
      const sustituto = {
               primaryEmail: "borrar-profesorsustituto",
               name: {
                  givenName: "Profesor",
                  familyName: "Sustituto",
               },
            },
            sustituido = "borrar-soyprofesor";

      clearPre();
      appendPre("Sustituyendo a un profesor por otro:");
      client.api.profesor.sustituir(sustituto, sustituido)
         .then(response => {
            console.log("DEBUG", response);
            appendPre(`${sustituto.primaryEmail}: OK`);
         }, error => {
            console.error("DEBUG: ERROR", error);
            appendPre(`${sustituto.primaryEmail}: Falló`);
         })

   });

   document.getElementById("bp"). addEventListener("click", function(e) {
      clearPre();
      appendPre("Borrando profesores:");
      // No hace falta la query, pero por si acaso se mezcla con los profesores reales.
      client.api.profesor.listar({query: "email:borrar-"}).then(async profesores => {
         const batch = new client.api.Batch();
         for(const p of profesores) {
            batch.add(client.api.profesor.borrar(p.primaryEmail));
         }
         let i=0;
         for await(const [email, result] of batch) {
            i++;
            console.log("DEBUG", result);
            const res = result.error.code === 0?"OK":"Fallo";
            appendPre(`${i}. ${email}: ${res}`);
         }
      });
   });

   document.getElementById("cd"). addEventListener("click", function(e) {
      const dpto = {name: "Administración", email: "borrar-administracion", puestos: ["/.{2}590101/"]}

      clearPre();
      appendPre("Creando departamentos:")
      client.api.dpto.crear(dpto)
         .then(response => {
                  appendPre(`${response.result.email}: OK`);
                  console.log("DEBUG", response);
                  client.config.merge({departamentos: [response.additional.config]});
               },
               error => {
                  appendPre(`${dpto.email}: Falló`);
                  console.error("DEBUG", error);
               });

   });

   document.getElementById("md"). addEventListener("click", function(e) {
      const dpto = {name: "Administración y finanzas", email: "borrar-administracion", puestos: ["/.{2}590101/", "/.{2}591222/"]};

      clearPre();
      appendPre("Actualizando departamentos:");
      client.api.dpto.actualizar(dpto)
         .then(response => {
                  appendPre(`${response.result.email}: OK`);
                  console.log("DEBUG", response);
                  client.config.merge({departamentos: [response.additional.config]});
               },
               error => {
                  appendPre(`${dpto.email}: Falló`);
                  console.error("DEBUG", error);
               });
   });

   document.getElementById("bd"). addEventListener("click", function(e) {
      const dpto = "borrar-administracion";

      clearPre();
      appendPre("Borrando departamentos:")
      client.api.dpto.borrar(dpto)
         .then(response => {
                  appendPre(`${dpto}: OK`);
                  console.log("DEBUG", response);
                  client.config.merge({departamentos: [{id: null, email: `${dpto}@${client.params.hosted_domain}`}]})
               },
               error => {
                  appendPre(`${dpto}: Falló`);
                  console.error("DEBUG", error);
               });

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
