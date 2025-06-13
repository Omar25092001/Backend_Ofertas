import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_super_seguro'

export function verificarToken(request, reply, done) {
  try {
    const authHeader = request.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Se requiere token de autenticación' })
    }
    
    const token = authHeader.split(' ')[1]
    
    const decodedToken = jwt.verify(token, JWT_SECRET)
    request.usuario = decodedToken
    done()
  } catch (error) {
    return reply.code(401).send({ error: 'Token inválido o expirado' })
  }
}

export function verificarAdmin(request, reply, done) {
  if (request.usuario && request.usuario.rol === 'ADMINISTRADOR') {
    done()
  } else {
    return reply.code(403).send({ error: 'Acceso denegado. Se requieren permisos de administrador' })
  }
}