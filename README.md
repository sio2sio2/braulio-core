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
// *failed*, *noconfig*, *signin* y *signout*. 

cliente.init();

~~~

El cliente no se inicializa propiamente hasta que no se usa su método
``.init()``, pero antes de invocarlo es necesario que esté cargado todo el
código relacionado con los cinco eventos asociados a la inicialización:

| Evento   | Se dispara cuando....        |
| -------- | ---------------------------- |
| succeed  | se inicializó con éxito.     |
| failed   | error en la inicialización.  |
| signin   | se produjo autenticación.    |
| noconfig | no hay configuración previa. |
| signout  | hubo desautenticación.       |

En realidad los tres últimos eventos están relacionados con el proceso de
autenticación, pero la inicialización intenta una autenticación automática, por
lo que al menos los eventos de *signin* y **noconfig** es pertinente tenerlos
cargados antes de proceder a la inicialización.

Para asociar acciones a los eventos, debe usarse el método
``.addeventListener()``:

~~~javascript

cliente.addEventListener("succeed", function(e) {  // this es cliente
   console.log(e.type);    // succeed.
   console.log(e.target);  // cliente.

   // Habilitamos el botón que permite la autenticación.
   document.getElementById("authorize").disabled = false;
});

~~~

### Autenticación

### Configuración

### Manipulación de G-Suite
