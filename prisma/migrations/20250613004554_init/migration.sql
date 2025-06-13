-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('USUARIO', 'ADMINISTRADOR', 'MODERADOR');

-- CreateTable
CREATE TABLE "Usuario" (
    "id_usuario" SERIAL NOT NULL,
    "nombre_completo" VARCHAR(255),
    "email" VARCHAR(255) NOT NULL,
    "contrasena_hash" VARCHAR(255) NOT NULL,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rol" "RolUsuario" NOT NULL DEFAULT 'USUARIO',

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "CategoriaProducto" (
    "id_categoria" SERIAL NOT NULL,
    "nombre_categoria" VARCHAR(100) NOT NULL,
    "descripcion_categoria" TEXT,

    CONSTRAINT "CategoriaProducto_pkey" PRIMARY KEY ("id_categoria")
);

-- CreateTable
CREATE TABLE "Supermercado" (
    "id_supermercado" SERIAL NOT NULL,
    "nombre_supermercado" VARCHAR(150) NOT NULL,
    "direccion" VARCHAR(255),
    "url_sitio_web" VARCHAR(255),

    CONSTRAINT "Supermercado_pkey" PRIMARY KEY ("id_supermercado")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id_producto" SERIAL NOT NULL,
    "nombre_producto" VARCHAR(255) NOT NULL,
    "marca" VARCHAR(100),
    "descripcion_producto" TEXT,
    "imagen_url" VARCHAR(255),
    "id_categoria" INTEGER,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id_producto")
);

-- CreateTable
CREATE TABLE "Oferta" (
    "id_oferta" SERIAL NOT NULL,
    "precio_original" DECIMAL(10,2),
    "precio_oferta" DECIMAL(10,2) NOT NULL,
    "fecha_inicio_oferta" TIMESTAMP(3),
    "fecha_fin_oferta" TIMESTAMP(3),
    "descripcion_oferta" TEXT,
    "url_oferta_original" VARCHAR(512) NOT NULL,
    "fecha_extraccion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valida" BOOLEAN NOT NULL DEFAULT true,
    "id_producto" INTEGER NOT NULL,
    "id_supermercado" INTEGER NOT NULL,

    CONSTRAINT "Oferta_pkey" PRIMARY KEY ("id_oferta")
);

-- CreateTable
CREATE TABLE "Favorito" (
    "id_favorito" SERIAL NOT NULL,
    "fecha_agregado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_usuario" INTEGER NOT NULL,
    "id_oferta" INTEGER NOT NULL,

    CONSTRAINT "Favorito_pkey" PRIMARY KEY ("id_favorito")
);

-- CreateTable
CREATE TABLE "SuscripcionNotificacionProducto" (
    "id_suscripcion" SERIAL NOT NULL,
    "precio_deseado_notificar" DECIMAL(10,2),
    "notificar_cualquier_oferta" BOOLEAN NOT NULL DEFAULT true,
    "fecha_suscripcion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_usuario" INTEGER NOT NULL,
    "id_producto" INTEGER NOT NULL,

    CONSTRAINT "SuscripcionNotificacionProducto_pkey" PRIMARY KEY ("id_suscripcion")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id_notificacion" SERIAL NOT NULL,
    "tipo_notificacion" VARCHAR(50) NOT NULL,
    "mensaje" TEXT NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "id_usuario_destino" INTEGER NOT NULL,
    "id_referencia_oferta" INTEGER,
    "id_referencia_producto" INTEGER,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id_notificacion")
);

-- CreateTable
CREATE TABLE "ReporteOferta" (
    "id_reporte" SERIAL NOT NULL,
    "motivo" TEXT,
    "fecha_reporte" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado_reporte" VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    "fecha_revision" TIMESTAMP(3),
    "notas_revision" TEXT,
    "id_oferta" INTEGER NOT NULL,
    "id_usuario_reporta" INTEGER,
    "id_admin_revisor" INTEGER,

    CONSTRAINT "ReporteOferta_pkey" PRIMARY KEY ("id_reporte")
);

-- CreateTable
CREATE TABLE "FuenteWebScraping" (
    "id_fuente" SERIAL NOT NULL,
    "nombre_fuente" VARCHAR(100) NOT NULL,
    "url_base" VARCHAR(255) NOT NULL,
    "frecuencia_actualizacion_minutos" INTEGER NOT NULL DEFAULT 1440,
    "ultima_extraccion_exitosa" TIMESTAMP(3),
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FuenteWebScraping_pkey" PRIMARY KEY ("id_fuente")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaProducto_nombre_categoria_key" ON "CategoriaProducto"("nombre_categoria");

-- CreateIndex
CREATE UNIQUE INDEX "Favorito_id_usuario_id_oferta_key" ON "Favorito"("id_usuario", "id_oferta");

-- CreateIndex
CREATE UNIQUE INDEX "SuscripcionNotificacionProducto_id_usuario_id_producto_key" ON "SuscripcionNotificacionProducto"("id_usuario", "id_producto");

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "CategoriaProducto"("id_categoria") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "Producto"("id_producto") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_id_supermercado_fkey" FOREIGN KEY ("id_supermercado") REFERENCES "Supermercado"("id_supermercado") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorito" ADD CONSTRAINT "Favorito_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorito" ADD CONSTRAINT "Favorito_id_oferta_fkey" FOREIGN KEY ("id_oferta") REFERENCES "Oferta"("id_oferta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuscripcionNotificacionProducto" ADD CONSTRAINT "SuscripcionNotificacionProducto_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuscripcionNotificacionProducto" ADD CONSTRAINT "SuscripcionNotificacionProducto_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "Producto"("id_producto") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_id_usuario_destino_fkey" FOREIGN KEY ("id_usuario_destino") REFERENCES "Usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_id_referencia_oferta_fkey" FOREIGN KEY ("id_referencia_oferta") REFERENCES "Oferta"("id_oferta") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_id_referencia_producto_fkey" FOREIGN KEY ("id_referencia_producto") REFERENCES "Producto"("id_producto") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReporteOferta" ADD CONSTRAINT "ReporteOferta_id_oferta_fkey" FOREIGN KEY ("id_oferta") REFERENCES "Oferta"("id_oferta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReporteOferta" ADD CONSTRAINT "ReporteOferta_id_usuario_reporta_fkey" FOREIGN KEY ("id_usuario_reporta") REFERENCES "Usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReporteOferta" ADD CONSTRAINT "ReporteOferta_id_admin_revisor_fkey" FOREIGN KEY ("id_admin_revisor") REFERENCES "Usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;
