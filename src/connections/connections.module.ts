import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ConnectionsController } from './connections.controller';
import { ConnectionsService } from './connections.service';
import { Connection, ConnectionSchema } from './connection-ref.schema';
import { TransportsModule } from '../transports/transports.module';
import { NatsTransportService } from '../transports/nats-transport.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Connection.name, schema: ConnectionSchema }
    ]),
    TransportsModule,
    EventsModule,
  ],
  controllers: [ConnectionsController],
  providers: [
    ConnectionsService,
    {
      provide: 'NATS_TRANSPORT',
      useExisting: NatsTransportService,
    },
  ],
  exports: [ConnectionsService],
})
export class ConnectionsModule {}
