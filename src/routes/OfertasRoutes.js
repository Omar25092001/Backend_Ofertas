import { PrismaClient } from '@prisma/client'
import { verificarToken, verificarAdmin } from '../../middleware/middleware.js'

const prisma = new PrismaClient()

export default async function ofertaRoutes(fastify, options) {
    // RUTAS PÚBLICAS (sin autenticación)

    // Obtener todas las ofertas (con paginación y filtros)
    fastify.get('/', async (request, reply) => {
        try {
            const {
                supermercado,
                producto,
                categoria,
                precioMin,
                precioMax,
                ordenar = 'precio_asc', // precio_asc, precio_desc, fecha_desc
                page = 1,
                limit = 10
            } = request.query

            const skip = (parseInt(page) - 1) * parseInt(limit)

            // Construir filtros
            let where = { valida: true }

            if (supermercado) {
                where.supermercado = {
                    id_supermercado: parseInt(supermercado)
                }
            }

            if (producto) {
                where.id_producto = parseInt(producto)
            }

            if (categoria) {
                where.producto = {
                    id_categoria: parseInt(categoria)
                }
            }

            if (precioMin) {
                where.precio_oferta = {
                    ...where.precio_oferta,
                    gte: parseFloat(precioMin)
                }
            }

            if (precioMax) {
                where.precio_oferta = {
                    ...where.precio_oferta,
                    lte: parseFloat(precioMax)
                }
            }

            // Definir ordenamiento
            let orderBy = {}

            switch (ordenar) {
                case 'precio_asc':
                    orderBy = { precio_oferta: 'asc' }
                    break
                case 'precio_desc':
                    orderBy = { precio_oferta: 'desc' }
                    break
                case 'fecha_desc':
                    orderBy = { fecha_extraccion: 'desc' }
                    break
                default:
                    orderBy = { precio_oferta: 'asc' }
            }

            // Ejecutar consulta
            const ofertas = await prisma.oferta.findMany({
                where,
                include: {
                    producto: {
                        include: {
                            categoria: true
                        }
                    },
                    supermercado: true,
                    _count: {
                        select: {
                            favoritos: true
                        }
                    }
                },
                skip,
                take: parseInt(limit),
                orderBy
            })

            // Contar total para paginación
            const total = await prisma.oferta.count({ where })

            return {
                ofertas,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            }
        } catch (error) {
            fastify.log.error(error)
            return reply.code(500).send({ error: 'Error al obtener ofertas' })
        }
    })

    // Obtener una oferta por ID
    fastify.get('/:id', async (request, reply) => {
        try {
            const { id } = request.params

            const oferta = await prisma.oferta.findUnique({
                where: { id_oferta: parseInt(id) },
                include: {
                    producto: {
                        include: {
                            categoria: true
                        }
                    },
                    supermercado: true,
                    _count: {
                        select: {
                            favoritos: true
                        }
                    }
                }
            })

            if (!oferta) {
                return reply.code(404).send({ error: 'Oferta no encontrada' })
            }

            return oferta
        } catch (error) {
            fastify.log.error(error)
            return reply.code(500).send({ error: 'Error al obtener la oferta' })
        }
    })

    // Obtener ofertas por producto
    fastify.get('/producto/:id', async (request, reply) => {
        try {
            const { id } = request.params
            const { page = 1, limit = 10 } = request.query

            const skip = (parseInt(page) - 1) * parseInt(limit)

            const ofertas = await prisma.oferta.findMany({
                where: {
                    id_producto: parseInt(id),
                    valida: true
                },
                include: {
                    supermercado: true,
                    _count: {
                        select: {
                            favoritos: true
                        }
                    }
                },
                skip,
                take: parseInt(limit),
                orderBy: { precio_oferta: 'asc' }
            })

            const total = await prisma.oferta.count({
                where: {
                    id_producto: parseInt(id),
                    valida: true
                }
            })

            return {
                ofertas,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            }
        } catch (error) {
            fastify.log.error(error)
            return reply.code(500).send({ error: 'Error al obtener ofertas por producto' })
        }
    })

    // Obtener ofertas por supermercado
    fastify.get('/supermercado/:id', async (request, reply) => {
        try {
            const { id } = request.params
            const { page = 1, limit = 10 } = request.query

            const skip = (parseInt(page) - 1) * parseInt(limit)

            const ofertas = await prisma.oferta.findMany({
                where: {
                    id_supermercado: parseInt(id),
                    valida: true
                },
                include: {
                    producto: {
                        include: {
                            categoria: true
                        }
                    },
                    _count: {
                        select: {
                            favoritos: true
                        }
                    }
                },
                skip,
                take: parseInt(limit),
                orderBy: { precio_oferta: 'asc' }
            })

            const total = await prisma.oferta.count({
                where: {
                    id_supermercado: parseInt(id),
                    valida: true
                }
            })

            return {
                ofertas,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            }
        } catch (error) {
            fastify.log.error(error)
            return reply.code(500).send({ error: 'Error al obtener ofertas por supermercado' })
        }
    })

    // Buscar ofertas (búsqueda avanzada)
    fastify.get('/buscar', async (request, reply) => {
        try {
            const {
                termino,
                categoria,
                supermercado,
                precioMin,
                precioMax,
                page = 1,
                limit = 10,
                ordenar = 'precio_asc'
            } = request.query

            const skip = (parseInt(page) - 1) * parseInt(limit)

            // Construir filtros avanzados
            let where = { valida: true }

            if (termino) {
                where.OR = [
                    {
                        producto: {
                            nombre_producto: {
                                contains: termino,
                                mode: 'insensitive'
                            }
                        }
                    },
                    {
                        producto: {
                            marca: {
                                contains: termino,
                                mode: 'insensitive'
                            }
                        }
                    },
                    {
                        descripcion_oferta: {
                            contains: termino,
                            mode: 'insensitive'
                        }
                    }
                ]
            }

            if (categoria) {
                where.producto = {
                    ...where.producto,
                    id_categoria: parseInt(categoria)
                }
            }

            if (supermercado) {
                where.id_supermercado = parseInt(supermercado)
            }

            if (precioMin) {
                where.precio_oferta = {
                    ...where.precio_oferta,
                    gte: parseFloat(precioMin)
                }
            }

            if (precioMax) {
                where.precio_oferta = {
                    ...where.precio_oferta,
                    lte: parseFloat(precioMax)
                }
            }

            // Definir ordenamiento
            let orderBy = {}

            switch (ordenar) {
                case 'precio_asc':
                    orderBy = { precio_oferta: 'asc' }
                    break
                case 'precio_desc':
                    orderBy = { precio_oferta: 'desc' }
                    break
                case 'fecha_desc':
                    orderBy = { fecha_extraccion: 'desc' }
                    break
                default:
                    orderBy = { precio_oferta: 'asc' }
            }

            const ofertas = await prisma.oferta.findMany({
                where,
                include: {
                    producto: {
                        include: {
                            categoria: true
                        }
                    },
                    supermercado: true,
                    _count: {
                        select: {
                            favoritos: true
                        }
                    }
                },
                skip,
                take: parseInt(limit),
                orderBy
            })

            const total = await prisma.oferta.count({ where })

            return {
                ofertas,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            }
        } catch (error) {
            fastify.log.error(error)
            return reply.code(500).send({ error: 'Error al buscar ofertas' })
        }
    })

    // RUTAS PROTEGIDAS (requieren autenticación)

    // Crear una nueva oferta (solo admin)
    fastify.post('/', {
        preHandler: [verificarToken, verificarAdmin]
    }, async (request, reply) => {
        try {
            const {
                precio_original,
                precio_oferta,
                fecha_inicio_oferta,
                fecha_fin_oferta,
                descripcion_oferta,
                url_oferta_original,
                id_producto,
                id_supermercado
            } = request.body

            // Validaciones básicas
            if (!precio_oferta) {
                return reply.code(400).send({ error: 'El precio de oferta es obligatorio' })
            }

            if (!id_producto) {
                return reply.code(400).send({ error: 'El ID del producto es obligatorio' })
            }

            if (!id_supermercado) {
                return reply.code(400).send({ error: 'El ID del supermercado es obligatorio' })
            }

            if (!url_oferta_original) {
                return reply.code(400).send({ error: 'La URL de la oferta original es obligatoria' })
            }

            // Verificar que exista el producto
            const producto = await prisma.producto.findUnique({
                where: { id_producto: parseInt(id_producto) }
            })

            if (!producto) {
                return reply.code(404).send({ error: 'El producto especificado no existe' })
            }

            // Verificar que exista el supermercado
            const supermercado = await prisma.supermercado.findUnique({
                where: { id_supermercado: parseInt(id_supermercado) }
            })

            if (!supermercado) {
                return reply.code(404).send({ error: 'El supermercado especificado no existe' })
            }

            // Crear la oferta
            const nuevaOferta = await prisma.oferta.create({
                data: {
                    precio_original: precio_original ? parseFloat(precio_original) : null,
                    precio_oferta: parseFloat(precio_oferta),
                    fecha_inicio_oferta: fecha_inicio_oferta ? new Date(fecha_inicio_oferta) : null,
                    fecha_fin_oferta: fecha_fin_oferta ? new Date(fecha_fin_oferta) : null,
                    descripcion_oferta,
                    url_oferta_original,
                    id_producto: parseInt(id_producto),
                    id_supermercado: parseInt(id_supermercado)
                },
                include: {
                    producto: true,
                    supermercado: true
                }
            })

            return reply.code(201).send(nuevaOferta)
        } catch (error) {
            fastify.log.error(error)

            if (error.code === 'P2003') {
                return reply.code(400).send({ error: 'El producto o supermercado especificado no existe' })
            }

            return reply.code(500).send({ error: 'Error al crear la oferta' })
        }
    })

    // Actualizar una oferta (solo admin)
    fastify.put('/:id', {
        preHandler: [verificarToken, verificarAdmin]
    }, async (request, reply) => {
        try {
            const { id } = request.params
            const {
                precio_original,
                precio_oferta,
                fecha_inicio_oferta,
                fecha_fin_oferta,
                descripcion_oferta,
                url_oferta_original,
                id_producto,
                id_supermercado,
                valida
            } = request.body

            // Verificar que la oferta existe
            const ofertaExistente = await prisma.oferta.findUnique({
                where: { id_oferta: parseInt(id) }
            })

            if (!ofertaExistente) {
                return reply.code(404).send({ error: 'Oferta no encontrada' })
            }

            // Preparar datos para actualización
            const datosActualizacion = {}

            if (precio_original !== undefined) {
                datosActualizacion.precio_original = precio_original !== null ?
                    parseFloat(precio_original) : null
            }

            if (precio_oferta !== undefined) {
                datosActualizacion.precio_oferta = parseFloat(precio_oferta)
            }

            if (fecha_inicio_oferta !== undefined) {
                datosActualizacion.fecha_inicio_oferta = fecha_inicio_oferta !== null ?
                    new Date(fecha_inicio_oferta) : null
            }

            if (fecha_fin_oferta !== undefined) {
                datosActualizacion.fecha_fin_oferta = fecha_fin_oferta !== null ?
                    new Date(fecha_fin_oferta) : null
            }

            if (descripcion_oferta !== undefined) {
                datosActualizacion.descripcion_oferta = descripcion_oferta
            }

            if (url_oferta_original !== undefined) {
                datosActualizacion.url_oferta_original = url_oferta_original
            }

            if (id_producto !== undefined) {
                datosActualizacion.id_producto = parseInt(id_producto)
            }

            if (id_supermercado !== undefined) {
                datosActualizacion.id_supermercado = parseInt(id_supermercado)
            }

            if (valida !== undefined) {
                datosActualizacion.valida = valida
            }

            // Actualizar la oferta
            const ofertaActualizada = await prisma.oferta.update({
                where: { id_oferta: parseInt(id) },
                data: datosActualizacion,
                include: {
                    producto: true,
                    supermercado: true
                }
            })

            return ofertaActualizada
        } catch (error) {
            fastify.log.error(error)

            if (error.code === 'P2025') {
                return reply.code(404).send({ error: 'Oferta no encontrada' })
            }

            if (error.code === 'P2003') {
                return reply.code(400).send({ error: 'El producto o supermercado especificado no existe' })
            }

            return reply.code(500).send({ error: 'Error al actualizar la oferta' })
        }
    })

    // Marcar una oferta como inválida (solo admin)
    fastify.patch('/:id/invalidar', {
        preHandler: [verificarToken, verificarAdmin]
    }, async (request, reply) => {
        try {
            const { id } = request.params

            const ofertaActualizada = await prisma.oferta.update({
                where: { id_oferta: parseInt(id) },
                data: { valida: false }
            })

            return {
                mensaje: 'Oferta marcada como inválida correctamente',
                oferta: ofertaActualizada
            }
        } catch (error) {
            fastify.log.error(error)

            if (error.code === 'P2025') {
                return reply.code(404).send({ error: 'Oferta no encontrada' })
            }

            return reply.code(500).send({ error: 'Error al marcar la oferta como inválida' })
        }
    })

    // Eliminar una oferta (solo admin)
    fastify.delete('/:id', {
        preHandler: [verificarToken, verificarAdmin]
    }, async (request, reply) => {
        try {
            const { id } = request.params

            // Verificar que la oferta existe
            const ofertaExistente = await prisma.oferta.findUnique({
                where: { id_oferta: parseInt(id) }
            })

            if (!ofertaExistente) {
                return reply.code(404).send({ error: 'Oferta no encontrada' })
            }

            // Eliminar la oferta
            await prisma.oferta.delete({
                where: { id_oferta: parseInt(id) }
            })

            return { mensaje: 'Oferta eliminada correctamente' }
        } catch (error) {
            fastify.log.error(error)

            if (error.code === 'P2025') {
                return reply.code(404).send({ error: 'Oferta no encontrada' })
            }

            return reply.code(500).send({ error: 'Error al eliminar la oferta' })
        }
    })

    // Reportar una oferta (autenticado)
    fastify.post('/:id/reportar', {
        preHandler: verificarToken
    }, async (request, reply) => {
        try {
            const { id } = request.params
            const { motivo } = request.body
            const id_usuario = request.usuario.id

            // Verificar que la oferta existe
            const ofertaExistente = await prisma.oferta.findUnique({
                where: { id_oferta: parseInt(id) }
            })

            if (!ofertaExistente) {
                return reply.code(404).send({ error: 'Oferta no encontrada' })
            }

            // Crear el reporte
            const nuevoReporte = await prisma.reporteOferta.create({
                data: {
                    motivo,
                    id_oferta: parseInt(id),
                    id_usuario_reporta: id_usuario
                },
                include: {
                    oferta: {
                        include: {
                            producto: true,
                            supermercado: true
                        }
                    }
                }
            })

            return reply.code(201).send({
                mensaje: 'Oferta reportada correctamente',
                reporte: nuevoReporte
            })
        } catch (error) {
            fastify.log.error(error)
            return reply.code(500).send({ error: 'Error al reportar la oferta' })
        }
    })


    fastify.get('/:id/ofertas', async (request, reply) => {
        try {
            const { id } = request.params;
            const {
                ordenar = 'precio_asc', // precio_asc, precio_desc, fecha_desc, supermercado
                validas = 'true',       // true, false, all
                page = 1,
                limit = 10
            } = request.query;

            const skip = (parseInt(page) - 1) * parseInt(limit);

            // Verificar que el producto existe
            const producto = await prisma.producto.findUnique({
                where: { id_producto: parseInt(id) },
                select: {
                    id_producto: true,
                    nombre_producto: true,
                    marca: true,
                    descripcion_producto: true,
                    imagen_url: true,
                    categoria: true
                }
            });

            if (!producto) {
                return reply.code(404).send({ error: 'Producto no encontrado' });
            }

            // Construir filtro para ofertas
            let whereOfertas = {
                id_producto: parseInt(id)
            };

            // Filtrar por validez de la oferta
            if (validas === 'true') {
                whereOfertas.valida = true;
            } else if (validas === 'false') {
                whereOfertas.valida = false;
            }
            // Si validas=all, no añadimos filtro y devolvemos todas

            // Determinar ordenamiento
            let orderBy = {};

            switch (ordenar) {
                case 'precio_asc':
                    orderBy = { precio_oferta: 'asc' };
                    break;
                case 'precio_desc':
                    orderBy = { precio_oferta: 'desc' };
                    break;
                case 'fecha_desc':
                    orderBy = { fecha_extraccion: 'desc' };
                    break;
                case 'supermercado':
                    orderBy = { supermercado: { nombre_supermercado: 'asc' } };
                    break;
                default:
                    orderBy = { precio_oferta: 'asc' };
            }

            // Obtener todas las ofertas del producto
            const ofertas = await prisma.oferta.findMany({
                where: whereOfertas,
                include: {
                    supermercado: true,
                    _count: {
                        select: {
                            favoritos: true
                        }
                    }
                },
                skip,
                take: parseInt(limit),
                orderBy
            });

            // Transformar los resultados para calcular descuentos y mejorar la presentación
            const ofertasFormateadas = ofertas.map(oferta => {
                const descuento = oferta.precio_original ?
                    (1 - parseFloat(oferta.precio_oferta) / parseFloat(oferta.precio_original)) * 100 : null;

                return {
                    id_oferta: oferta.id_oferta,
                    precio_oferta: parseFloat(oferta.precio_oferta),
                    precio_original: oferta.precio_original ? parseFloat(oferta.precio_original) : null,
                    descuento: descuento ? Math.round(descuento * 10) / 10 : null,
                    fecha_inicio_oferta: oferta.fecha_inicio_oferta,
                    fecha_fin_oferta: oferta.fecha_fin_oferta,
                    descripcion_oferta: oferta.descripcion_oferta,
                    url_oferta_original: oferta.url_oferta_original,
                    fecha_extraccion: oferta.fecha_extraccion,
                    valida: oferta.valida,
                    supermercado: {
                        id_supermercado: oferta.supermercado.id_supermercado,
                        nombre_supermercado: oferta.supermercado.nombre_supermercado,
                        direccion: oferta.supermercado.direccion,
                        url_sitio_web: oferta.supermercado.url_sitio_web
                    },
                    total_favoritos: oferta._count.favoritos
                };
            });

            // Contar total para paginación
            const total = await prisma.oferta.count({ where: whereOfertas });

            // Calcular estadísticas de precios
            let estadisticas = {};

            if (ofertas.length > 0 && validas !== 'false') {
                const preciosValidos = ofertas
                    .filter(o => o.valida)
                    .map(o => parseFloat(o.precio_oferta));

                if (preciosValidos.length > 0) {
                    const precioMin = Math.min(...preciosValidos);
                    const precioMax = Math.max(...preciosValidos);
                    const precioPromedio = preciosValidos.reduce((sum, price) => sum + price, 0) / preciosValidos.length;

                    estadisticas = {
                        precio_minimo: precioMin,
                        precio_maximo: precioMax,
                        precio_promedio: Math.round(precioPromedio * 100) / 100,
                        diferencia_porcentaje: precioMin > 0 ?
                            Math.round(((precioMax - precioMin) / precioMin) * 100) : null,
                        total_ofertas_validas: preciosValidos.length,
                    };
                }
            }

            return {
                producto,
                ofertas: ofertasFormateadas,
                estadisticas,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            };
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Error al obtener las ofertas del producto' });
        }
    });
}