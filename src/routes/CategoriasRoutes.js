import { verificarToken, verificarAdmin } from '../../middleware/middleware.js'
import { PrismaClient } from '@prisma/client'


const prisma = new PrismaClient()

export default async function categoriaRoutes(fastify, options) {
    // Obtener todas las categorías (público)
    fastify.get('/', async (request, reply) => {
        try {
            const categorias = await prisma.categoriaProducto.findMany({
                include: {
                    _count: {
                        select: {
                            productos: true
                        }
                    }
                }
            })
            
            return categorias
        } catch (error) {
            fastify.log.error(error)
            return reply.code(500).send({ error: 'Error al obtener categorías' })
        }
    })
    
    // Obtener una categoría por ID (público)
    fastify.get('/:id', async (request, reply) => {
        try {
            const { id } = request.params
            
            const categoria = await prisma.categoriaProducto.findUnique({
                where: { id_categoria: parseInt(id) },
                include: {
                    _count: {
                        select: {
                            productos: true
                        }
                    }
                }
            })
            
            if (!categoria) {
                return reply.code(404).send({ error: 'Categoría no encontrada' })
            }
            
            return categoria
        } catch (error) {
            fastify.log.error(error)
            return reply.code(500).send({ error: 'Error al obtener la categoría' })
        }
    })
    
    // Crear una nueva categoría (solo admin)
    fastify.post('/', {
        preHandler: [verificarToken, verificarAdmin]
    }, async (request, reply) => {
        try {
            const { nombre_categoria, descripcion_categoria } = request.body
            
            // Validar que el nombre no esté vacío
            if (!nombre_categoria || nombre_categoria.trim() === '') {
                return reply.code(400).send({ error: 'El nombre de la categoría es obligatorio' })
            }
            
            // Verificar si ya existe una categoría con ese nombre
            const categoriaExistente = await prisma.categoriaProducto.findUnique({
                where: { nombre_categoria }
            })
            
            if (categoriaExistente) {
                return reply.code(400).send({ error: 'Ya existe una categoría con ese nombre' })
            }
            
            // Crear la categoría
            const nuevaCategoria = await prisma.categoriaProducto.create({
                data: {
                    nombre_categoria,
                    descripcion_categoria
                }
            })
            
            return reply.code(201).send(nuevaCategoria)
        } catch (error) {
            fastify.log.error(error)
            return reply.code(500).send({ error: 'Error al crear la categoría' })
        }
    })
    
    // Actualizar una categoría (solo admin)
    fastify.put('/:id', {
        preHandler: [verificarToken, verificarAdmin]
    }, async (request, reply) => {
        try {
            const { id } = request.params
            const { nombre_categoria, descripcion_categoria } = request.body
            
            // Validar que el nombre no esté vacío si se proporciona
            if (nombre_categoria !== undefined && nombre_categoria.trim() === '') {
                return reply.code(400).send({ error: 'El nombre de la categoría no puede estar vacío' })
            }
            
            // Verificar si la categoría existe
            const categoriaExistente = await prisma.categoriaProducto.findUnique({
                where: { id_categoria: parseInt(id) }
            })
            
            if (!categoriaExistente) {
                return reply.code(404).send({ error: 'Categoría no encontrada' })
            }
            
            // Verificar si el nuevo nombre ya está en uso por otra categoría
            if (nombre_categoria && nombre_categoria !== categoriaExistente.nombre_categoria) {
                const nombreEnUso = await prisma.categoriaProducto.findUnique({
                    where: { nombre_categoria }
                })
                
                if (nombreEnUso) {
                    return reply.code(400).send({ error: 'Ya existe otra categoría con ese nombre' })
                }
            }
            
            // Preparar datos de actualización
            const datosActualizacion = {}
            
            if (nombre_categoria !== undefined) datosActualizacion.nombre_categoria = nombre_categoria
            if (descripcion_categoria !== undefined) datosActualizacion.descripcion_categoria = descripcion_categoria
            
            // Actualizar la categoría
            const categoriaActualizada = await prisma.categoriaProducto.update({
                where: { id_categoria: parseInt(id) },
                data: datosActualizacion
            })
            
            return categoriaActualizada
        } catch (error) {
            fastify.log.error(error)
            
            if (error.code === 'P2025') {
                return reply.code(404).send({ error: 'Categoría no encontrada' })
            }
            
            return reply.code(500).send({ error: 'Error al actualizar la categoría' })
        }
    })
    
    // Eliminar una categoría (solo admin)
    fastify.delete('/:id', {
        preHandler: [verificarToken, verificarAdmin]
    }, async (request, reply) => {
        try {
            const { id } = request.params
            
            // Verificar si la categoría existe
            const categoriaExistente = await prisma.categoriaProducto.findUnique({
                where: { id_categoria: parseInt(id) },
                include: {
                    _count: {
                        select: {
                            productos: true
                        }
                    }
                }
            })
            
            if (!categoriaExistente) {
                return reply.code(404).send({ error: 'Categoría no encontrada' })
            }
            
            // Verificar si tiene productos asociados
            if (categoriaExistente._count.productos > 0) {
                return reply.code(400).send({ 
                    error: 'No se puede eliminar la categoría porque tiene productos asociados',
                    productos: categoriaExistente._count.productos
                })
            }
            
            // Eliminar la categoría
            await prisma.categoriaProducto.delete({
                where: { id_categoria: parseInt(id) }
            })
            
            return { mensaje: 'Categoría eliminada correctamente' }
        } catch (error) {
            fastify.log.error(error)
            
            if (error.code === 'P2025') {
                return reply.code(404).send({ error: 'Categoría no encontrada' })
            }
            
            return reply.code(500).send({ error: 'Error al eliminar la categoría' })
        }
    })
}