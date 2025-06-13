import Fastify from 'fastify';
import cors from '@fastify/cors';
import cron from 'node-cron';
import sendEmails from './src/enviarCorreos.js';

const fastify = Fastify({ logger: true });
await fastify.register(cors);

let jobs = [];

fastify.post('/api/schedule', async (request, reply) => {
  const { cronTime, to, mensaje, subject } = request.body;

  let task = cron.schedule(
    cronTime,
    () => {
      fastify.log.info('Ejecutando tarea programada para enviar correos');
      sendEmails(to, mensaje, subject);
    },
    {
      scheduled: true,
      timezone: 'America/Santiago',
    }
  );
  fastify.log.info(`Tarea programada para ejecutarse en: ${cronTime}`);

  jobs.push(task);
  reply.send(
    `Tarea programada para ejecutarse en: ${cronTime} en la zona horaria: America/Santiago`
  );
});

fastify.post('/api/refreshNotifications', async (request, reply) => {
  for (let job of jobs) {
    job.stop();
  }
  jobs = [];

  for (let notification of request.body.newNotifications) {
    fastify.log.info(`Nueva notificación programada: ${notification.cronTime}`);

    let job = cron.schedule(
      notification.cronTime,
      () => {
        fastify.log.info(
          `Enviando correo a ${notification.to} con asunto ${notification.subject} y mensaje ${notification.mensaje}`
        );
        sendEmails(notification.to, notification.mensaje, notification.subject);
      },
      {
        scheduled: true,
        timezone: 'America/Santiago',
      }
    );
    jobs.push(job);
  }

  reply.send('Notificaciones actualizadas');
});

fastify.post('/api/send', async (request, reply) => {
  const { to, mensaje, subject } = request.body;
  try {
    await sendEmails(to, mensaje, subject);
    reply.send({ success: true, message: 'Correo enviado correctamente' });
  } catch (error) {
    reply.status(500).send({ success: false, message: 'Error al enviar correo' });
  }
});

const port = process.env.PORT || 8080;

fastify.listen({ port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`Microservicio escuchando en ${address}`);
});