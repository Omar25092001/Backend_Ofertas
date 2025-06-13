// plugins/prisma.js
import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function prismaPlugin(fastify, options) {
  fastify.decorate('prisma', prisma)

  // Cierra la conexión cuando Fastify se cierra
  fastify.addHook('onClose', async (fastifyInstance, done) => {
    await prisma.$disconnect()
    done()
  })
}

export default fp(prismaPlugin)
