# Braulio (core)

**Braulio** es una aplicación web bastante modesta que facilita la gestión de
[cuentas G-Suite](https://gsuite.google.es/) y, en particular:

* Las tareas de alta y baja de alumnos y profesores.
* La gestión de grupos necesarios:

   - Departamentos.
   - Tutores.
   - Grupos de alumnos.
   - Equipos educativos.

Por supuesto, esta gestión puede hacerse manualmente a través de la [interfaz
oficial](https://admin.google.com:), pero **Braulio** está diseñada para hacer
éstas específicamente, así que automatiza o semiautomatiza muchas de ellas y
ahorra tiempo y esfuerzo.

El repositorio no contiene implementación de interfaz web alguna, sólo contiene
el código Javascript que conecta con las [APIs de
Google](https://developers.google.com/apis-explorer). Para ella, consulte
[braulio-app](https://github.com/sio2sio2/braulio-app).

## Preparación del dominio

Para poder utilizar la aplicación es preciso:

* En [admin.google.com>Seguridad>Permisos de la API>Control de acceso de
  aplicaciones](https://admin.google.com/ac/owl/list?tab=services&hl=es)
  eliminar las restricciones a "Administrador de G-Suite".

* En la [consola de desarrollador](https://console.developers.google.com):

  + Crear un nuevo proyecto.

  + En la pantalla de consentimiento, hacer que el proyecto sea de tipo interno
    y darle un nombre.

  + Crear credenciales:

    1. Un identificador de cliente para una aplicación web (que será el
       ``clientId`` en nuestra aplicación).
    1. Una clave de API (que será la ``apiKey`` en nuestra aplicación).

  + Habilitar las APIs:

    1. [Admin SDK](https://developers.google.com/admin-sdk/directory), que
       permite manipular las cuentas de G-Suite.
    1. [Groups Settings API](https://developers.google.com/admin-sdk/groups-settings/get_started),
       que permite definir cuál es el acceso a las cuentas de grupo. Por ejemplo,
       si es posible que una cuenta externa, escriba a un grupo de G-Suite.
    1. [Drive API](https://developers.google.com/drive/api/v3/reference), que
       permite leer y escribir en el *Drive* del usuario. En este proyecto, es
       necesario para poder guardar la configuración de la aplicación.
    1. [Gmail API](https://developers.google.com/gmail/api), que permite el envío
       de mensajes.

## Organización del dominio

Las cuentas del instituto se organizarán del siguiente modo:

1. Tres unidades organizativas:

   * **Profesores**, para profesores.
   * **Alumnos**. para alumnos.
   * **Otros**, para cuentas que no sean de profesores ni de alumnos (p.e. una
     cuenta para la biblioteca del centro).

1. Dos grandes grupos relacionados con estas unidades organizativas:

   * **claustro**, que incluirá todos los grupos que representan
     departamentos didácticos o de formación profesional (lo que indirectamente
     supondrá que contenga a todos los profesores).
   * **alumnos**, que incluirá todos los grupos de alumnos (lo que
     indirectamente supondrá que contenga a todos los alumnos).

1. Grupos que contienen usuarios:

   * Un grupo por cada **departamento didáctico**, cada uno de los cuales
     contendrá a los profesores de tal departamento.
   * Un grupo por cada **conjunto de tutores** que se estime oportuno. La
     interfaz dejará libertad para crear estos grupos y marcar a los profesores
     que formen parte e ellos. Existirá, además, un grupo **tutores** que
     contenga todo estos grupos.
   * Un grupo por cada **grupo de alumnos**, cada uno de los cuales contendrá a
     los alumnos de tal grupo.
   * Un grupo por cada **equipo educativo**, cada uno de los cuales contendrá a
     los profesores que imparten clase en el grupo de alumnos correspondiente.

1. Cuentas de usuario:

   * Una para cada **profesor**, cada una de las cuales deberá estar en un
     departamento.
   * Una para cada **alumno**, cada una de las cuales deberá estar en un grupo
     de alumnos.
   * **Otras cuentas** que servirán para cualquier propósito:

     + Servicios del instituto (*Biblioteca*, *Secretaría*).
     + Cargos (en caso de que se prefiera una cuenta nueva a crearle un alias
       al que desempeña el cargo).

---
**Nota**

Sería conveniente también formar grupos de alumnos para cada asignatura, porque
permitiría formar los grupos de
[Classroom](https://edu.google.com/products/classroom), pero
eso exige disponer de un método sencillo para obtener esos datos de Séneca y no
existe. Es probable que los institutos antes de volcar los datos en Séneca,
creen los grupos con alguna otra herramienta (p.e. hojas de cálculo) que permita
una exportación más sencilla; pero al ser métodos semimanuales y no estar
normalizados, no hay forma de crear una herramienta universal de importación.

---

## Uso

El código depende de
[gapi-client](https://github.com/google/google-api-javascript-client), el cual
debe cargarse siempre a través de una etiqueta ``script``, se use cualquiera de
los dos métodos que se enuncian a continuación.

### Directamente en el navegador

Descargue el código ``dist/braulio-core.js`` y al final de su página HTML
coloque los elementos ``script``:

~~~html

<script src="https://apis.google.com/js/api.js"></script>
<script src="braulio-core.js"></script>

~~~

En su código *Javascript* podrá utilizar el cliente *Braulio* a través de la
función ``Braulio``:

~~~javascript

window.onload = function(e) {
   const cliente = Braulio("config.json", {
      clientId: "###---CLIENT ID---###,
      apiKey: "###---API KEY---###",
      hosted_domain: "iesmiinstituto.com"
   });
   // etc...
}

~~~

### Desarrollando con NodeJS

Instale la librería en su directorio de desarrollo:

~~~console

$ npm install git+https://github.com/sio2sio2/graulio-core.git

~~~

En el código *Javascript* que está escribiendo, importe la función:

~~~javascript

import Braulio from "braulio-core";

const cliente = Braulio("config.json", {
         clientId: "###---CLIENT ID---###",
         apiKey: "###---API KEY---###",
         hosted_domain: "iesmiinstituto.com"
      });

~~~

Recuerde que en el código HTML deberá incluir la carga de ``gapi``:

~~~html

<script src="https://apis.google.com/js/api.js"></script>

~~~

## API

### Inicialización

Utilice la función cargadora:

~~~javascript

const cliente = Braulio("config.json", {
         clientId: "###---CLIENT ID---###",
         apiKey: "###---API KEY---###",
         hosted_domain: "iesmiinstituto.com"
      });

// Código javascript relacionado con los eventos *succeed*,
// *failed*, *noconfig*, *signedin* y *signedout*. 

cliente.init();

~~~

El primer parámetro define el nombre que se usará para el fichero de
configuración que se almacena en el Drive del usuario que se autentica. El
segundo argumento define los parámetros que se usarán para la autenticación.

El cliente no se inicializa propiamente hasta que no se usa su método
``.init()``, pero antes de invocarlo es necesario que esté cargado todo el
código relacionado con los cinco eventos asociados a la inicialización:

| Evento    | Se dispara cuando....        |
| --------- | ---------------------------- |
| succeed   | se inicializó con éxito.     |
| failed    | error en la inicialización.  |
| signedin  | se produjo autenticación.    |
| noconfig  | no hay configuración previa. |
| signedout | hubo desautenticación.       |

En realidad los tres últimos eventos están relacionados con el proceso de
autenticación, pero la inicialización intenta una autenticación automática, por
lo que al menos las acciones relacionadas con los eventos de *signin* y
**noconfig** es pertinente tenerlos definidos antes de proceder a la
inicialización.

Para asociar acciones a los eventos, debe usarse el método
``.addeventListener()``:

~~~javascript

cliente.addEventListener("succeed", function(e) {  // this es cliente
   console.log(e.type === "succeed");    // true.
   console.log(e.target === cliente);    // true.

   // Habilitamos el botón que permite la autenticación.
   document.getElementById("authorize").disabled = false;
});

~~~

Échele un ojo al [ejemplo de
usuo](https://github.com/sio2sio2/braulio-core/tree/master/examples).

### Autenticación

El objeto que devuelve la función ``Braulio`` tiene dos métodos relacionados con
la autenticación:

| Método  | Descripción                          |
| ------- | ------------------------------------ |
| signin  | Arranca el proceso de autenticación. |
| signout | Desconecta la aplicación,            |

y dos eventos homónimos:

| Evento    | Se desencadena cuando...              |
| --------- | ------------------------------------- |
| signedin  | ... el usuario abre una sesión.       |
| signedout | ... el usuario sale de la sesión.     |

Por tanto, si planteamos crear un botón para controlar el ingreso del usuario
podríamos hacer algo como esto:

~~~javascript

// Braulio está asociado a la variable cliente.

document.getElementById("ingreso").onclick = function(e) {
   const conectado = this.textContent === "Salir",
         // Si estoy conectado, desconecto; si desconectado, conecto.
         accion = conectado?"signout":"signin";

   cliente[evento]();
}

cliente.addEventListener("signedin", function(e) {
   const button = document.getElementById("ingreso");
   button.textContent = "Salir";

   console.log(`${cliente.identity.name} <${cliente.identity.email}>`);
});

cliente.addEventListener("signedin", function(e) {
   const button = document.getElementById("ingreso");
   button.textContent = "Entrar";
});

~~~

### Configuración

La aplicación necesita almacenar información adicional referente a:

- el grupo que representará al claustro y contendrá todos los departamentos
  didácticos.
- el grupo que representará a los alumnos y contendrá todos los grupos de
  clase.
- el grupo que incluya a todos los tutores.
- los puestos adcritos a los distintos departamentos didácticos.
  Por ejemplo, es necesario conocer que el profesor con puesto
  *10590006* pertenece al departamento de Matemáticas.

Para ello usa un fichero en formato JSON que se almacena en el directorio para
datos de aplicaciones del [Drive](https://drive.google.com) del usuario
administrador y que tiene esta estructura:

~~~json

{
   "contenedores": {
      "claustro": { "id": "### identificador del grupo ###" },
      "alumnos": {"id": "### identificador del grupo ###" },
      "tutores": {"id": "### identificador del grupo ###" },
   },
   "ou": {
      "claustro": { "orgUnitId": "### identificador de la ou ###" },
      "alumnos": { "orgUnitId": "### identificador de la ou ###" },
      "misc": { "orgUnitId": "### identificador de la ou ###" }
   },
   "departamentos": [
      { 
         "id": "### Identificador del grupo de Filosofía ###",
         "puestos": [ "/[0-1][0-9]590001/" ]
      },
      {
         "id": "### Identificador del grupo de Lenguas Clásicas ###",
         "puestos": [ "00590002" , "00590003" ]
      }
   ]
}

~~~

El fichero almacena identificadores para evitar que una manipulación manual de
alguno de los nomres de grupo inutilice la aplicación. Al completarse la
autenticación, ``Braulio`` intenta cargar el fichero de configuración:

- Si lo encuentra, hará consultas para obtener los nombres, direcciones y
  descripciones, de los grupos y la ruta de las unidades organizativas a partir
  de los identificadores almacenados.
- Si no lo encuentra, disparará el evento *noconfig* para que pueda crearse
  una configuración inicial:

  ~~~javascript

  cliente.addEventListener("noconfig", function(e) {
      // El objeto de configuración facilita una propuesta inicial
      // que se puede tomar como base para crear la configuración.
      const config = cliente.config.seed;

      // Manipulación de config como se estime oportuno. Lo mínimo
      // indispensable es definir los correos electrónicos de 

      const cont = config.contenedores,
            utils = cliente.config.utils;;

      // En la semilla inicial falta definir los correos
      // electrónicos de los grupos (y, si se desean definir, las descripciones)

      cont.claustro.email = utils.generarCuentaDepartamento(cont.claustro.name);
      cont.alumnos.email = utils.generarCuentaDepartamento(cont.alumnos.name);
      cont.tutores.email = utils.generarCuentaDepartamento(cont.tutores.name);
      config.departamentos.forEach(dpto => {
         dpto.email = utils.generarCuentaDepartamento(dpto.name);
         dpto.description = `Departamento de ${dpto.name}`;
      });

      // Al acabar de manipular, se inicializa el objeto a fin de almacenar
      // el fichero:
      client.config.inicializar(config).then(response => {
         console.log("Inicialización completa de la configuración");
      });
  });

  ~~~

El objeto de configuración es accesible a través atributo ``cliente.config`` y
dispone:

**Métodos**

* ``.get()``: Promesa del contenido del fichero:

  ~~~javascript

  cliente.config.get().then(content => {
      console.log("El contenido de la configuración es", content);
  });

  ~~~

*

**Atributos**

**Eventos**

| Evento    | Se desencadena cuando...                                   |
| --------- | ---------------------------------------------------------- |
| noconfig  | ... se detecta que no existe configuración al autenticarse |

### API de manipulación de G-Suite
