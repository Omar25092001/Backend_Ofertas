import { PrismaClient } from '@prisma/client'
import { verificarToken, verificarAdmin } from '../../middleware/middleware.js'

const prisma = new PrismaClient()

export default async function supermercadoRoutes(fastify, options) {
    // RUTAS PÚBLICAS (sin autenticación)
    
    // Obtener todos los supermercados
    fastify.get('/', async (request, reply) => {
        try {
            const { ordenar = 'nombre' } = request.query
            
            // Definir ordenamiento
            let orderBy = {}
            
            switch(ordenar) {
                case 'nombre':
                    orderBy = { nombre_supermercado: 'asc' }
                    break
                case 'id':
                    orderBy = { id_supermercado: 'asc' }
                    break
                default:
                    orderBy = { nombre_supermercado: 'asc' }
            }
            
            const supermercados = await prisma.supermercado.findMany({
                orderBy,
                include: {
                    _count: {
                        select: {
                            ofertas: true
                        }
                    }
                }
            })
            
            return supermercados
        } catch (error) {
            fastify.log.error(error)
            return reply.code(500).send({ error: 'Error al obtener supermercados' })
        }
    })
    
    // Obtener un supermercado por ID
    fastify.get('/:id', async (request, reply) => {
        try {
            const { id } = request.params
            
            const supermercado = await prisma.supermercado.findUnique({
                where: { id_supermercado: parseInt(id) },
                include: {
                    _count: {
                        select: {
                            ofertas: {
                                where: {
                                    valida: true
                                }
                            }
                        }
                    }
                }
            })
            
            if (!supermercado) {
                return reply.code(404).send({ error: 'Supermercado no encontrado' })
            }
            
            return supermercado
        } catch (error) {
            fastify.log.error(error)
            return reply.code(500).send({ error: 'Error al obtener el supermercado' })
        }
    })
    
    // Buscar supermercados por nombre
    fastify.get('/buscar', async (request, reply) => {
        try {
            const { nombre } = request.query
            
            if (!nombre) {
                return reply.code(400).send({ error: 'Se debe proporcionar un nombre para la búsqueda' })
            }
            
            const supermercados = await prisma.supermercado.findMany({
                where: {
                    nombre_supermercado: {
                        contains: nombre,
                        mode: 'insensitive'
                    }
                },
                include: {
                    _count: {
                        select: {
                            ofertas: {
                                where: {
                                    valida: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    nombre_supermercado: 'asc'
                }
            })
            
            return supermercados
        } catch (error) {
            fastify.log.error(error)
            return reply.code(500).send({ error: 'Error al buscar supermercados' })
        }
    })
    
    // RUTAS PROTEGIDAS (requieren autenticación de administrador)
    
    // Crear un nuevo supermercado (solo admin)
    fastify.post('/', {
        preHandler: [verificarToken, verificarAdmin]
    }, async (request, reply) => {
        try {
            const { nombre_supermercado, direccion, url_sitio_web } = request.body
            
            // Validar que el nombre no esté vacío
            if (!nombre_supermercado || nombre_supermercado.trim() === '') {
                return reply.code(400).send({ error: 'El nombre del supermercado es obligatorio' })
            }
            
            // Crear el supermercado
            const nuevoSupermercado = await prisma.supermercado.create({
                data: {
                    nombre_supermercado,
                    direccion,
                    url_sitio_web
                }
            })
            
            return reply.code(201).send(nuevoSupermercado)
        } catch (error) {
            fastify.log.error(error)
            return reply.code(500).send({ error: 'Error al crear el supermercado' })
        }
    })
    
    // Actualizar un supermercado (solo admin)
    fastify.put('/:id', {
        preHandler: [verificarToken, verificarAdmin]
    }, async (request, reply) => {
        try {
            const { id } = request.params
            const { nombre_supermercado, direccion, url_sitio_web } = request.body
            
            // Verificar que el supermercado existe
            const supermercadoExistente = await prisma.supermercado.findUnique({
                where: { id_supermercado: parseInt(id) }
            })
            
            if (!supermercadoExistente) {
                return reply.code(404).send({ error: 'Supermercado no encontrado' })
            }
            
            // Validar que el nombre no esté vacío si se proporciona
            if (nombre_supermercado !== undefined && nombre_supermercado.trim() === '') {
                return reply.code(400).send({ error: 'El nombre del supermercado no puede estar vacío' })
            }
            
            // Preparar datos para actualización
            const datosActualizacion = {}
            
            if (nombre_supermercado !== undefined) datosActualizacion.nombre_supermercado = nombre_supermercado
            if (direccion !== undefined) datosActualizacion.direccion = direccion
            if (url_sitio_web !== undefined) datosActualizacion.url_sitio_web = url_sitio_web
            
            // Actualizar el supermercado
            const supermercadoActualizado = await prisma.supermercado.update({
                where: { id_supermercado: parseInt(id) },
                data: datosActualizacion
            })
            
            return supermercadoActualizado
        } catch (error) {
            fastify.log.error(error)
            
            if (error.code === 'P2025') {
                return reply.code(404).send({ error: 'Supermercado no encontrado' })
            }
            
            return reply.code(500).send({ error: 'Error al actualizar el supermercado' })
        }
    })
    
    // Eliminar un supermercado (solo admin)
    fastify.delete('/:id', {
        preHandler: [verificarToken, verificarAdmin]
    }, async (request, reply) => {
        try {
            const { id } = request.params
            
            // Verificar que el supermercado existe
            const supermercadoExistente = await prisma.supermercado.findUnique({
                where: { id_supermercado: parseInt(id) },
                include: {
                    _count: {
                        select: {
                            ofertas: true
                        }
                    }
                }
            })
            
            if (!supermercadoExistente) {
                return reply.code(404).send({ error: 'Supermercado no encontrado' })
            }
            
            // Verificar si tiene ofertas asociadas
            if (supermercadoExistente._count.ofertas > 0) {
                return reply.code(400).send({ 
                    error: 'No se puede eliminar el supermercado porque tiene ofertas asociadas',
                    ofertas: supermercadoExistente._count.ofertas
                })
            }
            
            // Eliminar el supermercado
            await prisma.supermercado.delete({
                where: { id_supermercado: parseInt(id) }
            })
            
            return { mensaje: 'Supermercado eliminado correctamente' }
        } catch (error) {
            fastify.log.error(error)
            
            if (error.code === 'P2025') {
                return reply.code(404).send({ error: 'Supermercado no encontrado' })
            }
            
            // Si hay error por restricciones de llaves foráneas
            if (error.code === 'P2003') {
                return reply.code(400).send({ 
                    error: 'No se puede eliminar el supermercado porque tiene ofertas asociadas' 
                })
            }
            
            return reply.code(500).send({ error: 'Error al eliminar el supermercado' })
        }
    })
    
    // Obtener las ofertas de un supermercado
    fastify.get('/:id/ofertas', async (request, reply) => {
        try {
            const { id } = request.params
            const { 
                validas = 'true', 
                ordenar = 'precio_asc', 
                page = 1, 
                limit = 10 
            } = request.query
            
            const skip = (parseInt(page) - 1) * parseInt(limit)
            
            // Verificar que el supermercado existe
            const supermercadoExistente = await prisma.supermercado.findUnique({
                where: { id_supermercado: parseInt(id) }
            })
            
            if (!supermercadoExistente) {
                return reply.code(404).send({ error: 'Supermercado no encontrado' })
            }
            
            // Construir filtros
            let where = {
                id_supermercado: parseInt(id)
            }
            
            // Filtrar por ofertas válidas si se especifica
            if (validas === 'true') {
                where.valida = true
            } else if (validas === 'false') {
                where.valida = false
            }
            
            // Definir ordenamiento
            let orderBy = {}
            
            switch(ordenar) {
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
            
            // Obtener las ofertas
            const ofertas = await prisma.oferta.findMany({
                where,
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
                orderBy
            })
            
            // Contar total para paginación
            const total = await prisma.oferta.count({ where })
            
            return {
                supermercado: {
                    id_supermercado: supermercadoExistente.id_supermercado,
                    nombre_supermercado: supermercadoExistente.nombre_supermercado
                },
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
            return reply.code(500).send({ error: 'Error al obtener las ofertas del supermercado' })
        }
    })
    
    // Obtener estadísticas de ofertas por supermercado (solo admin)
    fastify.get('/estadisticas', {
        preHandler: [verificarToken, verificarAdmin]
    }, async (request, reply) => {
        try {
            // Obtener supermercados con conteo de ofertas
            const estadisticas = await prisma.supermercado.findMany({
                include: {
                    _count: {
                        select: {
                            ofertas: {
                                where: {
                                    valida: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    nombre_supermercado: 'asc'
                }
            })
            
            // Obtener el total de ofertas válidas
            const totalOfertas = await prisma.oferta.count({
                where: {
                    valida: true
                }
            })
            
            // Calcular porcentajes y añadir a cada supermercado
            const estadisticasConPorcentaje = estadisticas.map(supermercado => ({
                ...supermercado,
                ofertas_activas: supermercado._count.ofertas,
                porcentaje: totalOfertas > 0 ? 
                    ((supermercado._count.ofertas / totalOfertas) * 100).toFixed(2) : 0
            }))
            
            return {
                total_ofertas: totalOfertas,
                supermercados: estadisticasConPorcentaje
            }
        } catch (error) {
            fastify.log.error(error)
            return reply.code(500).send({ error: 'Error al obtener las estadísticas de supermercados' })
        }
    })
}