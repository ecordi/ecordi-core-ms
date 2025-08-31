import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import axios from 'axios';
import FormData from 'form-data';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from '../messaging/message.schema';
import { signPayload } from '../common/hmac.util';
import { EventsService } from '../events/events.service';
import { MediaDownloadJob } from './workers.queue';

@Injectable()
export class MediaWorker {
  private readonly logger = new Logger(MediaWorker.name);
  private readonly worker: Worker<MediaDownloadJob>;
  private readonly connection: IORedis;

  constructor(
    private readonly config: ConfigService,
    private readonly events: EventsService,
    @InjectModel(Message.name) private readonly msgModel: Model<MessageDocument>,
  ) {
    const redisUrl =
      this.config.get<string>('REDIS_URL') || `redis://${this.config.get<string>('REDIS_HOST') || 'redis'}:${this.config.get<string>('REDIS_PORT') || '6379'}`;
    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

    this.worker = new Worker<MediaDownloadJob>(
      'whatsapp-media-download',
      async (job: Job<MediaDownloadJob>) => this.process(job),
      { connection: this.connection },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed: ${err?.message}`);
    });
  }

  private async fetchToken(connectionRefId: string): Promise<string> {
    const base = this.config.get<string>('WA_CHANNEL_BASE');
    const url = `${base}/wa/connections/${encodeURIComponent(connectionRefId)}/token`;
    const secret = this.config.get<string>('CORE_SIGNING_SECRET') || '';
    const signature = signPayload({ connectionRefId }, secret);
    const { data } = await axios.get(url, { headers: { 'x-core-signature': signature } });
    return data?.token || data?.access_token || data;
  }

  private async process(job: Job<MediaDownloadJob>) {
    const { mediaId, companyId, connectionRefId, phoneNumberId, messageId, type } = job.data;

    // 1. Get token
    const token = await this.fetchToken(connectionRefId);

    // 2. Get media metadata
    const metaUrl = `https://graph.facebook.com/v20.0/${mediaId}`;
    const { data: meta } = await axios.get(metaUrl, { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 });
    const downloadUrl = meta?.url;
    const mime = meta?.mime_type || 'application/octet-stream';

    // 3. Download binary
    const { data: buffer } = await axios.get<ArrayBuffer>(downloadUrl, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer',
      timeout: 20000,
    });

    // 4. Upload to files-ms
    const fileBase = this.config.get<string>('FILE_MS_BASE');
    const provider = this.config.get<string>('FILE_MS_PROVIDER') || 'gcp';
    const form = new FormData();
    const filename = `${messageId}-${mediaId}`;
    form.append('file', Buffer.from(buffer), { filename, contentType: mime });
    form.append('name', filename);
    form.append('provider', provider);

    const uploadHeaders = { ...form.getHeaders() };
    const signSecret = this.config.get<string>('FILE_MS_SIGNING_SECRET');
    if (signSecret) {
      const signature = signPayload({ name: filename, provider }, signSecret);
      (uploadHeaders as any)['x-core-signature'] = signature;
    }

    const uploadUrl = `${fileBase}/files`;
    const { data: uploaded } = await axios.post(uploadUrl, form, { headers: uploadHeaders, timeout: 30000 });

    // 5. Update DB
    await this.msgModel.updateOne(
      { messageId },
      {
        $set: {
          media: {
            pending: false,
            fileId: uploaded?.id,
            url: uploaded?.url,
            provider: uploaded?.provider,
            name: uploaded?.name,
            mimetype: uploaded?.mimetype || mime,
            size: uploaded?.size,
            publicId: uploaded?.publicId,
          },
        },
      },
    );

    // 6. Emit event
    this.events.mediaStored(companyId, { id: messageId, media: { url: uploaded?.url, provider: uploaded?.provider } });
  }

  async close() {
    await this.worker.close();
    await this.connection.quit();
  }
}
