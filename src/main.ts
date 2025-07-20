import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // Crear la aplicación principal HTTP
  const app = await NestFactory.create(AppModule);
  
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
  
  // Configuración global de pipes para validación
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  // Registrar filtro global de excepciones
  app.useGlobalFilters(new HttpExceptionFilter());
  
  // Configuración de Swagger para documentación
  const config = new DocumentBuilder()
    .setTitle('Core Microservice API')
    .setDescription('API for user context resolution and access control')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  SwaggerModule.setup('docs', app, document);
  
  // Obtener puerto de configuración
  const port = configService.get<number>('PORT', 3001);
  
  // Iniciar microservicio NATS
  await app.startAllMicroservices();
  logger.log('🚀 NATS Microservice is running');
  
  // Iniciar servidor HTTP
  await app.listen(port, '0.0.0.0');
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`🚀 HTTP Server is running on: ${await app.getUrl()}`);
  logger.log(`📚 Swagger documentation available at: http://0.0.0.0:${port}/docs`);
}
bootstrap();
