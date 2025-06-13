// server.js
import Fastify from 'fastify'
import prismaPlugin from './plugins/prisma.js'
import UserRoutes from './src/routes/UserRoutes.js'
import productoRoutes from './src/routes/ProductoRoutes.js'
import categoriaRoutes from './src/routes/CategoriasRoutes.js'
import supermercadoRoutes from './src/routes/SupermercadoRoutes.js'
import ofertasRoutes from './src/routes/OfertasRoutes.js'
import cors from '@fastify/cors'

const fastify = Fastify({
  logger: true
})

await fastify.register(cors, { 
  origin: true,
  methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
})

// Registrar plugin de Prisma
fastify.register(prismaPlugin)

fastify.register(UserRoutes, { prefix: '/usuarios' })

fastify.register(productoRoutes, { prefix: '/productos' })

fastify.register(categoriaRoutes, { prefix: '/categorias' })

fastify.register(supermercadoRoutes, { prefix: '/supermercados' })

fastify.register(ofertasRoutes, { prefix: '/ofertas' })

// Iniciar servidor
const start = async () => {
  try {
    await fastify.listen({ port: 3000 })
    console.log('Servidor corriendo en http://localhost:3000')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
