import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { ConfigModule } from '@nestjs/config';
import { MessagingModule } from '../messaging/messaging.module';
import { ConnectionsModule } from '../connections/connections.module';
import { WorkersModule } from '../workers/workers.module';
import { EventsModule } from '../events/events.module';
import { Message, MessageSchema } from '../messaging/schemas/message.schema';

@Module({
  imports: [
    ConfigModule, 
    MessagingModule, 
    ConnectionsModule, 
    WorkersModule, 
    EventsModule,
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }])
  ],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
