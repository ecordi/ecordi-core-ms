import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import helmet from 'helmet';
import cookieParser = require('cookie-parser');
import { StrictValidationPipe } from './common/validation.pipe';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // Crear la aplicación principal HTTP
  const app = await NestFactory.create(AppModule, { rawBody: true });
  
  // Obtener servicio de configuración
  const configService = app.get(ConfigService);
  
  // Configurar la aplicación como microservicio NATS
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: {
      servers: [configService.get('NATS_SERVERS') || 'nats://localhost:4222'],
      queue: 'core-ms',
    },
  });
  app.setGlobalPrefix('api/v1');
  // Configuración global de pipes para validación
  app.useGlobalPipes(new StrictValidationPipe());

  // Registrar filtro global de excepciones
  app.useGlobalFilters(new HttpExceptionFilter());

  // Security middlewares
  app.use(helmet());
  app.use(cookieParser(configService.get<string>('SESSION_SECRET') || 'dev_session'));

  // Avoid noisy 404 logs for /favicon.ico (Swagger UI and browsers request it by default)
  app.use('/favicon.ico', (_req, res) => res.status(204).end());

  // CORS
  const origins = (configService.get<string>('ALLOWED_ORIGINS') || '').split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || origins.length === 0 || origins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-core-signature', 'X-Hub-Signature-256'],
    exposedHeaders: ['Content-Type'],
  });
  
  // Configuración de Swagger para documentación
  const config = new DocumentBuilder()
    .setTitle('Core Microservice API')
    .setDescription('API for user context resolution and access control')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  
  // Obtener puerto de configuración
  const port = configService.get<number>('PORT', 3001);
  
  // Iniciar microservicio NATS
  await app.startAllMicroservices();
  logger.log(' NATS Microservice is running');
  
  // Iniciar servidor HTTP
  await app.listen(port, '0.0.0.0');
  logger.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(` HTTP Server is running on: ${await app.getUrl()}`);
  logger.log(` Swagger documentation available at: http://0.0.0.0:${port}/docs`);
}
bootstrap();
