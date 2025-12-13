import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { LinkedInController } from './linkedin.controller';
import { LinkedInService } from './linkedin.service';
import { LinkedInConnectionsController } from './linkedin-connections.controller';
import { LinkedInConnectionsService } from './linkedin-connections.service';
import { LinkedInEventsController } from './linkedin-events.controller';
import { LinkedInEventsService } from './linkedin-events.service';
import { LinkedInNatsController } from './linkedin-nats.controller';
import { LinkedInConnection, LinkedInConnectionSchema } from './schemas/linkedin-connection.schema';
import { LinkedInPost, LinkedInPostSchema } from './schemas/linkedin-post.schema';
import { LinkedInEvent, LinkedInEventSchema } from './schemas/linkedin-event.schema';
import { ConnectionsModule } from '../connections/connections.module';
import { EventsModule } from '../events/events.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: LinkedInConnection.name, schema: LinkedInConnectionSchema },
      { name: LinkedInPost.name, schema: LinkedInPostSchema },
      { name: LinkedInEvent.name, schema: LinkedInEventSchema },
    ]),
    ConnectionsModule,
    EventsModule,
    MessagingModule,
  ],
  controllers: [
    LinkedInController,
    LinkedInConnectionsController,
    LinkedInEventsController,
    LinkedInNatsController,
  ],
  providers: [
    LinkedInService,
    LinkedInConnectionsService,
    LinkedInEventsService,
  ],
  exports: [
    LinkedInService,
    LinkedInConnectionsService,
    LinkedInEventsService,
  ],
})
export class LinkedInModule {}
