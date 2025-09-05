import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export interface MediaDownloadJob {
  mediaId: string;
  companyId: string;
  connectionRefId: string;
  phoneNumberId: string;
  messageId: string;
  type: 'image' | 'audio' | 'video' | 'document' | 'sticker';
}

@Injectable()
export class MediaQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(MediaQueueService.name);
  private readonly queue: Queue<MediaDownloadJob>;

  constructor(private readonly config: ConfigService) {
    const envUrl = this.config.get<string>('REDIS_URL');
    const host = this.config.get<string>('REDIS_HOST') || 'redis';
    const port = this.config.get<string>('REDIS_PORT') || '6379';
    const username = this.config.get<string>('REDIS_USER');
    const password = this.config.get<string>('REDIS_PASSWORD');
    const enableTlsFlag = this.config.get<string>('REDIS_TLS') === 'true';

    let connection: IORedis;
    if (envUrl) {
      const isSecure = envUrl.startsWith('rediss://');
      const servername = isSecure ? new URL(envUrl).hostname : undefined;
      connection = new IORedis(envUrl, {
        maxRetriesPerRequest: null,
        ...(isSecure ? { tls: { servername } } : {}),
      } as any);
    } else {
      connection = new IORedis({
        host,
        port: Number(port),
        username,
        password,
        maxRetriesPerRequest: null,
        ...(enableTlsFlag ? { tls: { servername: host } } : {}),
      } as any);
    }
    this.queue = new Queue<MediaDownloadJob>('whatsapp-media-download', {
      connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }

  async enqueueDownload(job: MediaDownloadJob) {
    await this.queue.add('download', job, { jobId: `media-${job.messageId}-${job.mediaId}` });
  }

  async onModuleDestroy() {
    await this.queue.close();
  }
}
