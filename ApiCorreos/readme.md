PASOS PARA HACER FUNCIONAR LA API:


1 Instalar Google Cloud SDK
2 Instalar WSL
3 Instalar Docker

Tras esto hacer login en GC y Docker
Una vez iniciada la sesión, en la carpeta de la api donde está el Dockerfile ejecutar el siguiente comando:

    docker build -t apicorreos .

una vez ejecutado taggear el contenedor

    docker tag apicorreos nombreusuario/apicorreo

tras esto hacer el push

    docker push nombreusuario/apicorreos

Luego pasamos a la parte de GoogleCloud
    En GoogleCloud hay que primero crear un proyecto, por ejemplo "proyecto correo", este tendrá una ID visible en la selección de proyectos

Tras esto hay que hacer un pull de el contenedor
    docker pull nombreusuario/apicorreos

Tras ejecutar el pull hay que taggear el contenedor con el formato indicado
    docker tag nombreusuario/apicorreos gcr.io/IDPROYECTO/apicorreos:v(#version) 
    ej: docker tag nombreusuario/apicorreos gcr.io/apicorreos-462720/apicorreos:v3

Tras ello hacer el push
    docker push gcr.io/IDPROYECTO/apicorreos:v(#version) 

Luego en Cloud Run hay que crear un nuevo servicio y seleccionar la versión que se ingresó, tras esto esperar a que el proyecto se suba y ejecute, una vez hecho se nos dará una ip.

LA IP ACTUAL DE LA API ES LA SIGUIENTE: 
https://apicorreos-477231276703.southamerica-west1.run.app