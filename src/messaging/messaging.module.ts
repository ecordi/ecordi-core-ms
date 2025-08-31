import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MessagingService } from './messaging.service';
import { Message, MessageSchema } from './message.schema';
import { ConnectionsModule } from '../connections/connections.module';
import { TransportsModule } from '../transports/transports.module';

@Module({
  imports: [
    ConfigModule,
    ConnectionsModule,
    TransportsModule,
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
  ],
  providers: [MessagingService],
  exports: [MessagingService, MongooseModule],
})
export class MessagingModule {}
