import { Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MediaWorker } from './media.worker';
import { ConnectionsModule } from '../connections/connections.module';
import { MessagingModule } from '../messaging/messaging.module';
import { EventsModule } from '../events/events.module';
import { MediaQueueService } from './workers.queue';

@Module({
  imports: [ConfigModule, ConnectionsModule, MessagingModule, EventsModule],
  providers: [MediaWorker, MediaQueueService],
  exports: [MediaQueueService],
})
export class WorkersModule implements OnModuleDestroy {
  constructor(private readonly worker: MediaWorker) {}
  async onModuleDestroy() {
    await this.worker.close();
  }
}
