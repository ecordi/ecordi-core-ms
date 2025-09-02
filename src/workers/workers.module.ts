import { Module } from '@nestjs/common';
import { MediaQueueService } from './workers.queue';

@Module({
  imports: [],
  providers: [MediaQueueService],
  exports: [MediaQueueService],
})
export class WorkersModule {}