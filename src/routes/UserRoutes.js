import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { verificarToken, verificarAdmin } from '../../middleware/middleware.js'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_super_seguro'

export default async function usuarioRoutes(fastify, options) {
    // RUTAS PÚBLICAS (sin autenticación)
    
    // Crear un nuevo usuario (público)
    fastify.post('/', async (request, reply) => {
        try {
            const { nombre_completo, email, contrasena, rol } = request.body

            // Verificar si el email ya está registrado
            const usuarioExistente = await prisma.usuario.findUnique({
                where: { email }
            })

            if (usuarioExistente) {
                return reply.code(400).send({ error: 'Email ya registrado' })
            }

            // Hashear la contraseña
            const saltRounds = 10
            const contrasena_hash = await bcrypt.hash(contrasena, saltRounds)

            // Crear el usuario
            const nuevoUsuario = await prisma.usuario.create({
                data: {
                    nombre_completo,
                    email,
                    contrasena_hash,
                    rol: rol || undefined // Solo asigna el rol si está presente
                }
            })

            // Eliminar la contraseña hash de la respuesta
            const { contrasena_hash: _, ...usuarioSinContrasena } = nuevoUsuario

            return reply.code(201).send(usuarioSinContrasena)
        } catch (error) {
            fastify.log.error(error)
            return reply.code(500).send({ error: 'Error al crear el usuario' })
        }
    })

    // Login (público)
    fastify.post('/login', async (request, reply) => {
        try {
            const { email, contrasena } = request.body

            // Verificar que se proporcionaron email y contraseña
            if (!email || !contrasena) {
                return reply.code(400).send({ error: 'Email y contraseña son requeridos' })
            }

            // Buscar al usuario por email
            const usuario = await prisma.usuario.findUnique({
                where: { email },
                select: {
                    id_usuario: true,
                    nombre_completo: true,
                    email: true,
                    contrasena_hash: true,
                    rol: true
                }
            })

            // Verificar si el usuario existe
            if (!usuario) {
                return reply.code(401).send({ error: 'Credenciales inválidas' })
            }

            // Verificar la contraseña
            const passwordValido = await bcrypt.compare(contrasena, usuario.contrasena_hash)

            if (!passwordValido) {
                return reply.code(401).send({ error: 'Credenciales inválidas' })
            }

            // Generar token JWT
            const token = jwt.sign(
                {
                    id: usuario.id_usuario,
                    email: usuario.email,
                    rol: usuario.rol
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            )

            // Eliminar la contraseña hash de la respuesta
            const { contrasena_hash, ...usuarioData } = usuario

            // Devolver información del usuario y token
            return {
                usuario: usuarioData,
                token
            }
        } catch (error) {
            fastify.log.error(error)
            return reply.code(500).send({ error: 'Error en el proceso de login' })
        }
    })

    // RUTAS PROTEGIDAS - NECESITAN AUTENTICACIÓN
    
    // Perfil del usuario actual
    fastify.get('/perfil', {
        preHandler: verificarToken
    }, async (request, reply) => {
        try {
            const usuario = await prisma.usuario.findUnique({
                where: { id_usuario: request.usuario.id },
                select: {
                    id_usuario: true,
                    nombre_completo: true,
                    email: true,
                    rol: true,
                    fecha_registro: true
                }
            })
            
            if (!usuario) {
                return reply.code(404).send({ error: 'Usuario no encontrado' })
            }
            
            return usuario
        } catch (error) {
            fastify.log.error(error)
            return reply.code(500).send({ error: 'Error al obtener el perfil' })
        }
    })

    // RUTAS PROTEGIDAS - REQUIEREN SER ADMINISTRADOR
    
    // Obtener todos los usuarios (solo admins)
    fastify.get('/', {
        preHandler: [verificarToken, verificarAdmin]
    }, async (request, reply) => {
        try {
            const usuarios = await prisma.usuario.findMany({
                select: {
                    id_usuario: true,
                    nombre_completo: true,
                    email: true,
                    rol: true,
                    fecha_registro: true
                }
            })

            return usuarios
        } catch (error) {
            fastify.log.error(error)
            return reply.code(500).send({ error: 'Error al obtener usuarios' })
        }
    })

    // Obtener un usuario por ID (solo admins)
    fastify.get('/:id', {
        preHandler: [verificarToken, verificarAdmin]
    }, async (request, reply) => {
        try {
            const { id } = request.params

            const usuario = await prisma.usuario.findUnique({
                where: { id_usuario: parseInt(id) },
                select: {
                    id_usuario: true,
                    nombre_completo: true,
                    email: true,
                    rol: true,
                    fecha_registro: true
                }
            })

            if (!usuario) {
                return reply.code(404).send({ error: 'Usuario no encontrado' })
            }

            return usuario
        } catch (error) {
            fastify.log.error(error)
            return reply.code(500).send({ error: 'Error al obtener el usuario' })
        }
    })

    // Actualizar un usuario (solo admins)
    fastify.put('/:id', {
        preHandler: [verificarToken, verificarAdmin]
    }, async (request, reply) => {
        try {
            const { id } = request.params
            const { nombre_completo, email, contrasena, rol } = request.body

            // Preparar datos para actualización
            const datosActualizacion = {}

            if (nombre_completo) datosActualizacion.nombre_completo = nombre_completo
            if (email) datosActualizacion.email = email
            if (rol) datosActualizacion.rol = rol

            // Hash nueva contraseña si se proporciona
            if (contrasena) {
                const saltRounds = 10
                datosActualizacion.contrasena_hash = await bcrypt.hash(contrasena, saltRounds)
            }

            const usuarioActualizado = await prisma.usuario.update({
                where: { id_usuario: parseInt(id) },
                data: datosActualizacion,
                select: {
                    id_usuario: true,
                    nombre_completo: true,
                    email: true,
                    rol: true,
                    fecha_registro: true
                }
            })

            return usuarioActualizado
        } catch (error) {
            fastify.log.error(error)

            if (error.code === 'P2025') {
                return reply.code(404).send({ error: 'Usuario no encontrado' })
            }

            return reply.code(500).send({ error: 'Error al actualizar el usuario' })
        }
    })

    // Eliminar un usuario (solo admins)
    fastify.delete('/:id', {
        preHandler: [verificarToken, verificarAdmin]
    }, async (request, reply) => {
        try {
            const { id } = request.params

            await prisma.usuario.delete({
                where: { id_usuario: parseInt(id) }
            })

            return { mensaje: 'Usuario eliminado correctamente' }
        } catch (error) {
            fastify.log.error(error)

            if (error.code === 'P2025') {
                return reply.code(404).send({ error: 'Usuario no encontrado' })
            }

            return reply.code(500).send({ error: 'Error al eliminar el usuario' })
        }
    })

    // Obtener usuarios por rol (solo admins)
    fastify.get('/rol/:rol', {
        preHandler: [verificarToken, verificarAdmin]
    }, async (request, reply) => {
        try {
            const { rol } = request.params

            // Verificar que el rol sea válido
            const rolesValidos = ['USUARIO', 'ADMINISTRADOR', 'MODERADOR']
            if (!rolesValidos.includes(rol)) {
                return reply.code(400).send({ error: 'Rol no válido' })
            }

            const usuarios = await prisma.usuario.findMany({
                where: { rol },
                select: {
                    id_usuario: true,
                    nombre_completo: true,
                    email: true,
                    rol: true,
                    fecha_registro: true
                }
            })

            return usuarios
        } catch (error) {
            fastify.log.error(error)
            return reply.code(500).send({ error: 'Error al obtener usuarios por rol' })
        }
    })

    // Esta ruta permitirá cambiar específicamente el rol de un usuario (solo admins)
    fastify.patch('/:id/rol', {
        preHandler: [verificarToken, verificarAdmin]
    }, async (request, reply) => {
        try {
            const { id } = request.params
            const { rol } = request.body

            // Verificar que el rol sea válido
            const rolesValidos = ['USUARIO', 'ADMINISTRADOR', 'MODERADOR']
            if (!rolesValidos.includes(rol)) {
                return reply.code(400).send({ error: 'Rol no válido. Debe ser USUARIO, ADMINISTRADOR o MODERADOR' })
            }

            // Buscar el usuario para verificar que existe
            const usuarioExistente = await prisma.usuario.findUnique({
                where: { id_usuario: parseInt(id) }
            })

            if (!usuarioExistente) {
                return reply.code(404).send({ error: 'Usuario no encontrado' })
            }

            // Actualizar solo el rol del usuario
            const usuarioActualizado = await prisma.usuario.update({
                where: { id_usuario: parseInt(id) },
                data: { rol },
                select: {
                    id_usuario: true,
                    nombre_completo: true,
                    email: true,
                    rol: true,
                    fecha_registro: true
                }
            })

            return {
                mensaje: 'Rol actualizado correctamente',
                usuario: usuarioActualizado
            }
        } catch (error) {
            fastify.log.error(error)
            
            if (error.code === 'P2025') {
                return reply.code(404).send({ error: 'Usuario no encontrado' })
            }
            
            return reply.code(500).send({ error: 'Error al actualizar el rol del usuario' })
        }
    })
}