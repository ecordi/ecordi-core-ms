import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { NatsTransportService } from './nats-transport.service';

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
            servers: configService.get<string>('NATS_SERVERS').split(','),
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
            servers: configService.get<string>('NATS_SERVERS').split(','),
            queue: 'auth_queue',
          },
        }),
      },
    ]),
  ],
  providers: [NatsTransportService],
  exports: [NatsTransportService],
})
export class TransportsModule {}
