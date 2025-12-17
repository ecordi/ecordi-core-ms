import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Thread, ThreadSchema } from './schemas/thread.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { OutboxEvent, OutboxEventSchema } from './schemas/outbox-event.schema';
import { ThreadsService } from './services/threads.service';
import { MessagesService } from './services/messages.service';
import { ThreadsController } from './controllers/threads.controller';
import { MessagesController } from './controllers/messages.controller';
import { MessageListener } from './listeners/message.listener';
import { NatsTransportService } from '../transports/nats-transport.service';
import { JetstreamConsumerService } from './consumers/jetstream.consumer';
import { OutboxRepository } from './outbox/outbox.repository';
import { OutboxService } from './outbox/outbox.service';
import { OutboxWorker } from '../messaging/outbox/outbox.worker';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Thread.name, schema: ThreadSchema },
      { name: Message.name, schema: MessageSchema },
      { name: OutboxEvent.name, schema: OutboxEventSchema },
    ]),
  ],
  controllers: [ThreadsController, MessagesController, MessageListener],
  providers: [
    ThreadsService,
    MessagesService,
    NatsTransportService,
    JetstreamConsumerService,
    OutboxRepository,
    OutboxService,
    OutboxWorker,
  ],
  exports: [ThreadsService, MessagesService, OutboxService, OutboxRepository],
})
export class MessagingModule {}
