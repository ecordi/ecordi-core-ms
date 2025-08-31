import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { NatsTransportService } from './nats-transport.service';

// Simplified version of the TransportsModule for the WhatsApp channel

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'NATS_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.NATS,
          options: {
            servers: configService.get<string>('NATS_SERVERS') ? configService.get<string>('NATS_SERVERS').split(',') : ['nats://localhost:4222'],
            queue: 'core_queue',
          },
        }),
      },
      {
        name: 'AUTH_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.NATS,
          options: {
            servers: configService.get<string>('NATS_SERVERS') ? configService.get<string>('NATS_SERVERS').split(',') : ['nats://localhost:4222'],
            queue: 'auth_queue',
          },
        }),
      },
      {
        name: 'WHATSAPP_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.NATS,
          options: {
            servers: configService.get<string>('NATS_SERVERS') ? configService.get<string>('NATS_SERVERS').split(',') : ['nats://localhost:4222'],
            queue: 'whatsapp_channel_queue',
          },
        }),
      },
    ]),
  ],
  providers: [NatsTransportService],
  exports: [NatsTransportService, ClientsModule],
})
export class TransportsModule {}
