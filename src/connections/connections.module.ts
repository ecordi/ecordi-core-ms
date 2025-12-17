import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConnectionsController, FacebookOAuthController } from './connections.controller';
import { ConnectionsService } from './connections.service';
import { CoreConnection, CoreConnectionSchema } from './schemas/core-connection.schema';
import { NatsModule } from '../transports/nats.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CoreConnection.name, schema: CoreConnectionSchema }
    ]),
    NatsModule
  ],
  controllers: [ConnectionsController, FacebookOAuthController],
  providers: [ConnectionsService],
  exports: [ConnectionsService]
})
export class ConnectionsModule {}
