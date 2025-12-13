import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { Message, MessageSchema } from './schemas/message.schema';
import { Thread, ThreadSchema } from './schemas/thread.schema';
import { WebhookEvent, WebhookEventSchema } from './schemas/webhook-event.schema';
import { MessageStoreService } from './services/message-store.service';
import { ThreadService } from './services/thread.service';
import { MessagingService } from './messaging.service';
import { ThreadController } from './controllers/thread.controller';
import { MediaFetcherConsumer } from './consumers/media-fetcher.consumer';
import { TasksModule } from '../tasks/tasks.module';
import { TransportsModule } from '../transports/transports.module';
import { ChannelEventsConsumer } from './consumers/channel-events.consumer';
import { ChannelEventsDLQConsumer } from './consumers/channel-events-dlq.consumer';
import { ProcessAttachmentsService } from './helpers/process-attachments';
import { NewMessagesController } from './controllers/new-messages.controller';
import { MessagesController } from './controllers/messages.controller';
import { MessagesGateway } from './gateways/messages.gateway';
import { MessagingWebSocketGateway } from '../websocket/websocket.gateway';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';
import { EnsureCompanyInterceptor } from '../common/interceptors/ensure-company.interceptor';
import { PublisherService } from './nats/publisher.service';
import { NewMessagesService } from './services/new-messages.service';

@Module({
  imports: [
    forwardRef(() => TasksModule),
    TransportsModule,
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Thread.name, schema: ThreadSchema },
      { name: WebhookEvent.name, schema: WebhookEventSchema },
    ]),
    ClientsModule.registerAsync([
      {
        name: 'NATS_SERVICE',
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.NATS,
          options: {
            servers: configService.get<string>('NATS_SERVERS', 'nats://localhost:4222').split(','),
            queue: 'core_queue',
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [ThreadController, NewMessagesController, MessagesController],
  providers: [
    MessageStoreService,
    NewMessagesService,
    ThreadService,
    MessagingService,
    PublisherService,
    ChannelEventsConsumer,
    MediaFetcherConsumer,
    ProcessAttachmentsService,
    MessagingWebSocketGateway,
    IdempotencyInterceptor,
    EnsureCompanyInterceptor,
  ],
  exports: [MessageStoreService, MessagingService],
})
export class MessagingModule {}
