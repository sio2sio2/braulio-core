function appendPre(message) {
  var pre = document.getElementById('content');
  pre.appendChild(document.createTextNode(message + '\n'));
}

function clearPre() {
  var pre = document.getElementById('content');
   pre.innerHTML = "";
}

function interfaz(client) {
   client.addEventListener("succeed", function(e) {
      document.getElementById("authorize").addEventListener("click", e => {
         client[e.target.textContent === "Entrar"?"signin":"signout"](e);
      });
   });

   client.addEventListener("failed", function(e) {
      appendPre(JSON.stringify(error, null, 2));
   });

   client.addEventListener("noconfig", function(e) {
      appendPre("NO HAY CONFIGURACIÖN. Debería forzarse a crear la mínima indispensable.");
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
         appendPre(i + '. ' + user.primaryEmail + ' (' + user.name.fullName + ')');
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
         appendPre(i + '. ' + grp.email + ' (' + grp.description + ')');
         i++;
      }
   });

   document.getElementById("lgu").addEventListener("click", async function(e) {
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

      content = await client.config.get();
      console.log("DEBUG", content, await client.config.isEmpty);
      // client.config.set({"ab": 1, "xxDDxx": 12345}).then(response => console.log("DEBUGx", response));
      // client.config.remove(response => console.log(response));
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
      client.api.vaciarGrupo(grupo)
         .then(response => {
            clearPre();
            var i = 1;
            for(const email in response) {
               appendPre(i + ". " + email + ": " + response[email].code + " (" + response[email].message + ")");
               i++;
            }
         })
         .catch(error => {
            clearPre();
            appendPre("ERROR: " + (error.message || error.body));
         });
   });
}

window.onload = function(e) {
   const client = B("config.json", {
      clientId: clientId,
      apiKey: apiKey,
      hosted_domain: hosted_domain
   });
   interfaz(client);
   client.init();
}
