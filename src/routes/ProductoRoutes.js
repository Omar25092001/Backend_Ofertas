import { PrismaClient } from '@prisma/client'
import { verificarToken, verificarAdmin } from '../../middleware/middleware.js'

const prisma = new PrismaClient()

export default async function productoRoutes(fastify, options) {
    // RUTAS PÚBLICAS - Accesibles sin autenticación
    
    // Listar todos los productos
    fastify.get('/', async (request, reply) => {
    try {
        const {
            nombre,
            marca,
            categoria,
            page = 1,
            limit = 10,
            ordenar = 'nombre_asc' // nombre_asc, precio_asc, precio_desc
        } = request.query;
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Construir filtros dinámicamente
        let where = {};
        
        if (nombre) {
            where.nombre_producto = {
                contains: nombre,
                mode: 'insensitive'
            };
        }
        
        if (marca) {
            where.marca = {
                contains: marca,
                mode: 'insensitive'
            };
        }
        
        if (categoria) {
            where.id_categoria = parseInt(categoria);
        }
        
        // Determinar el orden de los resultados
        let orderBy = {};
        
        switch(ordenar) {
            case 'nombre_asc':
                orderBy = { nombre_producto: 'asc' };
                break;
            // Para precio_asc y precio_desc usaremos JavaScript para ordenar después
            default:
                orderBy = { nombre_producto: 'asc' };
        }
        
        // Consulta principal que incluye todas las ofertas válidas
        const productos = await prisma.producto.findMany({
            where,
            include: {
                categoria: {
                    select: {
                        id_categoria: true,
                        nombre_categoria: true
                    }
                },
                ofertas: {
                    where: {
                        valida: true
                    },
                    orderBy: {
                        precio_oferta: 'asc'
                    },
                    include: {
                        supermercado: {
                            select: {
                                id_supermercado: true,
                                nombre_supermercado: true
                            }
                        }
                    }
                }
            },
            skip,
            take: parseInt(limit),
            orderBy
        });
        
        // Transformar los resultados para incluir solo la mejor oferta de cada producto
        const productosConMejorPrecio = productos.map(producto => {
            // Buscar la oferta con menor precio
            const mejorOferta = producto.ofertas.length > 0 ? producto.ofertas[0] : null;
            
            return {
                id_producto: producto.id_producto,
                nombre_producto: producto.nombre_producto,
                marca: producto.marca,
                descripcion_producto: producto.descripcion_producto,
                imagen_url: producto.imagen_url,
                categoria: producto.categoria,
                mejor_precio: mejorOferta ? {
                    precio: parseFloat(mejorOferta.precio_oferta),
                    precio_original: mejorOferta.precio_original ? parseFloat(mejorOferta.precio_original) : null,
                    descuento: mejorOferta.precio_original ? 
                        Math.round((1 - parseFloat(mejorOferta.precio_oferta) / parseFloat(mejorOferta.precio_original)) * 100) : null,
                    supermercado: mejorOferta.supermercado,
                    id_oferta: mejorOferta.id_oferta,
                    fecha_actualizacion: mejorOferta.fecha_extraccion
                } : null,
                tiene_ofertas: producto.ofertas.length > 0,
                total_ofertas: producto.ofertas.length
            };
        });
        
        // Ordenar por precio si se solicitó
        if (ordenar === 'precio_asc') {
            productosConMejorPrecio.sort((a, b) => {
                // Productos sin ofertas van al final
                if (!a.mejor_precio) return 1;
                if (!b.mejor_precio) return -1;
                return a.mejor_precio.precio - b.mejor_precio.precio;
            });
        } else if (ordenar === 'precio_desc') {
            productosConMejorPrecio.sort((a, b) => {
                // Productos sin ofertas van al final
                if (!a.mejor_precio) return 1;
                if (!b.mejor_precio) return -1;
                return b.mejor_precio.precio - a.mejor_precio.precio;
            });
        }
        
        // Contar total para paginación
        const total = await prisma.producto.count({ where });
        
        return {
            productos: productosConMejorPrecio,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        };
    } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Error al obtener productos' });
    }
});
    
    // Obtener un producto por ID
    fastify.get('/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            
            const producto = await prisma.producto.findUnique({
                where: { id_producto: parseInt(id) },
                include: {
                    categoria: true,
                    ofertas: {
                        include: {
                            supermercado: true
                        },
                        where: {
                            valida: true
                        },
                        orderBy: {
                            precio_oferta: 'asc'
                        }
                    }
                }
            });
            
            if (!producto) {
                return reply.code(404).send({ error: 'Producto no encontrado' });
            }
            
            return producto;
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Error al obtener el producto' });
        }
    });
    
    // Buscar productos (búsqueda avanzada)
    fastify.get('/buscar', async (request, reply) => {
        try {
            const { 
                termino, 
                categoria, 
                precioMin, 
                precioMax,
                page = 1, 
                limit = 10 
            } = request.query;
            
            const skip = (parseInt(page) - 1) * parseInt(limit);
            
            // Construir consulta
            let where = {};
            
            if (termino) {
                where.OR = [
                    { nombre_producto: { contains: termino, mode: 'insensitive' } },
                    { marca: { contains: termino, mode: 'insensitive' } },
                    { descripcion_producto: { contains: termino, mode: 'insensitive' } }
                ];
            }
            
            if (categoria) {
                where.categoria = {
                    nombre_categoria: {
                        equals: categoria,
                        mode: 'insensitive'
                    }
                };
            }
            
            // Filtrar por precios usando las ofertas
            if (precioMin || precioMax) {
                where.ofertas = {
                    some: {
                        valida: true,
                        ...(precioMin && { precio_oferta: { gte: parseFloat(precioMin) } }),
                        ...(precioMax && { precio_oferta: { lte: parseFloat(precioMax) } }),
                    }
                };
            }
            
            const productos = await prisma.producto.findMany({
                where,
                include: {
                    categoria: {
                        select: {
                            nombre_categoria: true
                        }
                    },
                    ofertas: {
                        where: {
                            valida: true
                        },
                        orderBy: {
                            precio_oferta: 'asc'
                        },
                        take: 1,
                        include: {
                            supermercado: true
                        }
                    }
                },
                skip,
                take: parseInt(limit)
            });
            
            // Contar total para paginación
            const total = await prisma.producto.count({ where });
            
            return {
                productos,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            };
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Error al buscar productos' });
        }
    });
    
    // RUTAS PROTEGIDAS - Requieren autenticación y permisos de administrador
    
    // Crear un nuevo producto (solo admins)
    fastify.post('/', {
        preHandler: [verificarToken, verificarAdmin]
    }, async (request, reply) => {
        try {
            const { 
                nombre_producto, 
                marca, 
                descripcion_producto, 
                imagen_url, 
                id_categoria 
            } = request.body;
            
            // Validar que el nombre del producto no esté vacío
            if (!nombre_producto) {
                return reply.code(400).send({ error: 'El nombre del producto es obligatorio' });
            }
            
            // Crear el producto
            const nuevoProducto = await prisma.producto.create({
                data: {
                    nombre_producto,
                    marca,
                    descripcion_producto,
                    imagen_url,
                    id_categoria: id_categoria ? parseInt(id_categoria) : undefined
                },
                include: {
                    categoria: true
                }
            });
            
            return reply.code(201).send(nuevoProducto);
        } catch (error) {
            fastify.log.error(error);
            
            // Manejar errores específicos
            if (error.code === 'P2003') {
                return reply.code(400).send({ error: 'La categoría especificada no existe' });
            }
            
            return reply.code(500).send({ error: 'Error al crear el producto' });
        }
    });
    
    // Actualizar un producto (solo admins)
    fastify.put('/:id', {
        preHandler: [verificarToken, verificarAdmin]
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const { 
                nombre_producto, 
                marca, 
                descripcion_producto, 
                imagen_url, 
                id_categoria 
            } = request.body;
            
            // Verificar que el producto existe
            const productoExiste = await prisma.producto.findUnique({
                where: { id_producto: parseInt(id) }
            });
            
            if (!productoExiste) {
                return reply.code(404).send({ error: 'Producto no encontrado' });
            }
            
            // Preparar datos para actualización
            const datosActualizacion = {};
            
            if (nombre_producto) datosActualizacion.nombre_producto = nombre_producto;
            if (marca !== undefined) datosActualizacion.marca = marca;
            if (descripcion_producto !== undefined) datosActualizacion.descripcion_producto = descripcion_producto;
            if (imagen_url !== undefined) datosActualizacion.imagen_url = imagen_url;
            if (id_categoria !== undefined) {
                datosActualizacion.id_categoria = id_categoria ? parseInt(id_categoria) : null;
            }
            
            // Actualizar el producto
            const productoActualizado = await prisma.producto.update({
                where: { id_producto: parseInt(id) },
                data: datosActualizacion,
                include: {
                    categoria: true
                }
            });
            
            return productoActualizado;
        } catch (error) {
            fastify.log.error(error);
            
            if (error.code === 'P2025') {
                return reply.code(404).send({ error: 'Producto no encontrado' });
            }
            
            if (error.code === 'P2003') {
                return reply.code(400).send({ error: 'La categoría especificada no existe' });
            }
            
            return reply.code(500).send({ error: 'Error al actualizar el producto' });
        }
    });
    
    // Eliminar un producto (solo admins)
    fastify.delete('/:id', {
        preHandler: [verificarToken, verificarAdmin]
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            
            // Verificar que el producto existe
            const productoExiste = await prisma.producto.findUnique({
                where: { id_producto: parseInt(id) }
            });
            
            if (!productoExiste) {
                return reply.code(404).send({ error: 'Producto no encontrado' });
            }
            
            // Eliminar el producto
            await prisma.producto.delete({
                where: { id_producto: parseInt(id) }
            });
            
            return { mensaje: 'Producto eliminado correctamente' };
        } catch (error) {
            fastify.log.error(error);
            
            if (error.code === 'P2025') {
                return reply.code(404).send({ error: 'Producto no encontrado' });
            }
            
            // Si hay error por restricciones de llaves foráneas (productos con ofertas)
            if (error.code === 'P2003') {
                return reply.code(400).send({ 
                    error: 'No se puede eliminar el producto porque tiene ofertas asociadas' 
                });
            }
            
            return reply.code(500).send({ error: 'Error al eliminar el producto' });
        }
    });
    
    // Obtener productos por categoría
    fastify.get('/categoria/:idCategoria', async (request, reply) => {
        try {
            const { idCategoria } = request.params;
            const { page = 1, limit = 10 } = request.query;
            
            const skip = (parseInt(page) - 1) * parseInt(limit);
            
            const productos = await prisma.producto.findMany({
                where: {
                    id_categoria: parseInt(idCategoria)
                },
                include: {
                    categoria: true,
                    ofertas: {
                        where: {
                            valida: true
                        },
                        orderBy: {
                            precio_oferta: 'asc'
                        },
                        take: 1,
                        include: {
                            supermercado: true
                        }
                    }
                },
                skip,
                take: parseInt(limit),
                orderBy: {
                    nombre_producto: 'asc'
                }
            });
            
            const total = await prisma.producto.count({
                where: {
                    id_categoria: parseInt(idCategoria)
                }
            });
            
            return {
                productos,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            };
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Error al obtener productos por categoría' });
        }
    });

    
}