# Utiliza una imagen base de Node.js
FROM node:18

# Establece el directorio de trabajo en /app
WORKDIR /app

# Copia el package.json y el package-lock.json al contenedor
COPY package*.json ./

# Instala las dependencias del proyecto
RUN npm install

# Copia el resto del código de la aplicación al contenedor
COPY . .

# Expone el puerto que usa la aplicación
EXPOSE 8080

# Comando para ejecutar la aplicación
CMD ["node", "index.js"]
